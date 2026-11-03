import React from 'react';
import { Tag, Sparkles, Copy } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { INITIAL_COUPONS } from '../../data/coupons';

export const OffersPage: React.FC = () => {
  const { applyCoupon, addToast } = useStore();

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    applyCoupon(code);
  };

  return (
    <div className="vyora-container vyora-page max-w-5xl">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-center gap-2 typo-eyebrow text-[#7A1438]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Curated Privileges</span>
        </div>
        <h1 className="typo-h1 text-neutral-900 mt-1">
          Festive Privileges & Promo Vouchers
        </h1>
        <p className="typo-subtitle text-neutral-500 mt-2">
          Apply these curated codes at bag review or checkout for instant artisan credits.
        </p>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {INITIAL_COUPONS.map((coupon) => (
          <div
            key={coupon.code}
            className="p-6 bg-white rounded-2xl border-2 border-dashed border-[#BE185D]/30 relative flex flex-col justify-between hover:shadow-md transition-shadow group bg-linear-to-br from-white to-[#FAF2EB]/40"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="typo-h4 tracking-wider font-bold text-[#7A1438] bg-rose-50 px-3.5 py-1 rounded-lg border border-rose-200">
                  {coupon.code}
                </span>
                <span className="typo-badge typo-tabular text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                  {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                </span>
              </div>
              <h3 className="typo-h3 text-neutral-900">
                {coupon.description}
              </h3>
              <p className="typo-body-sm text-neutral-500 mt-2 typo-tabular">
                Valid on minimum order of ₹{coupon.minOrderValue.toLocaleString('en-IN')}
                {coupon.maxDiscount && ` · Max savings ₹${coupon.maxDiscount.toLocaleString('en-IN')}`}
              </p>
            </div>

            <div className="pt-5 mt-4 border-t border-[#F3ECE7] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleCopy(coupon.code)}
                className="min-h-10 py-2 px-4 typo-btn-sm text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 shrink-0" />
                <span>Apply to Bag</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coupon.code);
                  addToast(`Copied ${coupon.code} to clipboard!`);
                }}
                className="min-h-10 py-2 px-2 typo-btn-sm text-neutral-600 hover:text-black flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Copy Code</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Banking & Partner Privileges */}
      <div className="bg-[#FAF7F5] p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] space-y-4">
        <h3 className="typo-h3 text-neutral-900">
          Bank & Payment Privileges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="typo-card-title text-neutral-900">HDFC Bank Credit Cards</p>
            <p className="typo-body-sm text-neutral-600 mt-1">10% Instant Discount up to ₹1,500 on EMI transactions above ₹7,500.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="typo-card-title text-neutral-900">ICICI Bank RuPay Cards</p>
            <p className="typo-body-sm text-neutral-600 mt-1">Flat ₹750 cashback on orders above ₹4,000 using UPI on RuPay credit.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="typo-card-title text-neutral-900">Zero-Cost Doorstep COD</p>
            <p className="typo-body-sm text-neutral-600 mt-1">Free Cash on Delivery on all orders above ₹999 with zero processing fee.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
