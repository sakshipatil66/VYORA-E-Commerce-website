import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Timer, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';

export const FlashSaleSection: React.FC = () => {
  const { products, setActivePage, setSelectedCategory } = useStore();

  const [timeLeft, setTimeLeft] = useState({
    hours: 4,
    minutes: 42,
    seconds: 18
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const flashProducts = products
    .filter((p) => p.isFlashSale || p.discountPercent >= 38)
    .slice(0, 4);

  return (
    <section className="bg-[#F5EDE4] border-y border-[#E5D7C9] vyora-section">
      <div className="vyora-container">
        {/* Header & Tabular Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 sm:mb-10"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 typo-eyebrow text-[#7A1438]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>Seasonal Guild Privileges</span>
              <span aria-hidden="true">·</span>
              <span>Up to 44% Off</span>
            </div>
            <h2 className="typo-h2 text-neutral-900 mt-1.5">
              Curator’s Limited Vault
            </h2>
            <p className="typo-body text-neutral-600 mt-1.5 max-w-xl">
              Small-batch allocations across Chanderi couture, Hyderabadi jhumkas, smart audio, and carved rosewood decor.
            </p>
          </div>

          {/* Tabular Countdown Clock */}
          <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 rounded-xl border border-[#E5D7C9] shadow-2xs shrink-0 self-start md:self-auto">
            <div className="flex items-center gap-1.5 typo-body-sm text-neutral-600 font-medium">
              <Timer className="w-4 h-4 text-[#7A1438]" />
              <span>Window closes in</span>
            </div>
            <div className="flex items-center gap-1.5 typo-tabular typo-body-sm font-bold text-[#380811]">
              <span className="bg-[#FAF7F5] border border-[#E8DDD3] px-2.5 py-1 rounded-md">
                {String(timeLeft.hours).padStart(2, '0')}h
              </span>
              <span className="text-[#8C6D58]">:</span>
              <span className="bg-[#FAF7F5] border border-[#E8DDD3] px-2.5 py-1 rounded-md">
                {String(timeLeft.minutes).padStart(2, '0')}m
              </span>
              <span className="text-[#8C6D58]">:</span>
              <span className="bg-[#FAF7F5] border border-[#E8DDD3] px-2.5 py-1 rounded-md">
                {String(timeLeft.seconds).padStart(2, '0')}s
              </span>
            </div>
          </div>
        </motion.div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {flashProducts.map((prod, idx) => (
            <motion.div
              key={prod.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.45, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProductCard product={prod} />
            </motion.div>
          ))}
        </div>

        {/* View All Offers CTA */}
        <div className="mt-10 text-center">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActivePage('offers');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 min-h-11 py-3 px-7 typo-btn text-[#380811] hover:text-white bg-white hover:bg-[#4A0E17] rounded-full border border-[#D8C7B8] hover:border-[#4A0E17] shadow-2xs transition-all duration-300 cursor-pointer"
          >
            <span>Explore All Festive Privileges & Coupons</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
