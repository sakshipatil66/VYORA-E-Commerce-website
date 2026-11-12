import { CategoryId, Product, StoreCategory } from '../types';
import heroRoyalCouture from '../assets/images/hero_royal_couture_1793694603599.jpg';
import heroPolkiJewels from '../assets/images/hero_polki_jewels_1793694605573.jpg';
import heroBrassLiving from '../assets/images/hero_brass_living_1793694607275.jpg';
import heroAcousticTech from '../assets/images/hero_acoustic_tech_1793696284624.jpg';
import heroAyurvedaAtelier from '../assets/images/hero_ayurveda_atelier_1793696297589.jpg';

export const WOMENS_FASHION_SUBCATEGORIES = [
  "Women's Ethnic Wear",
  'Sarees & Weaves',
  'Kurtis & Suits'
];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
  bannerImage: string;
  assuranceBadge: string;
  keywords: string[];
}

export const CATEGORY_METADATA: Partial<Record<CategoryId, CategoryMeta>> = {
  all: {
    id: 'all',
    label: 'All Marketplace Collections',
    shortLabel: 'Shop All',
    eyebrow: 'Twelve Curated Pavilions',
    description:
      'Explore VYORA’s complete multi-category collection spanning designer women’s & men’s fashion, hallmarked fine jewellery, Ayurvedic beauty, acoustic electronics, handcrafted footwear, and sanctuary home décor.',
    bannerImage: heroRoyalCouture,
    assuranceBadge: '100% Authentic Provenance',
    keywords: ['all', 'marketplace', 'collection', 'vyora']
  },
  fashion: {
    id: 'fashion',
    label: 'Designer Fashion & Couture',
    shortLabel: 'Fashion',
    eyebrow: 'Handloom Weaves & Ceremonial Tailoring',
    description:
      'Pure Katan Banarasi sarees, Patan Patola weaves, embroidered bridal lehengas, Chanderi kurtis & suits, royal bandhgalas, and mulberry silk sherwanis crafted by master Indian looms.',
    bannerImage: heroRoyalCouture,
    assuranceBadge: 'Silk Mark & Handloom Certified',
    keywords: [
      'fashion',
      'couture',
      'clothing',
      'apparel',
      'ethnic',
      'women',
      'womens',
      'men',
      'mens',
      'kids',
      'saree',
      'sari',
      'lehenga',
      'kurti',
      'kurta',
      'suit',
      'anarkali',
      'sherwani',
      'shawl',
      'dupatta',
      'co-ord',
      'jacket',
      'nehru'
    ]
  },
  jewellery: {
    id: 'jewellery',
    label: 'Fine & Heritage Jewellery',
    shortLabel: 'Jewellery',
    eyebrow: 'Johari Bazaar & Temple Goldsmiths',
    description:
      'Uncut Jaipur Polki chokers, 925 sterling silver temple necklaces, baroque pearl jhumkas, Navratna kadas, Meenakari chandbalis, and solitaire rings.',
    bannerImage: heroPolkiJewels,
    assuranceBadge: 'BIS 925 Silver & 22K Vermeil',
    keywords: [
      'jewellery',
      'jewelry',
      'necklace',
      'choker',
      'earrings',
      'jhumka',
      'chandbali',
      'bangle',
      'kada',
      'ring',
      'anklet',
      'payal',
      'bracelet',
      'maang tikka',
      'polki',
      'kundan',
      'silver',
      'gold',
      'pearl',
      'temple'
    ]
  },
  beauty: {
    id: 'beauty',
    label: 'Beauty, Skincare & Perfumery',
    shortLabel: 'Beauty',
    eyebrow: 'Ayurvedic Botanicals & Kannauj Extraits',
    description:
      'Kashmiri saffron Kumkumadi facial elixirs, steam-distilled Kannauj rose mists, aged Assam oudh perfumes, botanical hair oils, velvet lip tints, and cold-processed body care.',
    bannerImage: heroAyurvedaAtelier,
    assuranceBadge: 'AYUSH GMP Certified Botanicals',
    keywords: [
      'beauty',
      'skincare',
      'skin',
      'cosmetics',
      'makeup',
      'perfume',
      'parfum',
      'fragrance',
      'oudh',
      'attar',
      'oil',
      'serum',
      'elixir',
      'gel',
      'cream',
      'butter',
      'mist',
      'toner',
      'ubtan',
      'mask',
      'lip',
      'lipstick',
      'kajal',
      'kohl',
      'hair',
      'bhringraj',
      'kumkumadi',
      'ayurveda'
    ]
  },
  electronics: {
    id: 'electronics',
    label: 'Electronics, Audio & Wearables',
    shortLabel: 'Electronics',
    eyebrow: 'Acoustic Engineering & Smart Timepieces',
    description:
      'Hand-finished walnut & spun-brass Bluetooth speakers, leather-strap AMOLED smartwatches, hybrid ANC headphones, true wireless earbuds, mechanical keyboards, and MagSafe desk gear.',
    bannerImage: heroAcousticTech,
    assuranceBadge: '1-Year Manufacturer Warranty',
    keywords: [
      'electronics',
      'electronic',
      'gadgets',
      'tech',
      'audio',
      'speaker',
      'bluetooth',
      'smartwatch',
      'watch',
      'earbuds',
      'tws',
      'headphones',
      'anc',
      'charger',
      'wireless',
      'magsafe',
      'power bank',
      'lamp',
      'turntable',
      'vinyl',
      'keyboard',
      'mechanical'
    ]
  },
  home: {
    id: 'home',
    label: 'Home Décor & Sanctuary Living',
    shortLabel: 'Home Decor',
    eyebrow: 'Moradabad Brass, Ceramics & Handblock Linens',
    description:
      'Hand-hammered Moradabad brass urlis, carved Sheesham wood lamps, Sanganer mulmul cotton dohars, Banarasi brocade cushions, stoneware dinner sets, and dhurrie rugs.',
    bannerImage: heroBrassLiving,
    assuranceBadge: 'Handcrafted Guild Decor',
    keywords: [
      'home',
      'decor',
      'home decor',
      'living',
      'interior',
      'brass',
      'urli',
      'lamp',
      'lantern',
      'dohar',
      'quilt',
      'bedding',
      'blanket',
      'cushion',
      'pillow',
      'tray',
      'vase',
      'ceramic',
      'dinnerware',
      'plates',
      'rug',
      'carpet',
      'dhurrie',
      'candle'
    ]
  },
  footwear: {
    id: 'footwear',
    label: 'Handcrafted Footwear',
    shortLabel: 'Footwear',
    eyebrow: 'Artisan Juttis, Sandals, Heels & Loafers',
    description:
      'Zardozi velvet bridal juttis, hand-tanned Jodhpur leather mojaris, Kolhapuri chappals, embroidered block heels, pearl wedge sandals, and penny loafers with memory-foam cushioning.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0467/1573/2136/files/2_71738d72-8925-4a8d-bb9c-42eb2d16ceff.jpg?width=1400',
    assuranceBadge: 'Double Memory-Foam Comfort',
    keywords: [
      'footwear',
      'shoes',
      'shoe',
      'sandals',
      'sandal',
      'heels',
      'heel',
      'wedges',
      'jutti',
      'juttis',
      'mojari',
      'mojaris',
      'kolhapuri',
      'chappal',
      'sliders',
      'mules',
      'loafers',
      'flats'
    ]
  },
  bags: {
    id: 'bags',
    label: 'Bags, Clutches & Travel Leather',
    shortLabel: 'Bags',
    eyebrow: 'Full-Grain Saddlery & Zari Evening Bags',
    description:
      'Vegetable-tanned leather weekender duffles, hand-embroidered bridal zari potlis, structured office totes, laptop backpacks, and brass-clasp box clutches.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0467/1573/2136/files/DSC0035.jpg?width=1400',
    assuranceBadge: 'Full-Grain Leather & Hand Zari',
    keywords: [
      'bags',
      'bag',
      'handbag',
      'luggage',
      'duffle',
      'travel',
      'potli',
      'clutch',
      'tote',
      'sling',
      'crossbody',
      'backpack',
      'laptop bag',
      'purse'
    ]
  },
  toys: {
    id: 'toys',
    label: 'Heritage Toys & Board Games',
    shortLabel: 'Toys & Games',
    eyebrow: 'GI-Tagged Channapatna Wood & Strategy Classics',
    description:
      'Organic vegetable-dyed Channapatna wooden stacking toys, tournament weighted Sheesham wood chess sets, balance boards, and Montessori pretend-play sets.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0276/7139/6412/files/snugglestacking7.png?width=1400',
    assuranceBadge: '100% Non-Toxic Organic Lacquer',
    keywords: ['toys', 'toy', 'games', 'game', 'chess', 'wooden', 'kids', 'montessori', 'channapatna', 'board game']
  },
  stationery: {
    id: 'stationery',
    label: 'Fine Stationery & Leather Journals',
    shortLabel: 'Stationery',
    eyebrow: 'Handmade Cotton Rag Paper & Brass Pens',
    description:
      'Hand-stitched deckle-edge khadi leather journals, turned solid brass fountain pens, desk blotter folios, botanical planners, and wax seal kits.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0593/5706/9369/files/Pocket-Journal-Navy-Blue-front.jpg?width=1400',
    assuranceBadge: 'Acid-Free Cotton Rag Paper',
    keywords: ['stationery', 'books', 'journal', 'notebook', 'diary', 'planner', 'pen', 'fountain pen', 'desk', 'wax seal']
  },
  fitness: {
    id: 'fitness',
    label: 'Mindful Fitness & Yoga Gear',
    shortLabel: 'Fitness',
    eyebrow: 'Antimicrobial Cork, Hemp & Copper Wellness',
    description:
      'High-density natural cork alignment yoga mats, ergonomic meditation bolsters, cork stability blocks, pure hammered copper water bottles, and canvas gym duffles.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0615/5606/4462/files/1_cf434c31-3d40-4fee-9d35-f12d9f5257e8.jpg?width=1400',
    assuranceBadge: '100% Natural Tree Rubber & Cork',
    keywords: ['fitness', 'sports', 'yoga', 'mat', 'meditation', 'copper bottle', 'workout', 'wellness', 'blocks']
  },
  essentials: {
    id: 'essentials',
    label: 'Gourmet Pantry & Artisanal Wellness',
    shortLabel: 'Gourmet Pantry',
    eyebrow: 'Single-Origin Estates & Vedic Superfoods',
    description:
      'GI-tagged Pampore Grade-A1 Mongra saffron, Vedic bilona A2 Gir cow ghee, Himalayan raw multiflora honey, Darjeeling first-flush teas, and ceremonial matcha.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/2598/1404/files/AshwagandhaGheeFOP.jpg?width=1400',
    assuranceBadge: 'Small-Batch Lab Tested Purity',
    keywords: ['essentials', 'pantry', 'grocery', 'gourmet', 'saffron', 'kesar', 'ghee', 'honey', 'tea', 'coffee', 'spices', 'food']
  },
  gifting: {
    id: 'gifting',
    label: 'Royal Gift Hampers & Keepsakes',
    shortLabel: 'Gifting',
    eyebrow: 'Curated Wedding, Festive & Corporate Boxes',
    description:
      'Velvet-lined brass festive keepsake trunks, Ayurvedic self-care spa boxes, brass filter-kaapi sets, wedding shagun hampers, and executive leather desk sets.',
    bannerImage: 'https://cdn.shopify.com/s/files/1/0017/0639/3644/files/Pro-CaptureOne0129copy2.webp?width=1400',
    assuranceBadge: 'Complimentary Wax-Sealed Note Card',
    keywords: ['gifting', 'gift', 'gifts', 'hamper', 'hampers', 'festive', 'wedding gift', 'diwali', 'corporate', 'box']
  }
};

