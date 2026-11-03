import React from 'react';
import { Award, ShieldCheck, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import aboutArtisanHands from '../../assets/images/about_artisan_hands_1793694632158.jpg';

export const AboutPage: React.FC = () => {
  const { setActivePage, setSelectedCategory } = useStore();

  return (
    <div className="vyora-container vyora-page max-w-5xl space-y-12">
      {/* Hero Narrative */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 typo-eyebrow text-[#7A1438]">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>The Maison & The Mission</span>
        </div>
        <h1 className="typo-h1 text-neutral-900">
          Crafting Contemporary Indian Luxury from Ancient Loom Roots
        </h1>
        <p className="typo-subtitle text-neutral-600">
          Headquartered in <strong className="font-semibold text-neutral-800">Pune, Maharashtra, India</strong>, VYORA was born out of a profound reverence for India’s living craft continuum — uniting generational weavers, filigree silversmiths, Ayurvedic botanists, acoustic engineers, and leather ateliers on one modern marketplace.
        </p>
      </div>

      {/* Visual Editorial Banner */}
      <div className="relative rounded-2xl overflow-hidden aspect-16/9 bg-[#2D0A11] border border-[#EBE4DD] shadow-lg">
        <img
          src={aboutArtisanHands}
          alt="Indian craftsmanship"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-5 sm:p-10">
          <div className="text-white max-w-lg">
            <span className="typo-eyebrow text-[#D4AF37]">Our Sacred Promise</span>
            <h3 className="typo-h2 text-white mt-1">
              Zero Imitations. 100% Certified Direct Artisan Hands.
            </h3>
          </div>
        </div>
      </div>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="typo-h3 text-neutral-900">
            Certified Purity
          </h3>
          <p className="typo-body text-neutral-600">
            Every raw silk saree carries the official Silk Mark of India. Every silver piece is BIS hallmarked 925, and all Ayurvedic serums carry Ministry of AYUSH GMP verification.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="typo-h3 text-neutral-900">
            Direct Weaver Dignity
          </h3>
          <p className="typo-body text-neutral-600">
            By eliminating up to 5 distributor markups, our artisan guilds earn up to 4× standard market wages, keeping younger generations inspired to continue their families&apos; ancestral looms.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="typo-h3 text-neutral-900">
            Conscious Packaging
          </h3>
          <p className="typo-body text-neutral-600">
            We use unbleached cotton muslin bags, natural cedar wood tags, and recyclable corrugated boxes crafted from post-consumer agricultural waste.
          </p>
        </div>
      </div>

      {/* Guild Clusters Map Description */}
      <div className="bg-[#FAF7F5] p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] space-y-4">
        <h3 className="typo-h3 text-neutral-900">
          Our Primary Maker Clusters Across India
        </h3>
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-4 gap-4 typo-body-sm">
          <div>
            <strong className="typo-card-title text-neutral-900 block">Varanasi, UP</strong>
            <span className="text-neutral-500">Katan silk, brocade, antique dabka</span>
          </div>
          <div>
            <strong className="typo-card-title text-neutral-900 block">Jaipur, Rajasthan</strong>
            <span className="text-neutral-500">Kundan polki jewelry, Bagru block prints</span>
          </div>
          <div>
            <strong className="typo-card-title text-neutral-900 block">Kannauj, UP</strong>
            <span className="text-neutral-500">Steam-distilled Damask rose attars</span>
          </div>
          <div>
            <strong className="typo-card-title text-neutral-900 block">Chanderi, MP</strong>
            <span className="text-neutral-500">Gossamer cotton-silk anarkalis</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-2">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setActivePage('shop');
          }}
          className="min-h-11 py-3 px-8 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <span>Explore The Curated Masterpieces</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </div>
  );
};
