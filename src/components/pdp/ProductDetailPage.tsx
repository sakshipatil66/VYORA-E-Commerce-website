import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  ArrowRight,
  Share2,
  Sparkles,
  Award,
  ChevronRight,
  Plus,
  HelpCircle,
  Scale,
  MapPin
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCarousel } from '../common/ProductCarousel';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import { Review } from '../../types';
import { CATEGORY_METADATA } from '../../data/categories';
import {
  SELECTABLE_INDIAN_LOCATIONS,
  LocationLookupResult,
  formatLocationLabel
} from '../../data/locations';

export const ProductDetailPage: React.FC = () => {
  const {
    products,
    selectedProductId,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setActivePage,
    openCategoryPage,
    checkLocationDelivery,
    selectLocationByQuery,
    selectedLocation,
    setSelectedLocation,
    toggleCompare,
    isInCompare,
    recentlyViewedIds,
    addToast
  } = useStore();

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const [selectedSize, setSelectedSize] = useState<string>(
    product?.sizes && product.sizes.length > 0 ? product.sizes[0] : ''
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    product?.colors && product.colors.length > 0 ? product.colors[0].name : ''
  );
  const [activeImage, setActiveImage] = useState(
    product ? getVariantProductImage(product, product.colors?.[0]?.name) : ''
  );
  const [quantity, setQuantity] = useState(1);

  const [locationInput, setLocationInput] = useState<string>(() =>
    formatLocationLabel(selectedLocation)
  );
  const [deliveryResult, setDeliveryResult] = useState<LocationLookupResult>(() =>
    checkLocationDelivery(formatLocationLabel(selectedLocation))
  );

  // Sync location input & delivery estimate whenever global selectedLocation changes
  useEffect(() => {
    const label = formatLocationLabel(selectedLocation);
    setLocationInput(label);
    setDeliveryResult(checkLocationDelivery(label));
  }, [selectedLocation, checkLocationDelivery]);

  // Sync image, size, and color when product changes
  useEffect(() => {
    if (product) {
      const initialColor = product.colors && product.colors.length > 0 ? product.colors[0].name : '';
      setSelectedColor(initialColor);
      setActiveImage(getVariantProductImage(product, initialColor));
      setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
      setQuantity(1);
    }
  }, [product?.id, product?.primaryImage]);

  // Color change switches both main image and full multi-angle gallery
  const handleColorSelection = (colorName: string) => {
    setSelectedColor(colorName);
    const variantGallery = product?.colorGalleries?.[colorName];
    if (variantGallery && variantGallery.length > 0) {
      setActiveImage(variantGallery[0]);
    } else if (product) {
      setActiveImage(getVariantProductImage(product, colorName));
    }
  };

  // Reviews state
  const [reviewsList, setReviewsList] = useState<Review[]>(
    product?.reviews || [
      {
        id: 'r-seed-01',
        userName: 'Ananya Kulkarni',
        userCity: 'Pune, Maharashtra, India',
        rating: 5,
        date: '12 Oct 2026',
        title: 'Remarkable authenticity & Pune priority delivery',
        comment:
          'Arrived in Pune, Maharashtra, India the very next afternoon in a protective box with authenticity certification. Exceptional craftsmanship.',
        verifiedPurchase: true,
        helpfulCount: 24
      }
    ]
  );
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('Pune, Maharashtra, India');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewText, setNewReviewText] = useState('');

  if (!product) {
    return (
      <div className="vyora-container py-20 text-center">
        <h2 className="typo-h2 text-neutral-900">Product not found</h2>
        <button
          onClick={() => openCategoryPage('all', null)}
          className="mt-4 min-h-11 px-6 py-2.5 bg-[#5B112B] text-white rounded-lg typo-btn cursor-pointer"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);

  const handleLocationCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const res = selectLocationByQuery(locationInput);
    setDeliveryResult(res);
    if (res.serviceable && res.location) {
      addToast(
        `Delivering to ${formatLocationLabel(res.location)} by ${res.estimatedDateLabel}`
      );
    } else {
      addToast(res.message, 'warning');
    }
  };

  const handleQuickLocationSelect = (locId: string) => {
    const loc = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === locId);
    if (!loc) return;
    setSelectedLocation(loc);
    const label = formatLocationLabel(loc);
    setLocationInput(label);
    const res = checkLocationDelivery(label);
    setDeliveryResult(res);
    addToast(`Delivery location updated to ${label}`);
  };

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedSize, selectedColor);
    setActivePage('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShareProduct = () => {
    const shareText = `${product.name} (${product.id}) — ₹${product.discountPrice.toLocaleString('en-IN')} on VYORA`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
    addToast('Product link & details copied to clipboard!');
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor || !newReviewText) return;
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      userName: newReviewAuthor,
      userCity: newReviewCity || 'Pune, Maharashtra, India',
      rating: newReviewRating,
      date: 'Just now',
      title: newReviewTitle || 'Verified Patron Experience',
      comment: newReviewText,
      verifiedPurchase: true,
      helpfulCount: 1
    };
    setReviewsList([newRev, ...reviewsList]);
    setIsWriteReviewOpen(false);
    setNewReviewAuthor('');
    setNewReviewCity('Pune, Maharashtra, India');
    setNewReviewTitle('');
    setNewReviewText('');
    addToast('Thank you! Your verified review has been published.');
  };

  // Frequently Bought Together Items
  const bundleItems = products.filter((p) =>
    (product.frequentlyBoughtTogetherIds || []).includes(p.id)
  );
  const bundleTotal =
    product.discountPrice + bundleItems.reduce((acc, b) => acc + b.discountPrice, 0);
  const bundleSavings = 300;
  const bundlePayable = Math.max(0, bundleTotal - bundleSavings);

  const handleAddBundleToBag = () => {
    addToCart(product, 1, selectedSize, selectedColor);
    bundleItems.forEach((it) => addToCart(it, 1));
    addToast('Complete ensemble bundle added to bag with ₹300 bonus savings!');
  };

  // Strictly same-category related products (multi-slide carousel) & recently viewed
  const relatedProducts = products.filter(
    (p) => p.category === product.category && p.id !== product.id
  );

  const recentlyViewedProducts = products.filter(
    (p) => recentlyViewedIds.includes(p.id) && p.id !== product.id
  );

  const catShortLabel = CATEGORY_METADATA[product.category]?.shortLabel || product.category;

  return (
    <div className="vyora-container vyora-page">
      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center gap-2 typo-meta text-neutral-500 mb-6">
        <button onClick={() => setActivePage('home')} className="hover:text-neutral-900 cursor-pointer">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <button
          onClick={() => openCategoryPage(product.category, null)}
          className="hover:text-[#7A1438] cursor-pointer"
        >
          {catShortLabel}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <span className="text-neutral-800 font-semibold truncate max-w-[220px] sm:max-w-xs">{product.name}</span>
      </nav>

      {/* Main PDP Grid: Gallery Left, Contiguous Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-4/5 w-full bg-[#F5EFEA] rounded-2xl overflow-hidden border border-[#EBE4DD] shadow-xs group">
            <ProductImage
              src={activeImage || getVariantProductImage(product, selectedColor)}
              alt={selectedColor ? `${product.name} — ${selectedColor}` : product.name}
              category={product.category}
              label={product.brand}
              className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
            {product.badge && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs text-[#5B112B] typo-badge px-2.5 py-1 rounded-sm shadow-xs border border-[#EBE4DD]">
                {product.badge}
              </div>
            )}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-neutral-700 hover:text-[#BE185D] hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isWishlisted ? 'fill-[#BE185D] text-[#BE185D]' : ''
                  }`}
                />
              </button>
              <button
                onClick={() => toggleCompare(product.id)}
                title="Compare creation"
                className={`w-10 h-10 rounded-full backdrop-blur-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer ${
                  isCompared ? 'bg-[#5B112B] text-white' : 'bg-white/90 text-neutral-700'
                }`}
              >
                <Scale className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Thumbnails Row (Color-synced multi-angle gallery) */}
          {(() => {
            const galleryImages =
              (selectedColor && product.colorGalleries?.[selectedColor]?.length
                ? product.colorGalleries[selectedColor]
                : product.images) || [product.primaryImage];
            return galleryImages.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {galleryImages.map((img, i) => (
                  <button
                    key={`${selectedColor}-${i}`}
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-24 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-[#F5EFEA] cursor-pointer ${
                      activeImage === img
                        ? 'border-[#7A1438] shadow-sm scale-102'
                        : 'border-[#EBE4DD] hover:border-neutral-400'
                    }`}
                  >
                    <ProductImage
                      src={img}
                      alt={`${product.name} angle ${i + 1}`}
                      category={product.category}
                      compact
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {/* Artisan & Heritage Story Module */}
          <div className="bg-[#FAF7F5] p-6 rounded-xl border border-[#EBE4DD] space-y-3 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-2 typo-eyebrow text-[#7A1438]">
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Artisan Provenance</span>
              </span>
              <span className="typo-meta typo-tabular normal-case tracking-normal text-neutral-500">ID: {product.id}</span>
            </div>
            <h4 className="typo-h3 text-neutral-900">
              Direct from {product.artisanOrigin || 'Master Guild Artisans of India'}
            </h4>
            <p className="typo-body text-neutral-600">
              {product.description}
            </p>
            {product.fabricDetails && (
              <div className="pt-2 typo-body-sm text-neutral-700">
                <strong className="text-neutral-900 font-semibold">Craft Composition:</strong>{' '}
                {product.fabricDetails}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contiguous Purchase Module (5 cols sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          {/* Header & Title */}
          <div className="space-y-2.5 border-b border-[#EBE4DD] pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="typo-label text-[#8C7A70]">
                {product.brand} · {product.subCategory}
              </span>
              <button
                type="button"
                onClick={handleShareProduct}
                title="Share creation details"
                className="flex items-center gap-1.5 min-h-8 py-1 px-3 typo-btn-sm text-[#5B112B] bg-[#FAF2EB] hover:bg-[#F3ECE7] rounded-lg border border-[#E5D9CE] transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#7A1438]" />
                <span>Share</span>
              </button>
            </div>

            <h1 className="typo-h1 text-neutral-900">
              {product.name}
            </h1>
            <p className="typo-subtitle text-neutral-600">{product.tagline}</p>

            {/* Rating Stars & Count */}
            <div className="flex flex-wrap items-center gap-2 pt-1 typo-meta typo-tabular">
              <div className="flex items-center gap-1 bg-[#F5EFEA] px-2.5 py-1 rounded text-neutral-800 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
              </div>
              <span className="text-neutral-500">
                {product.reviewCount} Verified Ratings & {reviewsList.length} Patron Reviews
              </span>
            </div>
          </div>

          {/* Pricing Module with Tabular Numerals */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="typo-price-lg text-[#4A0E17]">
                ₹{product.discountPrice.toLocaleString('en-IN')}
              </span>
              {product.originalPrice > product.discountPrice && (
                <>
                  <span className="typo-price text-neutral-400 line-through font-normal">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="typo-body-sm font-semibold text-emerald-700 typo-tabular">
                    Save {product.discountPercent}% (₹
                    {(product.originalPrice - product.discountPrice).toLocaleString('en-IN')})
                  </span>
                </>
              )}
            </div>
            <p className="typo-meta text-neutral-500">
              Inclusive of all taxes · Complimentary delivery on orders over ₹999
            </p>
          </div>

          {/* Color Selection with Live Image Switching */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap justify-between items-center gap-2 typo-body-sm">
                <span className="font-semibold text-neutral-800">Select Color / Finish:</span>
                <span className="text-[#7A1438] font-bold">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleColorSelection(c.name)}
                    className={`flex items-center gap-2 min-h-10 py-1.5 px-3.5 rounded-lg typo-btn-sm border transition-all cursor-pointer ${
                      selectedColor === c.name
                        ? 'border-[#7A1438] bg-rose-50/70 text-[#4A0E17] shadow-xs ring-1 ring-[#7A1438]'
                        : 'border-[#EBE4DD] bg-white text-neutral-700 hover:border-neutral-400 font-medium'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap justify-between items-center gap-2 typo-body-sm">
                <span className="font-semibold text-neutral-800">Select Size:</span>
                <span className="text-emerald-700 font-medium">True to Indian Fit</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`min-h-10 py-2 px-3.5 typo-btn-sm rounded-lg border transition-all cursor-pointer ${
                      selectedSize === s
                        ? 'bg-[#5B112B] text-white border-[#5B112B] shadow-xs'
                        : 'bg-white text-neutral-800 border-[#EBE4DD] hover:border-neutral-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {product.stockQuantity < 15 && (
                <p className="typo-meta text-amber-700 font-semibold">
                  Only {product.stockQuantity} handcrafted units remaining in this allocation
                </p>
              )}
            </div>
          )}

          {/* Primary Action Buttons: Add to Bag + Buy Now */}
          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleAddToCart}
                className="min-h-12 py-3.5 px-4 typo-btn text-neutral-900 bg-white hover:bg-[#F3ECE7] border-2 border-[#5B112B] rounded-lg transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#5B112B] shrink-0" />
                <span>Add to Bag</span>
              </button>
              <button
                onClick={handleBuyNow}
                className="min-h-12 py-3.5 px-4 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Express Buy Now</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* Delivery Location & Availability (Default: Pune, Maharashtra, India) */}
          <div className="bg-[#FAF7F5] p-4 sm:p-5 rounded-xl border border-[#EBE4DD] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 typo-body-sm font-semibold text-neutral-800">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#7A1438] shrink-0" />
                <span>Delivery Location & Availability</span>
              </span>
              <span className="typo-meta font-semibold text-[#7A1438]">
                {formatLocationLabel(selectedLocation)}
              </span>
            </div>

            {/* Quick Location Dropdown */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedLocation.id}
                onChange={(e) => handleQuickLocationSelect(e.target.value)}
                aria-label="Choose delivery location"
                className="typo-input bg-white font-medium cursor-pointer"
              >
                {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {formatLocationLabel(loc)}
                    {loc.isPune ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Check by City Name Input */}
            <form onSubmit={handleLocationCheck} className="flex gap-2">
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Pune, Maharashtra, India"
                className="typo-input flex-1 bg-white"
              />
              <button
                type="submit"
                className="min-h-11 px-4 typo-btn-sm text-white bg-[#5B112B] hover:bg-[#380811] rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Check
              </button>
            </form>

            {deliveryResult && (
              <div className="typo-body-sm pt-0.5">
                {deliveryResult.serviceable ? (
                  <div className="space-y-1 text-neutral-700">
                    <p className="text-emerald-800 font-semibold flex items-start gap-1.5">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Estimated Delivery by {deliveryResult.estimatedDateLabel} (
                        {deliveryResult.days}{' '}
                        {deliveryResult.days === 1 ? 'Day' : 'Days'}) to{' '}
                        {deliveryResult.location
                          ? formatLocationLabel(deliveryResult.location)
                          : formatLocationLabel(selectedLocation)}
                      </span>
                    </p>
                    <p className="text-neutral-500 typo-meta">
                      {deliveryResult.codAvailable ? 'Cash on Delivery Available · ' : ''}
                      Insured Dispatch · 7-Day Doorstep Return
                    </p>
                  </div>
                ) : (
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 typo-meta">
                    {deliveryResult.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 pt-3 border-t border-[#EBE4DD] typo-meta text-neutral-600">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span>Silk Mark & BIS Hallmarked</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#7A1438] shrink-0" />
              <span>7-Day Return Policy</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Fair Wage Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#7A1438] shrink-0" />
              <span>Insured Air Shipping</span>
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Bought Together Bundle Section */}
      {bundleItems.length > 0 && (
        <section className="mt-14 p-6 bg-white rounded-2xl border border-[#EBE4DD] shadow-xs">
          <div className="flex items-center gap-2 typo-eyebrow text-[#7A1438] mb-1">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Complete The Ensemble</span>
          </div>
          <h3 className="typo-h3 text-neutral-900 mb-4">
            Frequently Bought Together (Save Extra ₹{bundleSavings})
          </h3>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
              <div className="w-28 text-center">
                <ProductImage
                  src={getVariantProductImage(product, selectedColor)}
                  alt={product.name}
                  category={product.category}
                  compact
                  className="w-24 h-28 object-cover rounded-lg border border-[#EBE4DD] mx-auto mb-1.5"
                />
                <p className="typo-meta font-semibold line-clamp-1 text-neutral-900">{product.name}</p>
                <p className="typo-price text-[#4A0E17] mt-0.5">
                  ₹{product.discountPrice.toLocaleString('en-IN')}
                </p>
              </div>

              {bundleItems.map((bItem) => (
                <React.Fragment key={bItem.id}>
                  <Plus className="w-5 h-5 text-neutral-400 shrink-0" />
                  <div className="w-28 text-center">
                    <ProductImage
                      src={bItem.primaryImage}
                      alt={bItem.name}
                      category={bItem.category}
                      compact
                      className="w-24 h-28 object-cover rounded-lg border border-[#EBE4DD] mx-auto mb-1.5"
                    />
                    <p className="typo-meta font-semibold line-clamp-1 text-neutral-900">{bItem.name}</p>
                    <p className="typo-price text-[#4A0E17] mt-0.5">
                      ₹{bItem.discountPrice.toLocaleString('en-IN')}
                    </p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="w-full lg:w-auto bg-[#FAF7F5] p-5 rounded-xl border border-[#EBE4DD] text-center lg:text-right space-y-2.5 shrink-0">
              <div className="typo-body-sm text-neutral-500">
                Total Combined Price:{' '}
                <span className="line-through typo-tabular">
                  ₹{bundleTotal.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="typo-h3 text-[#4A0E17] typo-tabular font-sans">
                Bundle Price: ₹{bundlePayable.toLocaleString('en-IN')}
              </div>
              <button
                onClick={handleAddBundleToBag}
                className="min-h-11 py-2.5 px-6 bg-[#5B112B] hover:bg-[#430C1F] text-white typo-btn rounded-lg shadow-xs flex items-center justify-center gap-2 mx-auto lg:ml-auto cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Add All {bundleItems.length + 1} to Bag</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Product Highlights & Specifications */}
      <div className="mt-16 pt-12 border-t border-[#EBE4DD] space-y-10">
        <div>
          <h3 className="typo-h2 text-neutral-900 mb-4">
            Highlights & Craft Specifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-[#EBE4DD]">
            <div>
              <h4 className="typo-label text-[#7A1438] mb-3">
                Key Details & Dimensions
              </h4>
              <ul className="space-y-2 typo-body-sm text-neutral-700">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D4AF37] font-bold">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
                {product.dimensions && (
                  <li className="flex items-start gap-2 pt-1">
                    <strong className="text-neutral-900 font-semibold">Dimensions:</strong>
                    <span>{product.dimensions}</span>
                  </li>
                )}
                {product.weight && (
                  <li className="flex items-start gap-2">
                    <strong className="text-neutral-900 font-semibold">Net Weight:</strong>
                    <span>{product.weight}</span>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="typo-label text-[#7A1438] mb-3">
                Preservation & Care
              </h4>
              <ul className="space-y-2 typo-body-sm text-neutral-700">
                {(
                  product.careInstructions || [
                    'Store wrapped in pure cotton muslin',
                    'Keep away from moisture',
                    'Follow artisan care label'
                  ]
                ).map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-neutral-400">·</span>
                    <span>{c}</span>
                  </li>
                ))}
                {product.warranty && (
                  <li className="pt-2">
                    <strong className="text-neutral-900 font-semibold">Warranty:</strong> {product.warranty}
                  </li>
                )}
                {product.returnPolicy && (
                  <li>
                    <strong className="text-neutral-900 font-semibold">Return Policy:</strong>{' '}
                    {product.returnPolicy}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Product Q&A Module */}
        {product.qaList && product.qaList.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-[#EBE4DD] space-y-4">
            <div className="flex items-center gap-2 typo-eyebrow text-[#7A1438]">
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Questions & Answers</span>
            </div>
            <h4 className="typo-h3 text-neutral-900">
              Patron Inquiries about this Creation
            </h4>
            <div className="space-y-3 divide-y divide-[#F3ECE7]">
              {product.qaList.map((qa) => (
                <div key={qa.id} className="pt-3 first:pt-0 space-y-1 typo-body-sm">
                  <p className="font-semibold text-neutral-900 flex items-start gap-2">
                    <span className="text-[#7A1438] font-bold">Q:</span>
                    <span>{qa.question}</span>
                  </p>
                  <p className="text-neutral-600 pl-5">
                    <span className="font-semibold text-neutral-800">Answer:</span> {qa.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Reviews & Ratings Module */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="typo-h2 text-neutral-900">
                Patron Reviews ({reviewsList.length})
              </h3>
              <p className="typo-body-sm text-neutral-500">Verified experiences from real collectors</p>
            </div>
            <button
              onClick={() => setIsWriteReviewOpen(true)}
              className="min-h-10 py-2 px-4 typo-btn-sm text-[#5B112B] bg-[#F3ECE7] hover:bg-[#5B112B] hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Write a Review
            </button>
          </div>

          {isWriteReviewOpen && (
            <div className="mb-6 p-6 bg-white rounded-xl border border-[#EBE4DD] space-y-4 shadow-sm">
              <h4 className="typo-h3 text-[#4A0E17]">
                Share Your Experience with {product.name}
              </h4>
              <form onSubmit={handleAddReview} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="typo-label text-neutral-700 block mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      placeholder="e.g. Shalini Roy"
                      className="typo-input"
                    />
                  </div>
                  <div>
                    <label className="typo-label text-neutral-700 block mb-1.5">
                      Your Location
                    </label>
                    <input
                      type="text"
                      value={newReviewCity}
                      onChange={(e) => setNewReviewCity(e.target.value)}
                      placeholder="Pune, Maharashtra, India"
                      className="typo-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="typo-label text-neutral-700 block mb-1.5">
                      Rating
                    </label>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(Number(e.target.value))}
                      className="typo-input"
                    >
                      <option value={5}>5 Stars - Exquisite / Masterpiece</option>
                      <option value={4}>4 Stars - High Quality</option>
                      <option value={3}>3 Stars - Good</option>
                    </select>
                  </div>
                  <div>
                    <label className="typo-label text-neutral-700 block mb-1.5">
                      Review Title
                    </label>
                    <input
                      type="text"
                      value={newReviewTitle}
                      onChange={(e) => setNewReviewTitle(e.target.value)}
                      placeholder="e.g. Stunning craftsmanship"
                      className="typo-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">
                    Your Review
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Describe the craftsmanship, finish, and packaging..."
                    className="typo-input"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWriteReviewOpen(false)}
                    className="min-h-10 py-2 px-4 typo-btn-sm text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="min-h-10 py-2 px-5 typo-btn-sm text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
                  >
                    Publish Review
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {reviewsList.map((rev) => (
              <div
                key={rev.id}
                className="p-5 bg-white rounded-xl border border-[#EBE4DD] space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex">
                      {[...Array(rev.rating)].map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="typo-card-title text-neutral-900">{rev.title}</span>
                  </div>
                  <span className="typo-meta typo-tabular text-neutral-400">{rev.date}</span>
                </div>

                <p className="typo-body text-neutral-700">{rev.comment}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#F3ECE7] typo-meta text-neutral-500">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-neutral-900">{rev.userName}</span>
                    <span>·</span>
                    <span>{rev.userCity}</span>
                    {rev.verifiedPurchase && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5" /> Verified Buyer
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => addToast('Thank you for your feedback!')}
                    className="typo-meta hover:text-neutral-900 cursor-pointer"
                  >
                    Helpful ({rev.helpfulCount})
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Similar / Related Category Carousel (Multi-Slide) */}
        {relatedProducts.length > 0 && (
          <div className="pt-8 border-t border-[#EBE4DD]">
            <ProductCarousel
              eyebrow={`More in ${catShortLabel}`}
              title={`Recommended ${catShortLabel} Creations`}
              subtitle={`Explore more handpicked creations exclusively from our ${catShortLabel} collection.`}
              products={relatedProducts}
              onViewAll={() => openCategoryPage(product.category, null)}
              viewAllLabel={`View All ${catShortLabel}`}
              compactHeader
            />
          </div>
        )}

        {/* Recently Viewed Carousel */}
        {recentlyViewedProducts.length > 0 && (
          <div className="pt-8 border-t border-[#EBE4DD]">
            <ProductCarousel
              eyebrow="Your Journey"
              title="Recently Viewed Masterpieces"
              products={recentlyViewedProducts}
              compactHeader
            />
          </div>
        )}
      </div>
    </div>
  );
};
