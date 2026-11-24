import type { Order, Product } from '../types';
import { searchProducts } from '../data/categories';

export interface CatalogSignals {
  recentlyViewedIds: string[];
  wishlistIds?: string[];
  orders?: Order[];
}

export interface CatalogRecommendations {
  products: Product[];
  personalized: boolean;
}

export interface ShoppingGuideAnswer {
  message: string;
  products: Product[];
  kind: 'match' | 'personalized' | 'comparison' | 'empty';
}

const isAvailable = (product: Product) =>
  product.isActive !== false && product.stockQuantity > 0;

const uniqueProducts = (items: Product[]) =>
  items.filter((product, index) => items.findIndex((item) => item.id === product.id) === index);

export function rankCatalogRecommendations(
  products: Product[],
  signals: CatalogSignals,
  limit = 16
): CatalogRecommendations {
  const catalogById = new Map(products.map((product) => [product.id, product]));
  const categoryAffinity = new Map<string, number>();
  const brandAffinity = new Map<string, number>();
  const priceAnchors: number[] = [];
  const seenIds = new Set<string>();
  let hasPurchaseSignals = false;

  const addAffinity = (productId: string, weight: number, wasSeen = false) => {
    const product = catalogById.get(productId);
    if (!product) return;
    categoryAffinity.set(product.category, (categoryAffinity.get(product.category) || 0) + weight);
    if (product.brand) brandAffinity.set(product.brand.toLowerCase(), (brandAffinity.get(product.brand.toLowerCase()) || 0) + weight);
    if (product.discountPrice > 0) priceAnchors.push(product.discountPrice);
    if (wasSeen) seenIds.add(productId);
  };

  signals.recentlyViewedIds.slice(0, 8).forEach((id, index) =>
    addAffinity(id, Math.max(2, 8 - index), true)
  );
  (signals.wishlistIds || []).forEach((id) => addAffinity(id, 2, true));

  (signals.orders || [])
    .filter((order) => order.status !== 'cancelled')
    .slice(0, 12)
    .forEach((order) => {
      order.items.forEach((item) => {
        if (!catalogById.has(item.productId)) return;
        hasPurchaseSignals = true;
        addAffinity(item.productId, Math.min(5, Math.max(1, item.quantity)) * 1.5, true);
      });
    });

  const personalized = categoryAffinity.size > 0 || hasPurchaseSignals;
  const averagePrice = priceAnchors.length
    ? priceAnchors.reduce((sum, price) => sum + price, 0) / priceAnchors.length
    : 0;

  const ranked = products
    .filter(isAvailable)
    .map((product) => {
      const baseScore = (Number(product.rating) || 0) * 2 + Math.log1p(Math.max(0, product.reviewCount || 0)) * 0.6;
      let score = baseScore;

      if (personalized) {
        score += (categoryAffinity.get(product.category) || 0) * 4;
        score += (brandAffinity.get(product.brand.toLowerCase()) || 0) * 2;
        if (averagePrice > 0 && product.discountPrice > 0) {
          const relativePriceGap = Math.abs(product.discountPrice - averagePrice) / averagePrice;
          score += relativePriceGap <= 0.3 ? 3 : relativePriceGap <= 0.6 ? 1 : 0;
        }
        if (seenIds.has(product.id)) score -= 5;
      } else {
        if (product.isBestseller) score += 5;
        if (product.isTrending) score += 2;
        if (product.featured) score += 1;
      }

      return { product, score };
    })
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating || a.product.name.localeCompare(b.product.name))
    .map(({ product }) => product);

  return { products: ranked.slice(0, Math.max(0, limit)), personalized };
}

const removePromptWords = (value: string) => value
  .replace(/(?:under|below|less than|up to|upto|maximum|max|budget(?: of)?)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, ' ')
  .replace(/[₹\d,]+/g, ' ')
  .replace(/\b(?:please|can you|could you|show me|find|looking for|i want|i need|recommend|recommendations?|suggest|suggestions?|some|something|similar|like|this|for me|products?|items?|compare|the|a|an|with|and|versus|vs)\b/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const priceCeilingFrom = (query: string): number | null => {
  const match = query.match(/\b(?:under|below|less than|up to|upto|maximum|max|budget(?: of)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const applyBudget = (products: Product[], ceiling: number | null) =>
  ceiling === null ? products : products.filter((product) => product.discountPrice <= ceiling);

export function answerShoppingQuery(
  rawQuery: string,
  catalog: Product[],
  signals: CatalogSignals
): ShoppingGuideAnswer {
  const query = rawQuery.trim().slice(0, 300);
  const available = catalog.filter(isAvailable);
  const ceiling = priceCeilingFrom(query);
  const budgetLabel = ceiling === null ? '' : ` within ₹${ceiling.toLocaleString('en-IN')}`;

  if (/\b(compare|versus|\bvs\b)\b/i.test(query)) {
    const parts = query
      .replace(/\bcompare\b/gi, ' ')
      .split(/\b(?:and|versus|vs)\b/gi)
      .map((part) => removePromptWords(part))
      .filter((part) => part.length > 1);
    const matchedParts = parts.map((part) => searchProducts(available, part)[0]).filter(Boolean) as Product[];
    const comparison = applyBudget(uniqueProducts(matchedParts), ceiling).slice(0, 3);
    if (comparison.length >= 2) {
      return {
        kind: 'comparison',
        products: comparison,
        message: `Here are the closest available catalogue matches${budgetLabel}. Compare their listed prices, ratings, and categories below.`
      };
    }
  }

  const searchTerm = removePromptWords(query);
  const matched = applyBudget(searchProducts(available, searchTerm), ceiling).slice(0, 4);
  const asksForIdeas = /\b(recommend|recommendations?|suggest|suggestions?|something|similar|like this|for me|ideas?)\b/i.test(query);

  if (matched.length) {
    const asksAboutCare = /\b(care|clean|wash|maintain|material|fabric|details?)\b/i.test(query);
    const first = matched[0];
    const careNotes = first.careInstructions?.filter(Boolean) || [];
    const detail = asksAboutCare
      ? careNotes.length
        ? ` For ${first.name}, the catalogue lists: ${careNotes.join('; ')}.`
        : ` The catalogue describes ${first.name} as: ${first.description}`
      : '';
    return {
      kind: 'match',
      products: matched,
      message: `I found ${matched.length} available catalogue match${matched.length === 1 ? '' : 'es'}${budgetLabel}.${detail}`
    };
  }

  if (asksForIdeas) {
    const recommendationSet = rankCatalogRecommendations(available, signals, 4);
    const ideas = applyBudget(recommendationSet.products, ceiling);
    if (ideas.length) {
      const source = recommendationSet.personalized
        ? 'recent browsing, wishlist, and purchase categories'
        : 'current catalogue ratings and featured status';
      return {
        kind: 'personalized',
        products: ideas,
        message: `These available picks are ranked using ${source}${budgetLabel}.`
      };
    }
  }

  return {
    kind: 'empty',
    products: [],
    message: ceiling === null
      ? 'I could not find a close catalogue match. Try a product name, material, brand, or category such as sarees, jewellery, skincare, footwear, or home decor.'
      : `I could not find an available match${budgetLabel}. Try a broader category or a higher budget.`
  };
}
