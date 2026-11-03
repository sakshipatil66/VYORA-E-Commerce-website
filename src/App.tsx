import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AnnouncementBar } from './components/common/AnnouncementBar';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { SearchModal } from './components/common/SearchModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { ProtectedRouteGate } from './components/auth/ProtectedRouteGate';
import { QuickViewModal } from './components/common/QuickViewModal';
import { CompareDrawer } from './components/common/CompareDrawer';
import { ProductCarousel } from './components/common/ProductCarousel';

// Home sections
import { HeroCarousel } from './components/home/HeroCarousel';
import { MarqueeBanner } from './components/home/MarqueeBanner';
import { CategoryStrip } from './components/home/CategoryStrip';
import { FeaturedCollections } from './components/home/FeaturedCollections';
import { FlashSaleSection } from './components/home/FlashSaleSection';
import { EditorialSection } from './components/home/EditorialSection';
import { CustomerReviews } from './components/home/CustomerReviews';
import { NewsletterSection } from './components/home/NewsletterSection';

// Pages
import { ShopPage } from './components/shop/ShopPage';
import { SearchResultsPage } from './components/shop/SearchResultsPage';
import { ProductDetailPage } from './components/pdp/ProductDetailPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { OrderConfirmationPage } from './components/orders/OrderConfirmationPage';
import { OrderTrackingPage } from './components/orders/OrderTrackingPage';
import { MyOrdersPage } from './components/orders/MyOrdersPage';
import { WishlistPage } from './components/shop/WishlistPage';
import { UserProfilePage } from './components/account/UserProfilePage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OffersPage } from './components/info/OffersPage';
import { AboutPage } from './components/info/AboutPage';
import { ContactPage } from './components/info/ContactPage';
import { FAQPage } from './components/info/FAQPage';
import { PolicyPage } from './components/info/PolicyPage';

import { Sparkles, X, Gift, Tag, MapPin, Truck, ArrowRight } from 'lucide-react';
import { CategoryId, Product } from './types';
import { CATEGORY_METADATA, ORDERED_CATEGORIES } from './data/categories';
import { formatEstimatedDate, formatLocationLabel } from './data/locations';

type TrendingTabId = 'all' | 'fashion' | 'jewellery' | 'beauty' | 'electronics' | 'lifestyle';

const TRENDING_TABS: { id: TrendingTabId; label: string; targetCat: CategoryId }[] = [
  { id: 'all', label: 'All Signature Picks', targetCat: 'all' },
  { id: 'fashion', label: 'Couture & Sarees', targetCat: 'fashion' },
  { id: 'jewellery', label: 'Fine Jewellery', targetCat: 'jewellery' },
  { id: 'beauty', label: 'Ayurveda & Parfum', targetCat: 'beauty' },
  { id: 'electronics', label: 'Audio & Wearables', targetCat: 'electronics' },
  { id: 'lifestyle', label: 'Home, Footwear & Bags', targetCat: 'home' }
];

const SECONDARY_MARQUEE_ITEMS = [
  'Silk Mark India Certified',
  'BIS 925 Hallmarked Silver',
  'Ayush GMP Botanicals',
  'Bluetooth 5.3 Teak Acoustics',
  'Jodhpur Hand-Sewn Leather',
  'Pune, Maharashtra, India Priority Dispatch',
  '7-Day Doorstep Reverse Pickup'
];

type CategoryCarouselTab = 'all' | 'bestsellers' | 'new';