export function resolveCategoryMeta(id: CategoryId, categories: StoreCategory[] = []): CategoryMeta {
  const saved = categories.find((category) => category.id === id);
  const fallback = CATEGORY_METADATA[id];
  return {
    id,
    label: saved?.label || fallback?.label || id,
    shortLabel: saved?.label || fallback?.shortLabel || id,
    eyebrow: fallback?.eyebrow || 'VYORA curated collection',
    description: saved?.description || fallback?.description || '',
    bannerImage: saved?.image || fallback?.bannerImage || '',
    assuranceBadge: fallback?.assuranceBadge || 'Considered quality, always',
    keywords: fallback?.keywords || [id]
  };
}

export const ORDERED_CATEGORIES: CategoryMeta[] = [
  CATEGORY_METADATA.fashion!,
  CATEGORY_METADATA.jewellery!,
  CATEGORY_METADATA.beauty!,
  CATEGORY_METADATA.electronics!,
  CATEGORY_METADATA.home!,
  CATEGORY_METADATA.footwear!,
  CATEGORY_METADATA.bags!,
  CATEGORY_METADATA.toys!,
  CATEGORY_METADATA.stationery!,
  CATEGORY_METADATA.fitness!,
  CATEGORY_METADATA.essentials!,
  CATEGORY_METADATA.gifting!
];

