import React, { useState } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Award,
  ArrowRight,
  Check,
  MapPin,
  Mail,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId } from '../../types';
import { formatLocationLabel } from '../../data/locations';

const POPULAR_PRODUCT_LINKS: { id: string; label: string }[] = [
  { id: 'vyo-fash-01', label: 'Kanjivaram Zari Crimson Bridal Saree' },
  { id: 'vyo-jewel-01', label: 'Maharani Uncut Polki Emerald Choker' },
  { id: 'vyo-beauty-01', label: '24K Swarna Kumkumadi Night Elixir' },
  { id: 'vyo-elec-01', label: 'Malhar Teak & Brass Bluetooth Speaker' },
  { id: 'vyo-foot-01', label: 'Zardozi Crimson Bridal Velvet Juttis' },
  { id: 'vyo-home-01', label: 'Moradabad Hand-Hammered Brass Urli' }
];

export const Footer: React.FC = () => {
  const {
    setActivePage,
    openCategoryPage,
    openProductDetail,
    applyCoupon,
    addToast,
    selectedLocation,
    requestLocationPicker,
    currentUser,
    openAuthModal
  } = useStore();

  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const activeLocationText = formatLocationLabel(selectedLocation);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      addToast('Please enter a valid email address to subscribe.', 'warning');
      return;
    }
    setSubscribed(true);
    applyCoupon('FIRST500');
    setEmailInput('');
  };

  const handleNav = (page: string, category?: CategoryId, subCategory?: string | null) => {
    if (category) {
      openCategoryPage(category, subCategory ?? null);
    } else {
      setActivePage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCollectionJump = (sectionId: string, fallbackCategory: CategoryId = 'all') => {
    setActivePage('home');
    window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        openCategoryPage(fallbackCategory, null);
      }
    }, 80);
  };

  const handleSocialClick = (channelName: string, handle: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(handle).catch(() => {});
    }
    addToast(`Official VYORA ${channelName} (${handle}) handle copied — Pune, Maharashtra, India.`);
  };

  return (
    <footer className="bg-[#1E040A] text-[#FAF6F2] border-t border-[#4A0E17] mt-12 sm:mt-16">
      {/* Top 4 Luxury Assurance Pillars */}
      <div className="border-b border-[#4A0E17]/80 bg-[#28060E]">
        <div className="vyora-container py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#4A0E17] border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#D4AF37]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="typo-h4 text-white">Certified Authenticity</h4>
              <p className="typo-body-sm text-rose-200/75 mt-1">
                Silk Mark, BIS 925, Ayush GMP & warranty backed across 12 categories
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#4A0E17] border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#D4AF37]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="typo-h4 text-white">Insured Express Dispatch</h4>
              <p className="typo-body-sm text-rose-200/75 mt-1">
                Priority hub in Pune, Maharashtra, India · Free shipping above ₹999
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#4A0E17] border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#D4AF37]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="typo-h4 text-white">7-Day Effortless Returns</h4>
              <p className="typo-body-sm text-rose-200/75 mt-1">
                Complimentary doorstep reverse pickup with swift source refund
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#4A0E17] border border-[#D4AF37]/35 flex items-center justify-center shrink-0 text-[#D4AF37]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="typo-h4 text-white">256-Bit Encrypted Checkout</h4>
              <p className="typo-body-sm text-rose-200/75 mt-1">
                Verified UPI, RuPay, Visa, Mastercard, NetBanking & Cash on Delivery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Luxury Newsletter & Private Dispatch Strip */}
      <div className="border-b border-[#4A0E17]/70 bg-gradient-to-r from-[#24050C] via-[#340914] to-[#24050C]">
        <div className="vyora-container py-8 sm:py-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-1.5 typo-eyebrow text-[#D4AF37]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VYORA Connoisseur Newsletter</span>
            </div>
            <h3 className="typo-h3 text-white">
              Join Our Private Dispatch & Unlock ₹500 Off (Code: FIRST500)
            </h3>
            <p className="typo-body-sm text-rose-100/75">
              Receive early invitations to seasonal Banarasi weaves, Polki jewellery drops, teak audio releases, and festive gifting privileges.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="w-full lg:w-[460px] flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Subscribe to VYORA newsletter"
              className="flex-1 min-h-11 py-2.5 px-4 typo-input-bare bg-[#1A0308] border border-[#6E1733] rounded-full text-white placeholder:text-rose-200/45 focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="min-h-11 py-2.5 px-6 typo-btn bg-[#D4AF37] hover:bg-[#C69F26] text-neutral-950 rounded-full transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              {subscribed ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              <span>{subscribed ? 'Subscribed' : 'Subscribe'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Multi-Column Footer */}
      <div className="vyora-container vyora-section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Column 1: Brand Identity, Pune Location & Social Channels (4 Cols) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-5">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-[#5B112B] to-[#380811] border border-[#D4AF37]/45 flex items-center justify-center text-[#D4AF37] font-serif text-xl font-bold transition-transform group-hover:scale-105">
                V
              </div>
              <div>
                <span className="font-serif text-2xl font-bold tracking-[0.06em] text-white block leading-none">
                  VYORA
                </span>
                <span className="typo-badge tracking-[0.18em] text-[#D4AF37] mt-1 block">
                  Modern Indian Marketplace
                </span>
              </div>
            </button>

            <p className="typo-body-sm text-rose-100/75 max-w-sm">
              India’s luxury multi-category marketplace celebrating certified handloom fashion, fine jewellery, Ayurvedic beauty, acoustic electronics, handcrafted footwear, home décor, bags, and royal gifting.
            </p>

            {/* Verified Location & Concierge Details */}
            <div className="space-y-2.5 typo-body-sm text-rose-100/85 bg-[#28060E] border border-[#4A0E17] rounded-xl p-4 max-w-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <span className="typo-label text-rose-200/60 block">
                      Marketplace Location
                    </span>
                    <span className="font-semibold text-white block mt-0.5">Pune, Maharashtra, India</span>
                    {activeLocationText !== 'Pune, Maharashtra, India' && (
                      <span className="typo-meta text-[#D4AF37] block mt-0.5">
                        Delivering to: {activeLocationText}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestLocationPicker}
                  className="typo-meta font-semibold text-[#D4AF37] hover:underline shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-[#4A0E17]/70">
                <Mail className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <button
                  type="button"
                  onClick={() => handleNav('contact')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  concierge@vyora.in
                </button>
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="space-y-2">
              <span className="typo-footer-heading text-rose-200/60 block">
                Follow VYORA
              </span>
              <div className="flex items-center gap-2.5">
                {/* Instagram */}
                <button
                  type="button"
                  aria-label="VYORA on Instagram"
                  onClick={() => handleSocialClick('Instagram', '@vyoraindia')}
                  className="w-9 h-9 rounded-full bg-[#2E0710] hover:bg-[#D4AF37] border border-[#5B112B] text-rose-100 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </button>

                {/* Pinterest */}
                <button
                  type="button"
                  aria-label="VYORA on Pinterest"
                  onClick={() => handleSocialClick('Pinterest', '@vyoramarketplace')}
                  className="w-9 h-9 rounded-full bg-[#2E0710] hover:bg-[#D4AF37] border border-[#5B112B] text-rose-100 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 20l4-9" />
                    <path d="M10.7 14c.437 1.263 1.43 2 2.55 2c2.071 0 3.75-1.554 3.75-4a5 5 0 1 0-9.7 1.7" />
                  </svg>
                </button>

                {/* YouTube */}
                <button
                  type="button"
                  aria-label="VYORA on YouTube"
                  onClick={() => handleSocialClick('YouTube', '@VyoraOfficial')}
                  className="w-9 h-9 rounded-full bg-[#2E0710] hover:bg-[#D4AF37] border border-[#5B112B] text-rose-100 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                    <path d="m10 15 5-3-5-3z" />
                  </svg>
                </button>

                {/* X */}
                <button
                  type="button"
                  aria-label="VYORA on X"
                  onClick={() => handleSocialClick('X', '@vyora_in')}
                  className="w-9 h-9 rounded-full bg-[#2E0710] hover:bg-[#D4AF37] border border-[#5B112B] text-rose-100 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  aria-label="VYORA on Facebook"
                  onClick={() => handleSocialClick('Facebook', 'fb.com/vyoraindia')}
                  className="w-9 h-9 rounded-full bg-[#2E0710] hover:bg-[#D4AF37] border border-[#5B112B] text-rose-100 hover:text-neutral-950 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Shop by Category (3 Cols) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h5 className="typo-footer-heading text-[#D4AF37]">
              Shop by Category
            </h5>
            <ul className="space-y-2.5 typo-footer-link text-rose-100/75">
              <li>
                <button type="button" onClick={() => handleNav('shop', 'fashion', '__women__')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Women’s Designer Fashion
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'fashion', "Men's Ethnic Wear")} className="hover:text-white transition-colors cursor-pointer text-left">
                  Men’s Royal Ethnic Wear
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'jewellery')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Fine & Heritage Jewellery
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'beauty')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Beauty, Skincare & Parfum
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'electronics')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Electronics, Audio & Wearables
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'footwear')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Handcrafted Footwear & Juttis
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'home')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Home Décor & Brass Living
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'bags')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Leather Bags & Bridal Clutches
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'toys')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Toys & Heritage Board Games
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'stationery')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Books, Fitness & Gourmet Pantry
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'gifting')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Royal Gift Hampers
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shop', 'all')} className="text-[#D4AF37] hover:text-amber-200 font-semibold transition-colors cursor-pointer text-left">
                  Explore All 12 Categories →
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Popular Products & Collections (3 Cols) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h5 className="typo-footer-heading text-[#D4AF37]">
              Popular & Collections
            </h5>
            <ul className="space-y-2.5 typo-footer-link text-rose-100/75">
              <li>
                <button
                  type="button"
                  onClick={() => handleCollectionJump('trending-products-section')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Trending Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleCollectionJump('best-sellers-section')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Best Sellers Across India
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleCollectionJump('new-arrivals-section')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  New Season Arrivals
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('offers')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Festive Offers & Privilege Codes
                </button>
              </li>
              <li className="pt-2.5 border-t border-[#4A0E17]/60">
                <span className="typo-label text-rose-200/55 block mb-1">
                  Signature Creations
                </span>
              </li>
              {POPULAR_PRODUCT_LINKS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openProductDetail(item.id)}
                    className="hover:text-white transition-colors cursor-pointer text-left line-clamp-1"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Customer Support, Company & Legal Policies (2 Cols) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h5 className="typo-footer-heading text-[#D4AF37]">
              Support & Policies
            </h5>
            <ul className="space-y-2.5 typo-footer-link text-rose-100/75">
              <li>
                <button type="button" onClick={() => handleNav('contact')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Customer Support
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('about')} className="hover:text-white transition-colors cursor-pointer text-left">
                  About Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('contact')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Contact Us
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('faq')} className="hover:text-white transition-colors cursor-pointer text-left">
                  FAQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('shipping')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Shipping and Delivery
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('returns')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Returns and Refunds
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('privacy')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('terms')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Terms and Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => (currentUser ? handleNav('profile') : openAuthModal('signin'))}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  {currentUser ? 'Customer Dashboard' : 'Sign In / Create Account'}
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('my_orders')} className="hover:text-white transition-colors cursor-pointer text-left">
                  My Orders & Tracking
                </button>
              </li>
              <li>
                <button type="button" onClick={() => handleNav('wishlist')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Saved Wishlist
                </button>
              </li>
              {currentUser?.role === 'admin' && (
                <li>
                  <button
                    type="button"
                    onClick={() => handleNav('admin')}
                    className="text-[#D4AF37] hover:text-amber-200 transition-colors font-semibold cursor-pointer text-left"
                  >
                    Store Admin
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright, Location & Payment Method Icons Bar */}
        <div className="pt-10 mt-12 border-t border-[#4A0E17]/80 flex flex-col lg:flex-row items-center justify-between gap-5 typo-body-sm text-rose-200/70">
          <div className="text-center lg:text-left space-y-1.5">
            <p className="text-rose-100/90 font-medium">
              © {new Date().getFullYear()} VYORA — Modern Indian Marketplace · Pune, Maharashtra, India. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 typo-meta text-rose-200/60">
              <button type="button" onClick={() => handleNav('privacy')} className="hover:text-white cursor-pointer">
                Privacy Policy
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => handleNav('terms')} className="hover:text-white cursor-pointer">
                Terms & Conditions
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => handleNav('shipping')} className="hover:text-white cursor-pointer">
                Shipping & Delivery
              </button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => handleNav('returns')} className="hover:text-white cursor-pointer">
                Returns & Refunds
              </button>
            </div>
          </div>

          {/* Payment Method Icons */}
          <div className="flex flex-wrap items-center justify-center gap-2 typo-meta">
            <span className="font-medium text-rose-200/80 mr-1">Accepted Payments:</span>

            {/* UPI */}
            <span className="inline-flex items-center gap-1.5 bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-white font-semibold">
              <span className="w-2 h-2 rounded-xs bg-emerald-400" aria-hidden="true" />
              UPI
            </span>

            {/* RuPay */}
            <span className="inline-flex items-center gap-1.5 bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-white font-semibold">
              <span className="w-2 h-2 rounded-xs bg-amber-400" aria-hidden="true" />
              RuPay
            </span>

            {/* Visa */}
            <span className="inline-flex items-center bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-white font-serif italic font-bold tracking-wider">
              VISA
            </span>

            {/* Mastercard */}
            <span className="inline-flex items-center gap-1.5 bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-white font-semibold">
              <span className="inline-flex -space-x-1" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
              </span>
              Mastercard
            </span>

            {/* NetBanking */}
            <span className="inline-flex items-center bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-rose-100 font-medium">
              NetBanking
            </span>

            {/* Cash on Delivery */}
            <span className="inline-flex items-center bg-[#2C0710] border border-[#5B112B] px-2.5 py-1 rounded-md text-[#D4AF37] font-semibold">
              COD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
