import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Award } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import editorialSilkLoom from '../../assets/images/editorial_silk_loom_1793694607835.jpg';
import aboutArtisanHands from '../../assets/images/about_artisan_hands_1793694632158.jpg';

const MILESTONES = [
  { value: '12', label: 'Curated Lifestyle Pavilions' },
  { value: '180+', label: 'Indian Craft & Design Guilds' },
  { value: '48,000+', label: 'Verified Patrons Nationwide' },
  { value: '100%', label: 'Direct-from-Maker Provenance' }
];

export const EditorialSection: React.FC = () => {
  const { setActivePage, setSelectedCategory, setSelectedSubCategory } = useStore();

  const handleShopAll = () => {
    setSelectedCategory('all');
    setSelectedSubCategory(null);
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReadStory = () => {
    setActivePage('about');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#380811] text-white rounded-2xl overflow-hidden shadow-2xl border border-[#D4AF37]/30"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Editorial Visual Collage (5 Cols) */}
          <div className="lg:col-span-5 relative min-h-[380px] lg:min-h-[560px] bg-[#22050B]">
            <img
              src={editorialSilkLoom}
              alt="Master Indian craftsperson weaving silk brocade"
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#22050B]/90 via-transparent to-transparent" />

            {/* Secondary Framed Craft Inset */}
            <div className="hidden sm:block absolute bottom-5 right-5 w-44 rounded-xl overflow-hidden border-2 border-[#D4AF37]/60 shadow-2xl bg-[#22050B]">
              <img
                src={aboutArtisanHands}
                alt="Fine metalwork and detail craftsmanship"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-28 object-cover"
              />
              <div className="px-3 py-2 bg-[#22050B]/95 text-[10px] text-rose-100/90 leading-snug">
                <span className="text-[#D4AF37] font-semibold block">Zero Middlemen</span>
                Direct from 180+ ateliers
              </div>
            </div>

            <div className="absolute bottom-5 left-5 sm:max-w-[210px] bg-black/45 backdrop-blur-xs px-3.5 py-2.5 rounded-lg text-xs text-rose-100 border border-white/15">
              <span className="font-semibold text-[#D4AF37] block">Living Provenance</span>
              Varanasi · Jaipur · Moradabad · Kannauj · Bengaluru
            </div>
          </div>

          {/* Right Brand Storytelling & Marketplace Milestones (7 Cols) */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-14 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>The Maison Philosophy</span>
                <span aria-hidden="true">·</span>
                <span>Every Creation Tells A Story</span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white leading-[1.12]">
                Crafted Across India, Curated For Modern Connoisseurs
              </h2>

              <div className="w-16 h-[1.5px] bg-gradient-to-r from-[#D4AF37] to-transparent" />

              <p className="text-sm sm:text-base text-rose-100/85 leading-relaxed font-light">
                VYORA brings together India’s finest master guilds and contemporary design studios under one roof—spanning Silk Mark Banarasi couture, Johari Bazaar fine jewellery, Kottakkal Ayurvedic elixirs, teakwood acoustic engineering, Jodhpur leather footwear, and solid Moradabad brassware.
              </p>

              <p className="text-xs sm:text-sm text-rose-200/75 leading-relaxed font-light">
                Every creation undergoes strict material verification and ships directly from certified ateliers in tamper-evident luxury packaging, ensuring fair maker remuneration without multi-tier distributor markups.
              </p>

              {/* 4 Quantitative Marketplace Counters */}
              <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3.5 tabular-nums">
                {MILESTONES.map((item) => (
                  <div
                    key={item.label}
                    className="p-3.5 bg-[#4D0F21]/65 rounded-xl border border-[#D4AF37]/25"
                  >
                    <span className="block font-serif text-xl sm:text-2xl font-bold text-[#D4AF37]">
                      {item.value}
                    </span>
                    <span className="block text-[11px] text-rose-100/80 mt-1 leading-snug">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={handleReadStory}
                className="py-3.5 px-6 text-xs sm:text-sm font-semibold text-[#2A070F] bg-[#FAF7F5] hover:bg-[#D4AF37] rounded-full transition-colors flex items-center gap-2 shadow-md cursor-pointer"
              >
                <span>Read Our Marketplace Story</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleShopAll}
                className="py-3.5 px-6 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-full transition-colors cursor-pointer"
              >
                Explore All 12 Departments
              </button>

              <div className="hidden xl:flex items-center gap-1.5 text-xs text-rose-200/80 ml-auto">
                <Award className="w-4 h-4 text-[#D4AF37]" />
                <span>GI, Silk Mark & Hallmarked Certified</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};
