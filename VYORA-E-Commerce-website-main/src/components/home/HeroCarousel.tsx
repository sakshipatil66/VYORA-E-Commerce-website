import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api, HomeBanner } from '../../lib/api';
import { CategoryId } from '../../types';
import heroRoyalCouture from '../../assets/images/hero_royal_couture_1793694603599.jpg';
import heroPolkiJewels from '../../assets/images/hero_polki_jewels_1793694605573.jpg';
import heroBrassLiving from '../../assets/images/hero_brass_living_1793694607275.jpg';
import heroAcousticTech from '../../assets/images/hero_acoustic_tech_1793696284624.jpg';
import heroAyurvedaAtelier from '../../assets/images/hero_ayurveda_atelier_1793696297589.jpg';

interface Slide {
  id: string;
  kicker: string;
  edition: string;
  title: string;
  subtitle: string;
  image: string;
  category: CategoryId;
  ctaText: string;
  secondaryCta: string;
  secondaryCategory: CategoryId;
}

const SLIDES: Slide[] = [
  {
    id: 'slide-01',
    kicker: 'Couture & Handloom Pavilion',
    edition: '2026 Grand Edit',
    title: 'The Royal Opulence of Varanasi & Rajputana',
    subtitle:
      'Pure Katan silk Banarasi sarees, hand-embroidered raw silk sherwanis, and gossamer organza lehengas woven by generational master looms.',
    image: heroRoyalCouture,
    category: 'fashion',
    ctaText: 'Explore Couture & Sarees',
    secondaryCta: 'Shop All 12 Departments',
    secondaryCategory: 'all'
  },
  {
    id: 'slide-02',
    kicker: 'Fine Jewellery & Bridal Vault',
    edition: 'Johari Bazaar Atelier',
    title: 'Uncut Polki, Emeralds & Temple Heirlooms',
    subtitle:
      'Hallmarked 925 sterling silver and 22K gold vermeil chokers, Navratna kadas, and baroque pearl jhumkas crafted with lifetime plating assurance.',
    image: heroPolkiJewels,
    category: 'jewellery',
    ctaText: 'Discover Fine Jewellery',
    secondaryCta: 'Bridal Potlis & Footwear',
    secondaryCategory: 'footwear'
  },
  {
    id: 'slide-03',
    kicker: 'Acoustic Tech & Timepieces',
    edition: 'Design Engineering',
    title: 'Warm Teak Acoustics & AMOLED Chronographs',
    subtitle:
      'Hand-finished walnut & spun-brass Bluetooth speakers, leather-strap smartwatches, MagSafe walnut chargers, and hybrid ANC audio.',
    image: heroAcousticTech,
    category: 'electronics',
    ctaText: 'Explore Electronics & Audio',
    secondaryCta: 'Leather Travel & Desk',
    secondaryCategory: 'bags'
  },
  {
    id: 'slide-04',
    kicker: 'Ayurveda, Parfum & Leather Craft',
    edition: 'Botanical Apothecary',
    title: 'Kashmiri Saffron Elixirs & Kannauj Oudh',
    subtitle:
      '26-herb Kumkumadi facial oils, copper-distilled Damask rose mists, aged Assam oudh extraits, and hand-burnished leather companions.',
    image: heroAyurvedaAtelier,
    category: 'beauty',
    ctaText: 'Shop Beauty & Perfumery',
    secondaryCta: 'Explore Gourmet Pantry',
    secondaryCategory: 'essentials'
  },
  {
    id: 'slide-05',
    kicker: 'Sanctuary Home & Gifting',
    edition: 'Artisanal Living',
    title: 'Hand-Hammered Brass & Block-Printed Linens',
    subtitle:
      'Moradabad solid peetal urlis, Sanganer mulmul cotton dohars, carved Sheesham diffuser lamps, and bespoke festive gift trunks.',
    image: heroBrassLiving,
    category: 'home',
    ctaText: 'Shop Home & Living',
    secondaryCta: 'Royal Gift Hampers',
    secondaryCategory: 'gifting'
  }
];

