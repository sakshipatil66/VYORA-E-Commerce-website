import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Eye,
  Flower2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import { Coupon, Order, OrderStatus, Product, StoreCategory } from '../../types';

type AdminTab = 'overview' | 'products' | 'orders' | 'categories' | 'campaigns';
type Summary = Awaited<ReturnType<typeof api.adminSummary>>;
type ProductDraft = Omit<Product, 'id'>;

const orderStatuses: OrderStatus[] = [
  'placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'
];

const money = (amount: number) => `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const humanize = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const emptyProduct = (categoryId: string): ProductDraft => ({
  name: '',
  brand: 'VYORA',
  category: categoryId,
  subCategory: '',
  tagline: '',
  description: '',
  originalPrice: 0,
  discountPrice: 0,
  discountPercent: 0,
  rating: 0,
  reviewCount: 0,
  images: [],
  primaryImage: '',
  inStock: false,
  stockQuantity: 0,
  highlights: [],
  featured: false,
  isBestseller: false,
  isNewArrival: false
});

const tabItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'categories', label: 'Categories', icon: Boxes },
  { id: 'campaigns', label: 'Campaigns', icon: BadgePercent }
];

const MetricCard: React.FC<{
  label: string;
  value: string;
  note: string;
  icon: React.FC<{ className?: string }>;
  accent: string;
}> = ({ label, value, note, icon: Icon, accent }) => (
  <div className="rounded-2xl border border-[#eadfd5] bg-white p-5 shadow-[0_8px_24px_rgba(47,20,20,.035)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">{label}</p>
        <p className="mt-3 font-serif text-[28px] leading-none text-[#341016]">{value}</p>
      </div>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    </div>
    <p className="mt-4 text-xs text-[#8b7b72]">{note}</p>
  </div>
);

const ProductEditor: React.FC<{
  initial: ProductDraft;
  categories: StoreCategory[];
  saving: boolean;
  onSave: (product: ProductDraft) => Promise<void>;
  onClose: () => void;
}> = ({ initial, categories, saving, onSave, onClose }) => {
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');

  const change = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setImageError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 350 * 1024) {
      setImageError('Image files must be 350 KB or smaller.');
      return;
    }
    setImageError('');
    const reader = new FileReader();
    reader.onerror = () => setImageError('The selected image could not be read.');
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setImageError('The selected image could not be read.');
        return;
      }
      const existingUploadSize = draft.images
        .filter((image) => image.startsWith('data:'))
        .reduce((total, image) => total + image.length, 0);
      if (existingUploadSize + reader.result.length > 420_000) {
        setImageError('Combined uploaded images exceed the supported size. Remove an image or use smaller files.');
        return;
      }
      const images = [...new Set([reader.result, ...draft.images])];
      setDraft((current) => ({ ...current, images, primaryImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.brand.trim() || !draft.category) {
      setFormError('Complete the product name, brand, and category.');
      return;
    }
    if (draft.originalPrice < 0 || draft.discountPrice < 0 ||
        draft.discountPrice > draft.originalPrice || draft.stockQuantity < 0) {
      setFormError('Prices and stock must be valid; offer price cannot exceed MRP.');
      return;
    }
    const images = draft.images.filter(Boolean);
    const product: ProductDraft = {
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      description: draft.description.trim(),
      tagline: draft.tagline.trim(),
      images,
      primaryImage: draft.primaryImage || images[0] || '',
      inStock: draft.stockQuantity > 0,
      discountPercent: draft.originalPrice
        ? Math.max(0, Math.round((1 - draft.discountPrice / draft.originalPrice) * 100))
        : 0,
      highlights: draft.highlights.map((item) => item.trim()).filter(Boolean)
    };
    setFormError('');
    await onSave(product);
  };

  const fieldClass = 'mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm text-[#30231f] outline-none transition focus:border-[#8c3448] focus:ring-2 focus:ring-[#8c3448]/10';
  const labelClass = 'text-[11px] font-semibold uppercase tracking-[.11em] text-[#79675e]';

  return (
    <Modal onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">Catalog studio</p>
            <h2 className="mt-1 font-serif text-2xl text-[#341016]">{initial.name ? 'Edit product' : 'Add a product'}</h2>
            <p className="mt-1 text-xs text-[#897970]">Product changes are saved to the live catalog.</p>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Product name *
            <input autoFocus required maxLength={200} className={fieldClass} value={draft.name} onChange={(event) => change('name', event.target.value)} />
          </label>
          <label className={labelClass}>Brand *
            <input required className={fieldClass} value={draft.brand} onChange={(event) => change('brand', event.target.value)} />
          </label>
          <label className={labelClass}>Category *
            <select required className={fieldClass} value={draft.category} onChange={(event) => change('category', event.target.value)}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label className={labelClass}>Collection / subcategory
            <input className={fieldClass} value={draft.subCategory} onChange={(event) => change('subCategory', event.target.value)} />
          </label>
          <label className={labelClass}>Sizes or volume options
            <input className={fieldClass} value={(draft.sizes || []).join(', ')} onChange={(event) => change('sizes', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="30 ml, 50 ml, 100 ml" />
          </label>
          <label className={labelClass}>Colors (one name | hex per line)
            <textarea rows={2} className={fieldClass} value={(draft.colors || []).map((color) => `${color.name} | ${color.hex}`).join('\n')}
              onChange={(event) => change('colors', event.target.value.split('\n').map((line) => {
                const [name, hex] = line.split('|');
                return { name: name.trim(), hex: hex?.trim() || '#5B112B' };
              }).filter((color) => color.name))} placeholder={'Amber | #A46B3A\nRose | #A44D62'} />
          </label>
          <label className={labelClass}>MRP (₹) *
            <input type="number" min="0" step="1" required className={fieldClass} value={draft.originalPrice} onChange={(event) => change('originalPrice', Number(event.target.value))} />
          </label>
          <label className={labelClass}>Selling price (₹) *
            <input type="number" min="0" step="1" required className={fieldClass} value={draft.discountPrice} onChange={(event) => change('discountPrice', Number(event.target.value))} />
          </label>
          <label className={labelClass}>Available stock *
            <input type="number" min="0" step="1" required className={fieldClass} value={draft.stockQuantity} onChange={(event) => change('stockQuantity', Number(event.target.value))} />
          </label>
          <label className={labelClass}>Product badge
            <input className={fieldClass} value={draft.badge || ''} onChange={(event) => change('badge', event.target.value)} placeholder="New arrival, Bestseller…" />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Short note
            <input maxLength={180} className={fieldClass} value={draft.tagline} onChange={(event) => change('tagline', event.target.value)} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Description
            <textarea rows={3} className={fieldClass} value={draft.description} onChange={(event) => change('description', event.target.value)} />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>Image URLs (one per line)
            <textarea rows={2} className={fieldClass} value={draft.images.filter((image) => !image.startsWith('data:')).join('\n')}
              onChange={(event) => {
                const uploaded = draft.images.filter((image) => image.startsWith('data:'));
                const urls = event.target.value.split('\n').map((url) => url.trim()).filter(Boolean);
                const images = [...uploaded, ...urls];
                setDraft((current) => ({ ...current, images, primaryImage: current.primaryImage.startsWith('data:') ? current.primaryImage : images[0] || '' }));
              }} />
          </label>
          <div className="sm:col-span-2 rounded-xl border border-dashed border-[#d6c6b8] bg-[#fcf9f6] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#45312c]">Upload a product image</p>
                <p className="mt-1 text-xs text-[#887970]">JPG, PNG, WebP or GIF · 350 KB max</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#d8c6b8] px-4 py-2 text-xs font-semibold text-[#5b112b] hover:bg-white">
                Choose image
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handleUpload} />
              </label>
            </div>
            {draft.primaryImage && (
              <div className="mt-3 flex items-center gap-3">
                <img src={draft.primaryImage} alt="Product preview" className="h-16 w-16 rounded-lg bg-white object-cover" />
                <button type="button" onClick={() => setDraft((current) => {
                  const images = current.images.filter((image) => image !== current.primaryImage);
                  return { ...current, images, primaryImage: images[0] || '' };
                })} className="text-xs font-medium text-[#985568] hover:text-[#5b112b]">Remove image</button>
              </div>
            )}
            {imageError && <p className="mt-2 text-xs text-rose-700">{imageError}</p>}
          </div>
          <label className={`${labelClass} sm:col-span-2`}>Product highlights (one per line)
            <textarea rows={3} className={fieldClass} value={draft.highlights.join('\n')} onChange={(event) => change('highlights', event.target.value.split('\n'))} />
          </label>
          <div className="sm:col-span-2 flex flex-wrap gap-5">
            {([
              ['featured', 'Feature on storefront'],
              ['isBestseller', 'Bestseller'],
              ['isNewArrival', 'New arrival']
            ] as const).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-2 text-xs text-[#594842]">
                <input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => change(key, event.target.checked)} className="accent-[#6c2134]" />
                {label}
              </label>
            ))}
          </div>
        </div>
        {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]">Cancel</button>
          <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#42101f] disabled:cursor-wait disabled:opacity-60">
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ children, onClose, wide = false }) => (
  <div role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }} className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-sm sm:p-6">
    <div role="dialog" aria-modal="true" className={`my-auto w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7`}>
      {children}
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const {
    products, categories, saveCategory, removeCategory, orders, refreshOrders, updateOrderStatus,
    addProduct, updateProduct, deleteProduct, coupons, addCoupon, currentUser, logout,
    setActivePage, addToast
  } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [productSort, setProductSort] = useState('name');
  const [productPage, setProductPage] = useState(1);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const [productModal, setProductModal] = useState<ProductDraft | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [categoryDraft, setCategoryDraft] = useState<StoreCategory | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValue, setCouponValue] = useState(15);
  const [couponMinimum, setCouponMinimum] = useState(1499);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const loadSummary = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await api.adminSummary();
      setSummary(data);
    } catch (error) {
      addToast(`Could not load the admin overview: ${(error as Error).message}`, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary(true);
    refreshOrders().catch((error: Error) => addToast(`Could not load orders: ${error.message}`, 'warning'));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadSummary(), refreshOrders().catch((error: Error) => {
      addToast(`Could not refresh orders: ${error.message}`, 'warning');
    })]);
    setIsRefreshing(false);
  };

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return [...products].filter((product) => {
      const matchesQuery = !query || [product.name, product.brand, product.category, product.subCategory]
        .some((value) => value.toLowerCase().includes(query));
      const matchesCategory = productCategory === 'all' || product.category === productCategory;
      const matchesStock = stockFilter === 'all' ||
        (stockFilter === 'low' && product.stockQuantity > 0 && product.stockQuantity <= 10) ||
        (stockFilter === 'out' && product.stockQuantity === 0);
      return matchesQuery && matchesCategory && matchesStock;
    }).sort((a, b) => productSort === 'stock'
      ? a.stockQuantity - b.stockQuantity
      : productSort === 'price'
        ? a.discountPrice - b.discountPrice
        : a.name.localeCompare(b.name));
  }, [products, productSearch, productCategory, stockFilter, productSort]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return [...orders].filter((order) => {
      const matchesQuery = !query || [
        order.id,
        order.shippingAddress.fullName,
        order.shippingAddress.phone,
        order.shippingAddress.city
      ].some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (orderFilter === 'all' || order.status === orderFilter);
    });
  }, [orders, orderSearch, orderFilter]);

  const productPages = Math.max(1, Math.ceil(filteredProducts.length / 8));
  const orderPages = Math.max(1, Math.ceil(filteredOrders.length / 8));
  const visibleProducts = filteredProducts.slice((productPage - 1) * 8, productPage * 8);
  const visibleOrders = filteredOrders.slice((orderPage - 1) * 8, orderPage * 8);
  const totalRevenue = summary?.revenue ?? orders.reduce((total, order) => total + order.total, 0);
  const statusCounts = orderStatuses.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map(({ count }) => count));
  const lowStock = summary?.lowStock ?? products.filter((product) => product.stockQuantity <= 10);
  const weeklySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toDateString();
    return {
      date,
      amount: orders.filter((order) => new Date(order.date).toDateString() === key)
        .reduce((sum, order) => sum + order.total, 0)
    };
  });
  const maxSales = Math.max(1, ...weeklySales.map(({ amount }) => amount));

  const chooseTab = (next: AdminTab) => {
    setTab(next);
    setMobileMenuOpen(false);
  };

  const startNewProduct = () => {
    setEditingProductId(null);
    setProductModal(emptyProduct(categories[0]?.id || 'beauty'));
  };

  const saveProduct = async (product: ProductDraft) => {
    setSavingProduct(true);
    const succeeded = editingProductId
      ? await updateProduct({ ...product, id: editingProductId })
      : await addProduct(product);
    setSavingProduct(false);
    if (succeeded) {
      setProductModal(null);
      setEditingProductId(null);
    }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setUpdatingOrderId(order.id);
    const succeeded = await updateOrderStatus(order.id, status);
    setUpdatingOrderId('');
    if (succeeded) await loadSummary();
  };

  const startCategory = (category?: StoreCategory) => {
    setEditingCategoryId(category?.id || '');
    setCategoryDraft(category
      ? { ...category }
      : { id: '', label: '', description: '', image: '' });
  };

  const saveCategoryForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryDraft) return;
    setSavingCategory(true);
    const slug = editingCategoryId || categoryDraft.id || categoryDraft.label
      .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const saved = await saveCategory({ ...categoryDraft, id: slug }, !editingCategoryId);
    setSavingCategory(false);
    if (saved) setCategoryDraft(null);
  };

  const handleCouponSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!couponCode.trim()) return;
    setSavingCoupon(true);
    const saved = await addCoupon({
      code: couponCode.trim().toUpperCase(),
      description: `${couponValue}% off your next VYORA order`,
      discountType: 'percentage',
      discountValue: couponValue,
      minOrderValue: couponMinimum
    });
    setSavingCoupon(false);
    if (saved) setCouponCode('');
  };

  const stockAction = async (product: Product, adjustment: number) => {
    await updateProduct({ ...product, stockQuantity: Math.max(0, product.stockQuantity + adjustment) });
  };

  const renderOrdersTable = (items: Order[], compact = false) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[690px] text-left">
        <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
          <tr>
            <th className="px-4 py-3 font-semibold">Order</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Total</th>
            <th className="px-4 py-3 font-semibold">Payment</th>
            {!compact && <th className="px-4 py-3 font-semibold">Fulfillment</th>}
            <th className="px-4 py-3 text-right font-semibold">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f1e9e2]">
          {items.map((order) => (
            <tr key={order.id} className="text-xs transition hover:bg-[#fdfaf7]">
              <td className="px-4 py-3.5">
                <p className="font-semibold text-[#4c2226]">#{order.id}</p>
                <p className="mt-1 text-[10px] text-[#97867c]">{dateLabel(order.date)}</p>
              </td>
              <td className="px-4 py-3.5">
                <p className="font-semibold text-[#3d302b]">{order.shippingAddress.fullName}</p>
                <p className="mt-1 text-[10px] text-[#97867c]">{order.shippingAddress.city}</p>
              </td>
              <td className="px-4 py-3.5 font-semibold text-[#3d302b]">{money(order.total)}</td>
              <td className="px-4 py-3.5">
                <p className="font-medium text-[#55463f]">{order.paymentMethod}</p>
                <p className="mt-1 text-[10px] text-[#97867c]">{order.paymentStatus}</p>
              </td>
              {!compact && (
                <td className="px-4 py-3.5">
                  <select
                    aria-label={`Update order ${order.id} status`}
                    disabled={updatingOrderId === order.id}
                    value={order.status}
                    onChange={(event) => void handleStatusChange(order, event.target.value as OrderStatus)}
                    className="max-w-[155px] rounded-full border border-[#e7dcd3] bg-white px-3 py-2 text-[10px] font-semibold text-[#5b2631] outline-none focus:border-[#9b5363] disabled:opacity-60"
                  >
                    {orderStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                  </select>
                </td>
              )}
              <td className="px-4 py-3.5 text-right">
                <button type="button" onClick={() => setOrderDetails(order)} aria-label={`View order ${order.id}`}
                  className="rounded-full p-2 text-[#8b6a61] transition hover:bg-[#f5ece6] hover:text-[#5b112b]">
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {!items.length && <tr><td colSpan={compact ? 5 : 6} className="px-4 py-12 text-center text-sm text-[#93837a]">No orders match this view.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const renderPager = (page: number, pages: number, setPage: (page: number) => void, total: number) => (
    <div className="flex items-center justify-between border-t border-[#eee4dc] px-4 py-3 text-[11px] text-[#897970]">
      <span>{total ? `${(page - 1) * 8 + 1}–${Math.min(page * 8, total)} of ${total}` : '0 results'}</span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"
          className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <span className="px-2">{page} / {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"
          className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );

  const cardClass = 'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <div className="min-h-screen bg-[#f8f4ef] text-[#2e2522] lg:flex">
      {mobileMenuOpen && <button aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-30 bg-[#1a0b0d]/45 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[#eadfd5] bg-[#fffdfa] px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b112b] text-[#e2c47d]"><Flower2 className="h-5 w-5" /></div>
          <div>
            <p className="font-serif text-lg font-bold tracking-[.14em] text-[#45141e]">VYORA</p>
            <p className="text-[9px] uppercase tracking-[.2em] text-[#9b8174]">Atelier · Admin</p>
          </div>
          <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="ml-auto rounded-lg p-2 text-[#8e7c73] lg:hidden"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-9 px-3 text-[9px] font-bold uppercase tracking-[.19em] text-[#a18f84]">Store workspace</div>
        <nav className="mt-3 space-y-1">
          {tabItems.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => chooseTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${tab === id ? 'bg-[#5b112b] text-white shadow-md shadow-[#5b112b]/15' : 'text-[#71615a] hover:bg-[#f7f0eb] hover:text-[#4c1b27]'}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {id === 'orders' && <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] ${tab === id ? 'bg-white/15' : 'bg-[#f3ebe4]'}`}>{orders.length}</span>}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#eadfd5] bg-[#fbf7f2] p-4">
          <div className="flex items-center gap-2 text-[#8d6a35]"><ShieldCheck className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[.1em]">Private workspace</span></div>
          <p className="mt-2 text-[11px] leading-5 text-[#817269]">Catalog and order controls are available to verified store administrators only.</p>
          <button type="button" onClick={() => { setActivePage('shop'); window.scrollTo({ top: 0 }); }}
            className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-[#5b112b] hover:underline">
            View storefront <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[#eadfd5] bg-[#fffdfa]/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)} className="rounded-xl border border-[#eadfd5] p-2 text-[#634e46] lg:hidden"><Menu className="h-4 w-4" /></button>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.19em] text-[#a28351]">VYORA · Store management</p>
              <h1 className="font-serif text-[17px] leading-tight text-[#3e171e]">{tabItems.find((item) => item.id === tab)?.label}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" disabled={isRefreshing} onClick={() => void handleRefresh()} aria-label="Refresh dashboard data"
              className="rounded-full border border-[#e9ded5] p-2.5 text-[#755f56] transition hover:bg-[#f7f0eb] disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#49312b]">{currentUser?.name || 'Store administrator'}</p>
              <p className="mt-0.5 text-[10px] text-[#9a897f]">{currentUser?.email}</p>
            </div>
            <button type="button" onClick={() => void logout()} title="Sign out" aria-label="Sign out"
              className="inline-flex items-center gap-2 rounded-full border border-[#eadfd5] px-3 py-2 text-[11px] font-semibold text-[#795d55] hover:border-[#d8c4b8] hover:bg-[#faf4ef]">
              <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
          {tab === 'overview' && (
            <>
              <section className="relative overflow-hidden rounded-[24px] bg-[#3c111a] px-6 py-7 text-white sm:px-9 sm:py-9">
                <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-[#ddbd78]/20" />
                <div className="pointer-events-none absolute -right-1 top-4 h-48 w-48 rounded-full border border-[#ddbd78]/15" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.21em] text-[#dfc47f]"><Sparkles className="h-3.5 w-3.5" /> The atelier, in focus</p>
                    <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-[38px]">A considered view of your store.</h2>
                    <p className="mt-2 max-w-lg text-xs leading-5 text-[#f0dfda]/75">A live pulse on your catalog, client orders and day-to-day operations.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={startNewProduct} className="inline-flex items-center gap-2 rounded-full bg-[#d7bd7d] px-4 py-2.5 text-xs font-bold text-[#3b1119] hover:bg-[#e6d5aa]"><Plus className="h-3.5 w-3.5" />Add product</button>
                    <button type="button" onClick={() => chooseTab('orders')} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10">Review orders<ArrowRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Gross revenue" value={isLoading ? '—' : money(totalRevenue)} note="Recorded across all orders" icon={TrendingUp} accent="bg-[#f5eee0] text-[#987235]" />
                <MetricCard label="Total orders" value={isLoading ? '—' : String(summary?.orders ?? orders.length)} note={`${orders.filter((order) => order.status !== 'delivered').length} currently in progress`} icon={ShoppingBag} accent="bg-[#f6e9eb] text-[#853c4a]" />
                <MetricCard label="Active products" value={isLoading ? '—' : String(summary?.products ?? products.length)} note={`${lowStock.length} need a stock check`} icon={Package} accent="bg-[#eaf0e9] text-[#4d7450]" />
                <MetricCard label="Customers" value={isLoading ? '—' : String(summary?.customers ?? '—')} note="Registered customer accounts" icon={Users} accent="bg-[#eeeaf4] text-[#705a8d]" />
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <div className={`${cardClass} p-5 sm:p-6`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Sales analytics</p><h3 className="mt-1 font-serif text-xl text-[#3b191e]">Revenue, last 7 days</h3></div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ec] px-2.5 py-1 text-[10px] font-semibold text-[#517553]"><Activity className="h-3 w-3" /> Live data</span>
                  </div>
                  <div className="mt-7 flex h-48 items-end gap-2 border-b border-l border-[#eee4dc] px-3 pb-0 sm:gap-4">
                    {weeklySales.map(({ date, amount }, index) => {
                      const height = amount ? Math.max(8, amount / maxSales * 100) : 3;
                      return <div key={date.toISOString()} className="group flex h-full flex-1 flex-col items-center justify-end">
                        <span className="mb-2 hidden text-[9px] font-semibold text-[#755d54] group-hover:block">{amount ? money(amount) : '—'}</span>
                        <div title={`${date.toLocaleDateString('en-IN')}: ${money(amount)}`} className={`w-full max-w-[34px] rounded-t-md transition-all ${index === 6 ? 'bg-[#7a2639]' : 'bg-[#ddc9c0] group-hover:bg-[#aa6a72]'}`} style={{ height: `${height}%` }} />
                        <span className="mt-2 -mb-5 text-[9px] text-[#928178]">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                      </div>;
                    })}
                  </div>
                  <div className="mt-9 flex items-center justify-between text-[10px] text-[#928178]"><span>Daily order revenue</span><span className="font-semibold text-[#6d343d]">{money(weeklySales.reduce((sum, item) => sum + item.amount, 0))} this week</span></div>
                </div>

                <div className={`${cardClass} p-5 sm:p-6`}>
                  <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Fulfillment</p><h3 className="mt-1 font-serif text-xl text-[#3b191e]">Order status</h3></div>
                  <div className="mt-5 space-y-3">
                    {statusCounts.filter(({ count }) => count > 0).length === 0 && <p className="py-7 text-center text-xs text-[#928178]">No orders have been placed yet.</p>}
                    {statusCounts.filter(({ count }) => count > 0).map(({ status, count }) => (
                      <div key={status}>
                        <div className="mb-1.5 flex justify-between text-[10px]"><span className="font-medium text-[#594841]">{humanize(status)}</span><span className="font-semibold text-[#6d343d]">{count}</span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#f1eae4]"><div className="h-full rounded-full bg-[#8c3d4d]" style={{ width: `${count / maxStatusCount * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => chooseTab('orders')} className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold text-[#6b2838] hover:underline">Manage fulfillment<ArrowRight className="h-3 w-3" /></button>
                </div>
              </section>

              <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <div className={cardClass}>
                  <div className="flex items-center justify-between p-5 sm:px-6">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Latest activity</p><h3 className="mt-1 font-serif text-xl text-[#3b191e]">Recent orders</h3></div>
                    <button type="button" onClick={() => chooseTab('orders')} className="text-[10px] font-semibold text-[#7d3b49] hover:underline">All orders</button>
                  </div>
                  {renderOrdersTable(orders.slice(0, 5), true)}
                </div>
                <div className={`${cardClass} p-5 sm:p-6`}>
                  <div className="flex items-center justify-between">
                    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Inventory watch</p><h3 className="mt-1 font-serif text-xl text-[#3b191e]">Low stock</h3></div>
                    <CircleAlert className="h-5 w-5 text-[#b17041]" />
                  </div>
                  <div className="mt-4 divide-y divide-[#f0e8e1]">
                    {lowStock.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center gap-3 py-3">
                        <img src={product.primaryImage || undefined} alt="" className="h-11 w-11 rounded-lg bg-[#f6f0eb] object-cover" />
                        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#49342e]">{product.name}</p><p className="mt-1 text-[10px] text-[#94847a]">{product.category}</p></div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${product.stockQuantity === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{product.stockQuantity === 0 ? 'Out' : `${product.stockQuantity} left`}</span>
                      </div>
                    ))}
                    {!lowStock.length && <p className="py-8 text-center text-xs text-[#918178]">Inventory is in good shape.</p>}
                  </div>
                  <button type="button" onClick={() => { setStockFilter('low'); chooseTab('products'); }} className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-[#6b2838] hover:underline">Review inventory<ArrowRight className="h-3 w-3" /></button>
                </div>
              </section>
            </>
          )}

          {tab === 'products' && (
            <section className={cardClass}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Catalog & inventory</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Product collection</h2></div>
                <button type="button" onClick={startNewProduct} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5b112b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#42101f]"><Plus className="h-3.5 w-3.5" />Add product</button>
              </div>
              <div className="flex flex-col gap-2 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 lg:flex-row">
                <label className="relative min-w-[190px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
                  <input value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setProductPage(1); }} placeholder="Search products, brand or category" className="w-full rounded-full border border-[#e9ded5] bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]" />
                </label>
                <select value={productCategory} onChange={(event) => { setProductCategory(event.target.value); setProductPage(1); }} className="rounded-full border border-[#e9ded5] bg-white px-3 py-2.5 text-xs text-[#5b4b44] outline-none">
                  <option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
                <select value={stockFilter} onChange={(event) => { setStockFilter(event.target.value); setProductPage(1); }} className="rounded-full border border-[#e9ded5] bg-white px-3 py-2.5 text-xs text-[#5b4b44] outline-none">
                  <option value="all">All inventory</option><option value="low">Low stock (1–10)</option><option value="out">Out of stock</option>
                </select>
                <select value={productSort} onChange={(event) => setProductSort(event.target.value)} className="rounded-full border border-[#e9ded5] bg-white px-3 py-2.5 text-xs text-[#5b4b44] outline-none">
                  <option value="name">Name A–Z</option><option value="stock">Stock: low first</option><option value="price">Price: low first</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
                    <tr><th className="px-5 py-3 font-semibold">Product</th><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Price</th><th className="px-4 py-3 font-semibold">Available stock</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1e9e2]">
                    {visibleProducts.map((product) => (
                      <tr key={product.id} className="text-xs hover:bg-[#fdfaf7]">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3"><img src={product.primaryImage || undefined} alt="" className="h-12 w-12 rounded-lg bg-[#f5efea] object-cover" />
                            <div><p className="max-w-[230px] truncate font-semibold text-[#40312c]">{product.name}</p><p className="mt-1 text-[10px] text-[#95847b]">{product.brand}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#725f56]">{categories.find((category) => category.id === product.category)?.label || product.category}</td>
                        <td className="px-4 py-3"><p className="font-semibold text-[#4c2028]">{money(product.discountPrice)}</p>{product.originalPrice > product.discountPrice && <p className="mt-1 text-[10px] text-[#a4968c] line-through">{money(product.originalPrice)}</p>}</td>
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#eee4dc] bg-white px-1.5 py-1">
                            <button type="button" aria-label={`Reduce ${product.name} stock`} onClick={() => void stockAction(product, -1)} className="grid h-5 w-5 place-items-center rounded-full text-[#735c53] hover:bg-[#f4ece6]">−</button>
                            <span className="min-w-5 text-center font-semibold tabular-nums">{product.stockQuantity}</span>
                            <button type="button" aria-label={`Increase ${product.name} stock`} onClick={() => void stockAction(product, 1)} className="grid h-5 w-5 place-items-center rounded-full text-[#735c53] hover:bg-[#f4ece6]">+</button>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${product.stockQuantity === 0 ? 'bg-rose-50 text-rose-700' : product.stockQuantity <= 10 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{product.stockQuantity === 0 ? 'Out of stock' : product.stockQuantity <= 10 ? 'Low stock' : 'In stock'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => { setEditingProductId(product.id); setProductModal({ ...product }); }} aria-label={`Edit ${product.name}`} className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6] hover:text-[#5b112b]"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={async () => {
                              if (window.confirm(`Delete “${product.name}” from the live catalog?`)) await deleteProduct(product.id);
                            }} aria-label={`Delete ${product.name}`} className="rounded-lg p-2 text-[#a17777] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleProducts.length && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-[#95847b]">No products match your search or filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              {renderPager(productPage, productPages, setProductPage, filteredProducts.length)}
            </section>
          )}

          {tab === 'orders' && (
            <section className={cardClass}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Client fulfillment</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Orders & dispatch</h2></div>
                <span className="rounded-full bg-[#f7eee8] px-3 py-1.5 text-[10px] font-semibold text-[#805c50]">{filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}</span>
              </div>
              <div className="flex flex-col gap-2 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 sm:flex-row">
                <label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" /><input value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); setOrderPage(1); }} placeholder="Search order, customer, phone or city" className="w-full rounded-full border border-[#e9ded5] bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]" /></label>
                <select value={orderFilter} onChange={(event) => { setOrderFilter(event.target.value); setOrderPage(1); }} className="rounded-full border border-[#e9ded5] bg-white px-3 py-2.5 text-xs text-[#5b4b44] outline-none">
                  <option value="all">All fulfillment statuses</option>{orderStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                </select>
              </div>
              {renderOrdersTable(visibleOrders)}
              {renderPager(orderPage, orderPages, setOrderPage, filteredOrders.length)}
            </section>
          )}

          {tab === 'categories' && (
            <section className={cardClass}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Store taxonomy</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Curated categories</h2><p className="mt-1 text-xs text-[#8e7d74]">Category updates appear in storefront navigation and product filters.</p></div>
                <button type="button" onClick={() => startCategory()} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5b112b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#42101f]"><Plus className="h-3.5 w-3.5" />Add category</button>
              </div>
              <div className="grid gap-4 border-t border-[#eee4dc] bg-[#fdfbf9] p-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <article key={category.id} className="overflow-hidden rounded-2xl border border-[#eee4dc] bg-white">
                    {category.image ? <img src={category.image} alt="" className="h-32 w-full bg-[#f5efea] object-cover" /> : <div className="grid h-32 place-items-center bg-gradient-to-br from-[#f7eee6] to-[#ead9d0] text-[#9b7770]"><Tag className="h-7 w-7" /></div>}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-serif text-lg text-[#45252a]">{category.label}</h3><p className="mt-1 text-[10px] text-[#a08d82]">/{category.id} · {products.filter((product) => product.category === category.id).length} products</p></div><div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${category.label}`} onClick={() => startCategory(category)} className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Delete ${category.label}`} onClick={async () => {
                          const productCount = products.filter((product) => product.category === category.id).length;
                          if (productCount) {
                            addToast('Move or remove products from this category before deleting it.', 'warning');
                            return;
                          }
                          if (window.confirm(`Delete the “${category.label}” category?`)) await removeCategory(category.id);
                        }} className="rounded-lg p-2 text-[#a17777] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div></div>
                      <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-5 text-[#78675f]">{category.description || 'Add a short collection description to introduce this department.'}</p>
                    </div>
                  </article>
                ))}
                {!categories.length && <p className="col-span-full py-12 text-center text-sm text-[#95847b]">No categories yet. Add one to start organizing the catalog.</p>}
              </div>
            </section>
          )}

          {tab === 'campaigns' && (
            <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
              <div className={`${cardClass} p-5 sm:p-6`}>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Promotional studio</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Create a campaign</h2>
                <form onSubmit={(event) => void handleCouponSubmit(event)} className="mt-5 space-y-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Discount code
                    <input required minLength={3} maxLength={30} pattern="(?:[A-Za-z0-9]|_|-)+" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="ATELIER15" className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-[#8c3448]" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Discount %
                      <input type="number" required min={1} max={100} value={couponValue} onChange={(event) => setCouponValue(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#8c3448]" />
                    </label>
                    <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Minimum order ₹
                      <input type="number" required min={0} value={couponMinimum} onChange={(event) => setCouponMinimum(Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#8c3448]" />
                    </label>
                  </div>
                  <button disabled={savingCoupon} type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5b112b] px-4 py-3 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-55">{savingCoupon ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Publish campaign</button>
                </form>
              </div>
              <div className={`${cardClass} p-5 sm:p-6`}>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Live on storefront</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Active campaigns</h2>
                <div className="mt-4 divide-y divide-[#f0e8e1]">
                  {coupons.map((coupon) => <CouponRow key={coupon.code} coupon={coupon} />)}
                  {!coupons.length && <p className="py-14 text-center text-sm text-[#95847b]">No active campaigns yet.</p>}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {productModal && <ProductEditor key={editingProductId || 'new-product'} initial={productModal} categories={categories}
        saving={savingProduct} onSave={saveProduct} onClose={() => { setProductModal(null); setEditingProductId(null); }} />}
      {categoryDraft && (
        <Modal onClose={() => setCategoryDraft(null)}>
          <form onSubmit={(event) => void saveCategoryForm(event)} className="space-y-4">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">Store taxonomy</p><h2 className="mt-1 font-serif text-2xl text-[#341016]">{editingCategoryId ? 'Edit category' : 'New category'}</h2></div>
              <button type="button" aria-label="Close dialog" onClick={() => setCategoryDraft(null)} className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"><X className="h-4 w-4" /></button>
            </div>
            <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Category name *
              <input autoFocus required minLength={2} maxLength={100} value={categoryDraft.label} onChange={(event) => setCategoryDraft({ ...categoryDraft, label: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#8c3448]" />
            </label>
            {!editingCategoryId && <p className="text-[10px] text-[#928178]">Store URL key: {categoryDraft.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category-name'}</p>}
            <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Description
              <textarea rows={3} maxLength={1000} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#8c3448]" />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">Category image URL
              <input type="url" maxLength={2000} value={categoryDraft.image} onChange={(event) => setCategoryDraft({ ...categoryDraft, image: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-sm outline-none focus:border-[#8c3448]" />
            </label>
            <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
              <button type="button" onClick={() => setCategoryDraft(null)} className="rounded-full px-4 py-2.5 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]">Cancel</button>
              <button disabled={savingCategory} type="submit" className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{savingCategory ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save category</button>
            </div>
          </form>
        </Modal>
      )}
      {orderDetails && (
        <Modal onClose={() => setOrderDetails(null)} wide>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">Order record</p><h2 className="mt-1 font-serif text-2xl text-[#341016]">#{orderDetails.id}</h2><p className="mt-1 text-xs text-[#897970]">Placed {dateLabel(orderDetails.date)}</p></div>
            <button type="button" aria-label="Close order details" onClick={() => setOrderDetails(null)} className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#faf6f2] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">Deliver to</p><p className="mt-2 text-sm font-semibold text-[#44322c]">{orderDetails.shippingAddress.fullName}</p><p className="mt-1 text-xs leading-5 text-[#78665e]">{orderDetails.shippingAddress.street}, {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.state} {orderDetails.shippingAddress.pincode}</p><p className="mt-1 text-xs text-[#78665e]">{orderDetails.shippingAddress.phone}</p></div>
            <div className="rounded-xl bg-[#faf6f2] p-4"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">Payment & status</p><p className="mt-2 text-sm font-semibold text-[#44322c]">{orderDetails.paymentMethod} · {orderDetails.paymentStatus}</p><p className="mt-1 text-xs text-[#78665e]">Fulfillment: {humanize(orderDetails.status)}</p><p className="mt-1 text-xs text-[#78665e]">Estimated delivery: {orderDetails.estimatedDeliveryDate}</p>{orderDetails.paymentId && <p className="mt-1 break-all text-[10px] text-[#9a8579]">Payment reference: {orderDetails.paymentId}</p>}</div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">Items · {orderDetails.items.length}</p>
            <div className="max-h-56 divide-y divide-[#eee4dc] overflow-y-auto rounded-xl border border-[#eee4dc]">
              {orderDetails.items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center gap-3 p-3">
                <img src={item.image || undefined} alt="" className="h-12 w-12 rounded-lg bg-[#f5efea] object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#44322c]">{item.name}</p><p className="mt-1 text-[10px] text-[#928178]">{item.size || item.color ? [item.size, item.color].filter(Boolean).join(' · ') : 'Standard'} · Qty {item.quantity}</p></div>
                <span className="text-xs font-semibold text-[#58303a]">{money(item.price * item.quantity)}</span>
              </div>)}
            </div>
          </div>
          <div className="ml-auto mt-4 max-w-xs space-y-2 text-xs">
            <div className="flex justify-between text-[#77665e]"><span>Subtotal</span><span>{money(orderDetails.subtotal)}</span></div>
            {orderDetails.discount > 0 && <div className="flex justify-between text-[#77665e]"><span>Discount</span><span>−{money(orderDetails.discount)}</span></div>}
            <div className="flex justify-between text-[#77665e]"><span>Delivery</span><span>{money(orderDetails.deliveryFee)}</span></div>
            <div className="flex justify-between border-t border-[#eadfd5] pt-2 text-sm font-bold text-[#431720]"><span>Total</span><span>{money(orderDetails.total)}</span></div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const CouponRow: React.FC<{ coupon: Coupon }> = ({ coupon }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-4">
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5eee0] text-[#a17d3d]"><BadgePercent className="h-5 w-5" /></span>
      <div><p className="font-mono text-xs font-bold tracking-wider text-[#67303b]">{coupon.code}</p><p className="mt-1 text-[10px] text-[#938178]">{coupon.description}</p></div>
    </div>
    <div className="text-right"><p className="text-xs font-semibold text-[#49342e]">{coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `${money(coupon.discountValue)} off`}</p><p className="mt-1 text-[10px] text-[#938178]">Min. {money(coupon.minOrderValue)}</p></div>
  </div>
);
