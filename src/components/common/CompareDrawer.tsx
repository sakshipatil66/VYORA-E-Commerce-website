import React, { useState } from 'react';
import { Scale, X, ShoppingBag, Star } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage } from './ProductImage';

export const CompareDrawer: React.FC = () => {
  const { compareList, toggleCompare, clearCompare, products, addToCart, openProductDetail } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  if (compareList.length === 0) return null;

  const comparedProducts = products.filter((p) => compareList.includes(p.id));

  return (
    <>
      {/* Floating Bottom Pill Trigger */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 min-h-11 py-2.5 px-4 bg-[#5B112B] hover:bg-[#430C1F] text-white typo-btn-sm rounded-full shadow-2xl border-2 border-[#D4AF37] transition-all transform hover:scale-105 cursor-pointer"
        >
          <Scale className="w-4 h-4 text-[#D4AF37]" />
          <span>Compare ({compareList.length} items)</span>
        </button>
      </div>

      {/* Comparison Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 bg-[#FAF7F5] border-b border-[#EBE4DD] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#7A1438] shrink-0" />
                <h3 className="typo-h3 text-[#4A0E17]">
                  Side-by-Side Product Comparison
                </h3>
                <span className="typo-meta text-neutral-500 typo-tabular">({comparedProducts.length} of max 4)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCompare}
                  className="typo-btn-sm text-rose-700 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close comparison"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="p-4 sm:p-6 overflow-x-auto overflow-y-auto">
              <div className="min-w-[680px] grid grid-cols-5 gap-4">
                
                {/* Feature Column Labels (Col 1) */}
                <div className="space-y-6 pt-32 typo-label text-neutral-500">
                  <div className="h-10 flex items-center">Price (INR)</div>
                  <div className="h-8 flex items-center">Rating</div>
                  <div className="h-8 flex items-center">Department</div>
                  <div className="h-12 flex items-center">Craft & Material</div>
                  <div className="h-10 flex items-center">Dimensions</div>
                  <div className="h-8 flex items-center">Warranty</div>
                  <div className="h-8 flex items-center">Returns</div>
                </div>

                {/* Product Columns (Cols 2-5) */}
                {comparedProducts.map((prod) => (
                  <div key={prod.id} className="p-3.5 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] flex flex-col justify-between space-y-6">
                    {/* Top item preview */}
                    <div className="relative space-y-2">
                      <button
                        onClick={() => toggleCompare(prod.id)}
                        aria-label="Remove"
                        className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-white rounded-full text-neutral-500 hover:text-rose-600 shadow-xs z-10 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <ProductImage
                        src={prod.primaryImage}
                        alt={prod.name}
                        category={prod.category}
                        label={prod.brand}
                        className="w-full aspect-4/5 object-cover rounded-lg bg-white"
                      />
                      <p className="typo-label text-[#8C7A70]">{prod.brand}</p>
                      <h4
                        onClick={() => {
                          setIsOpen(false);
                          openProductDetail(prod.id);
                        }}
                        className="typo-card-title text-neutral-900 hover:text-[#7A1438] cursor-pointer line-clamp-2"
                      >
                        {prod.name}
                      </h4>
                    </div>

                    {/* Price Row */}
                    <div className="h-10 flex items-center typo-tabular">
                      <div>
                        <span className="typo-price text-[#4A0E17]">
                          ₹{prod.discountPrice.toLocaleString('en-IN')}
                        </span>
                        {prod.originalPrice > prod.discountPrice && (
                          <span className="typo-meta text-neutral-400 line-through ml-1.5">
                            ₹{prod.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating Row */}
                    <div className="h-8 flex items-center typo-body-sm typo-tabular">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                      <span className="font-semibold">{prod.rating}</span>
                      <span className="text-neutral-400 ml-1">({prod.reviewCount})</span>
                    </div>

                    {/* Department Row */}
                    <div className="h-8 flex items-center typo-body-sm capitalize text-neutral-700">
                      {prod.category} · {prod.subCategory}
                    </div>

                    {/* Material Row */}
                    <div className="h-12 flex items-center typo-body-sm text-neutral-600 line-clamp-2">
                      {prod.fabricDetails || 'Authentic Handcrafted Artisan Material'}
                    </div>

                    {/* Dimensions Row */}
                    <div className="h-10 flex items-center typo-body-sm text-neutral-600 typo-tabular">
                      {prod.dimensions || 'Standard Universal Sizing'}
                    </div>

                    {/* Warranty Row */}
                    <div className="h-8 flex items-center typo-body-sm text-neutral-600">
                      {prod.warranty || '100% Authenticity Guarantee'}
                    </div>

                    {/* Return Policy Row */}
                    <div className="h-8 flex items-center typo-body-sm text-emerald-800 font-medium">
                      {prod.returnPolicy || '7-Day Free Doorstep Return'}
                    </div>

                    {/* Add to Bag Button */}
                    <button
                      onClick={() => addToCart(prod, 1)}
                      className="w-full min-h-10 py-2 px-3 bg-[#5B112B] hover:bg-[#430C1F] text-white typo-btn-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-auto cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Bag</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