export const HeroCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [campaigns, setCampaigns] = useState<HomeBanner[]>([]);
  const { setActivePage, setSelectedCategory, setSelectedSubCategory } = useStore();

  useEffect(() => {
    api.homeBanners().then(({ banners }) => setCampaigns(banners)).catch(() => {});
  }, []);

  const slides = campaigns.length ? campaigns : SLIDES.map((slide) => ({ ...slide, active: true }));

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const slide = slides[current % slides.length];

  const handleCta = (cat: string) => {
    setSelectedCategory(cat as CategoryId);
    setSelectedSubCategory(null);
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden bg-[#22050B]"
    >
      {/* Main Hero Canvas */}
      <div className="relative min-h-[540px] sm:min-h-[600px] lg:min-h-[640px] flex items-center">
        {/* Crossfading Background Photography */}
        <AnimatePresence mode="sync">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1E040A]/92 via-[#2A0710]/72 to-[#1E040A]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E040A]/80 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Editorial Foreground Copy */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl space-y-5"
            >
              {/* Unboxed Editorial Kicker */}
              <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{slide.kicker}</span>
                <span aria-hidden="true" className="text-rose-200/50">
                  ·
                </span>
                <span className="text-rose-100/80">{slide.edition}</span>
              </div>

              {/* Serif Display Headline */}
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.5rem] font-bold text-white tracking-tight leading-[1.08] text-balance">
                {slide.title}
              </h1>

              {/* Gold Hairline Accent */}
              <div className="w-16 h-[1.5px] bg-gradient-to-r from-[#D4AF37] to-transparent" />

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-rose-100/85 leading-relaxed max-w-xl font-light">
                {slide.subtitle}
              </p>

              {/* Dual Functional CTAs */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  onClick={() => handleCta(slide.category)}
                  className="py-3.5 px-7 text-xs sm:text-sm font-semibold text-[#2A070F] bg-[#FAF7F5] hover:bg-[#D4AF37] hover:text-neutral-950 rounded-full transition-all duration-300 shadow-lg flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>{slide.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCta(slide.secondaryCategory)}
                  className="py-3.5 px-6 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-full transition-all duration-300 backdrop-blur-xs cursor-pointer"
                >
                  {slide.secondaryCta}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Interactive Slide Progress Indicators */}
          <div className="mt-12 sm:mt-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5" role="tablist" aria-label="Hero campaign slides">
              {slides.map((s, idx) => {
                const active = idx === current;
                return (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={active}
                    aria-label={`Slide ${idx + 1}: ${s.kicker}`}
                    onClick={() => setCurrent(idx)}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      active
                        ? 'w-10 bg-[#D4AF37]'
                        : 'w-2.5 bg-white/35 hover:bg-white/65'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
                aria-label="Previous campaign slide"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center border border-white/20 hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <span className="px-3 py-1 bg-black/35 backdrop-blur-xs rounded-full border border-white/15 text-[11px] text-rose-100 font-mono tabular-nums">
                0{current + 1} / 0{slides.length}
              </span>
              <button
                onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
                aria-label="Next campaign slide"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center border border-white/20 hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Marketplace Provenance Strip */}
      <div className="bg-[#180308] border-t border-[#4A0E17]/80 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs tabular-nums">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-rose-100/80">
              <strong className="text-white font-semibold">12 Curated Pavilions</strong> · 100% Authentic
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-rose-100/80">
              <strong className="text-white font-semibold">180+ Craft Clusters</strong> & Design Studios
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-rose-100/80">
              <strong className="text-white font-semibold">48-Hour Metro Air</strong> Express Dispatch
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="text-rose-100/80">
              <strong className="text-white font-semibold">4.92 / 5.0</strong> Verified Patron Score
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
