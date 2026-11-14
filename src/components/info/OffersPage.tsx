import React from 'react';
import { Tag, Sparkles, Copy } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const OffersPage: React.FC = () => {
  const { coupons, categories, applyCoupon, addToast } = useStore();

  const categoryLabelMap = new Map(categories.map((cat) => [cat.id, cat.label || cat.id]));

  const handleApplyAndCopy = async (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    await applyCoupon(code);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated Privileges</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 mt-1">
          Festive Privileges &amp; Promo Vouchers
        </h1>
        <p className="text-xs text-neutral-500 mt-2">
          Apply these curated codes at bag review or checkout for instant artisan credits.
        </p>
      </div>

      {/* Coupons Grid */}
      {coupons.length === 0 ? (
        <div className="mb-12 rounded-2xl border border-dashed border-[#DFD2C6] bg-white p-10 text-center">
          <p className="font-serif text-lg font-semibold text-neutral-800">
            No active promotional codes right now
          </p>
          <p className="text-xs text-neutral-500 mt-1.5">
            Check back soon for new seasonal privileges and curated offers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {coupons.map((coupon) => {
            const categoryNames = (coupon.applicableCategories || [])
              .map((catId) => categoryLabelMap.get(catId) || catId);
            const remainingUses =
              coupon.usageLimit !== null && coupon.usageLimit !== undefined
                ? Math.max(0, coupon.usageLimit - (coupon.usedCount ?? 0))
                : null;

            return (
              <div
                key={coupon.code}
                className="p-6 bg-white rounded-2xl border-2 border-dashed border-[#BE185D]/30 relative flex flex-col justify-between hover:shadow-md transition-shadow group bg-linear-to-br from-white to-[#FAF2EB]/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-base font-bold text-[#7A1438] bg-rose-50 px-3 py-1 rounded-md border border-rose-200">
                      {coupon.code}
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono tabular-nums">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue.toLocaleString('en-IN')} OFF`}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-neutral-900">
                    {coupon.description}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2 font-mono tabular-nums">
                    Valid on minimum order of ₹{coupon.minOrderValue.toLocaleString('en-IN')}
                    {coupon.maxDiscount ? ` · Max savings ₹${coupon.maxDiscount.toLocaleString('en-IN')}` : ''}
                  </p>
                  {(categoryNames.length > 0 || coupon.expiresAt || remainingUses !== null) && (
                    <p className="text-[11px] text-[#7A6A62] mt-1.5">
                      {[
                        categoryNames.length > 0 ? `Applies to: ${categoryNames.join(', ')}` : '',
                        coupon.expiresAt
                          ? `Valid until ${new Date(coupon.expiresAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}`
                          : '',
                        remainingUses !== null ? `${remainingUses} redemptions left` : ''
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>

                <div className="pt-6 mt-4 border-t border-[#F3ECE7] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => void handleApplyAndCopy(coupon.code)}
                    className="py-2 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Apply to Bag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(coupon.code).catch(() => {});
                      }
                      addToast(`Copied ${coupon.code} to clipboard!`);
                    }}
                    className="text-xs font-medium text-neutral-600 hover:text-black flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Banking & Partner Privileges */}
      <div className="bg-[#FAF7F5] p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] space-y-4">
        <h3 className="font-serif text-lg font-bold text-neutral-900">
          Bank & Payment Privileges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="font-bold text-neutral-900">HDFC Bank Credit Cards</p>
            <p className="text-neutral-600 mt-1">10% Instant Discount up to ₹1,500 on EMI transactions above ₹7,500.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="font-bold text-neutral-900">ICICI Bank RuPay Cards</p>
            <p className="text-neutral-600 mt-1">Flat ₹750 cashback on orders above ₹4,000 using UPI on RuPay credit.</p>
          </div>
          <div className="p-4 bg-white rounded-xl border border-[#EBE4DD]">
            <p className="font-bold text-neutral-900">Zero-Cost Doorstep COD</p>
            <p className="text-neutral-600 mt-1">Free Cash on Delivery on all orders above ₹999 with zero processing fee.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
