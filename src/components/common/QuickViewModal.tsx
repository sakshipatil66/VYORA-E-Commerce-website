import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingBag, ArrowRight, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from './ProductImage';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    openProductDetail
  } = useStore();

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeImg, setActiveImg] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (quickViewProduct) {
      const initialColor =
        quickViewProduct.colors && quickViewProduct.colors.length > 0
          ? quickViewProduct.colors[0].name
          : '';
      const initialSize =
        quickViewProduct.sizes && quickViewProduct.sizes.length > 0
          ? quickViewProduct.sizes[0]
          : '';
      setSelectedColor(initialColor);
      setSelectedSize(initialSize);
      setActiveImg(getVariantProductImage(quickViewProduct, initialColor));
      setQuantity(1);
    }
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const currentSize =
    selectedSize ||
    (quickViewProduct.sizes && quickViewProduct.sizes.length > 0 ? quickViewProduct.sizes[0] : '');
  const currentColor =
    selectedColor ||
    (quickViewProduct.colors && quickViewProduct.colors.length > 0
      ? quickViewProduct.colors[0].name
      : '');
  const galleryImages =
    (currentColor && quickViewProduct.colorGalleries?.[currentColor]?.length
      ? quickViewProduct.colorGalleries[currentColor]
      : quickViewProduct.images) || [quickViewProduct.primaryImage];
  const currentImg =
    activeImg || getVariantProductImage(quickViewProduct, currentColor);

  const handleColorChange = (name: string) => {
    setSelectedColor(name);
    const variantGallery = quickViewProduct.colorGalleries?.[name];
    if (variantGallery && variantGallery.length > 0) {
      setActiveImg(variantGallery[0]);
    } else {
      setActiveImg(getVariantProductImage(quickViewProduct, name));
    }
  };

  const handleAddToCart = () => {
    addToCart(quickViewProduct, quantity, currentSize, currentColor);
    setQuickViewProduct(null);
  };

  const handleGoToPDP = () => {
    const prodId = quickViewProduct.id;
    setQuickViewProduct(null);
    openProductDetail(prodId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[92vh] overflow-y-auto md:overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-black shadow-xs transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Gallery Preview Left (5 cols) */}
        <div className="md:w-1/2 bg-[#FAF7F5] p-4 sm:p-6 flex flex-col justify-between gap-3 shrink-0">
          <div className="relative aspect-4/5 rounded-xl overflow-hidden border border-[#EBE4DD] bg-white">
            <ProductImage
              src={currentImg}
              alt={currentColor ? `${quickViewProduct.name} (${currentColor})` : quickViewProduct.name}
              category={quickViewProduct.category}
              label={quickViewProduct.brand}
              className="w-full h-full object-cover object-top"
            />
            {quickViewProduct.badge && (
              <span className="absolute top-3 left-3 bg-[#5B112B] text-white typo-badge px-2.5 py-1 rounded shadow-xs">
                {quickViewProduct.badge}
              </span>
            )}
          </div>

          {/* Multi-angle thumbnails */}
          {galleryImages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
              {galleryImages.map((img, idx) => (
                <button
                  key={`${currentColor}-${idx}`}
                  onClick={() => setActiveImg(img)}
                  className={`w-12 h-14 rounded-md overflow-hidden border-2 shrink-0 transition-all bg-white cursor-pointer ${
                    currentImg === img
                      ? 'border-[#7A1438] shadow-xs'
                      : 'border-[#EBE4DD] hover:border-neutral-400'
                  }`}
                >
                  <ProductImage
                    src={img}
                    alt={`${quickViewProduct.name} view ${idx + 1}`}
                    category={quickViewProduct.category}
                    compact
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Color Switch Buttons */}
          {quickViewProduct.colors && quickViewProduct.colors.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="typo-meta text-neutral-500 font-semibold">Color:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {quickViewProduct.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleColorChange(c.name)}
                    className={`flex items-center gap-1.5 py-1 px-2.5 rounded-md typo-meta border transition-all cursor-pointer ${
                      currentColor === c.name
                        ? 'border-[#7A1438] bg-rose-50 font-semibold text-[#4A0E17]'
                        : 'border-[#EBE4DD] bg-white text-neutral-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Right (5 cols) */}
        <div className="md:w-1/2 p-5 sm:p-6 md:overflow-y-auto space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div>
              <p className="typo-label text-[#8C7A70]">
                {quickViewProduct.brand} · {quickViewProduct.subCategory}
              </p>
              <h2 className="typo-h3 text-neutral-900 mt-1">
                {quickViewProduct.name}
              </h2>
              <div className="flex items-center gap-2 mt-2 typo-meta typo-tabular">
                <span className="flex items-center gap-1 bg-[#F5EFEA] px-2 py-0.5 rounded font-bold text-neutral-800">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {quickViewProduct.rating}
                </span>
                <span className="text-neutral-500">({quickViewProduct.reviewCount} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2.5 typo-tabular pt-1">
              <span className="typo-price-lg text-[#4A0E17]">
                ₹{quickViewProduct.discountPrice.toLocaleString('en-IN')}
              </span>
              {quickViewProduct.originalPrice > quickViewProduct.discountPrice && (
                <>
                  <span className="typo-body-sm text-neutral-400 line-through">
                    ₹{quickViewProduct.originalPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="typo-meta font-semibold text-emerald-700">
                    {quickViewProduct.discountPercent}% off
                  </span>
                </>
              )}
            </div>

            <p className="typo-body-sm text-neutral-600 line-clamp-3">
              {quickViewProduct.description}
            </p>

            {/* Sizes */}
            {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
              <div className="space-y-1.5">
                <span className="typo-label text-neutral-800 block">Select Size:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickViewProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-h-9 py-1.5 px-3 typo-btn-sm rounded-md border transition-colors cursor-pointer ${
                        currentSize === s
                          ? 'bg-[#5B112B] text-white border-[#5B112B]'
                          : 'bg-white text-neutral-800 border-[#EBE4DD] hover:border-neutral-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#F3ECE7] space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleAddToCart}
                className="min-h-11 py-2.5 px-4 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Bag</span>
              </button>
              <button
                onClick={handleGoToPDP}
                className="min-h-11 py-2.5 px-4 typo-btn text-neutral-800 bg-[#FAF7F5] hover:bg-[#F3ECE7] border border-[#EBE4DD] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Full Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 typo-meta text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Complimentary Pan-India Delivery & 7-Day Returns</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
