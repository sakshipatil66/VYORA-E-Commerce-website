import React from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, Quote, ArrowUpRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ReviewItem {
  id: string;
  name: string;
  city: string;
  department: string;
  productId: string;
  itemPurchased: string;
  rating: number;
  quote: string;
}

const REVIEWS: ReviewItem[] = [
  {
    id: 'rev-01',
    name: 'Radhika Sen-Gupta',
    city: 'Mumbai, Maharashtra, India',
    department: 'Fine Jewellery',
    productId: 'vyo-jewel-01',
    itemPurchased: 'Padmavati Royal Polki Choker Set',
    rating: 5,
    quote:
      'The uncut polki setting and emerald drops look indistinguishable from bespoke heirloom pieces in Jaipur. Arrived in a velvet-lined box within 48 hours.'
  },
  {
    id: 'rev-02',
    name: 'Vikram & Sunaina Oberoi',
    city: 'New Delhi, Delhi, India',
    department: 'Couture & Sarees',
    productId: 'vyo-fash-07',
    itemPurchased: 'Kashi Pure Katan Silk Banarasi Saree',
    rating: 5,
    quote:
      'The weight of the pure mulberry Katan silk, crisp kadhua zari weave, and official Silk Mark hologram exceeded every expectation for our reception.'
  },
  {
    id: 'rev-03',
    name: 'Dr. Ananya Nair',
    city: 'Bengaluru, Karnataka, India',
    department: 'Ayurveda & Beauty',
    productId: 'vyo-beauty-01',
    itemPurchased: 'Kumkumadi Tailam Saffron Glow Elixir',
    rating: 5,
    quote:
      'Authentic cold-pressed Ayurvedic formulation with real Pampore saffron strands and zero synthetic perfume. My skin luminosity transformed in two weeks.'
  },
  {
    id: 'rev-04',
    name: 'Rohan Deshmukh',
    city: 'Pune, Maharashtra, India',
    department: 'Electronics & Audio',
    productId: 'vyo-elec-01',
    itemPurchased: 'Acoustic Soul Teak Bluetooth Speaker',
    rating: 5,
    quote:
      'Rarely does an audio product double as architectural furniture. Warm, room-filling analog bass paired with tactile brass controls and seamless Bluetooth 5.3.'
  },
  {
    id: 'rev-05',
    name: 'Meenakshi Iyer',
    city: 'Chennai, Tamil Nadu, India',
    department: 'Living & Decor',
    productId: 'vyo-home-01',
    itemPurchased: 'Moradabad Hand-Hammered Brass Urli',
    rating: 5,
    quote:
      'Substantial, gleaming solid brass with intricate floral etchings. Filled with water and floating jasmine at our foyer, every guest asks where we found it.'
  },
  {
    id: 'rev-06',
    name: 'Kabir Malhotra',
    city: 'Hyderabad, Telangana, India',
    department: 'Footwear & Leather',
    productId: 'vyo-bags-01',
    itemPurchased: 'Royal Bengal Leather Duffle Bag',
    rating: 5,
    quote:
      'Supple full-grain vegetable-tanned leather and heavy solid brass zippers. Fits effortlessly in cabin overhead bins and ages beautifully with every trip.'
  }
];

export const CustomerReviews: React.FC = () => {
  const { openProductDetail } = useStore();

  return (
    <section className="vyora-container vyora-section">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center max-w-2xl mx-auto mb-10 sm:mb-12"
      >
        <p className="typo-eyebrow text-[#7A1438]">
          Patron Voices · 4.92 / 5.0 Average Rating
        </p>
        <h2 className="typo-h2 text-neutral-900 mt-1.5">
          Cherished Across All Twelve Pavilions
        </h2>
        <p className="typo-body text-neutral-600 mt-2">
          Verified reflections from over 48,000 patrons across 180 Indian cities experiencing VYORA’s multi-category marketplace.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {REVIEWS.map((review, idx) => (
          <motion.article
            key={review.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.45, delay: (idx % 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 sm:p-6 bg-white rounded-2xl border border-[#E8DDD3] hover:border-[#D4AF37]/60 shadow-2xs hover:shadow-lg flex flex-col justify-between relative transition-all duration-300"
          >
            <Quote className="w-8 h-8 text-[#5B112B]/10 absolute top-5 right-5 pointer-events-none" />

            <div className="space-y-3">
              {/* Rating & Verified Mark */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                  ))}
                </div>
                <div className="flex items-center gap-1 typo-meta text-emerald-800 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Patron</span>
                </div>
              </div>

              {/* Department Kicker */}
              <p className="typo-label text-[#8C6D58]">
                {review.department}
              </p>

              {/* Testimonial Quote */}
              <p className="typo-body text-neutral-700">
                “{review.quote}”
              </p>
            </div>

            {/* Patron Attribution & Linked Product */}
            <div className="pt-4 mt-5 border-t border-[#F3ECE7] flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="typo-body-sm font-semibold text-neutral-900">
                  {review.name}{' '}
                  <span className="font-normal text-neutral-500">· {review.city}</span>
                </p>
                <button
                  onClick={() => openProductDetail(review.productId)}
                  className="mt-1 inline-flex items-center gap-1 typo-meta font-semibold text-[#7A1438] hover:text-[#380811] transition-colors truncate max-w-full cursor-pointer"
                >
                  <span className="truncate underline underline-offset-2">
                    {review.itemPurchased}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
};
