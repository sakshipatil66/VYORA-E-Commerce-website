import React, { useState } from 'react';
import { X, Sparkles, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatLocationLabel } from '../../data/locations';

export const AnnouncementBar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const { setActivePage, applyCoupon, selectedLocation, requestLocationPicker } = useStore();

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Special promotions"
      className="bg-[#380811] text-[#FAF6F2] typo-meta py-2 border-b border-[#D4AF37]/20 transition-all duration-200"
    >
      <div className="vyora-container flex items-center justify-between gap-3 sm:gap-4">
        <div className="hidden lg:flex items-center gap-3 typo-meta text-rose-200/85 shrink-0">
          <button
            type="button"
            onClick={requestLocationPicker}
            title="Change delivery location"
            className="inline-flex items-center gap-1 text-[#D4AF37] hover:text-white font-semibold transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{formatLocationLabel(selectedLocation)}</span>
          </button>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setActivePage('my_orders')}
            className="hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            Track Order
          </button>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-center gap-2 text-center">
          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
          <span className="font-medium tracking-wide truncate">
            Complimentary Express Shipping Above ₹999 Across All 12 Departments
          </span>
          <span className="hidden md:inline text-rose-200/40" aria-hidden="true">
            ·
          </span>
          <span className="hidden md:inline text-rose-100/90 shrink-0">
            Code{' '}
            <button
              onClick={() => applyCoupon('FIRST500')}
              className="font-semibold text-[#D4AF37] underline underline-offset-2 hover:text-white transition-colors cursor-pointer"
            >
              FIRST500
            </button>{' '}
            for ₹500 Off
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setActivePage('offers')}
            className="typo-label text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
          >
            Privileges
          </button>
          <button
            onClick={() => setIsVisible(false)}
            aria-label="Dismiss announcement"
            className="text-rose-300/80 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