const CategoryProductSlidesBlock: React.FC<{
  categoryId: CategoryId;
  products: Product[];
  index: number;
  onViewAll: (catId: CategoryId) => void;
}> = ({ categoryId, products, index, onViewAll }) => {
  const [subTab, setSubTab] = useState<CategoryCarouselTab>('all');
  const meta = CATEGORY_METADATA[categoryId];

  // Strictly scoped to this single category — never mixes unrelated products!
  const categoryItems = useMemo(
    () => products.filter((p) => p.category === categoryId),
    [products, categoryId]
  );

  const displayedCategoryItems = useMemo(() => {
    if (subTab === 'bestsellers') {
      return [...categoryItems].sort(
        (a, b) =>
          (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0) ||
          b.reviewCount - a.reviewCount ||
          b.rating - a.rating
      );
    }
    if (subTab === 'new') {
      return [...categoryItems].sort(
        (a, b) =>
          (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0) ||
          (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
          b.id.localeCompare(a.id)
      );
    }
    return categoryItems;
  }, [categoryItems, subTab]);

  if (categoryItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <ProductCarousel
        eyebrow={`${String(index + 1).padStart(2, '0')} · ${meta.eyebrow}`}
        title={meta.label}
        subtitle={meta.description}
        products={displayedCategoryItems}
        onViewAll={() => onViewAll(categoryId)}
        viewAllLabel={`View All ${meta.shortLabel} (${categoryItems.length})`}
        bgVariant={index % 2 === 0 ? 'card' : 'ivory'}
        compactHeader
        headerRightExtra={
          <div className="flex items-center gap-1 bg-[#EFE6DD] p-1 rounded-full overflow-x-auto no-scrollbar max-w-full">
            {(
              [
                { id: 'all', label: `All (${categoryItems.length})` },
                { id: 'bestsellers', label: 'Best Sellers' },
                { id: 'new', label: 'New & Featured' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`py-1.5 px-3 rounded-full typo-meta font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  subTab === t.id
                    ? 'bg-white text-[#4A0E17] shadow-2xs'
                    : 'text-[#5C493E] hover:text-[#2D0A11]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />
    </motion.div>
  );
};

const HomePageContent: React.FC = () => {
  const {
    products,
    setActivePage,
    openCategoryPage,
    recentlyViewedIds,
    applyCoupon,
    selectedLocation,
    requestLocationPicker
  } = useStore();
  const [activeTab, setActiveTab] = useState<TrendingTabId>('all');

  // 1. Trending Products (Multi-slide carousel)
  const trendingShowcase = useMemo(() => {
    if (activeTab === 'all') {
      const trending = products.filter((p) => p.isTrending);
      return trending.length >= 12 ? trending.slice(0, 16) : products.slice(0, 16);
    }
    if (activeTab === 'lifestyle') {
      return products.filter((p) =>
        ['home', 'footwear', 'bags', 'gifting', 'fitness'].includes(p.category)
      );
    }
    return products.filter((p) => p.category === activeTab);
  }, [products, activeTab]);

  // 2. Best Sellers (Multi-slide carousel)
  const bestSellersShowcase = useMemo(() => {
    return [...products]
      .filter((p) => p.isBestseller)
      .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating)
      .slice(0, 16);
  }, [products]);

  // 3. New Arrivals (Multi-slide carousel)
  const newArrivalsShowcase = useMemo(() => {
    return products.filter((p) => p.isNewArrival).slice(0, 16);
  }, [products]);

  // 4. Featured Products (Multi-slide carousel)
  const featuredProductsShowcase = useMemo(() => {
    return products.filter((p) => p.featured).slice(0, 16);
  }, [products]);

  // 5. Recommended Products (Multi-slide carousel across diverse categories)
  const recommendedProductsShowcase = useMemo(() => {
    const byRating = [...products]
      .filter((p) => !p.isFlashSale)
      .sort((a, b) => b.rating - a.rating || a.discountPrice - b.discountPrice);
    return byRating.slice(0, 16);
  }, [products]);

  const recentProducts = products.filter((p) => recentlyViewedIds.includes(p.id)).slice(0, 8);

  const navigateToCategory = (cat: CategoryId) => {
    openCategoryPage(cat, null);
  };

  const currentTabConfig = TRENDING_TABS.find((t) => t.id === activeTab) || TRENDING_TABS[0];
  const locationLabel = formatLocationLabel(selectedLocation);
  const estDate = formatEstimatedDate(selectedLocation.expressDays);

  return (
    <div>
      {/* 1. Multi-Category Luxury Campaign Hero */}
      <HeroCarousel />

      {/* 2. Scrolling Luxury Craftsmanship Marquee */}
      <MarqueeBanner variant="dark" />

      {/* 3. Image-Based Twelve Pavilions Category Showcase */}
      <CategoryStrip />

      {/* 4. Pune, Maharashtra, India Priority Dispatch & Delivery Assurance Strip */}
      <section className="vyora-container pt-2 pb-8">
        <div className="rounded-2xl bg-gradient-to-r from-[#FAF2EB] via-white to-[#FAF2EB] border border-[#E2D3C5] p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#4A0E17] text-[#D4AF37] flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 typo-meta text-neutral-600">
                <span className="typo-label text-[#7A1438]">
                  Active Shopping & Delivery Location
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                  <Truck className="w-3.5 h-3.5" />
                  Priority Dispatch by {estDate}
                </span>
              </div>
              <p className="typo-h3 text-neutral-900 mt-0.5">
                {locationLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={requestLocationPicker}
              className="min-h-10 py-2 px-4 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn-sm transition-colors cursor-pointer"
            >
              Change Location
            </button>
            <button
              type="button"
              onClick={() => navigateToCategory('all')}
              className="inline-flex items-center gap-1.5 min-h-10 py-2 px-4 rounded-full bg-white hover:bg-[#F3ECE7] text-[#380811] border border-[#D8C7B8] typo-btn-sm transition-colors cursor-pointer"
            >
              <span>Shop All {products.length} Creations</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#7A1438]" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Multi-Slide Carousel 1: Trending Products */}
      <section
        id="trending-products-section"
        className="scroll-mt-24 vyora-container vyora-section-sm border-t border-[#EAE0D6]"
      >
        <ProductCarousel
          eyebrow="Patron Favorites · Trending Across India"
          title="Trending Products"
          subtitle="Smoothly slide across multi-category creations trending right now — hover any card to view its secondary angle."
          products={trendingShowcase}
          onViewAll={() => navigateToCategory(currentTabConfig.targetCat)}
          viewAllLabel={
            activeTab === 'all' ? 'View All Trending' : `View All ${currentTabConfig.label}`
          }
          headerRightExtra={
            <div
              role="tablist"
              aria-label="Filter trending creations by department"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 max-w-full"
            >
              {TRENDING_TABS.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-h-9 py-1.5 px-3.5 rounded-full typo-btn-sm whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#4A0E17] text-[#FAF7F5] shadow-2xs'
                        : 'bg-[#F2EAE2] text-[#4A3E39] hover:bg-[#E7DBD0]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          }
        />
      </section>

      {/* 6. Multi-Slide Carousel 2: Best Sellers */}
      <section
        id="best-sellers-section"
        className="scroll-mt-24 vyora-container vyora-section-sm border-t border-[#EAE0D6]"
      >
        <ProductCarousel
          eyebrow="Most Acclaimed · Highest Patron Reviews"
          title="Best Sellers"
          subtitle="Our highest-rated sarees, Polki chokers, Kumkumadi elixirs, teak speakers, and handcrafted juttis."
          products={bestSellersShowcase}
          onViewAll={() => navigateToCategory('all')}
          viewAllLabel="View All Best Sellers"
          bgVariant="card"
        />
      </section>

      {/* 7. Asymmetric Multi-Category Featured Collections Lookbook */}
      <FeaturedCollections />

      {/* 8. Multi-Slide Carousel 3: Featured Products */}
      <section
        id="featured-products-section"
        className="scroll-mt-24 vyora-container vyora-section-sm border-t border-[#EAE0D6]"
      >
        <ProductCarousel
          eyebrow="Curator’s Spotlight · Signature Editions"
          title="Featured Products"
          subtitle="Handpicked flagship creations showcasing authentic craftsmanship across fashion, jewellery, tech, and home."
          products={featuredProductsShowcase}
          onViewAll={() => navigateToCategory('all')}
          viewAllLabel="View All Featured"
          bgVariant="ivory"
        />
      </section>

      {/* 9. Curator's Seasonal Vault (Limited Drops) */}
      <FlashSaleSection />

      {/* 10. Shop Every Category — Dedicated Multi-Slide Carousels for All 12 Categories */}
      <section className="vyora-container vyora-section space-y-8 border-t border-[#EAE0D6]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 typo-eyebrow text-[#7A1438]">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>12 Curated Marketplace Pavilions · Multi-Slide Showcases</span>
            </div>
            <h2 className="typo-h2 text-neutral-900">
              Explore Every Category Slide-by-Slide
            </h2>
            <p className="typo-body text-neutral-600">
              Every department below features multiple horizontal product slides strictly belonging to that category, complete with navigation arrows, pagination dots, and a direct View All page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateToCategory('all')}
            className="inline-flex items-center gap-2 min-h-11 py-2.5 px-5 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>Open Complete {products.length}-Item Catalog</span>
            <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
          </button>
        </div>

        <div className="space-y-8">
          {ORDERED_CATEGORIES.map((cat, idx) => (
            <CategoryProductSlidesBlock
              key={cat.id}
              categoryId={cat.id}
              products={products}
              index={idx}
              onViewAll={navigateToCategory}
            />
          ))}
        </div>
      </section>

      {/* 11. Regal Festive Privilege Promotional Banner */}
      <section className="vyora-container vyora-section-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#2D070F] via-[#5B112B] to-[#7A1438] text-white p-6 sm:p-10 lg:p-12 shadow-xl border border-[#D4AF37]/35 flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[#D4AF37] typo-eyebrow">
              <Gift className="w-4 h-4 shrink-0" />
              <span>Grand Season Privilege · Dispatching from Pune, Maharashtra, India</span>
            </div>
            <h2 className="typo-h2 text-white">
              Flat ₹1,000 Off on Orders Above ₹7,500
            </h2>
            <p className="typo-body text-rose-100/85">
              Applicable across handloom sarees & sherwanis, Polki jewellery, teakwood Bluetooth speakers, leather travel bags, and brass decor — with insured delivery to {locationLabel}.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <button
              onClick={() => {
                applyCoupon('ROYAL1000');
                navigateToCategory('all');
              }}
              className="min-h-11 py-3 px-6 bg-[#FAF7F5] hover:bg-[#D4AF37] text-[#2A070F] typo-btn rounded-full shadow-md flex items-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Tag className="w-4 h-4 text-[#7A1438]" />
              <span>Apply Code: ROYAL1000</span>
            </button>
            <button
              onClick={() => {
                setActivePage('offers');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-11 py-3 px-6 bg-white/10 hover:bg-white/20 text-white border border-white/25 typo-btn rounded-full transition-colors cursor-pointer"
            >
              All Privilege Codes
            </button>
          </div>
        </motion.div>
      </section>

      {/* 12. Multi-Category Brand Storytelling & Provenance */}
      <EditorialSection />

      {/* 13. Multi-Slide Carousel 4: New Arrivals */}
      <section
        id="new-arrivals-section"
        className="scroll-mt-24 vyora-container vyora-section-sm border-t border-[#EAE0D6]"
      >
        <ProductCarousel
          eyebrow="Freshly Curated · New Season Releases"
          title="New Arrivals"
          subtitle="Newly inducted handloom drapes, silver filigree, smart wearables, and artisan home accents."
          products={newArrivalsShowcase}
          onViewAll={() => navigateToCategory('all')}
          viewAllLabel="View All New Arrivals"
          bgVariant="card"
        />
      </section>

      {/* 14. Multi-Slide Carousel 5: Recommended Products */}
      <section
        id="recommended-products-section"
        className="scroll-mt-24 vyora-container vyora-section-sm border-t border-[#EAE0D6]"
      >
        <ProductCarousel
          eyebrow="Personalized Marketplace Picks · 4.8★+ Rated"
          title="Recommended Products"
          subtitle="Curated high-affinity recommendations across lifestyle, beauty, electronics, footwear, and gifting."
          products={recommendedProductsShowcase}
          onViewAll={() => navigateToCategory('all')}
          viewAllLabel="Explore All Recommendations"
          bgVariant="ivory"
        />
      </section>

      {/* 15. Secondary Warm Silk Scrolling Marquee */}
      <MarqueeBanner variant="light" items={SECONDARY_MARQUEE_ITEMS} />

      {/* 16. Verified Multi-Category Patron Testimonials */}
      <CustomerReviews />

      {/* 17. Recently Viewed Creations Carousel */}
      {recentProducts.length > 0 && (
        <section className="vyora-container vyora-section-sm border-t border-[#EAE0D6]">
          <ProductCarousel
            eyebrow="Your Personal Trail"
            title="Recently Viewed Creations"
            products={recentProducts}
            onViewAll={() => navigateToCategory('all')}
            viewAllLabel="Continue Exploring"
            compactHeader
          />
        </section>
      )}

      {/* 18. Dedicated Homepage Newsletter & Welcome Voucher */}
      <NewsletterSection />
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { activePage, toasts, removeToast } = useStore();

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePageContent />;
      case 'shop':
        return <ShopPage />;
      case 'search':
        return <SearchResultsPage />;
      case 'pdp':
        return <ProductDetailPage />;
      case 'checkout':
        return (
          <ProtectedRouteGate
            targetPage="checkout"
            title="Sign In for Secure Checkout"
            description="Please sign in with your customer account or register a new profile to save your delivery address, earn loyalty points, and complete checkout."
          >
            <CheckoutPage />
          </ProtectedRouteGate>
        );
      case 'order_confirmation':
        return (
          <ProtectedRouteGate
            targetPage="order_confirmation"
            title="Order Confirmation"
            description="Sign in to view your confirmed order receipt and consignment dispatch details."
          >
            <OrderConfirmationPage />
          </ProtectedRouteGate>
        );
      case 'order_tracking':
        return (
          <ProtectedRouteGate
            targetPage="order_tracking"
            title="Live Consignment Tracking"
            description="Sign in to your VYORA account to track live shipment checkpoints for your personal orders."
          >
            <OrderTrackingPage />
          </ProtectedRouteGate>
        );
      case 'my_orders':
        return (
          <ProtectedRouteGate
            targetPage="my_orders"
            title="My Orders & Consignments"
            description="Sign in to access your personal order history, tax invoices, and live courier tracking."
          >
            <MyOrdersPage />
          </ProtectedRouteGate>
        );
      case 'wishlist':
        return (
          <ProtectedRouteGate
            targetPage="wishlist"
            title="Personal Wishlist Vault"
            description="Sign in or create a customer account to view and manage the items saved to your private wishlist."
          >
            <WishlistPage />
          </ProtectedRouteGate>
        );
      case 'profile':
        return (
          <ProtectedRouteGate
            targetPage="profile"
            title="Customer Account Dashboard"
            description="Sign in or register an account to view your personal profile, loyalty tier, saved addresses, wishlist, and account settings."
          >
            <UserProfilePage />
          </ProtectedRouteGate>
        );
      case 'admin':
        return (
          <ProtectedRouteGate
            targetPage="admin"
            title="Store Operations Console"
            description="Administrator authentication is required to access the VYORA Store Operations Console."
            requireAdmin
          >
            <AdminDashboard />
          </ProtectedRouteGate>
        );
      case 'offers':
        return <OffersPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      case 'faq':
        return <FAQPage />;
      case 'shipping':
        return <PolicyPage policyType="shipping" />;
      case 'returns':
        return <PolicyPage policyType="returns" />;
      case 'privacy':
        return <PolicyPage policyType="privacy" />;
      case 'terms':
        return <PolicyPage policyType="terms" />;
      default:
        return <HomePageContent />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F5] text-neutral-900">
      {/* Slim Dismissible Privilege Bar */}
      <AnnouncementBar />

      {/* Sticky 3-Zone Header */}
      <Header />

      {/* Main Dynamic Viewport */}
      <main className="flex-1">{renderCurrentPage()}</main>

      {/* Luxury Multi-Column Footer */}
      <Footer />

      {/* Global Interactive Overlays */}
      <SearchModal />
      <CartDrawer />
      <AuthModal />
      <QuickViewModal />
      <CompareDrawer />

      {/* Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-5 sm:right-5 z-50 flex flex-col gap-2 sm:max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 bg-[#380811] text-white typo-body-sm rounded-xl shadow-2xl border border-[#D4AF37]/40 animate-in slide-in-from-bottom duration-200"
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Dismiss notification"
              className="text-rose-300 hover:text-white p-1 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