export function isWomensFashionProduct(product: Product): boolean {
  return (
    product.category === 'fashion' &&
    WOMENS_FASHION_SUBCATEGORIES.includes(product.subCategory)
  );
}

export function isWomensProduct(product: Product): boolean {
  const subCategory = product.subCategory.toLowerCase().replace(/[^a-z]/g, '');
  return (
    (product.category === 'fashion' || product.category === 'footwear') &&
    (isWomensFashionProduct(product) || subCategory.includes('women') || subCategory.includes('ladies'))
  );
}

export function isMensProduct(product: Product): boolean {
  const subCategory = product.subCategory.toLowerCase().replace(/[^a-z]/g, '');
  return (
    (product.category === 'fashion' || product.category === 'footwear') &&
    subCategory.includes('men') &&
    !subCategory.includes('women')
  );
}

const normalizeSearchText = (value: string) =>
  value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();

const CATEGORY_UMBRELLA_TERMS: Partial<Record<CategoryId, string[]>> = {
  all: ['all', 'marketplace'],
  fashion: ['fashion', 'couture', 'clothing', 'apparel', 'ethnic', 'garment', 'wear'],
  jewellery: ['jewellery', 'jewelry', 'ornament', 'ornaments', 'jewels', 'jewel'],
  beauty: ['beauty', 'skincare', 'cosmetics', 'apothecary', 'personal care'],
  electronics: ['electronics', 'electronic', 'tech', 'gadget', 'gadgets'],
  home: ['home', 'decor', 'home decor', 'living', 'interior', 'furnishing'],
  footwear: ['footwear', 'shoes', 'shoe'],
  bags: ['bags', 'bag', 'luggage'],
  toys: ['toys', 'toy', 'games', 'play'],
  stationery: ['stationery', 'desk', 'paper'],
  fitness: ['fitness', 'yoga', 'wellness', 'workout'],
  essentials: ['essentials', 'pantry', 'gourmet', 'grocery', 'superfood'],
  gifting: ['gifting', 'gift', 'gifts', 'hamper', 'hampers']
};

