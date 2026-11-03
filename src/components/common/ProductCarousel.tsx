import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  onViewAll?: () => void;
  viewAllLabel?: string;
  headerRightExtra?: React.ReactNode;
  compactHeader?: boolean;
  bgVariant?: 'transparent' | 'ivory' | 'card';
}

export const ProductCarousel: React.FC<ProductCarouselProps> = ({
  eyebrow,
  title,
  subtitle,
  products,
  onViewAll,
  viewAllLabel = 'View All',
  headerRightExtra,
  compactHeader = false,
  bgVariant = 'transparent'
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(1);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const recalculateMetrics = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);

    // Estimate number of distinct horizontal slides
    const computedSlides =
      clientWidth > 0 ? Math.max(1, Math.ceil((scrollWidth - 8) / clientWidth)) : 1;
    setTotalSlides(computedSlides);

    if (maxScroll <= 4 || computedSlides <= 1) {
      setActiveSlide(0);
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const progress = Math.min(1, Math.max(0, scrollLeft / maxScroll));
    const currentIdx = Math.min(
      computedSlides - 1,
      Math.round(progress * (computedSlides - 1))
    );
    setActiveSlide(currentIdx);
    setCanScrollPrev(scrollLeft > 8);
    setCanScrollNext(scrollLeft < maxScroll - 8);
  }, []);

  // Reset scroll to start when product list identity changes (e.g., switching tabs)
  const productSignature = products.map((p) => p.id).join('|');
  useEffect(() => {
    const el = trackRef.current;
    if (el) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
    const timer = window.setTimeout(recalculateMetrics, 40);
    return () => window.clearTimeout(timer);
  }, [productSignature, recalculateMetrics]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    recalculateMetrics();
    const onScroll = () => recalculateMetrics();
    el.addEventListener('scroll', onScroll, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => recalculateMetrics());
      observer.observe(el);
    } else {
      window.addEventListener('resize', onScroll);
    }

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', onScroll);
    };
  }, [recalculateMetrics]);

  const scrollBySlide = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, el.clientWidth * 0.92);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const scrollToSlideIndex = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (totalSlides <= 1 || maxScroll <= 0) return;
    const targetLeft = (index / (totalSlides - 1)) * maxScroll;
    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  const wrapperClasses =
    bgVariant === 'card'
      ? 'bg-white rounded-2xl border border-[#EAE0D6] p-5 sm:p-7 shadow-2xs'
      : bgVariant === 'ivory'
      ? 'bg-[#F6EFE9]/75 rounded-2xl border border-[#EAE0D6] p-5 sm:p-7'
      : '';

  return (
    <div className={wrapperClasses}>
      {/* Carousel Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div className="space-y-1 max-w-2xl">
          {eyebrow && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7A1438]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>{eyebrow}</span>
            </div>
          )}
          <h2
            className={`font-serif font-bold text-neutral-900 leading-tight ${
              compactHeader ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Controls: Optional Filter Pills + Prev/Next Arrows + View All CTA */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 shrink-0">
          {headerRightExtra}

          <div className="flex items-center gap-2">
            {/* Prev / Next Slide Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollBySlide(-1)}
                disabled={!canScrollPrev}
                aria-label={`Previous slide in ${title}`}
                className="w-9 h-9 rounded-full border border-[#DFD2C5] bg-white hover:bg-[#4A0E17] text-[#380811] hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollBySlide(1)}
                disabled={!canScrollNext}
                aria-label={`Next slide in ${title}`}
                className="w-9 h-9 rounded-full border border-[#DFD2C5] bg-white hover:bg-[#4A0E17] text-[#380811] hover:text-white disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center transition-all shadow-2xs cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full bg-[#4A0E17] hover:bg-[#7A1438] text-[#FAF7F5] text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              >
                <span>{viewAllLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Smooth Horizontal Sliding Product Track */}
      <div className="relative">
        <div
          ref={trackRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((prod) => (
            <div
              key={prod.id}
              className="w-[80%] sm:w-[46.5%] md:w-[31.5%] lg:w-[23.6%] shrink-0 snap-start"
            >
              <ProductCard product={prod} />
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Pagination Dots & Slide Counter */}
      {totalSlides > 1 && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label={`${title} carousel pagination`}
            className="flex items-center gap-1.5"
          >
            {Array.from({ length: totalSlides }, (_, idx) => {
              const isCurrent = idx === activeSlide;
              return (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`Go to slide ${idx + 1} of ${totalSlides}`}
                  onClick={() => scrollToSlideIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isCurrent
                      ? 'w-7 bg-[#5B112B]'
                      : 'w-2 bg-[#D8C7B8] hover:bg-[#8C6D58]'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono tabular-nums">
            <span>
              Slide {activeSlide + 1} / {totalSlides} · {products.length} items
            </span>
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className="font-sans font-semibold text-[#7A1438] hover:underline cursor-pointer"
              >
                {viewAllLabel} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
