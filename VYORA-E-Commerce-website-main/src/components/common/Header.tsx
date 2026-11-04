import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import { LocationSelector } from './LocationSelector';
import { ProductImage } from './ProductImage';
import { CATEGORY_METADATA, ORDERED_CATEGORIES, searchProducts } from '../../data/categories';

const MORE_DEPARTMENTS: { id: CategoryId; label: string; subtitle: string }[] = [
  { id: 'fashion', label: 'All Couture & Fashion', subtitle: 'Women, Men & Kids ethnic wear' },
  { id: 'toys', label: 'Toys & Heritage Games', subtitle: 'Channapatna wood & Sheesham chess' },
  { id: 'stationery', label: 'Books & Stationery', subtitle: 'Hand-bound khadi leather journals' },
  { id: 'fitness', label: 'Mindful Fitness', subtitle: 'Organic cork alignment yoga mats' },
  { id: 'essentials', label: 'Gourmet Pantry', subtitle: 'Pampore saffron & Vedic A2 ghee' },
  { id: 'gifting', label: 'Royal Gift Hampers', subtitle: 'Bespoke brass keepsake trunks' }
];

const POPULAR_SEARCH_CHIPS = [
  'Banarasi Saree',
  'Polki Necklace',
  'Kumkumadi Oil',
  'Bluetooth Speaker',
  'Bridal Juttis',
  'Brass Urli'
];

