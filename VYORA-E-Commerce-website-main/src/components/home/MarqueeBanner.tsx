import React from 'react';

interface MarqueeBannerProps {
  variant?: 'dark' | 'light';
  items?: string[];
}

const DEFAULT_ITEMS = [
  'Every Creation Tells A Story',
  'Handloomed Banarasi & Chanderi Couture',
  'Hallmarked 925 & 22K Vermeil Jewels',
  'Cold-Pressed Ayurvedic Elixirs & Oudh',
  'Handcrafted Teak Audio & Smart Timepieces',
  'Jodhpur Leather Mojaris & Weekender Duffles',
  'Moradabad Solid Brass Sanctuary Decor',
  'Insured Pan-India Express Air Delivery'
];

export const MarqueeBanner: React.FC<MarqueeBannerProps> = ({
  variant = 'dark',
  items = DEFAULT_ITEMS
}) => {
  const isDark = variant === 'dark';

  const renderTrack = (ariaHidden = false) => (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex items-center shrink-0"
    >
      {items.map((text, idx) => (
        <div key={`${text}-${idx}`} className="flex items-center shrink-0">
          <span
            className={`px-6 text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] whitespace-nowrap ${
              isDark ? 'text-[#FAF6F2]/90' : 'text-[#4A0E17]'
            }`}
          >
            {text}
          </span>
          <span
            aria-hidden="true"
            className={`text-xs select-none ${
              isDark ? 'text-[#D4AF37]' : 'text-[#B8860B]'
            }`}
          >
            ✦
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      role="region"
      aria-label="Marketplace craftsmanship highlights"
      className={`w-full overflow-hidden py-3.5 border-y ${
        isDark
          ? 'bg-[#2A070F] border-[#D4AF37]/25'
          : 'bg-[#F4EBE2] border-[#E3D5C8]'
      }`}
    >
      <div className="animate-vyora-marquee">
        {renderTrack(false)}
        {renderTrack(true)}
      </div>
    </div>
  );
};
