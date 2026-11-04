import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ShoppingBag, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import { formatEstimatedDate, formatLocationLabel } from '../../data/locations';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    cart,
    cartSubtotal,
    cartTotal,
    cartDiscount,
    couponDiscountAmount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    updateCartQuantity,
    removeFromCart,
    savedForLater,
    saveForLater,
    moveToCartFromSaved,
    removeSavedForLater,
    setActivePage,
    openProductDetail,
    selectedLocation,
    requestLocationPicker
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartDrawerOpen) return null;

  const freeDeliveryThreshold = 999;
  const neededForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal);
  const deliveryProgress = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100);
  const estDate = formatEstimatedDate(selectedLocation.expressDays);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    setActivePage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartDrawerOpen(false)}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF7F5] shadow-2xl flex flex-col border-l border-[#EBE4DD]">
          
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-[#EBE4DD] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#7A1438]" />
              <h2 className="font-serif text-lg font-bold text-[#4A0E17]">
                Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              aria-label="Close bag"
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping + Pune Location Estimate Banner */}
          <div className="bg-[#F6EFEA] px-5 py-3 border-b border-[#EBE4DD] space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#5B112B]">
              <button
                type="button"
                onClick={requestLocationPicker}
                className="inline-flex items-center gap-1 font-medium hover:text-[#7A1438] text-left cursor-pointer truncate"
              >
                <MapPin className="w-3.5 h-3.5 text-[#7A1438] shrink-0" />
                <span className="truncate">
                  Delivering to <strong>{formatLocationLabel(selectedLocation)}</strong>
                </span>
              </button>
              <span className="text-emerald-800 font-semibold shrink-0">Est. {estDate}</span>
            </div>
            {neededForFreeDelivery > 0 ? (
              <p className="text-xs text-[#5B112B] font-medium">
                Add <span className="font-bold font-mono">₹{neededForFreeDelivery.toLocaleString('en-IN')}</span> more for <span className="font-semibold text-emerald-800">FREE Express Delivery</span>
              </p>
            ) : (
              <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                You've unlocked Complimentary Express Delivery!
              </p>
            )}
            <div className="w-full bg-[#E3D4C7] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#BE185D] h-full transition-all duration-300 rounded-full"
                style={{ width: `${deliveryProgress}%` }}
              />
            </div>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#F3ECE7] flex items-center justify-center text-[#7A1438]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-neutral-800">Your bag is empty</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Discover handpicked festive weaves, jewellery, and luxury Ayurvedic beauty.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    setActivePage('shop');
                  }}
                  className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors shadow-xs"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-lg border border-[#EBE4DD] flex gap-3.5 shadow-2xs"
                >
                  {/* Thumbnail */}
                  <ProductImage
                    src={getVariantProductImage(item.product, item.selectedColor)}
                    alt={item.product.name}
                    category={item.product.category}
                    compact
                    onClick={() => {
                      setIsCartDrawerOpen(false);
                      openProductDetail(item.productId);
                    }}
                    className="w-20 h-24 object-cover rounded-md bg-[#F3ECE7] cursor-pointer hover:opacity-90 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => {
                            setIsCartDrawerOpen(false);
                            openProductDetail(item.productId);
                          }}
                          className="text-xs font-semibold text-neutral-900 hover:text-[#7A1438] cursor-pointer line-clamp-2"
                        >
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                          className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Variant metadata (Zero-Pill discipline: unboxed text) */}
                      <div className="flex items-center gap-2 text-[11px] text-[#8C7A70] mt-1">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        {item.selectedSize && item.selectedColor && <span>·</span>}
                        {item.selectedColor && <span>{item.selectedColor}</span>}
                      </div>
                    </div>

                      {/* Quantity Stepper & Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#F5EFEA]">
                        <div className="flex items-center border border-[#EBE4DD] rounded-md bg-[#FAF7F5]">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1 text-neutral-600 hover:text-black hover:bg-[#EBE4DD] rounded-l"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold font-mono tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-1 text-neutral-600 hover:text-black hover:bg-[#EBE4DD] rounded-r"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveForLater(item.id)}
                            className="text-[10px] text-neutral-500 hover:text-[#7A1438] underline"
                          >
                            Save for later
                          </button>
                          <span className="font-mono text-xs tabular-nums font-bold text-[#4A0E17]">
                            ₹{(item.product.discountPrice * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Saved For Later Section */}
              {savedForLater && savedForLater.length > 0 && (
                <div className="pt-4 border-t border-[#EBE4DD] space-y-3">
                  <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Saved for Later ({savedForLater.length})
                  </h4>
                  <div className="space-y-2">
                    {savedForLater.map((savedItem) => (
                      <div key={savedItem.id} className="p-2.5 bg-white rounded-lg border border-[#EBE4DD] flex items-center justify-between gap-3 text-xs">
                        <ProductImage
                          src={getVariantProductImage(savedItem.product, savedItem.selectedColor)}
                          alt={savedItem.product.name}
                          category={savedItem.product.category}
                          compact
                          className="w-12 h-14 object-cover rounded bg-[#FAF7F5] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-neutral-900 truncate">{savedItem.product.name}</h5>
                          <p className="font-mono tabular-nums font-bold text-[#4A0E17] text-xs">
                            ₹{savedItem.product.discountPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => moveToCartFromSaved(savedItem.id)}
                            className="py-1 px-2.5 bg-[#FAF7F5] hover:bg-[#5B112B] hover:text-white border border-[#EBE4DD] rounded text-[11px] font-semibold text-[#5B112B] transition-colors"
                          >
                            Move to Bag
                          </button>
                          <button
                            onClick={() => removeSavedForLater(savedItem.id)}
                            className="text-neutral-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {/* Footer with Calculations and Checkout */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-[#EBE4DD] space-y-3">
              {/* Promo Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#7A1438] font-medium">
                      <Tag className="w-3.5 h-3.5 text-[#BE185D]" />
                      <span>Coupon <strong className="font-mono">{appliedCoupon.code}</strong> applied!</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs text-rose-700 hover:text-rose-900 underline font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Promo code (e.g. FIRST500)"
                        className="flex-1 py-1.5 px-3 text-xs uppercase bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438] font-mono"
                      />
                      <button
                        type="submit"
                        className="py-1.5 px-3 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-rose-700">{couponError}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span>Try:</span>
                      <button
                        type="button"
                        onClick={() => applyCoupon('FIRST500')}
                        className="underline font-mono text-[#7A1438] hover:text-[#5B112B]"
                      >
                        FIRST500
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => applyCoupon('FESTIVE25')}
                        className="underline font-mono text-[#7A1438] hover:text-[#5B112B]"
                      >
                        FESTIVE25
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-neutral-600 font-mono tabular-nums pt-2 border-t border-[#F3ECE7]">
                <div className="flex justify-between">
                  <span>Bag Subtotal</span>
                  <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Retail Savings</span>
                    <span>-₹{cartDiscount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-[#BE185D]">
                    <span>Coupon Savings</span>
                    <span>-₹{couponDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Pan-India Delivery</span>
                  <span>{neededForFreeDelivery === 0 ? <strong className="text-emerald-700 font-sans">FREE</strong> : '₹99'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#4A0E17] pt-2 border-t border-[#EBE4DD] font-sans">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Authentic Indian Craft · 7-Day Easy Returns · Secure order placement</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
