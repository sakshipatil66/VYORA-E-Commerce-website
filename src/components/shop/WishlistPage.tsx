import React from 'react';
import { Heart } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCard } from '../common/ProductCard';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, setActivePage, setSelectedCategory } = useStore();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="vyora-container vyora-page">
      {/* Header */}
      <div className="mb-8 border-b border-[#EBE4DD] pb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="typo-eyebrow text-[#7A1438]">
            Curated Vault
          </p>
          <h1 className="typo-h1 text-neutral-900 mt-1">
            My Wishlist ({wishlistedProducts.length})
          </h1>
        </div>
        {wishlistedProducts.length > 0 && (
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActivePage('shop');
            }}
            className="typo-btn-sm text-[#5B112B] hover:underline cursor-pointer"
          >
            Discover More Treasures
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {wishlistedProducts.length === 0 ? (
        <div className="bg-white p-10 sm:p-16 rounded-2xl border border-[#EBE4DD] text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="typo-h3 text-neutral-900">Your wishlist is empty</h2>
          <p className="typo-body text-neutral-500">
            Save your favorite handcrafted sarees, polki jewels, and home accents to review them anytime.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setActivePage('shop');
            }}
            className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
          >
            Explore Masterpiece Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistedProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
