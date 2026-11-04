import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import { ProductImage } from './ProductImage';
import { CATEGORY_METADATA, ORDERED_CATEGORIES, searchProducts } from '../../data/categories';

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    products,
    openProductDetail,
    openCategoryPage,
    submitSearch,
    searchQuery
  } = useStore();

  const [term, setTerm] = useState(searchQuery || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTerm(searchQuery || '');
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsSearchModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSearchModalOpen, setIsSearchModalOpen, searchQuery]);

  const filtered = useMemo(() => {
    return searchProducts(products, term);
  }, [products, term]);

  if (!isSearchModalOpen) return null;

  const handleSelectProduct = (id: string) => {
    setIsSearchModalOpen(false);
    openProductDetail(id);
  };

  const handleCategorySearch = (cat: CategoryId) => {
    setIsSearchModalOpen(false);
    openCategoryPage(cat, null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(term);
  };

  const quickSearches = [
    'Banarasi Silk',
    'Polki Choker',
    'Kumkumadi Oil',
    'Bluetooth Speaker',
    'Bridal Juttis',
    'Brass Urli',
    'Women Kurti',
    'Leather Bag'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#FAF7F5] rounded-2xl shadow-2xl border border-[#EBE4DD] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Search Input Bar */}
        <form onSubmit={handleFormSubmit} className="p-4 bg-white border-b border-[#EBE4DD] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#7A1438] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search products, categories, brands, keywords, or product ID..."
            className="w-full bg-transparent text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm('')}
              aria-label="Clear search"
              className="text-neutral-400 hover:text-neutral-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="py-1.5 px-3.5 rounded-full bg-[#4A0E17] hover:bg-[#7A1438] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setIsSearchModalOpen(false)}
            className="text-xs font-semibold text-[#5B112B] hover:text-[#4A0E17] px-2 py-1 bg-[#F3ECE7] rounded cursor-pointer"
          >
            ESC
          </button>
        </form>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto divide-y divide-[#EBE4DD] space-y-4">
          {!term.trim() ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#8C7A70] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Trending Searches ({products.length} Indexed Products)
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((qs) => (
                    <button
                      key={qs}
                      type="button"
                      onClick={() => submitSearch(qs)}
                      className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-[#F3ECE7] text-neutral-800 rounded-full border border-[#EBE4DD] transition-colors cursor-pointer"
                    >
                      {qs}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-[#8C7A70] uppercase tracking-wider mb-2">
                  Browse by Category
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ORDERED_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySearch(cat.id)}
                      className="p-2.5 text-left text-xs font-medium bg-white hover:bg-[#F3ECE7] rounded-lg border border-[#EBE4DD] flex items-center justify-between cursor-pointer"
                    >
                      <span>{cat.shortLabel}</span>
                      <ArrowRight className="w-3 h-3 text-[#7A1438]" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-600 font-medium">
                  Found {filtered.length} {filtered.length === 1 ? 'product' : 'products'} matching “{term}”
                </p>
                {filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={() => submitSearch(term)}
                    className="text-xs font-semibold text-[#7A1438] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm font-semibold text-neutral-800">
                    No matching products found for “{term}”
                  </p>
                  <p className="text-xs text-neutral-500">
                    Check your spelling, search by product ID (e.g. “vyo-fash-01”), or try broader terms such as “saree”, “jewellery”, “speaker”, “skincare”, or “footwear”.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {filtered.slice(0, 8).map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleSelectProduct(prod.id)}
                        className="w-full p-2 bg-white hover:bg-[#F5EFEA] rounded-lg border border-[#EBE4DD] flex items-center gap-3 text-left cursor-pointer transition-colors"
                      >
                        <ProductImage
                          src={prod.primaryImage}
                          alt={prod.name}
                          category={prod.category}
                          compact
                          className="w-14 h-14 object-cover rounded-md bg-[#EBE4DD] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A70] uppercase tracking-wider font-medium truncate">
                            <span className="truncate">
                              {prod.brand} · {CATEGORY_METADATA[prod.category]?.shortLabel || prod.category}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono lowercase text-neutral-400 shrink-0">
                              {prod.id}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-neutral-900 truncate">
                            {prod.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 font-mono tabular-nums text-xs">
                            <span className="font-bold text-[#4A0E17]">
                              ₹{prod.discountPrice.toLocaleString('en-IN')}
                            </span>
                            {prod.originalPrice > prod.discountPrice && (
                              <span className="text-neutral-400 line-through text-[11px]">
                                ₹{prod.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400 shrink-0 mr-2" />
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => submitSearch(term)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#4A0E17] hover:bg-[#380811] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>
                        View All Results ({filtered.length} {filtered.length === 1 ? 'product' : 'products'})
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
