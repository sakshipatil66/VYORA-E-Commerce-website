import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Award,
  Truck,
  MapPin,
  X,
  Star
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';
import { ProductCarousel } from '../common/ProductCarousel';
import {
  resolveCategoryMeta,
  WOMENS_FASHION_SUBCATEGORIES,
  isMensProduct,
  isWomensProduct
} from '../../data/categories';
import { formatEstimatedDate, formatLocationLabel } from '../../data/locations';

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc' | 'featured';

export const ShopPage: React.FC = () => {
  const {
    products,
    categories,
    selectedCategory,
    selectedSubCategory,
    setSelectedSubCategory,
    openCategoryPage,
    setActivePage,
    selectedLocation,
    requestLocationPicker
  } = useStore();

  const [priceRange, setPriceRange] = useState<'all' | 'under2k' | '2k-5k' | '5k-15k' | 'above15k'>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const pageSize = 12;
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);

  // Reset facet selections & pagination whenever the user switches category
  useEffect(() => {
    setPriceRange('all');
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setMinRating(0);
    setInStockOnly(false);
    setVisibleCount(pageSize);
  }, [selectedCategory, selectedSubCategory]);

  // Reset visibleCount when facets change
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [priceRange, selectedBrands, selectedColors, selectedSizes, minRating, inStockOnly, sortBy]);

  // Strictly scope pool to selected category (never show unrelated products!)
  const categoryPool = useMemo(() => {
    if (selectedCategory === 'all') return products;
    if (selectedSubCategory === '__women__') return products.filter(isWomensProduct);
    if (selectedSubCategory === '__men__') return products.filter(isMensProduct);
    const inCat = products.filter((p) => p.category === selectedCategory);
    return inCat;
  }, [products, selectedCategory, selectedSubCategory]);

  // Multi-slide Carousel 1 within active category: Trending & Best Sellers
  const categoryTrendingSlidePool = useMemo(() => {
    return [...categoryPool].sort(
      (a, b) =>
        (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0) ||
        (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0) ||
        b.reviewCount - a.reviewCount
    );
  }, [categoryPool]);

  // Multi-slide Carousel 2 within active category: New Arrivals & Featured
  const categoryNewAndFeaturedPool = useMemo(() => {
    return [...categoryPool].sort(
      (a, b) =>
        (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0) ||
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
        b.id.localeCompare(a.id)
    );
  }, [categoryPool]);

  // Available subcategories within active category
  const availableSubCategories = useMemo(() => {
    const base =
      selectedCategory === 'all' || selectedSubCategory?.startsWith('__')
        ? []
        : products.filter((p) => p.category === selectedCategory);
    const subs = new Set<string>();
    base.forEach((p) => {
      if (p.subCategory) subs.add(p.subCategory);
    });
    return Array.from(subs);
  }, [products, selectedCategory, selectedSubCategory]);

  // Dynamic facets derived strictly from the active category pool
  const availableBrands = useMemo(() => {
    const counts = new Map<string, number>();
    categoryPool.forEach((p) => {
      counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [categoryPool]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    categoryPool.forEach((p) => {
      (p.colors || []).forEach((c) => {
        if (!map.has(c.name)) {
          map.set(c.name, c.hex);
        }
      });
    });
    return Array.from(map.entries());
  }, [categoryPool]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    categoryPool.forEach((p) => {
      (p.sizes || []).forEach((s) => {
        if (s && s.length <= 22) set.add(s);
      });
    });
    return Array.from(set);
  }, [categoryPool]);

  // Filtered + Sorted Products
  const filteredProducts = useMemo(() => {
    return categoryPool
      .filter((p) => {
        if (selectedSubCategory && !selectedSubCategory.startsWith('__')) {
          const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normalize(p.subCategory) !== normalize(selectedSubCategory)) return false;
        }

        if (priceRange === 'under2k' && p.discountPrice >= 2000) return false;
        if (priceRange === '2k-5k' && (p.discountPrice < 2000 || p.discountPrice >= 5000)) return false;
        if (priceRange === '5k-15k' && (p.discountPrice < 5000 || p.discountPrice > 15000)) return false;
        if (priceRange === 'above15k' && p.discountPrice <= 15000) return false;

        if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false;

        if (selectedColors.length > 0) {
          const prodColors = (p.colors || []).map((c) => c.name);
          if (!selectedColors.some((sc) => prodColors.includes(sc))) return false;
        }

        if (selectedSizes.length > 0) {
          const prodSizes = p.sizes || [];
          if (!selectedSizes.some((ss) => prodSizes.includes(ss))) return false;
        }

        if (minRating > 0 && p.rating < minRating) return false;

        if (inStockOnly && !p.inStock) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (
            (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0) ||
            b.reviewCount - a.reviewCount ||
            b.rating - a.rating
          );
        }
        if (sortBy === 'newest') {
          return (
            (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0) ||
            b.id.localeCompare(a.id)
          );
        }
        if (sortBy === 'price-asc') return a.discountPrice - b.discountPrice;
        if (sortBy === 'price-desc') return b.discountPrice - a.discountPrice;
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating;
      });
  }, [
    categoryPool,
    selectedSubCategory,
    priceRange,
    selectedBrands,
    selectedColors,
    selectedSizes,
    minRating,
    inStockOnly,
    sortBy
  ]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const resetFilters = () => {
    setPriceRange('all');
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedSizes([]);
    setMinRating(0);
    setInStockOnly(false);
    if (selectedSubCategory && !selectedSubCategory.startsWith('__')) {
      setSelectedSubCategory(null);
    }
    setSortBy('popular');
  };

  const scrollToFullCatalog = () => {
    resetFilters();
    setVisibleCount(Math.max(pageSize, categoryPool.length));
    const el = document.getElementById('complete-category-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasActiveFilters =
    priceRange !== 'all' ||
    selectedBrands.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    minRating > 0 ||
    inStockOnly ||
    (selectedSubCategory !== null && !selectedSubCategory.startsWith('__'));

  // Category Metadata & Dynamic Title for Women / Men / Specific Category
  const activeMeta = resolveCategoryMeta(selectedCategory, categories);
  const isWomenView = selectedCategory === 'fashion' && selectedSubCategory === '__women__';
  const isMenView = selectedCategory === 'fashion' && selectedSubCategory === '__men__';

  const pageTitle = isWomenView
    ? "Women's Designer Fashion & Couture"
    : isMenView
    ? "Men's Royal Ethnic & Tailoring"
    : activeMeta.label;

  const pageDescription = isWomenView
    ? 'Handwoven Banarasi Katan sarees, Patan Patola silks, embroidered bridal lehengas, Chanderi kurtis, velvet anarkalis, and zari linen co-ords crafted exclusively for women.'
    : isMenView
    ? 'Hand-embroidered raw silk sherwanis, Jodhpur bandhgala Nehru jackets, mulberry silk festive kurtas, and Lucknowi Chikankari ensembles tailored for men.'
    : activeMeta.description;

  const estDate = formatEstimatedDate(selectedLocation.expressDays);
  const locationLabel = formatLocationLabel(selectedLocation);
  const visibleSlice = filteredProducts.slice(0, visibleCount);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentExpandedPages = Math.min(totalPages, Math.ceil(visibleCount / pageSize));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* 1. Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-medium">
        <button
          onClick={() => setActivePage('home')}
          className="hover:text-[#7A1438] transition-colors cursor-pointer"
        >
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <button
          onClick={() => openCategoryPage('all', null)}
          className={`transition-colors cursor-pointer ${
            selectedCategory === 'all' ? 'text-neutral-900 font-semibold' : 'hover:text-[#7A1438]'
          }`}
        >
          Categories
        </button>
        {selectedCategory !== 'all' && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <button
              onClick={() => openCategoryPage(selectedCategory, null)}
              className={`transition-colors cursor-pointer ${
                !selectedSubCategory ? 'text-neutral-900 font-semibold' : 'hover:text-[#7A1438]'
              }`}
            >
              {activeMeta.shortLabel}
            </button>
          </>
        )}
        {selectedSubCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[#7A1438] font-semibold">
              {selectedSubCategory === '__women__'
                ? "Women's Collection"
                : selectedSubCategory === '__men__'
                  ? "Men's Collection"
                  : selectedSubCategory}
            </span>
          </>
        )}
      </nav>

      {/* 2. Dedicated Category Hero Banner */}
      <section className="relative rounded-2xl overflow-hidden bg-[#26060D] border border-[#D4AF37]/30 shadow-md">
        <img
          src={activeMeta.bannerImage}
          alt={pageTitle}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E040A]/95 via-[#2D070F]/85 to-[#1E040A]/55" />

        <div className="relative z-10 p-6 sm:p-9 lg:p-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{activeMeta.eyebrow}</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white leading-tight">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-rose-100/85 leading-relaxed font-light">
              {pageDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2.5 shrink-0">
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-xs border border-[#D4AF37]/40 text-white text-xs font-mono tabular-nums">
              <strong className="text-[#D4AF37]">{filteredProducts.length}</strong>{' '}
              {filteredProducts.length === 1 ? 'Product' : 'Products'} Available
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-rose-100/90">
              <Award className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>{activeMeta.assuranceBadge}</span>
            </div>
            <button
              type="button"
              onClick={requestLocationPicker}
              className="flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>
                Delivering to {locationLabel} · Est. {estDate}
              </span>
              <MapPin className="w-3 h-3 text-[#D4AF37] shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Quick Category Switcher Bar (Includes Women, Men & All 12 Categories) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
          <button
            onClick={() => openCategoryPage('all', null)}
            className={`py-2 px-3.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#4A0E17] text-white shadow-2xs'
                : 'bg-white hover:bg-[#F3ECE7] text-neutral-700 border border-[#E5D9CE]'
            }`}
          >
            All Categories ({products.length})
          </button>
          <button
            onClick={() => openCategoryPage('fashion', '__women__')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              isWomenView
                ? 'bg-[#4A0E17] text-white shadow-2xs'
                : 'bg-white hover:bg-[#F3ECE7] text-neutral-700 border border-[#E5D9CE]'
            }`}
          >
            Women’s Fashion
          </button>
          <button
            onClick={() => openCategoryPage('fashion', '__men__')}
            className={`py-2 px-3.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              isMenView
                ? 'bg-[#4A0E17] text-white shadow-2xs'
                : 'bg-white hover:bg-[#F3ECE7] text-neutral-700 border border-[#E5D9CE]'
            }`}
          >
            Men’s Fashion
          </button>
          {categories.map((cat) => {
            const isSelected =
              selectedCategory === cat.id &&
              !(cat.id === 'fashion' && (isWomenView || isMenView));
            return (
              <button
                key={cat.id}
                onClick={() => openCategoryPage(cat.id, null)}
                className={`py-2 px-3.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#4A0E17] text-white shadow-2xs'
                    : 'bg-white hover:bg-[#F3ECE7] text-neutral-700 border border-[#E5D9CE]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Subcategory Pills for Selected Category */}
        {selectedCategory !== 'all' && availableSubCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 text-xs">
            <span className="text-neutral-400 font-semibold uppercase text-[10px] tracking-wider shrink-0">
              Collections:
            </span>
            <button
              onClick={() => setSelectedSubCategory(null)}
              className={`py-1 px-3 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                selectedSubCategory === null
                  ? 'bg-neutral-900 text-white font-semibold'
                  : 'bg-[#F3ECE7] text-neutral-700 hover:bg-[#E8DCD2]'
              }`}
            >
              All {activeMeta.shortLabel}
            </button>
            {selectedCategory === 'fashion' && (
              <button
                onClick={() =>
                  setSelectedSubCategory(selectedSubCategory === '__women__' ? null : '__women__')
                }
                className={`py-1 px-3 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                  selectedSubCategory === '__women__'
                    ? 'bg-[#7A1438] text-white font-semibold'
                    : 'bg-[#F3ECE7] text-neutral-700 hover:bg-[#E8DCD2]'
                }`}
              >
                All Women’s Wear ({WOMENS_FASHION_SUBCATEGORIES.length} Edits)
              </button>
            )}
            {availableSubCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubCategory(selectedSubCategory === sub ? null : sub)}
                className={`py-1 px-3 rounded-full text-xs transition-colors shrink-0 cursor-pointer ${
                  selectedSubCategory === sub
                    ? 'bg-[#7A1438] text-white font-semibold'
                    : 'bg-[#F3ECE7] text-neutral-700 hover:bg-[#E8DCD2]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Multi-Slide Horizontal Carousels Strictly Scoped to Selected Category */}
      {categoryPool.length >= 5 && (
        <div className="space-y-6">
          <ProductCarousel
            eyebrow={`${activeMeta.shortLabel} · Slide Rail 01`}
            title={`Trending & Best Sellers in ${activeMeta.shortLabel}`}
            subtitle="Slide horizontally through patron-acclaimed creations belonging strictly to this department."
            products={categoryTrendingSlidePool}
            onViewAll={scrollToFullCatalog}
            viewAllLabel={`View All ${categoryPool.length}`}
            compactHeader
            bgVariant="card"
          />

          <ProductCarousel
            eyebrow={`${activeMeta.shortLabel} · Slide Rail 02`}
            title={`New Arrivals & Featured in ${activeMeta.shortLabel}`}
            subtitle="Fresh atelier releases and connoisseur editions curated for this category."
            products={categoryNewAndFeaturedPool}
            onViewAll={scrollToFullCatalog}
            viewAllLabel="Browse Full Grid"
            compactHeader
            bgVariant="ivory"
          />
        </div>
      )}

      {/* 5. Main Layout: Faceted Filters Sidebar + Complete Category Product Grid */}
      <div id="complete-category-catalog" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Mobile Filter & Sort Bar */}
        <div className="lg:hidden flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#EBE4DD]">
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-[#5B112B] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters {hasActiveFilters ? '(Active)' : ''}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs font-semibold text-neutral-800 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md py-1 px-2 focus:outline-none"
            >
              <option value="popular">Popularity</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="featured">Curated</option>
            </select>
          </div>
        </div>

        {/* Faceted Filters Sidebar */}
        <aside
          className={`space-y-5 bg-white p-5 rounded-2xl border border-[#EBE4DD] shadow-2xs ${
            isMobileFilterOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#F3ECE7]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-900">
              <SlidersHorizontal className="w-4 h-4 text-[#7A1438]" />
              <span>Filter Products</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* 1. Price Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
              Price
            </label>
            <div className="space-y-1.5 text-xs">
              {[
                { id: 'all', label: 'All Prices' },
                { id: 'under2k', label: 'Under ₹2,000' },
                { id: '2k-5k', label: '₹2,000 – ₹5,000' },
                { id: '5k-15k', label: '₹5,000 – ₹15,000' },
                { id: 'above15k', label: 'Above ₹15,000' }
              ].map((range) => (
                <label
                  key={range.id}
                  className="flex items-center gap-2 cursor-pointer text-neutral-700 hover:text-black"
                >
                  <input
                    type="radio"
                    name="priceRange"
                    checked={priceRange === range.id}
                    onChange={() => setPriceRange(range.id as typeof priceRange)}
                    className="accent-[#7A1438]"
                  />
                  <span>{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Brand Filter */}
          {availableBrands.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-[#F3ECE7]">
              <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
                Brand ({availableBrands.length})
              </label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs">
                {availableBrands.map(([brand, count]) => (
                  <label
                    key={brand}
                    className="flex items-center justify-between gap-2 cursor-pointer text-neutral-700 hover:text-black"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="rounded accent-[#7A1438]"
                      />
                      <span className="truncate">{brand}</span>
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
                      ({count})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. Color Filter */}
          {availableColors.length > 0 && (
            <div className="space-y-2.5 pt-4 border-t border-[#F3ECE7]">
              <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
                Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableColors.map(([colorName, hex]) => {
                  const active = selectedColors.includes(colorName);
                  return (
                    <button
                      key={colorName}
                      type="button"
                      onClick={() => toggleColor(colorName)}
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                        active
                          ? 'border-[#7A1438] bg-[#FAF2EB] text-[#4A0E17] font-semibold'
                          : 'border-[#EBE4DD] bg-[#FAF7F5] text-neutral-700 hover:border-neutral-400'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/15 shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="truncate max-w-[115px]">{colorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Size / Edition Filter (where applicable) */}
          {availableSizes.length > 0 && (
            <div className="space-y-2.5 pt-4 border-t border-[#F3ECE7]">
              <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
                Size / Variant
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSizes.map((sz) => {
                  const active = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`py-1 px-2.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#5B112B] text-white border-[#5B112B]'
                          : 'bg-white text-neutral-700 border-[#EBE4DD] hover:border-[#7A1438]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Customer Rating Filter */}
          <div className="space-y-2 pt-4 border-t border-[#F3ECE7]">
            <label className="text-xs font-semibold text-neutral-800 uppercase tracking-wider block">
              Customer Rating
            </label>
            <div className="space-y-1.5 text-xs">
              {[
                { val: 0, label: 'Any Rating' },
                { val: 4.8, label: '4.8★ & above' },
                { val: 4.5, label: '4.5★ & above' },
                { val: 4.0, label: '4.0★ & above' }
              ].map((rat) => (
                <label
                  key={rat.val}
                  className="flex items-center gap-2 cursor-pointer text-neutral-700 hover:text-black"
                >
                  <input
                    type="radio"
                    name="rating"
                    checked={minRating === rat.val}
                    onChange={() => setMinRating(rat.val)}
                    className="accent-[#7A1438]"
                  />
                  <span className="inline-flex items-center gap-1">
                    {rat.val > 0 && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                    {rat.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 6. Availability Toggle */}
          <div className="pt-4 border-t border-[#F3ECE7]">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-neutral-800">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded accent-[#7A1438]"
              />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid + Toolbar + Pagination / Load More */}
        <div className="lg:col-span-3 space-y-5">
          {/* Desktop Sort & Count Toolbar */}
          <div className="hidden lg:flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-[#EBE4DD] shadow-2xs">
            <p className="text-xs text-neutral-600 font-medium">
              Complete Catalog:{' '}
              <strong className="text-neutral-900 font-mono tabular-nums">
                {visibleSlice.length}
              </strong>{' '}
              of{' '}
              <strong className="text-neutral-900 font-mono tabular-nums">
                {filteredProducts.length}
              </strong>{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'} in{' '}
              <span className="text-[#7A1438] font-semibold">{pageTitle}</span>
            </p>

            <div className="flex items-center gap-2.5">
              <label htmlFor="desktop-sort" className="text-xs font-semibold text-neutral-600">
                Sort by:
              </label>
              <div className="relative">
                <select
                  id="desktop-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none bg-[#FAF7F5] border border-[#E5D9CE] rounded-lg py-1.5 pl-3 pr-8 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#7A1438] cursor-pointer"
                >
                  <option value="popular">Popularity</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="featured">Featured Curations</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedBrands.map((b) => (
                <button
                  key={b}
                  onClick={() => toggleBrand(b)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FAF2EB] border border-[#D8C2B0] text-xs font-medium text-[#4A0E17] cursor-pointer"
                >
                  <span>Brand: {b}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
              {selectedColors.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FAF2EB] border border-[#D8C2B0] text-xs font-medium text-[#4A0E17] cursor-pointer"
                >
                  <span>Color: {c}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
              {selectedSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FAF2EB] border border-[#D8C2B0] text-xs font-medium text-[#4A0E17] cursor-pointer"
                >
                  <span>Size: {s}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
              {priceRange !== 'all' && (
                <button
                  onClick={() => setPriceRange('all')}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FAF2EB] border border-[#D8C2B0] text-xs font-medium text-[#4A0E17] cursor-pointer"
                >
                  <span>Price filter</span>
                  <X className="w-3 h-3" />
                </button>
              )}
              {minRating > 0 && (
                <button
                  onClick={() => setMinRating(0)}
                  className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-[#FAF2EB] border border-[#D8C2B0] text-xs font-medium text-[#4A0E17] cursor-pointer"
                >
                  <span>{minRating}★+</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-[#EBE4DD] text-center space-y-4">
              <h3 className="font-serif text-xl font-bold text-neutral-800">
                No matching products in {pageTitle}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
                Try clearing one of your selected brand, color, size, or price filters to view all items in this category.
              </p>
              <button
                onClick={resetFilters}
                className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-full hover:bg-[#380811] transition-colors cursor-pointer"
              >
                View All Products in {activeMeta.shortLabel}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {visibleSlice.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {/* Pagination & Load More Footer */}
              <div className="pt-6 border-t border-[#EAE0D6] flex flex-col items-center gap-4">
                <p className="text-xs text-neutral-500 font-mono tabular-nums">
                  Displaying {visibleSlice.length} of {filteredProducts.length} verified creations
                </p>

                {visibleCount < filteredProducts.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + pageSize)}
                    className="py-3 px-8 rounded-full bg-[#4A0E17] hover:bg-[#7A1438] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    Load More Products ({filteredProducts.length - visibleCount} remaining)
                  </button>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, idx) => {
                      const pageNum = idx + 1;
                      const isLoaded = pageNum <= currentExpandedPages;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setVisibleCount(pageNum * pageSize)}
                          className={`w-8 h-8 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                            pageNum === currentExpandedPages
                              ? 'bg-[#5B112B] text-white'
                              : isLoaded
                              ? 'bg-[#FAF2EB] text-[#4A0E17] border border-[#DFD2C5]'
                              : 'bg-white text-neutral-600 border border-[#EBE4DD] hover:border-[#7A1438]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
