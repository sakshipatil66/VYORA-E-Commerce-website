import React, { useState, useEffect } from 'react';
import { Heart, ShoppingBag, Star, Check, Eye, Scale } from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    openProductDetail,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setQuickViewProduct,
    toggleCompare,
    isInCompare
  } = useStore();

  const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0].name : '';
  const [selectedColorName, setSelectedColorName] = useState<string>(defaultColor);
  const [activeImg, setActiveImg] = useState<string>(() =>
    getVariantProductImage(product, defaultColor)
  );
  const [isAddedAnim, setIsAddedAnim] = useState(false);

  useEffect(() => {
    const nextColor = product.colors && product.colors.length > 0 ? product.colors[0].name : '';
    setSelectedColorName(nextColor);
    setActiveImg(getVariantProductImage(product, nextColor));
  }, [product.id, product.primaryImage]);

  const isWishlisted = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined;
    addToCart(product, 1, defaultSize, selectedColorName);
    setIsAddedAnim(true);
    setTimeout(() => setIsAddedAnim(false), 1200);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(product.id);
  };

  const handleColorSwatchClick = (e: React.MouseEvent, colorName: string) => {
    e.stopPropagation();
    setSelectedColorName(colorName);
    setActiveImg(getVariantProductImage(product, colorName));
  };

  // Resolve primary studio angle and matching second angle of the EXACT SAME product & color
  const baseImage = activeImg || getVariantProductImage(product, selectedColorName);
  const rawHoverImage =
    (selectedColorName && product.colorHoverImages?.[selectedColorName]) ||
    product.secondaryImage ||
    (product.images && product.images.length > 1 ? product.images[1] : undefined);
  const hoverImage = rawHoverImage && rawHoverImage !== baseImage ? rawHoverImage : undefined;

  // Single disciplined badge tag (no badge spam)
  const primaryTag = product.badge || (product.isNewArrival ? 'New Season' : undefined);

  return (
    <article
      onClick={() => openProductDetail(product.id)}
      className="group relative flex flex-col bg-white rounded-xl border border-[#E8DDD3] hover:border-[#D4AF37]/70 overflow-hidden cursor-pointer shadow-2xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* 4:5 Studio Image Container with Smooth Dual-Angle Crossfade */}
      <div className="relative aspect-4/5 w-full bg-[#F5EFEA] overflow-hidden">
        {/* Primary Angle */}
        <ProductImage
          src={baseImage}
          alt={selectedColorName ? `${product.name} (${selectedColorName})` : product.name}
          category={product.category}
          label={product.brand}
          loading="lazy"
          className={`w-full h-full object-cover object-top transition-all duration-500 ease-out ${
            hoverImage ? 'group-hover:opacity-0 group-hover:scale-103' : 'group-hover:scale-105'
          }`}
        />

        {/* Secondary Angle of the Exact Same Product (Revealed Smoothly on Hover) */}
        {hoverImage && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none">
            <ProductImage
              src={hoverImage}
              alt={
                selectedColorName
                  ? `${product.name} (${selectedColorName}) — Alternate View`
                  : `${product.name} — Alternate View`
              }
              category={product.category}
              label={product.brand}
              loading="lazy"
              className="w-full h-full object-cover object-top transition-transform duration-700 ease-out scale-100 group-hover:scale-105"
            />
          </div>
        )}

        {/* Single Subtle Craft Tag (Top Left) */}
        {primaryTag && (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-block bg-[#380811]/90 backdrop-blur-xs text-[#FAF6F2] text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-sm border border-[#D4AF37]/30">
              {primaryTag}
            </span>
          </div>
        )}

        {/* Top-Right Action Stack */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleWishlistToggle}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className="w-8 h-8 rounded-full bg-white/92 backdrop-blur-xs flex items-center justify-center text-neutral-600 hover:text-[#BE185D] hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isWishlisted ? 'fill-[#BE185D] text-[#BE185D]' : 'text-neutral-600'
              }`}
            />
          </button>

          <button
            onClick={handleQuickView}
            title="Quick View"
            aria-label="Quick View"
            className="w-8 h-8 rounded-full bg-white/92 backdrop-blur-xs flex items-center justify-center text-neutral-600 hover:text-[#7A1438] hover:scale-110 active:scale-95 transition-all shadow-xs opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 duration-200 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCompareToggle}
            title={isCompared ? 'Remove from comparison' : 'Compare creation'}
            aria-label="Compare"
            className={`w-8 h-8 rounded-full backdrop-blur-xs flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xs opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 duration-300 cursor-pointer ${
              isCompared ? 'bg-[#5B112B] text-white opacity-100 translate-x-0' : 'bg-white/92 text-neutral-600 hover:text-[#7A1438]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Slide-Up Quick Add Bar */}
        <div className="absolute inset-x-2.5 bottom-2.5 opacity-95 sm:opacity-0 sm:translate-y-2 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all duration-300 ease-out z-10">
          <button
            onClick={handleQuickAdd}
            className={`w-full py-2.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              isAddedAnim
                ? 'bg-emerald-700 text-white'
                : 'bg-[#380811]/95 hover:bg-[#5B112B] text-[#FAF7F5] border border-[#D4AF37]/30 backdrop-blur-xs'
            }`}
          >
            {isAddedAnim ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Added to Bag</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Quick Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clean Product Metadata Module */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Unboxed Brand · Subcategory */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#8C7567] uppercase tracking-wider font-medium truncate">
            <span className="truncate">{product.brand}</span>
            {product.subCategory && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{product.subCategory}</span>
              </>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-[15px] font-semibold text-neutral-900 group-hover:text-[#7A1438] transition-colors line-clamp-1 mt-1">
            {product.name}
          </h3>

          {/* Craft Tagline */}
          <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
            {product.tagline}
          </p>

          {/* Interactive Color Variant Swatches */}
          {product.colors && product.colors.length > 1 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {product.colors.slice(0, 4).map((c) => (
                <button
                  key={c.name}
                  onClick={(e) => handleColorSwatchClick(e, c.name)}
                  title={c.name}
                  aria-label={`Select color ${c.name}`}
                  className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                    selectedColorName === c.name
                      ? 'ring-2 ring-[#7A1438] ring-offset-1 scale-110 border-white'
                      : 'border-black/20 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <span className="text-[10px] text-neutral-400 ml-1 truncate">
                {selectedColorName}
              </span>
            </div>
          )}
        </div>

        {/* Aligned Tabular Price & Rating Baseline */}
        <div className="pt-2.5 border-t border-[#F3ECE7] flex items-baseline justify-between gap-2 mt-auto">
          <div className="flex items-baseline gap-1.5 tabular-nums">
            <span className="text-[15px] sm:text-base font-bold text-[#4A0E17]">
              ₹{product.discountPrice.toLocaleString('en-IN')}
            </span>
            {product.originalPrice > product.discountPrice && (
              <>
                <span className="text-xs text-neutral-400 line-through">
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-neutral-700 font-medium tabular-nums shrink-0">
            <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
            <span>{product.rating}</span>
            <span className="text-neutral-400">({product.reviewCount})</span>
          </div>
        </div>
      </div>
    </article>
  );
};