export const Header: React.FC = () => {
  const {
    products,
    activePage,
    setActivePage,
    selectedCategory,
    selectedSubCategory,
    openCategoryPage,
    openProductDetail,
    searchQuery,
    submitSearch,
    cartCount,
    wishlist,
    setIsCartDrawerOpen,
    setIsSearchModalOpen,
    currentUser,
    setIsAuthModalOpen
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inputVal, setInputVal] = useState(searchQuery || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchDesktopRef = useRef<HTMLDivElement>(null);
  const searchMobileRef = useRef<HTMLDivElement>(null);

  // Sync header input when global searchQuery updates (e.g. from SearchResultsPage)
  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Keyboard shortcut Cmd/Ctrl + K opens SearchModal or focuses search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setIsSearchModalOpen]);

  // Close live suggestions dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inDesktop = searchDesktopRef.current?.contains(target);
      const inMobile = searchMobileRef.current?.contains(target);
      if (!inDesktop && !inMobile) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isDropdownOpen]);

  const liveMatches = useMemo(() => {
    if (!inputVal.trim()) return [];
    return searchProducts(products, inputVal);
  }, [products, inputVal]);

  const matchingCategories = useMemo(() => {
    const q = inputVal.trim().toLowerCase();
    if (!q) return [];
    return ORDERED_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(q) ||
        cat.shortLabel.toLowerCase().includes(q) ||
        cat.keywords.some((kw) => kw.includes(q))
    ).slice(0, 3);
  }, [inputVal]);

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
    submitSearch(inputVal);
  };

  const handleClearSearch = () => {
    setInputVal('');
    if (activePage === 'search') {
      submitSearch('');
    }
  };

  const handleNavClick = (page: string, category?: CategoryId, subCategory?: string | null) => {
    if (category) {
      openCategoryPage(category, subCategory ?? null);
    } else {
      setActivePage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const navLinkClass = (isActive: boolean) =>
    `relative whitespace-nowrap shrink-0 py-2 text-[13px] tracking-wide transition-colors cursor-pointer after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-[#7A1438] after:transition-all after:duration-300 ${
      isActive
        ? 'text-[#7A1438] font-bold after:w-full'
        : 'text-[#3F332E] font-medium hover:text-[#7A1438] after:w-0 hover:after:w-full'
    }`;

  const renderSuggestionsDropdown = () => {
    if (!isDropdownOpen) return null;
    const trimmed = inputVal.trim();

    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#E5D9CE] overflow-hidden z-50 max-h-[72vh] overflow-y-auto">
        {!trimmed ? (
          <div className="p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8C6D58] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Popular Searches Across Categories</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInputVal(chip);
                    setIsDropdownOpen(false);
                    submitSearch(chip);
                  }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#FAF7F5] hover:bg-[#FAF2EB] text-[#380811] rounded-full border border-[#E5D9CE] transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#F1E8E0]">
            {/* Matching Category Quick Links */}
            {matchingCategories.length > 0 && (
              <div className="p-3 bg-[#FAF7F5]/70 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C6D58]">
                  Departments:
                </span>
                {matchingCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleNavClick('shop', cat.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[#E5D9CE] hover:border-[#7A1438] text-xs font-semibold text-[#4A0E17] transition-colors cursor-pointer"
                  >
                    <span>{cat.shortLabel}</span>
                    <ArrowUpRight className="w-3 h-3 text-[#7A1438]" />
                  </button>
                ))}
              </div>
            )}

            {/* Matching Product Suggestions */}
            {liveMatches.length === 0 ? (
              <div className="p-5 text-center space-y-2">
                <p className="text-xs font-semibold text-neutral-800">
                  No direct matches for “{trimmed}”
                </p>
                <p className="text-[11px] text-neutral-500">
                  Press Enter to view helpful category recommendations, or try “saree”, “jhumka”, “speaker”, “perfume”, or “shoes”.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    submitSearch(trimmed);
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#5B112B] text-white text-xs font-semibold cursor-pointer"
                >
                  <span>Open Search Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="p-2 space-y-1">
                  {liveMatches.slice(0, 6).map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        openProductDetail(prod.id);
                      }}
                      className="w-full p-2 rounded-xl hover:bg-[#FAF3EC] flex items-center gap-3 text-left transition-colors cursor-pointer group"
                    >
                      <ProductImage
                        src={prod.primaryImage}
                        alt={prod.name}
                        category={prod.category}
                        compact
                        className="w-12 h-14 object-cover rounded-lg bg-[#EFE6DD] border border-[#E5D9CE] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#8C6D58] font-semibold truncate">
                          <span className="truncate">
                            {prod.brand} · {CATEGORY_METADATA[prod.category]?.shortLabel || prod.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono lowercase text-neutral-400 shrink-0">
                            {prod.id}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-neutral-900 group-hover:text-[#7A1438] truncate">
                          {prod.name}
                        </p>
                        <div className="flex items-center gap-2 font-mono tabular-nums text-xs mt-0.5">
                          <span className="font-bold text-[#4A0E17]">
                            ₹{prod.discountPrice.toLocaleString('en-IN')}
                          </span>
                          {prod.originalPrice > prod.discountPrice && (
                            <span className="text-[11px] text-neutral-400 line-through">
                              ₹{prod.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#7A1438] shrink-0 mr-1" />
                    </button>
                  ))}
                </div>

                {/* View All Search Results Button */}
                <div className="p-2.5 bg-[#FAF7F5]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      submitSearch(trimmed);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#4A0E17] hover:bg-[#380811] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>
                      View All Results ({liveMatches.length} {liveMatches.length === 1 ? 'product' : 'products'}) for “{trimmed}”
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F5]/95 backdrop-blur-md border-b border-[#E6DBD1] transition-all">
      {/* Row 1: Brand Wordmark + Pune Location Selector + Modern Inline Search Bar + Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-19 flex items-center justify-between gap-3 lg:gap-5">
        {/* Zone 1: Brand + Desktop Location Selector */}
        <div className="flex items-center gap-3 lg:gap-4 shrink-0">
          <button
            onClick={() => handleNavClick('home')}
            className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md bg-gradient-to-br from-[#5B112B] to-[#380811] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] font-serif text-xl font-bold shadow-xs transition-transform duration-300 group-hover:scale-105">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-[0.06em] text-[#4A0E17] leading-none">
                VYORA
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#8C6D58] font-sans font-semibold mt-1 hidden sm:block">
                Indian Luxury Marketplace
              </span>
            </div>
          </button>

          {/* Desktop Pune Location Selector */}
          <div className="hidden md:block">
            <LocationSelector />
          </div>
        </div>

        {/* Zone 2: Modern Inline Search Bar (Desktop & Tablet) */}
        <div ref={searchDesktopRef} className="hidden md:block flex-1 max-w-xl relative">
          <form
            onSubmit={handleSearchFormSubmit}
            role="search"
            aria-label="Search products, brands, and categories"
            className="flex items-center w-full bg-white border border-[#DFD2C5] focus-within:border-[#7A1438] focus-within:ring-2 focus-within:ring-[#7A1438]/15 rounded-full overflow-hidden shadow-2xs transition-all"
          >
            <div className="pl-3.5 pr-2 text-[#7A1438] flex items-center pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputVal}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setInputVal(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="Search products, categories, brands, keywords, or ID..."
              className="w-full py-2.5 text-xs sm:text-[13px] text-neutral-900 placeholder:text-[#8C7A70] bg-transparent focus:outline-none"
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search query"
                className="p-1.5 mr-1 text-neutral-400 hover:text-neutral-800 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="py-2 px-4 mr-1 my-1 rounded-full bg-[#4A0E17] hover:bg-[#7A1438] text-[#FAF7F5] text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          {renderSuggestionsDropdown()}
        </div>

        {/* Zone 3: Wishlist, Bag, Account, Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            onClick={() => handleNavClick('wishlist')}
            aria-label="Saved wishlist"
            className="relative p-2 text-[#4A3E39] hover:text-[#7A1438] transition-colors rounded-full hover:bg-[#F3ECE7] cursor-pointer"
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#9F1239] text-white text-[10px] font-bold flex items-center justify-center font-mono tabular-nums">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCartDrawerOpen(true)}
            aria-label="Shopping bag"
            className="relative p-2 text-[#4A3E39] hover:text-[#7A1438] transition-colors rounded-full hover:bg-[#F3ECE7] cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#4A0E17] text-[#D4AF37] text-[10px] font-bold flex items-center justify-center font-mono tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          {currentUser ? (
            <button
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2 p-1 pr-2.5 rounded-full hover:bg-[#F3ECE7] border border-transparent hover:border-[#E6DBD1] transition-colors text-xs font-medium text-[#4A3E39] cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#5B112B] text-[#D4AF37] flex items-center justify-center text-xs font-semibold">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden xl:inline text-xs font-semibold text-[#4A0E17] max-w-[84px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="py-2 px-3.5 text-xs font-semibold text-[#FAF7F5] bg-[#4A0E17] hover:bg-[#2D0A11] rounded-full transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
              Sign In
            </button>
          )}

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('admin')}
              className="hidden sm:flex items-center gap-1 py-1 px-2.5 text-[11px] font-semibold text-[#854D0E] bg-[#FEF08A]/80 border border-[#FACC15] rounded-full hover:bg-[#FEF08A] transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 text-[#4A3E39] hover:text-[#7A1438] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Search & Pune Location Strip (< md) */}
      <div className="md:hidden px-4 pb-3 space-y-2 border-t border-[#EFE5DC] pt-2.5 bg-[#FAF7F5]">
        <div className="flex items-center justify-between gap-2">
          <LocationSelector compact />
          <button
            type="button"
            onClick={() => handleNavClick('offers')}
            className="text-[11px] font-semibold text-[#9F1239] hover:underline shrink-0 cursor-pointer"
          >
            Festive Offers →
          </button>
        </div>

        <div ref={searchMobileRef} className="relative">
          <form
            onSubmit={handleSearchFormSubmit}
            role="search"
            className="flex items-center w-full bg-white border border-[#DFD2C5] focus-within:border-[#7A1438] rounded-full overflow-hidden shadow-2xs"
          >
            <div className="pl-3 pr-1.5 text-[#7A1438]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputVal}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setInputVal(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="Search name, category, brand, or ID..."
              className="w-full py-2 text-xs text-neutral-900 placeholder:text-[#8C7A70] bg-transparent focus:outline-none"
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear mobile search"
                className="p-1 text-neutral-400 hover:text-neutral-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="py-1.5 px-3.5 mr-1 my-1 rounded-full bg-[#4A0E17] text-white text-xs font-semibold shrink-0"
            >
              Go
            </button>
          </form>

          {renderSuggestionsDropdown()}
        </div>
      </div>

      {/* Row 2: Dedicated Category Navigation Bar (Desktop) */}
      <div className="hidden lg:block border-t border-[#EDE3DA] bg-[#F7F1EB]/90">
        <nav
          aria-label="Marketplace categories"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-5 h-11"
        >
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleNavClick('shop', 'all', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'all')}
            >
              Shop All
            </button>
            <button
              onClick={() => handleNavClick('shop', 'fashion', '__women__')}
              className={navLinkClass(
                activePage === 'shop' &&
                  selectedCategory === 'fashion' &&
                  selectedSubCategory === '__women__'
              )}
            >
              Women
            </button>
            <button
              onClick={() => handleNavClick('shop', 'fashion', '__men__')}
              className={navLinkClass(
                activePage === 'shop' &&
                  selectedCategory === 'fashion' &&
                  selectedSubCategory === '__men__'
              )}
            >
              Men
            </button>
            <button
              onClick={() => handleNavClick('shop', 'jewellery', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'jewellery')}
            >
              Jewellery
            </button>
            <button
              onClick={() => handleNavClick('shop', 'beauty', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'beauty')}
            >
              Beauty
            </button>
            <button
              onClick={() => handleNavClick('shop', 'electronics', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'electronics')}
            >
              Electronics
            </button>
            <button
              onClick={() => handleNavClick('shop', 'footwear', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'footwear')}
            >
              Footwear
            </button>
            <button
              onClick={() => handleNavClick('shop', 'home', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'home')}
            >
              Home Decor
            </button>
            <button
              onClick={() => handleNavClick('shop', 'bags', null)}
              className={navLinkClass(activePage === 'shop' && selectedCategory === 'bags')}
            >
              Bags
            </button>

            {/* More Categories Mega Popover */}
            <div className="relative group">
              <button className="flex items-center gap-1 whitespace-nowrap shrink-0 py-2 text-[13px] font-medium text-[#3F332E] hover:text-[#7A1438] transition-colors cursor-pointer">
                <span>More Categories</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 group-hover:rotate-180" />
              </button>

              <div className="absolute top-full left-0 pt-2 hidden group-hover:block z-50">
                <div className="w-[440px] bg-white rounded-xl shadow-2xl border border-[#E6DBD1] p-4 grid grid-cols-2 gap-1.5">
                  {MORE_DEPARTMENTS.map((dept) => (
                    <button
                      key={dept.label}
                      onClick={() => handleNavClick('shop', dept.id, null)}
                      className="group/item flex items-start justify-between gap-2 text-left p-2.5 rounded-lg hover:bg-[#FAF5F0] transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 group-hover/item:text-[#7A1438] transition-colors">
                          {dept.label}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                          {dept.subtitle}
                        </p>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37] opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </button>
                  ))}
                  <div className="col-span-2 mt-2 pt-2.5 border-t border-[#F1E8E0] flex items-center justify-between px-2">
                    <button
                      onClick={() => handleNavClick('about')}
                      className="text-[11px] font-semibold text-[#5B112B] hover:underline cursor-pointer"
                    >
                      Our Artisan Provenance →
                    </button>
                    <button
                      onClick={() => handleNavClick('offers')}
                      className="text-[11px] font-semibold text-[#7A1438] hover:underline cursor-pointer"
                    >
                      Festive Privileges & Codes →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleNavClick('offers')}
            className={`whitespace-nowrap shrink-0 py-1.5 text-[13px] tracking-wide font-semibold transition-colors cursor-pointer ${
              activePage === 'offers'
                ? 'text-[#9F1239] underline underline-offset-8'
                : 'text-[#9F1239] hover:text-[#4A0E17]'
            }`}
          >
            Offers & Coupons
          </button>
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EADFD7] bg-[#FAF7F5] px-4 pt-3 pb-6 space-y-3 max-h-[78vh] overflow-y-auto shadow-xl">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C6D58] px-2">
            Shop by Category
          </p>
          <div className="grid grid-cols-2 gap-1.5 pb-3 border-b border-[#EADFD7]">
            <button
              onClick={() => handleNavClick('shop', 'all', null)}
              className="text-left px-3 py-2 text-xs font-semibold text-[#4A0E17] bg-[#F3ECE7] hover:bg-[#EAE0D7] rounded-md transition-colors"
            >
              Shop All ({products.length})
            </button>
            <button
              onClick={() => handleNavClick('shop', 'fashion', '__women__')}
              className="text-left px-3 py-2 text-xs font-medium text-[#3F332E] hover:bg-[#F1E8E0] hover:text-[#7A1438] rounded-md transition-colors"
            >
              Women’s Fashion
            </button>
            <button
              onClick={() => handleNavClick('shop', 'fashion', '__men__')}
              className="text-left px-3 py-2 text-xs font-medium text-[#3F332E] hover:bg-[#F1E8E0] hover:text-[#7A1438] rounded-md transition-colors"
            >
              Men’s Ethnic Wear
            </button>
            {[
              { id: 'fashion' as CategoryId, label: 'All Fashion & Couture' },
              { id: 'jewellery' as CategoryId, label: 'Fine Jewellery' },
              { id: 'beauty' as CategoryId, label: 'Beauty & Skincare' },
              { id: 'electronics' as CategoryId, label: 'Electronics & Audio' },
              { id: 'footwear' as CategoryId, label: 'Footwear & Juttis' },
              { id: 'home' as CategoryId, label: 'Home Decor' },
              { id: 'bags' as CategoryId, label: 'Bags & Clutches' },
              { id: 'toys' as CategoryId, label: 'Toys & Board Games' },
              { id: 'stationery' as CategoryId, label: 'Books & Stationery' },
              { id: 'fitness' as CategoryId, label: 'Fitness & Yoga' },
              { id: 'essentials' as CategoryId, label: 'Gourmet Pantry' },
              { id: 'gifting' as CategoryId, label: 'Gift Hampers' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick('shop', item.id, null)}
                className="text-left px-3 py-2 text-xs font-medium text-[#3F332E] hover:bg-[#F1E8E0] hover:text-[#7A1438] rounded-md transition-colors"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => handleNavClick('offers')}
              className="text-left px-3 py-2 text-xs font-semibold text-[#9F1239] bg-rose-50/70 hover:bg-[#F1E8E0] rounded-md"
            >
              Festive Offers
            </button>
          </div>

          <div className="flex flex-col gap-1 text-xs text-[#6B584E]">
            <button
              onClick={() => handleNavClick('my_orders')}
              className="text-left py-2 px-3 rounded hover:bg-[#F1E8E0] font-medium"
            >
              My Orders & Live Tracking
            </button>
            <button
              onClick={() => handleNavClick('about')}
              className="text-left py-2 px-3 rounded hover:bg-[#F1E8E0] font-medium"
            >
              Our Marketplace Story
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="text-left py-2 px-3 rounded hover:bg-[#F1E8E0] font-medium"
            >
              Concierge & Support
            </button>
            <button
              onClick={() => handleNavClick('faq')}
              className="text-left py-2 px-3 rounded hover:bg-[#F1E8E0] font-medium"
            >
              Authenticity & Returns Guide
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className="text-left py-2 px-3 rounded bg-amber-100 text-amber-900 font-semibold"
              >
                Store Admin Console
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
