import React, { useEffect, useState } from 'react';
import { Award, ShieldCheck, HeartHandshake, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api, BrandStoryContent } from '../../lib/api';
import { useCmsContent } from '../../hooks/useCmsContent';
import aboutArtisanHands from '../../assets/images/about_artisan_hands_1793694632158.jpg';

export const AboutPage: React.FC = () => {
  const { setActivePage, setSelectedCategory } = useStore();
  const cmsContent = useCmsContent();
  const [brandStory, setBrandStory] = useState<BrandStoryContent | null>(null);

  useEffect(() => {
    let active = true;
    api.publicBrandStory().then(({ story }) => { if (active) setBrandStory(story); }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Hero Narrative */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{cmsContent?.about.eyebrow || 'The Maison & The Mission'}</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-neutral-900 leading-tight">
          {cmsContent?.about.title || brandStory?.title || 'Crafting Contemporary Indian Luxury from Ancient Loom Roots'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed font-light">
          {brandStory?.introduction || cmsContent?.about.description || 'Headquartered in Pune, Maharashtra, India, VYORA was born out of a profound reverence for India’s living craft continuum — uniting generational makers on one modern marketplace.'}
        </p>
      </div>

      {brandStory && (brandStory.mission || brandStory.vision || brandStory.values.length > 0 || brandStory.milestones.length > 0) && <section className="space-y-8 rounded-2xl border border-[#EBE4DD] bg-[#FAF7F5] p-5 sm:p-8">
        {(brandStory.mission || brandStory.vision) && <div className="grid gap-4 md:grid-cols-2">{brandStory.mission && <article className="rounded-xl border border-[#EBE4DD] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9A7652]">Our mission</p><p className="mt-2 text-sm leading-6 text-neutral-700">{brandStory.mission}</p></article>}{brandStory.vision && <article className="rounded-xl border border-[#EBE4DD] bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9A7652]">Our vision</p><p className="mt-2 text-sm leading-6 text-neutral-700">{brandStory.vision}</p></article>}</div>}
        {brandStory.values.length > 0 && <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9A7652]">Values we carry</p><div className="mt-3 flex flex-wrap gap-2">{brandStory.values.map((value) => <span key={value} className="rounded-full border border-[#decdb4] bg-white px-3 py-2 text-xs font-medium text-[#54353a]">{value}</span>)}</div></div>}
        {brandStory.milestones.length > 0 && <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#9A7652]">Our journey</p><div className="mt-4 space-y-4 border-l border-[#C5A46D] pl-5">{brandStory.milestones.map((milestone) => <article key={milestone.id} className="relative grid gap-3 sm:grid-cols-[72px_1fr]"><span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full border-2 border-[#FAF7F5] bg-[#8A5D32]"/><p className="font-serif text-sm font-semibold text-[#6D3D40]">{milestone.year}</p><div>{milestone.image && <img src={milestone.image} alt={milestone.imageAlt || milestone.title} loading="lazy" className="mb-3 max-h-56 w-full rounded-xl object-cover"/>}<h3 className="font-serif text-lg font-semibold text-neutral-900">{milestone.title}</h3><p className="mt-1 text-sm leading-6 text-neutral-600">{milestone.description}</p></div></article>)}</div></div>}
      </section>}

      {/* Visual Editorial Banner */}
      <div className="relative rounded-2xl overflow-hidden aspect-16/9 bg-[#2D0A11] border border-[#EBE4DD] shadow-lg">
        <img
          src={aboutArtisanHands}
          alt="Indian craftsmanship"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 sm:p-10">
          <div className="text-white max-w-lg">
            <span className="text-xs uppercase font-bold text-[#D4AF37] tracking-wider">{cmsContent?.about.promiseTitle || 'Our Sacred Promise'}</span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold mt-1">
              {cmsContent?.about.promiseDescription || 'Zero Imitations. 100% Certified Direct Artisan Hands.'}
            </h3>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-neutral-900">
            Certified Purity
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed font-light">
            Every raw silk saree carries the official Silk Mark of India. Every silver piece is BIS hallmarked 925, and all Ayurvedic serums carry Ministry of AYUSH GMP verification.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-neutral-900">
            Direct Weaver Dignity
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed font-light">
            By eliminating up to 5 distributor markups, our artisan guilds earn up to 4× standard market wages, keeping younger generations inspired to continue their families' ancestral looms.
          </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs space-y-3">
          <div className="w-10 h-10 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-neutral-900">
            Conscious Packaging
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed font-light">
            We use unbleached cotton muslin bags, natural cedar wood tags, and recyclable corrugated boxes crafted from post-consumer agricultural waste.
          </p>
        </div>
      </div>

      {/* Guild Clusters Map Description */}
      <div className="bg-[#FAF7F5] p-8 rounded-2xl border border-[#EBE4DD] space-y-4">
        <h3 className="font-serif text-xl font-bold text-neutral-900">
          Our Primary Maker Clusters Across India
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <strong className="text-neutral-900 block font-sans">Varanasi, UP</strong>
            <span className="text-neutral-500">Katan silk, brocade, antique dabka</span>
          </div>
          <div>
            <strong className="text-neutral-900 block font-sans">Jaipur, Rajasthan</strong>
            <span className="text-neutral-500">Kundan polki jewelry, Bagru block prints</span>
          </div>
          <div>
            <strong className="text-neutral-900 block font-sans">Kannauj, UP</strong>
            <span className="text-neutral-500">Steam-distilled Damask rose attars</span>
          </div>
          <div>
            <strong className="text-neutral-900 block font-sans">Chanderi, MP</strong>
            <span className="text-neutral-500">Gossamer cotton-silk anarkalis</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setActivePage('shop');
          }}
          className="py-3 px-8 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors inline-flex items-center gap-2 shadow-xs"
        >
          <span>Explore The Curated Masterpieces</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
