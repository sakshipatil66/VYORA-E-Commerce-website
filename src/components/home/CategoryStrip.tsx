import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import { ProductImage } from '../common/ProductImage';

interface CategoryItem {
  id: CategoryId;
  name: string;
  subtitle: string;
  count: string;
  image: string;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'fashion',
    name: 'Couture & Fashion',
    subtitle: 'Sarees, Sherwanis & Lehengas',
    count: '1,420+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/1224/2138/products/RoohiRS0002RedPureKatanSilkShikaargahSaree19.jpg?width=1200'
  },
  {
    id: 'jewellery',
    name: 'Fine Jewellery',
    subtitle: 'Polki, Kadas & Moissanite',
    count: '860+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0971/4060/5203/files/DSCF0577.webp?width=1200'
  },
  {
    id: 'beauty',
    name: 'Ayurveda & Beauty',
    subtitle: 'Elixirs, Mists & Niche Oudh',
    count: '340+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0618/3246/2410/files/1SADHEV_Aloe_Vera_and_Saffron_Gel_with_Kumkumadi_Tailam1.jpg?width=1200'
  },
  {
    id: 'electronics',
    name: 'Electronics & Audio',
    subtitle: 'Speakers, Watches & ANC',
    count: '240+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0916/7034/8143/files/Get-Together-2-XL_3__32069__45611__33782.jpg?width=1200'
  },
  {
    id: 'home',
    name: 'Living & Decor',
    subtitle: 'Brass Urlis, Dohars & Lamps',
    count: '720+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0030/9759/1872/products/EL-003-194_B.jpg?width=1200'
  },
  {
    id: 'footwear',
    name: 'Artisan Footwear',
    subtitle: 'Mojaris, Juttis & Block Heels',
    count: '490+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0467/1573/2136/files/2_71738d72-8925-4a8d-bb9c-42eb2d16ceff.jpg?width=1200'
  },
  {
    id: 'bags',
    name: 'Bags & Luggage',
    subtitle: 'Leather Duffles & Zari Potlis',
    count: '310+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0467/1573/2136/files/DSC0035.jpg?width=1200'
  },
  {
    id: 'toys',
    name: 'Toys & Games',
    subtitle: 'Channapatna & Sheesham Chess',
    count: '190+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0276/7139/6412/files/snugglestacking7.png?width=1200'
  },
  {
    id: 'stationery',
    name: 'Books & Stationery',
    subtitle: 'Hand-Bound Khadi Journals',
    count: '160+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0593/5706/9369/files/Pocket-Journal-Navy-Blue-front.jpg?width=1200'
  },
  {
    id: 'fitness',
    name: 'Sports & Fitness',
    subtitle: 'Organic Cork Yoga Gear',
    count: '140+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0615/5606/4462/files/1_cf434c31-3d40-4fee-9d35-f12d9f5257e8.jpg?width=1200'
  },
  {
    id: 'essentials',
    name: 'Gourmet Pantry',
    subtitle: 'Mongra Saffron & A2 Ghee',
    count: '280+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/2598/1404/files/AshwagandhaGheeFOP.jpg?width=1200'
  },
  {
    id: 'gifting',
    name: 'Gifts & Hampers',
    subtitle: 'Royal Brass Keepsake Trunks',
    count: '220+ Creations',
    image: 'https://cdn.shopify.com/s/files/1/0017/0639/3644/files/Pro-CaptureOne0129copy2.webp?width=1200'
  }
];

export const CategoryStrip: React.FC = () => {
  const { openCategoryPage } = useStore();

  const handleSelect = (catId: CategoryId, subCat: string | null = null) => {
    openCategoryPage(catId, subCat);
  };

  return (
    <section className="vyora-container vyora-section">
      {/* Editorial Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
      >
        <div>
          <p className="typo-eyebrow text-[#7A1438]">
            Twelve Curated Pavilions
          </p>
          <h2 className="typo-h2 text-neutral-900 mt-1.5">
            Explore by Category
          </h2>
          <p className="typo-body text-neutral-600 mt-1.5 max-w-xl">
            From women’s & men’s designer couture and fine jewellery to acoustic electronics, pure skincare, footwear, and home décor.
          </p>
        </div>

        <button
          onClick={() => handleSelect('all')}
          className="inline-flex items-center gap-1.5 typo-btn text-[#5B112B] hover:text-[#380811] group cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <span className="underline underline-offset-4">Browse Complete Catalog</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>

      {/* Quick Spotlight Category Buttons (Women, Men, Jewellery, Electronics, Beauty, Footwear, Home Decor) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-5">
        {[
          { label: 'Women’s Fashion', cat: 'fashion' as CategoryId, sub: '__women__' },
          { label: 'Men’s Ethnic', cat: 'fashion' as CategoryId, sub: "Men's Ethnic Wear" },
          { label: 'Jewellery', cat: 'jewellery' as CategoryId, sub: null },
          { label: 'Electronics', cat: 'electronics' as CategoryId, sub: null },
          { label: 'Beauty & Skincare', cat: 'beauty' as CategoryId, sub: null },
          { label: 'Footwear', cat: 'footwear' as CategoryId, sub: null },
          { label: 'Home Decor', cat: 'home' as CategoryId, sub: null }
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => handleSelect(btn.cat, btn.sub)}
            className="min-h-10 py-2 px-4 rounded-full bg-white hover:bg-[#4A0E17] text-[#380811] hover:text-white border border-[#DFD2C5] typo-btn-sm whitespace-nowrap shrink-0 transition-colors shadow-2xs cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Rich Portrait Image Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-5">
        {CATEGORIES.map((cat, idx) => (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: (idx % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => handleSelect(cat.id)}
            className="group relative aspect-3/4 rounded-xl overflow-hidden bg-[#EFE6DD] border border-[#E5D9CE] hover:border-[#D4AF37] shadow-2xs hover:shadow-xl transition-all duration-300 text-left cursor-pointer"
          >
            {/* Category Photography */}
            <ProductImage
              src={cat.image}
              alt={cat.name}
              category={cat.id}
              loading="lazy"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-108"
            />

            {/* Measured Bottom Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E040A]/92 via-[#1E040A]/35 to-transparent transition-opacity duration-300" />

            {/* Subtle Inner Gold Frame on Hover */}
            <div className="absolute inset-2 rounded-lg border border-[#D4AF37]/0 group-hover:border-[#D4AF37]/45 transition-colors duration-300 pointer-events-none" />

            {/* Category Title & Count */}
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 flex flex-col justify-end">
              <span className="typo-badge text-[#D4AF37] typo-tabular">
                {cat.count}
              </span>
              <h3 className="font-serif text-base sm:text-lg font-bold text-white leading-snug mt-0.5">
                {cat.name}
              </h3>
              <p className="typo-meta text-rose-100/80 line-clamp-1 mt-0.5">
                {cat.subtitle}
              </p>
              <div className="mt-2 inline-flex items-center gap-1 typo-meta font-semibold text-[#D4AF37] opacity-90 group-hover:opacity-100 transition-all">
                <span>Explore</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};