function buildItemSynonyms(text: string): string {
  const extra: string[] = [];
  if (/\bt shirts?\b|\btshirts?\b|\btees?\b/.test(text)) {
    extra.push('tee tees t shirt tshirt t shirts tshirts');
  }
  if (/\btrousers?\b|\bpants?\b|\bchinos?\b/.test(text)) {
    extra.push('trouser trousers pants chino chinos slacks');
  }
  if (/\bdenim\b|\bjeans?\b/.test(text)) extra.push('denim jeans jean');
  if (/\bjacket\b|\bcoats?\b|\bbomber\b/.test(text)) extra.push('jacket jackets coat coats outerwear bomber');
  if (/\bshirts?\b|\bbutton down\b/.test(text)) extra.push('shirt shirts button down formal');
  if (/\bsneakers?\b|\btrainers?\b/.test(text)) extra.push('sneaker sneakers trainer trainers shoes');
  if (/\bsaree\b|\bsarees\b|\bsari\b/.test(text)) extra.push('saree sarees sari');
  if (/\bparfum\b|\bperfume\b|\battar\b|\boudh\b|\bextrait\b|\bfragrance\b/.test(text)) {
    extra.push('perfume parfum fragrance scent attar');
  }
  if (/\bjutti\b|\bjuttis\b|\bmojari\b|\bmojaris\b|\bsandal\b|\bheel\b|\bloafer\b|\bkolhapuri\b|\bslider\b|\bwedge\b/.test(text)) {
    extra.push('shoes shoe footwear');
  }
  if (/\bpayal\b|\banklet\b/.test(text)) extra.push('anklet payal');
  if (/\bjhumka\b|\bchandbali\b|\bearring\b|\bstuds\b/.test(text)) extra.push('earrings earring');
  if (/\bchoker\b|\bnecklace\b|\bhaar\b/.test(text)) extra.push('necklace choker');
  if (/\bkada\b|\bbangle\b|\bbracelet\b/.test(text)) extra.push('bangle bracelet kada');
  if (/\bsaffron\b|\bkesar\b|\bmongra\b/.test(text)) extra.push('saffron kesar');
  if (/\bsmartwatch\b|\bchronograph\b/.test(text)) extra.push('watch smartwatch wearable');
  if (/\bspeaker\b|\bearbuds\b|\bheadphones\b|\bturntable\b/.test(text)) extra.push('audio sound');
  return extra.join(' ');
}

/**
 * Precision multi-token search across centralized catalog:
 * Searches by product ID, product name, category, subcategory, brand, colors,
 * highlights, and item-specific synonyms — never leaking unrelated sibling items.
 */
