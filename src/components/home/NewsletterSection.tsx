import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, Check, Copy } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const NewsletterSection: React.FC = () => {
  const { applyCoupon, addToast, setActivePage } = useStore();
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      addToast('Please enter a valid email address to unlock your welcome privilege.', 'warning');
      return;
    }
    setJoined(true);
    applyCoupon('FIRST500');
    setEmail('');
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('FIRST500').catch(() => {});
    }
    setCopied(true);
    applyCoupon('FIRST500');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="vyora-container pb-8 pt-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#F4EBE2] via-[#FAF5F0] to-[#EFE2D5] border border-[#DFCDBE] p-6 sm:p-10 lg:p-14 shadow-sm"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2 typo-eyebrow text-[#7A1438]">
              <Sparkles className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
              <span>The Vyora Inner Circle</span>
              <span aria-hidden="true">·</span>
              <span>Private Previews & Privileges</span>
            </div>

            <h2 className="typo-h2 text-[#2D0A11]">
              Receive ₹500 Off Your First Atelier Order
            </h2>

            <p className="typo-body text-[#5C493E] max-w-xl">
              Join our connoisseur dispatch for early access to seasonal Banarasi weaves, Jaipur jewellery drops, limited acoustic editions, and festive gifting privileges.
            </p>
          </div>

          <div className="lg:col-span-5">
            {joined ? (
              <div className="bg-white rounded-xl border border-[#D4AF37]/60 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 typo-body-sm font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Welcome to The Vyora Inner Circle — ₹500 Privilege Unlocked</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F5] border border-[#E6DBD1] rounded-lg px-3.5 py-2.5">
                  <div>
                    <span className="typo-label text-neutral-500 block">
                      Active Privilege Code
                    </span>
                    <span className="typo-tabular text-base font-bold text-[#4A0E17] tracking-wider">
                      FIRST500
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 min-h-9 py-1.5 px-3.5 rounded-md bg-[#4A0E17] hover:bg-[#2D0A11] text-white typo-btn-sm transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    <span>{copied ? 'Applied' : 'Copy & Apply'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    aria-label="Email address for newsletter"
                    className="flex-1 min-h-11 py-3 px-4 typo-input-bare bg-white border border-[#D8C7B8] rounded-full text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#7A1438]"
                  />
                  <button
                    type="submit"
                    className="min-h-11 py-3 px-6 typo-btn bg-[#4A0E17] hover:bg-[#2D0A11] text-[#FAF7F5] rounded-full transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
                  >
                    <span>Unlock ₹500 Off</span>
                    <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-2 typo-meta text-[#7A665A]">
                  <span>Instant code FIRST500 applied at checkout.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage('offers');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="font-semibold text-[#7A1438] hover:underline cursor-pointer"
                  >
                    View all 6 coupons →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
