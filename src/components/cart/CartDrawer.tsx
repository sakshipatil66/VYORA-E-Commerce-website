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
    requestLocationPicker,
    currentUser,
    openAuthModal,
    addToast
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
    if (!currentUser) {
      addToast('Please sign in or create an account to complete secure checkout.', 'info');
      openAuthModal('signin', 'checkout');
      return;
    }
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

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen sm:max-w-md bg-[#FAF7F5] shadow-2xl flex flex-col border-l border-[#EBE4DD]">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-[#EBE4DD] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-[#7A1438] shrink-0" />
              <h2 className="typo-h3 text-[#4A0E17]">
                Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              aria-label="Close bag"
              className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-[#FAF7F5] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping + Pune Location Estimate Banner */}
          <div className="bg-[#F6EFEA] px-4 sm:px-5 py-3 border-b border-[#EBE4DD] space-y-2">
            <div className="flex items-center justify-between gap-2 typo-meta text-[#5B112B]">
              <button
                type="button"
                onClick={requestLocationPicker}
                className="inline-flex items-center gap-1.5 font-medium hover:text-[#7A1438] text-left cursor-pointer truncate"
              >
                <MapPin className="w-3.5 h-3.5 text-[#7A1438] shrink-0" />
                <span className="truncate">
                  Delivering to <strong className="font-semibold">{formatLocationLabel(selectedLocation)}</strong>
                </span>
              </button>
              <span className="text-emerald-800 font-semibold shrink-0">Est. {estDate}</span>
            </div>
            {neededForFreeDelivery > 0 ? (
              <p className="typo-body-sm text-[#5B112B] font-medium">
                Add <span className="font-bold typo-tabular">₹{neededForFreeDelivery.toLocaleString('en-IN')}</span> more for{' '}
                <span className="font-semibold text-emerald-800">FREE Express Delivery</span>
              </p>
            ) : (
              <p className="typo-body-sm text-emerald-800 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>You&apos;ve unlocked Complimentary Express Delivery!</span>
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
                  <h3 className="typo-h3 text-neutral-800">Your bag is empty</h3>
                  <p className="typo-body-sm text-neutral-500 mt-1 max-w-xs">
                    Discover handpicked festive weaves, jewellery, and luxury Ayurvedic beauty.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    setActivePage('shop');
                  }}
                  className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors shadow-xs cursor-pointer"
                >
                  Explore Collections
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-white rounded-xl border border-[#EBE4DD] flex gap-3.5 shadow-2xs"
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
                    className="w-20 h-24 object-cover rounded-lg bg-[#F3ECE7] cursor-pointer hover:opacity-90 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          onClick={() => {
                            setIsCartDrawerOpen(false);
                            openProductDetail(item.productId);
                          }}
                          className="typo-card-title text-neutral-900 hover:text-[#7A1438] cursor-pointer line-clamp-2"
                        >
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Variant metadata */}
                      <div className="flex flex-wrap items-center gap-1.5 typo-meta text-[#8C7A70] mt-1">
                        {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                        {item.selectedSize && item.selectedColor && <span>·</span>}
                        {item.selectedColor && <span>{item.selectedColor}</span>}
                      </div>
                    </div>

                    {/* Quantity Stepper & Price */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F5EFEA]">
                      <div className="flex items-center border border-[#EBE4DD] rounded-lg bg-[#FAF7F5]">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-[#EBE4DD] rounded-l-lg cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center typo-btn-sm typo-tabular">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-black hover:bg-[#EBE4DD] rounded-r-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => saveForLater(item.id)}
                          className="typo-meta text-neutral-500 hover:text-[#7A1438] underline cursor-pointer"
                        >
                          Save for later
                        </button>
                        <span className="typo-price text-[#4A0E17]">
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
                <h4 className="typo-label text-neutral-700">
                  Saved for Later ({savedForLater.length})
                </h4>
                <div className="space-y-2">
                  {savedForLater.map((savedItem) => (
                    <div
                      key={savedItem.id}
                      className="p-3 bg-white rounded-xl border border-[#EBE4DD] flex items-center justify-between gap-3"
                    >
                      <ProductImage
                        src={getVariantProductImage(savedItem.product, savedItem.selectedColor)}
                        alt={savedItem.product.name}
                        category={savedItem.product.category}
                        compact
                        className="w-12 h-14 object-cover rounded-md bg-[#FAF7F5] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="typo-card-title text-neutral-900 truncate">
                          {savedItem.product.name}
                        </h5>
                        <p className="typo-price text-[#4A0E17] mt-0.5">
                          ₹{savedItem.product.discountPrice.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => moveToCartFromSaved(savedItem.id)}
                          className="min-h-8 py-1 px-3 bg-[#FAF7F5] hover:bg-[#5B112B] hover:text-white border border-[#EBE4DD] rounded-lg typo-btn-sm text-[#5B112B] transition-colors cursor-pointer"
                        >
                          Move to Bag
                        </button>
                        <button
                          onClick={() => removeSavedForLater(savedItem.id)}
                          aria-label="Remove saved item"
                          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="p-4 sm:p-5 bg-white border-t border-[#EBE4DD] space-y-3.5">
              {/* Promo Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-2 typo-body-sm">
                    <div className="flex items-center gap-2 text-[#7A1438] font-medium">
                      <Tag className="w-4 h-4 text-[#BE185D] shrink-0" />
                      <span>
                        Coupon <strong className="font-bold tracking-wider">{appliedCoupon.code}</strong> applied!
                      </span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="typo-btn-sm text-rose-700 hover:text-rose-900 underline cursor-pointer"
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
                        className="typo-input flex-1 uppercase tracking-wider"
                      />
                      <button
                        type="submit"
                        className="min-h-11 px-4 typo-btn-sm text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="typo-meta text-rose-700">{couponError}</p>}
                    <div className="flex items-center gap-2 typo-meta text-neutral-500">
                      <span>Try:</span>
                      <button
                        type="button"
                        onClick={() => applyCoupon('FIRST500')}
                        className="underline font-semibold text-[#7A1438] hover:text-[#5B112B] cursor-pointer"
                      >
                        FIRST500
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => applyCoupon('FESTIVE25')}
                        className="underline font-semibold text-[#7A1438] hover:text-[#5B112B] cursor-pointer"
                      >
                        FESTIVE25
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Price Calculation */}
              <div className="space-y-1.5 typo-body-sm text-neutral-600 typo-tabular pt-2 border-t border-[#F3ECE7]">
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
                  <span>
                    {neededForFreeDelivery === 0 ? (
                      <strong className="text-emerald-700 font-semibold">FREE</strong>
                    ) : (
                      '₹99'
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-baseline typo-h4 text-[#4A0E17] pt-2.5 border-t border-[#EBE4DD]">
                  <span>Total Payable</span>
                  <span className="typo-price text-[#4A0E17]">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleCheckout}
                className="min-h-12 w-full py-3.5 px-4 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Proceed to Secure Checkout</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <div className="flex items-center justify-center gap-1.5 typo-meta text-neutral-500 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Authentic Indian Craft · 7-Day Easy Returns · Secure UPI</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
