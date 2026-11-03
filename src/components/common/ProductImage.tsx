import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Gem,
  Droplets,
  Headphones,
  Lamp,
  Footprints,
  ShoppingBag,
  Puzzle,
  BookOpen,
  Activity,
  Leaf,
  Gift
} from 'lucide-react';
import { CategoryId, Product } from '../../types';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  fashion: Sparkles,
  jewellery: Gem,
  beauty: Droplets,
  electronics: Headphones,
  home: Lamp,
  footwear: Footprints,
  bags: ShoppingBag,
  toys: Puzzle,
  stationery: BookOpen,
  fitness: Activity,
  essentials: Leaf,
  gifting: Gift
};

export function getVariantProductImage(product: Product, selectedColor?: string): string {
  if (selectedColor && product.colorImages && product.colorImages[selectedColor]) {
    return product.colorImages[selectedColor];
  }
  return product.primaryImage;
}

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  category?: CategoryId | string;
  label?: string;
  compact?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category,
  label,
  compact = false,
  className = '',
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const Icon = (category && CATEGORY_ICONS[category]) || Sparkles;
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#F5EFEA] to-[#EAE0D7] text-[#5B112B] select-none ${
          compact ? 'p-1.5' : 'p-4'
        } ${className}`}
      >
        <div
          className={`${
            compact ? 'w-6 h-6' : 'w-11 h-11 mb-2'
          } rounded-full bg-[#5B112B]/10 flex items-center justify-center shrink-0`}
        >
          <Icon className={compact ? 'w-3.5 h-3.5 text-[#7A1438]' : 'w-5 h-5 text-[#7A1438]'} />
        </div>
        {!compact && (
          <>
            {label && (
              <span className="typo-badge text-[#7A1438] line-clamp-1">
                {label}
              </span>
            )}
            <span className="typo-meta font-medium text-neutral-700 line-clamp-2 mt-0.5">
              {alt}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  );
};
