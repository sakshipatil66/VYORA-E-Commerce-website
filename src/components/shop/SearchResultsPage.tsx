import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Truck,
  MapPin,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import { ProductCard } from '../common/ProductCard';
import { CATEGORY_METADATA, ORDERED_CATEGORIES, searchProducts } from '../../data/categories';
import { formatEstimatedDate, formatLocationLabel } from '../../data/locations';

const RECOVERY_KEYWORDS = [
  'Banarasi Saree',
  'Polki Necklace',
  'Kumkumadi',
  'Bluetooth Speaker',
  'Smartwatch',
  'Bridal Juttis',
  'Brass Urli',
  'Leather Bag',
  'vyo-fash-01'
];

type PriceFilterId = 'all' | 'under2k' | '2k-5k' | '5k-15k' | 'above15k';

export const SearchResultsPage: React.FC = () => {
  const {
    products,
    searchQuery,
    submitSearch,
    setActivePage,
    openCategoryPage,
    selectedLocation,
    requestLocationPicker
  } = useStore();

  const [refineInput, setRefineInput] = useState(searchQuery || '');
  const [categoryFilter, setCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'popular' | 'newest' | 'price-asc' | 'price-desc'>('relevance');
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    setRefineInput(searchQuery || '');
    setCategoryFilter('all');
    setBrandFilter('all');
    setPriceFilter('all');
    setMinRating(0);
    setVisibleCount(16);
  }, [searchQuery]);

  // Core catalog search across name, category, brand, keywords, and product ID
  const rawMatchedProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return searchProducts(products, searchQuery);
  }, [products, searchQuery]);

  // Count per category within search results
  const matchedCategoryCounts = useMemo(() => {
    const counts = new Map<CategoryId, number>();
    rawMatchedProducts.forEach((p) => {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    });
    return counts;
  }, [rawMatchedProducts]);

  // Available brands strictly within matched products
  const matchedBrands = useMemo(() => {
    const counts = new Map<string, number>();
    rawMatchedProducts.forEach((p) => {
      counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rawMatchedProducts]);

  const hasSubFilters =
    categoryFilter !== 'all' ||
    brandFilter !== 'all' ||
    priceFilter !== 'all' ||
    minRating > 0;

  const resetSubFilters = () => {
    setCategoryFilter('all');
    setBrandFilter('all');
    setPriceFilter('all');
    setMinRating(0);
    setSortBy('relevance');
    setVisibleCount(Math.max(16, rawMatchedProducts.length));
  };

  const displayedProducts = useMemo(() => {
    const filtered = rawMatchedProducts.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (brandFilter !== 'all' && p.brand !== brandFilter) return false;
      if (priceFilter === 'under2k' && p.discountPrice >= 2000) return false;
      if (priceFilter === '2k-5k' && (p.discountPrice < 2000 || p.discountPrice > 5000)) return false;
      if (priceFilter === '5k-15k' && (p.discountPrice < 5000 || p.discountPrice > 15000)) return false;
      if (priceFilter === 'above15k' && p.discountPrice <= 15000) return false;
      if (minRating > 0 && p.rating < minRating) return false;
      return true;
    });

    const copy = [...filtered];
    if (sortBy === 'popular') {
      copy.sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);
    } else if (sortBy === 'newest') {
      copy.sort((a, b) => (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0) || b.id.localeCompare(a.id));
    } else if (sortBy === 'price-asc') {
      copy.sort((a, b) => a.discountPrice - b.discountPrice);
    } else if (sortBy === 'price-desc') {
      copy.sort((a, b) => b.discountPrice - a.discountPrice);
    }
    return copy;
  }, [rawMatchedProducts, categoryFilter, brandFilter, priceFilter, minRating, sortBy]);

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(refineInput);
  };

  const estDate = formatEstimatedDate(selectedLocation.expressDays);
  const locationLabel = formatLocationLabel(selectedLocation);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-medium">
        <button
          onClick={() => setActivePage('home')}
          className="hover:text-[#7A1438] transition-colors cursor-pointer"
        >
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 font-semibold">Search Results</span>
        {searchQuery && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[#7A1438] truncate max-w-[240px]">“{searchQuery}”</span>
          </>
        )}
      </nav>

      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-[#2D070F] via-[#4A0E17] to-[#65122F] rounded-2xl p-6 sm:p-8 text-white border border-[#D4AF37]/30 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VYORA Centralized Catalog Search · {products.length} Indexed Creations</span>
            </p>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white">
              {searchQuery
                ? `Search Results for “${searchQuery}”`
                : 'Browse Complete Marketplace Catalog'}
            </h1>
            <div className="text-xs sm:text-sm text-rose-100/85 flex flex-wrap items-center gap-2">
              <span className="font-mono tabular-nums font-semibold text-[#D4AF37]">
                {displayedProducts.length}{' '}
                {displayedProducts.length === 1 ? 'creation' : 'creations'} shown
                {hasSubFilters ? ` (of ${rawMatchedProducts.length} matched)` : ''}
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={requestLocationPicker}
                className="inline-flex items-center gap-1.5 text-rose-100/90 hover:text-white transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Delivering to {locationLabel} · Est. {estDate}</span>
                <MapPin className="w-3 h-3 text-[#D4AF37]" />
              </button>
            </div>
          </div>

          {/* Inline Refine Search Form */}
          <form onSubmit={handleRefineSubmit} className="w-full lg:w-[440px] flex items-center bg-white rounded-full p-1 shadow-sm">
            <Search className="w-4 h-4 text-[#7A1438] ml-3 shrink-0" />
            <input
              type="text"
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              placeholder="Search name, category, brand, keyword, or ID..."
              className="flex-1 py-2 px-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-none"
            />
            {refineInput && (
              <button
                type="button"
                onClick={() => {
                  setRefineInput('');
                  submitSearch('');
                }}
                aria-label="Clear search query"
                className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="py-2 px-5 rounded-full bg-[#5B112B] hover:bg-[#380811] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category Facet Filter Row when results exist */}
        {rawMatchedProducts.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/15">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={resetSubFilters}
                  className={`py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    !hasSubFilters
                      ? 'bg-[#D4AF37] text-neutral-950'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  View All Results ({rawMatchedProducts.length})
                </button>
                {Array.from(matchedCategoryCounts.entries()).map(([catId, count]) => (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(categoryFilter === catId ? 'all' : catId);
                      setVisibleCount(16);
                    }}
                    className={`py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      categoryFilter === catId
                        ? 'bg-[#D4AF37] text-neutral-950'
                        : 'bg-white/10 text-rose-100 hover:bg-white/20'
                    }`}
                  >
                    {CATEGORY_METADATA[catId]?.shortLabel || catId} ({count})
                  </button>
                ))}
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setRefineInput('');
                    submitSearch('');
                  }}
                  className="text-xs font-semibold text-[#D4AF37] hover:underline whitespace-nowrap cursor-pointer"
                >
                  Browse All {products.length} Catalog Products →
                </button>
              )}
            </div>

            {/* Secondary Filter & Sort Controls (Brand, Price, Rating, Sort) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#26060D]/70 rounded-xl p-3 border border-white/10">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </span>

                {/* Brand Filter */}
                <div className="relative">
                  <select
                    aria-label="Filter search results by brand"
                    value={brandFilter}
                    onChange={(e) => {
                      setBrandFilter(e.target.value);
                      setVisibleCount(16);
                    }}
                    className="appearance-none bg-[#380811] border border-white/20 text-white text-xs rounded-lg py-1.5 pl-3 pr-7 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">All Brands ({matchedBrands.length})</option>
                    {matchedBrands.map(([brand, cnt]) => (
                      <option key={brand} value={brand}>
                        {brand} ({cnt})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-rose-200 absolute right-2 top-2 pointer-events-none" />
                </div>

                {/* Price Filter */}
                <div className="relative">
                  <select
                    aria-label="Filter search results by price"
                    value={priceFilter}
                    onChange={(e) => {
                      setPriceFilter(e.target.value as PriceFilterId);
                      setVisibleCount(16);
                    }}
                    className="appearance-none bg-[#380811] border border-white/20 text-white text-xs rounded-lg py-1.5 pl-3 pr-7 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="all">All Prices</option>
                    <option value="under2k">Under ₹2,000</option>
                    <option value="2k-5k">₹2,000 – ₹5,000</option>
                    <option value="5k-15k">₹5,000 – ₹15,000</option>
                    <option value="above15k">Above ₹15,000</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-rose-200 absolute right-2 top-2 pointer-events-none" />
                </div>

                {/* Rating Filter */}
                <div className="relative">
                  <select
                    aria-label="Filter search results by customer rating"
                    value={minRating}
                    onChange={(e) => {
                      setMinRating(Number(e.target.value));
                      setVisibleCount(16);
                    }}
                    className="appearance-none bg-[#380811] border border-white/20 text-white text-xs rounded-lg py-1.5 pl-3 pr-7 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={4.8}>4.8★ & above</option>
                    <option value={4.5}>4.5★ & above</option>
                    <option value={4.0}>4.0★ & above</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-rose-200 absolute right-2 top-2 pointer-events-none" />
                </div>

                {hasSubFilters && (
                  <button
                    type="button"
                    onClick={resetSubFilters}
                    className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-[#D4AF37]" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-rose-200/80">Sort by:</span>
                <div className="relative">
                  <select
                    aria-label="Sort search results"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="appearance-none bg-[#380811] border border-white/25 text-white text-xs rounded-lg py-1.5 pl-3 pr-8 focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="popular">Popularity</option>
                    <option value="newest">Newest Arrivals</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-rose-200 absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Grid or Helpful Empty State */}
      {displayedProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5D9CE] p-8 sm:p-12 text-center space-y-6 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>

          {rawMatchedProducts.length > 0 && hasSubFilters ? (
            <div className="space-y-3 max-w-lg mx-auto">
              <h2 className="font-serif text-2xl font-bold text-neutral-900">
                No products match your active sub-filters
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                We found {rawMatchedProducts.length} matching creations for “{searchQuery}”, but none match your narrow brand, price, or rating filter.
              </p>
              <button
                type="button"
                onClick={resetSubFilters}
                className="py-2.5 px-6 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                View All {rawMatchedProducts.length} Matching Results
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="font-serif text-2xl font-bold text-neutral-900">
                  We couldn’t find any products matching “{searchQuery}”
                </h2>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  Double-check your spelling, search by product ID (such as “vyo-fash-01” or “vyo-elec-01”), try general keywords (“saree”, “earrings”, “perfume”, “speaker”, “sandals”), or explore our categories below.
                </p>
              </div>

              {/* Helpful Suggested Keywords */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8C6D58]">
                  Try Searching For
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {RECOVERY_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => submitSearch(kw)}
                      className="py-1.5 px-3.5 rounded-full bg-[#FAF7F5] hover:bg-[#4A0E17] text-[#380811] hover:text-white border border-[#E5D9CE] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Browse Curated Categories */}
          <div className="pt-6 border-t border-[#F1E8E0] text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7A1438] text-center mb-4">
              Or Explore Marketplace Categories
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ORDERED_CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => openCategoryPage(cat.id, null)}
                  className="group p-3 rounded-xl border border-[#EBE4DD] hover:border-[#7A1438] bg-[#FAF7F5] hover:bg-white text-left transition-all cursor-pointer"
                >
                  <p className="font-serif text-sm font-bold text-neutral-900 group-hover:text-[#7A1438]">
                    {cat.shortLabel}
                  </p>
                  <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{cat.eyebrow}</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7A1438] mt-2">
                    Shop Now <ArrowRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts.slice(0, visibleCount).map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>

          {/* Load More / View All Results Control */}
          {visibleCount < displayedProducts.length && (
            <div className="text-center pt-4 space-y-3">
              <p className="text-xs text-neutral-500 font-mono tabular-nums">
                Showing {Math.min(visibleCount, displayedProducts.length)} of {displayedProducts.length} matching products
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 16)}
                  className="py-3 px-8 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                >
                  Load More Results ({displayedProducts.length - visibleCount} remaining)
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleCount(displayedProducts.length)}
                  className="py-3 px-6 rounded-full bg-white hover:bg-[#FAF2EB] text-[#4A0E17] border border-[#D8C7B8] text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  View All {displayedProducts.length} Results
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