export function searchProducts(products: Product[], rawQuery: string): Product[] {
  const cleaned = normalizeSearchText(rawQuery).replace(/\bt\s+shirts?\b/g, 'tshirt');
  if (!cleaned) return [];

  const tokens = cleaned.split(/\s+/).filter(Boolean);

  const hasExplicitMenToken = tokens.some((token) => token === 'men' || token === 'mens');
  const hasExplicitWomenToken = tokens.some((token) =>
    token === 'women' || token === 'womens' || token === 'ladies'
  );
  const compactQuery = cleaned.replace(/\s+/g, '');
  const idMatches = products.filter((p) =>
    normalizeSearchText(p.id).replace(/\s+/g, '').includes(compactQuery)
  );

  if (compactQuery.startsWith('vyo') && idMatches.length > 0) {
    return idMatches.sort((a, b) => {
      const aExact = normalizeSearchText(a.id).replace(/\s+/g, '') === compactQuery;
      const bExact = normalizeSearchText(b.id).replace(/\s+/g, '') === compactQuery;
      return Number(bExact) - Number(aExact);
    });
  }

  const scored: { product: Product; score: number; coreMatch: boolean }[] = [];

  for (const p of products) {
    const idLower = p.id.toLowerCase();
    const nameLower = normalizeSearchText(p.name);
    const brandLower = normalizeSearchText(p.brand);
    const catLower = normalizeSearchText(p.category);
    const subLower = normalizeSearchText(p.subCategory);
    const taglineLower = normalizeSearchText(p.tagline);
    const descLower = normalizeSearchText(p.description);
    const badgeLower = normalizeSearchText(p.badge || '');
    const originLower = normalizeSearchText(p.artisanOrigin || '');
    const fabricLower = normalizeSearchText(p.fabricDetails || '');
    const colorsLower = normalizeSearchText((p.colors || []).map((c) => c.name).join(' '));
    const highlightsLower = normalizeSearchText(p.highlights.join(' '));
    const catMeta = CATEGORY_METADATA[p.category];
    const catUmbrella = normalizeSearchText([
      catMeta?.label || '',
      catMeta?.shortLabel || '',
      ...(CATEGORY_UMBRELLA_TERMS[p.category] || [])
    ].join(' '));

    if (hasExplicitMenToken && !hasExplicitWomenToken) {
      if (!isMensProduct(p)) continue;
    }
    if (hasExplicitWomenToken && !hasExplicitMenToken) {
      if (!isWomensProduct(p)) continue;
    }

    const itemCoreText = `${idLower} ${nameLower} ${brandLower} ${catLower} ${subLower} ${taglineLower} ${badgeLower} ${originLower} ${fabricLower} ${colorsLower} ${highlightsLower}`;
    const itemSynonyms = buildItemSynonyms(
      `${nameLower} ${catLower} ${subLower} ${taglineLower} ${highlightsLower}`
    );
    const genderTag = isMensProduct(p) ? 'men mens' : isWomensProduct(p) ? 'women womens ladies' : '';
    const coreSearchableCorpus = normalizeSearchText(
      `${itemCoreText} ${itemSynonyms} ${catUmbrella} ${genderTag}`
    );
    const searchableCorpus = normalizeSearchText(`${coreSearchableCorpus} ${descLower}`);

    const allTokensMatch = tokens.every((token) => searchableCorpus.includes(token));

    if (!allTokensMatch) continue;
    const coreMatch = tokens.every((token) => coreSearchableCorpus.includes(token));

    let score = 0;
    if (nameLower === cleaned) score += 160;
    else if (nameLower.includes(cleaned)) score += 110;
    if (brandLower.includes(cleaned)) score += 90;
    if (subLower.includes(cleaned)) score += 80;
    if (catLower === cleaned || normalizeSearchText(catMeta?.shortLabel || '') === cleaned) score += 95;

    for (const tok of tokens) {
      if (idLower.includes(tok)) score += 60;
      if (nameLower.includes(tok)) score += 38;
      if (brandLower.includes(tok)) score += 28;
      if (subLower.includes(tok)) score += 25;
      if (catLower.includes(tok)) score += 24;
      if (colorsLower.includes(tok)) score += 18;
      if (highlightsLower.includes(tok)) score += 14;
      if (taglineLower.includes(tok)) score += 12;
      if (catUmbrella.includes(tok)) score += 10;
      if (descLower.includes(tok)) score += 6;
    }

    if (p.featured || p.isBestseller) score += 3;
    scored.push({ product: p, score, coreMatch });
  }

  const coreMatches = scored.filter((entry) => entry.coreMatch);
  return (coreMatches.length > 0 ? coreMatches : scored)
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating)
    .map((entry) => entry.product);
}
