import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import { Product, StoreCategory } from '../../types';

interface AdminProductsProps {
  products: Product[];
  categories: StoreCategory[];
  initialStockFilter?: string;
  onStartNew: () => void;
  onEdit: (product: Product) => void;
  onToggleVisibility: (product: Product, nextActive: boolean) => Promise<void>;
  onDelete: (product: Product) => void;
  onOpenInventoryForProduct: (product: Product) => void;
}

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'updated_desc';

const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const dateLabel = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  categories,
  initialStockFilter = 'all',
  onStartNew,
  onEdit,
  onToggleVisibility,
  onDelete,
  onOpenInventoryForProduct
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState(initialStockFilter);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('updated_desc');
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState('');
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    setStockFilter(initialStockFilter);
    setPage(1);
  }, [initialStockFilter]);

  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.label || cat.id])),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        const catLabel = categoryMap.get(product.category) || product.category;
        const matchesQuery =
          !q ||
          [product.name, product.sku || '', product.brand, product.category, catLabel, product.subCategory]
            .some((val) => val.toLowerCase().includes(q));

        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

        const price = product.discountPrice;
        const matchesPrice =
          priceFilter === 'all' ||
          (priceFilter === 'under2k' && price < 2000) ||
          (priceFilter === '2k-5k' && price >= 2000 && price <= 5000) ||
          (priceFilter === '5k-15k' && price > 5000 && price <= 15000) ||
          (priceFilter === 'above15k' && price > 15000);

        const threshold = product.lowStockThreshold ?? 10;
        const matchesStock =
          stockFilter === 'all' ||
          (stockFilter === 'in' && product.stockQuantity > threshold) ||
          (stockFilter === 'low' && product.stockQuantity > 0 && product.stockQuantity <= threshold) ||
          (stockFilter === 'out' && product.stockQuantity === 0);

        const isActive = product.isActive !== false;
        const matchesVisibility =
          visibilityFilter === 'all' ||
          (visibilityFilter === 'active' && isActive) ||
          (visibilityFilter === 'inactive' && !isActive);

        return matchesQuery && matchesCategory && matchesPrice && matchesStock && matchesVisibility;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.discountPrice - b.discountPrice;
        if (sortBy === 'price_desc') return b.discountPrice - a.discountPrice;
        if (sortBy === 'stock_asc') return a.stockQuantity - b.stockQuantity;
        if (sortBy === 'stock_desc') return b.stockQuantity - a.stockQuantity;
        if (sortBy === 'updated_desc') {
          const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
          const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
          return tb - ta || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [products, search, categoryFilter, priceFilter, stockFilter, visibilityFilter, sortBy, categoryMap]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters =
    Boolean(search) ||
    categoryFilter !== 'all' ||
    priceFilter !== 'all' ||
    stockFilter !== 'all' ||
    visibilityFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setPriceFilter('all');
    setStockFilter('all');
    setVisibilityFilter('all');
    setPage(1);
  };

  const handleToggle = async (product: Product) => {
    const nextActive = product.isActive === false;
    setTogglingId(product.id);
    await onToggleVisibility(product, nextActive);
    setTogglingId('');
    if (viewProduct?.id === product.id) {
      setViewProduct({ ...product, isActive: nextActive });
    }
  };

  const liveViewProduct = viewProduct
    ? products.find((p) => p.id === viewProduct.id) || viewProduct
    : null;

  const activeCount = products.filter((p) => p.isActive !== false).length;
  const inactiveCount = products.length - activeCount;

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <>
      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Catalog, SKUs & visibility
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-2xl text-[#3b191e]">Product collection</h2>
              <span className="rounded-full bg-[#eef4ec] px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {activeCount} active
              </span>
              {inactiveCount > 0 && (
                <span className="rounded-full bg-[#f4ece6] px-2.5 py-0.5 text-[10px] font-bold text-[#7c6158]">
                  {inactiveCount} archived / hidden
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7dbd0] px-3 py-2 text-[11px] font-semibold text-[#6b5a52] hover:bg-[#faf4ef]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5b112b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#42101f]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </button>
          </div>
        </div>

        {/* Multi-criteria Filter Toolbar */}
        <div className="grid gap-2.5 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr]">
          <label className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, SKU, brand or category"
              className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
            />
          </label>

          <select
            aria-label="Filter products by category"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter products by price range"
            value={priceFilter}
            onChange={(event) => {
              setPriceFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All price ranges</option>
            <option value="under2k">Under ₹2,000</option>
            <option value="2k-5k">₹2,000 – ₹5,000</option>
            <option value="5k-15k">₹5,001 – ₹15,000</option>
            <option value="above15k">Above ₹15,000</option>
          </select>

          <select
            aria-label="Filter products by stock status"
            value={stockFilter}
            onChange={(event) => {
              setStockFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All stock status</option>
            <option value="in">Healthy stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>

          <select
            aria-label="Filter products by visibility"
            value={visibilityFilter}
            onChange={(event) => {
              setVisibilityFilter(event.target.value as 'all' | 'active' | 'inactive');
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All visibility</option>
            <option value="active">Active (Visible)</option>
            <option value="inactive">Inactive (Hidden)</option>
          </select>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortKey)}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="updated_desc">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
          </select>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">SKU</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Pricing</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Visibility</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e9e2]">
              {visibleProducts.map((product) => {
                const isActive = product.isActive !== false;
                const threshold = product.lowStockThreshold ?? 10;
                return (
                  <tr
                    key={product.id}
                    className={`text-xs transition hover:bg-[#fdfaf7] ${!isActive ? 'bg-[#faf7f4]/75 opacity-80' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.primaryImage || undefined}
                          alt=""
                          className="h-12 w-12 rounded-lg bg-[#f5efea] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="max-w-[230px] truncate font-semibold text-[#40312c]">
                            {product.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[#95847b]">
                            {product.brand}
                            {product.badge ? ` · ${product.badge}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md border border-[#eadfd5] bg-[#faf6f2] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#5b2631]">
                        {product.sku || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#725f56]">
                      <p>{categoryMap.get(product.category) || product.category}</p>
                      {product.subCategory && (
                        <p className="mt-0.5 text-[10px] text-[#9c8a80]">{product.subCategory}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-[#4c2028]">
                        {money(product.discountPrice)}
                      </p>
                      {product.originalPrice > product.discountPrice && (
                        <p className="mt-0.5 font-mono text-[10px] text-[#a4968c] line-through">
                          {money(product.originalPrice)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            product.stockQuantity === 0
                              ? 'bg-rose-50 text-rose-700'
                              : product.stockQuantity <= threshold
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {product.stockQuantity === 0
                            ? 'Out of stock'
                            : product.stockQuantity <= threshold
                              ? `Low (${product.stockQuantity})`
                              : `${product.stockQuantity} in stock`}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenInventoryForProduct(product)}
                          className="text-[10px] font-semibold text-[#7a1438] hover:underline"
                        >
                          Adjust in Inventory
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={togglingId === product.id}
                        onClick={() => void handleToggle(product)}
                        aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${product.name}`}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-50 ${
                          isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-[#dfd3c9] bg-[#f4ece6] text-[#755e55] hover:bg-[#e9ddd3]'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Eye className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Hidden
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewProduct(product)}
                          aria-label={`View ${product.name}`}
                          title="View product details"
                          className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6] hover:text-[#5b112b]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          title="Edit product"
                          className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6] hover:text-[#5b112b]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={togglingId === product.id}
                          onClick={() => void handleToggle(product)}
                          aria-label={isActive ? `Archive ${product.name}` : `Restore ${product.name}`}
                          title={isActive ? 'Archive (hide from store)' : 'Activate on store'}
                          className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6] hover:text-[#5b112b] disabled:opacity-50"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(product)}
                          aria-label={`Delete ${product.name}`}
                          title="Delete permanently"
                          className="rounded-lg p-2 text-[#a17777] hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleProducts.length && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-[#95847b]">
                    No products match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#eee4dc] px-4 py-3 text-[11px] text-[#897970]">
          <span>
            {filteredProducts.length
              ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredProducts.length)} of ${filteredProducts.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Product Detail Inspection Modal */}
      {liveViewProduct && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewProduct(null);
          }}
          className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-xs sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-3xl rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eee4dc] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[#faf6f2] border border-[#eadfd5] px-2 py-0.5 font-mono text-[11px] font-bold text-[#5b112b]">
                    {liveViewProduct.sku || 'No SKU'}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      liveViewProduct.isActive !== false
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-[#f4ece6] text-[#755e55]'
                    }`}
                  >
                    {liveViewProduct.isActive !== false ? 'Active on Storefront' : 'Hidden / Archived'}
                  </span>
                </div>
                <h3 className="mt-2 font-serif text-2xl text-[#341016]">{liveViewProduct.name}</h3>
                <p className="mt-0.5 text-xs text-[#897970]">
                  {liveViewProduct.brand} · {categoryMap.get(liveViewProduct.category) || liveViewProduct.category}
                  {liveViewProduct.subCategory ? ` / ${liveViewProduct.subCategory}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close product view"
                onClick={() => setViewProduct(null)}
                className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <div className="space-y-2">
                {liveViewProduct.primaryImage ? (
                  <img
                    src={liveViewProduct.primaryImage}
                    alt={liveViewProduct.name}
                    className="h-52 w-full rounded-xl border border-[#eee4dc] bg-[#f8f3ee] object-cover"
                  />
                ) : (
                  <div className="grid h-52 w-full place-items-center rounded-xl border border-[#eee4dc] bg-[#f8f3ee] text-[#9b8479]">
                    <Package className="h-8 w-8" />
                  </div>
                )}
                {liveViewProduct.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {liveViewProduct.images.slice(0, 4).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt=""
                        className="h-11 w-full rounded-md border border-[#eee4dc] object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-[#faf6f2] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#928178]">Selling Price</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#3c111a]">
                      {money(liveViewProduct.discountPrice)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf6f2] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#928178]">MRP</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#6b5a52]">
                      {money(liveViewProduct.originalPrice)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf6f2] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#928178]">Stock Qty</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#3c111a]">
                      {liveViewProduct.stockQuantity}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf6f2] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#928178]">Alert Threshold</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[#6b5a52]">
                      ≤ {liveViewProduct.lowStockThreshold ?? 10}
                    </p>
                  </div>
                </div>

                {liveViewProduct.tagline && (
                  <p className="font-medium text-[#5b112b] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#a88243]" />
                    {liveViewProduct.tagline}
                  </p>
                )}

                {liveViewProduct.description && (
                  <p className="leading-5 text-[#66564f]">{liveViewProduct.description}</p>
                )}

                {liveViewProduct.highlights.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#928178]">
                      Highlights
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-[#5e4e47]">
                      {liveViewProduct.highlights.map((h, idx) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#8a7970]">
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" /> ID: <code className="font-mono">{liveViewProduct.id}</code>
                  </span>
                  <span>Updated: {dateLabel(liveViewProduct.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#eee4dc] pt-4">
              <button
                type="button"
                onClick={() => void handleToggle(liveViewProduct)}
                className="rounded-full border border-[#d8c6b8] px-4 py-2 text-xs font-semibold text-[#5b112b] hover:bg-[#faf4ef]"
              >
                {liveViewProduct.isActive !== false ? 'Archive / Hide' : 'Restore to Storefront'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = liveViewProduct;
                  setViewProduct(null);
                  onEdit(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#42101f]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
