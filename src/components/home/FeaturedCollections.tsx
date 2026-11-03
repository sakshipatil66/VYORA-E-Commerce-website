import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import heroRoyalCouture from '../../assets/images/hero_royal_couture_1793694603599.jpg';
import heroAcousticTech from '../../assets/images/hero_acoustic_tech_1793696284624.jpg';
import heroAyurvedaAtelier from '../../assets/images/hero_ayurveda_atelier_1793696297589.jpg';
import heroBrassLiving from '../../assets/images/hero_brass_living_1793694607275.jpg';

interface CollectionWorld {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  category: CategoryId;
  cta: string;
  spanClass: string;
}

const WORLDS: CollectionWorld[] = [
  {
    id: 'world-couture-bridal',
    eyebrow: 'Couture · Sarees · Bridal Jewels',
    title: 'The Royal Wedding & Ceremonial Wardrobe',
    description:
      'Kadhua Banarasi silks, raw silk sherwanis, Jaipur Polki chokers, and velvet bridal juttis curated for milestone celebrations.',
    image: heroRoyalCouture,
    category: 'fashion',
    cta: 'Shop Couture Edit',
    spanClass: 'lg:col-span-7 lg:row-span-2 min-h-[380px] lg:min-h-[520px]'
  },
  {
    id: 'world-acoustic-tech',
    eyebrow: 'Audio · Smartwatches · Desk Gear',
    title: 'Acoustic Wood & Precision Wearables',
    description:
      'Handcrafted walnut speakers, leather AMOLED chronographs, and MagSafe desk stations.',
    image: heroAcousticTech,
    category: 'electronics',
    cta: 'Explore Tech Atelier',
    spanClass: 'lg:col-span-5 min-h-[250px]'
  },
  {
    id: 'world-ayurveda-leather',
    eyebrow: 'Ayurveda · Niche Parfum · Travel Leather',
    title: 'Botanical Rituals & Fine Leather',
    description:
      '26-herb Kumkumadi elixirs, aged Assam oudh extraits, and full-grain weekender duffles.',
    image: heroAyurvedaAtelier,
    category: 'beauty',
    cta: 'Explore Apothecary',
    spanClass: 'lg:col-span-5 min-h-[250px]'
  },
  {
    id: 'world-sanctuary-living',
    eyebrow: 'Brass Decor · Handloom Dohars · Hampers',
    title: 'The Mindful Indian Sanctuary & Royal Gifting',
    description:
      'Moradabad solid brass urlis, carved Sheesham diffuser lamps, block-printed mulmul quilts, and heirloom festive trunks.',
    image: heroBrassLiving,
    category: 'home',
    cta: 'Shop Living & Gifting',
    spanClass: 'lg:col-span-12 min-h-[260px]'
  }
];

export const FeaturedCollections: React.FC = () => {
  const { setSelectedCategory, setSelectedSubCategory, setActivePage } = useStore();

  const handleOpenWorld = (cat: CategoryId) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(null);
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="vyora-container vyora-section">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 typo-eyebrow text-[#7A1438]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span>Signature Lookbooks</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Category Worlds</span>
          </div>
          <h2 className="typo-h2 text-neutral-900 mt-1.5">
            Featured Marketplace Collections
          </h2>
        </div>

        <button
          onClick={() => handleOpenWorld('all')}
          className="inline-flex items-center gap-1.5 typo-btn text-[#5B112B] hover:text-[#380811] group cursor-pointer self-start sm:self-auto"
        >
          <span className="underline underline-offset-4">Explore All Collections</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {WORLDS.map((world, idx) => (
          <motion.div
            key={world.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, delay: idx * 0.07, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => handleOpenWorld(world.category)}
            className={`group relative rounded-2xl overflow-hidden border border-[#E5D9CE] hover:border-[#D4AF37] shadow-sm hover:shadow-xl cursor-pointer flex items-end ${world.spanClass}`}
          >
            <img
              src={world.image}
              alt={world.title}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E040A]/92 via-[#1E040A]/45 to-transparent" />
            <div className="absolute inset-3 rounded-xl border border-[#D4AF37]/0 group-hover:border-[#D4AF37]/40 transition-colors duration-300 pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-8 max-w-2xl space-y-2">
              <p className="typo-eyebrow text-[#D4AF37]">
                {world.eyebrow}
              </p>
              <h3 className="typo-h3 text-white">
                {world.title}
              </h3>
              <p className="typo-body text-rose-100/85 line-clamp-2 max-w-xl">
                {world.description}
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-2 min-h-10 py-2 px-4 rounded-full bg-white/95 group-hover:bg-[#D4AF37] text-[#2A070F] typo-btn-sm transition-colors shadow-xs">
                  <span>{world.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
