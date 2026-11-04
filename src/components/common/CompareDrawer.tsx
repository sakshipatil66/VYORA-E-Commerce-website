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
      <div className="fixed bottom-6 left-6 z-40 animate-in slide-in-from-bottom duration-300">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 py-2.5 px-4 bg-[#5B112B] hover:bg-[#430C1F] text-white text-xs font-semibold rounded-full shadow-2xl border-2 border-[#D4AF37] transition-all transform hover:scale-105"
        >
          <Scale className="w-4 h-4 text-[#D4AF37]" />
          <span>Compare ({compareList.length} items)</span>
        </button>
      </div>

      {/* Comparison Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 bg-[#FAF7F5] border-b border-[#EBE4DD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#7A1438]" />
                <h3 className="font-serif text-lg font-bold text-[#4A0E17]">
                  Side-by-Side Product Comparison
                </h3>
                <span className="text-xs text-neutral-500 font-mono">({comparedProducts.length} of max 4)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCompare}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="p-6 overflow-x-auto overflow-y-auto">
              <div className="min-w-[650px] grid grid-cols-5 gap-4">
                
                {/* Feature Column Labels (Col 1) */}
                <div className="space-y-6 pt-32 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
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
                  <div key={prod.id} className="p-3 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] flex flex-col justify-between space-y-6">
                    {/* Top item preview */}
                    <div className="relative space-y-2">
                      <button
                        onClick={() => toggleCompare(prod.id)}
                        aria-label="Remove"
                        className="absolute top-1 right-1 p-1 bg-white rounded-full text-neutral-400 hover:text-rose-600 shadow-xs z-10"
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
                      <p className="text-[10px] text-[#8C7A70] uppercase tracking-wider font-semibold">{prod.brand}</p>
                      <h4
                        onClick={() => {
                          setIsOpen(false);
                          openProductDetail(prod.id);
                        }}
                        className="text-xs font-bold text-neutral-900 hover:text-[#7A1438] cursor-pointer line-clamp-2"
                      >
                        {prod.name}
                      </h4>
                    </div>

                    {/* Price Row */}
                    <div className="h-10 flex items-center font-mono tabular-nums">
                      <div>
                        <span className="font-bold text-sm text-[#4A0E17]">
                          ₹{prod.discountPrice.toLocaleString('en-IN')}
                        </span>
                        {prod.originalPrice > prod.discountPrice && (
                          <span className="text-[11px] text-neutral-400 line-through ml-1.5">
                            ₹{prod.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating Row */}
                    <div className="h-8 flex items-center text-xs font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-1" />
                      <span>{prod.rating}</span>
                      <span className="text-neutral-400 ml-1">({prod.reviewCount})</span>
                    </div>

                    {/* Department Row */}
                    <div className="h-8 flex items-center text-xs capitalize text-neutral-700">
                      {prod.category} · {prod.subCategory}
                    </div>

                    {/* Material Row */}
                    <div className="h-12 flex items-center text-xs text-neutral-600 line-clamp-2 leading-tight">
                      {prod.fabricDetails || 'Authentic Handcrafted Artisan Material'}
                    </div>

                    {/* Dimensions Row */}
                    <div className="h-10 flex items-center text-xs text-neutral-600 font-mono">
                      {prod.dimensions || 'Standard Universal Sizing'}
                    </div>

                    {/* Warranty Row */}
                    <div className="h-8 flex items-center text-xs text-neutral-600">
                      {prod.warranty || '100% Authenticity Guarantee'}
                    </div>

                    {/* Return Policy Row */}
                    <div className="h-8 flex items-center text-xs text-emerald-800 font-medium">
                      {prod.returnPolicy || '7-Day Free Doorstep Return'}
                    </div>

                    {/* Add to Bag Button */}
                    <button
                      onClick={() => addToCart(prod, 1)}
                      className="w-full py-2 px-3 bg-[#5B112B] hover:bg-[#430C1F] text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-2xs mt-auto"
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
