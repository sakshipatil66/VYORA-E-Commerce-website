import React, { useEffect, useState } from 'react';
import {
  BadgePercent,
  Boxes,
  Check,
  ExternalLink,
  Flower2,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Undo2,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../lib/api';
import {
  AdminAnalyticsData,
  AdminCouponSummary,
  AdminCustomer,
  AdminCustomerDetail,
  AdminInventorySummary,
  AdminRefundSummary,
  AdminReturnSummary,
  AdminShipmentSummary,
  AnalyticsGranularity,
  AnalyticsRange,
  Coupon,
  InventoryAdjustmentReason,
  Order,
  OrderShipmentInfo,
  OrderStatus,
  Product,
  RefundMethod,
  RefundStatus,
  ReturnRequest,
  ReturnStatus,
  StoreCategory
} from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';
import { AdminCoupons } from './AdminCoupons';
import { AdminCustomers } from './AdminCustomers';
import { AdminInventory } from './AdminInventory';
import { AdminOverview } from './AdminOverview';
import { AdminOrders } from './AdminOrders';
import { AdminProducts } from './AdminProducts';
import { AdminRefunds } from './AdminRefunds';
import { AdminReturns } from './AdminReturns';
import { AdminShipping } from './AdminShipping';

type AdminTab =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'shipping'
  | 'returns'
  | 'refunds'
  | 'customers'
  | 'categories'
  | 'coupons';
type ProductDraft = Omit<Product, 'id'>;

const createDraftSku = (categoryId: string) => {
  const prefix = (categoryId || 'ITEM')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4) || 'ITEM';
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VY-${prefix}-${suffix}`;
};

const emptyProduct = (categoryId: string): ProductDraft => ({
  sku: createDraftSku(categoryId),
  isActive: true,
  lowStockThreshold: 10,
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
  { id: 'inventory', label: 'Inventory', icon: Layers },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'shipping', label: 'Shipping', icon: Truck },
  { id: 'returns', label: 'Returns', icon: Undo2 },
  { id: 'refunds', label: 'Refunds', icon: Wallet },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'categories', label: 'Categories', icon: Boxes },
  { id: 'coupons', label: 'Coupons', icon: BadgePercent }
];

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
    const normalizedSku = (draft.sku || '').trim().toUpperCase();
    if (normalizedSku && !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(normalizedSku)) {
      setFormError('SKU must be 2–40 characters using letters, numbers, hyphens, or underscores.');
      return;
    }
    if (
      !Number.isFinite(draft.originalPrice) ||
      !Number.isFinite(draft.discountPrice) ||
      draft.originalPrice < 0 ||
      draft.discountPrice < 0 ||
      draft.discountPrice > draft.originalPrice ||
      !Number.isInteger(draft.stockQuantity) ||
      draft.stockQuantity < 0
    ) {
      setFormError('Prices and stock must be valid whole numbers; offer price cannot exceed MRP.');
      return;
    }
    const threshold = draft.lowStockThreshold ?? 10;
    if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10000) {
      setFormError('Low-stock alert threshold must be a whole number between 0 and 10,000.');
      return;
    }
    const images = draft.images.filter(Boolean);
    const product: ProductDraft = {
      ...draft,
      sku: normalizedSku || createDraftSku(draft.category),
      isActive: draft.isActive !== false,
      lowStockThreshold: threshold,
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
          <div className={labelClass}>
            <div className="flex items-center justify-between">
              <span>SKU code</span>
              <button
                type="button"
                onClick={() => change('sku', createDraftSku(draft.category))}
                className="inline-flex items-center gap-1 text-[10px] font-semibold normal-case tracking-normal text-[#7a1438] hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Auto-generate
              </button>
            </div>
            <input
              maxLength={40}
              placeholder="VY-BEAU-4821"
              className={`${fieldClass} font-mono uppercase`}
              value={draft.sku || ''}
              onChange={(event) =>
                change('sku', event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
              }
            />
          </div>
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
          <label className={labelClass}>Product badge
            <input className={fieldClass} value={draft.badge || ''} onChange={(event) => change('badge', event.target.value)} placeholder="New arrival, Bestseller…" />
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
          <label className={labelClass}>Low-stock alert threshold
            <input type="number" min="0" max="10000" step="1" className={fieldClass} value={draft.lowStockThreshold ?? 10} onChange={(event) => change('lowStockThreshold', Number(event.target.value))} />
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
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3b191e]">
              <input
                type="checkbox"
                checked={draft.isActive !== false}
                onChange={(event) => change('isActive', event.target.checked)}
                className="accent-[#6c2134]"
              />
              Active &amp; visible on storefront
            </label>
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
    products, categories, saveCategory, removeCategory, orders, refreshOrders, refreshProducts,
    refreshCoupons, updateOrderStatus, updateOrderShipment,
    addProduct, updateProduct, deleteProduct, currentUser, logout,
    setActivePage, addToast
  } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>(products);
  const [inventoryData, setInventoryData] = useState<AdminInventorySummary | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [customerStats, setCustomerStats] = useState<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalLifetimeValue: number;
  } | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [couponSummary, setCouponSummary] = useState<AdminCouponSummary | null>(null);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [returnSummary, setReturnSummary] = useState<AdminReturnSummary | null>(null);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [refundSummary, setRefundSummary] = useState<AdminRefundSummary | null>(null);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  const [shipmentSummary, setShipmentSummary] = useState<AdminShipmentSummary | null>(null);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [preselectedReturnForRefund, setPreselectedReturnForRefund] = useState<ReturnRequest | null>(null);
  const [inventoryFocusProductId, setInventoryFocusProductId] = useState<string | null>(null);
  const [productStockFilterPreset, setProductStockFilterPreset] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d');
  const [analyticsGranularity, setAnalyticsGranularity] = useState<AnalyticsGranularity>('daily');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [orderStatusPreset, setOrderStatusPreset] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productModal, setProductModal] = useState<ProductDraft | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [categoryDraft, setCategoryDraft] = useState<StoreCategory | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'product'; product: Product }
    | { type: 'category'; category: StoreCategory }
    | null
  >(null);
  const [deletingTarget, setDeletingTarget] = useState(false);

  const loadAnalytics = async (
    showLoading = false,
    overrides?: {
      range?: AnalyticsRange;
      granularity?: AnalyticsGranularity;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await api.adminAnalytics({
        range: overrides?.range ?? analyticsRange,
        granularity: overrides?.granularity ?? analyticsGranularity,
        startDate: overrides?.startDate ?? analyticsStartDate,
        endDate: overrides?.endDate ?? analyticsEndDate
      });
      setAnalytics(data);
    } catch (error) {
      addToast(`Could not load the admin analytics: ${(error as Error).message}`, 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminCatalogAndInventory = async (showLoading = false) => {
    if (showLoading) setLoadingInventory(true);
    try {
      const [catalogRes, invRes] = await Promise.all([
        api.adminProducts(),
        api.adminInventory()
      ]);
      setAdminProducts(catalogRes.products);
      setInventoryData(invRes);
    } catch (error) {
      addToast(`Could not load catalog inventory: ${(error as Error).message}`, 'warning');
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadCustomersAndCoupons = async (showLoading = false) => {
    if (showLoading) {
      setLoadingCustomers(true);
      setLoadingCoupons(true);
    }
    try {
      const [custRes, coupRes] = await Promise.all([api.adminCustomers(), api.adminCoupons()]);
      setCustomers(custRes.customers);
      setCustomerStats(custRes.stats);
      setCouponSummary(coupRes);
    } catch (error) {
      addToast(`Could not load customer or coupon data: ${(error as Error).message}`, 'warning');
    } finally {
      setLoadingCustomers(false);
      setLoadingCoupons(false);
    }
  };

  const loadReturnsRefundsAndShipping = async (showLoading = false) => {
    if (showLoading) {
      setLoadingReturns(true);
      setLoadingRefunds(true);
      setLoadingShipments(true);
    }
    try {
      const [retRes, refRes, shipRes] = await Promise.all([
        api.adminReturns(),
        api.adminRefunds(),
        api.adminShipments()
      ]);
      setReturnSummary(retRes);
      setRefundSummary(refRes);
      setShipmentSummary(shipRes);
    } catch (error) {
      addToast(`Could not load returns, refunds, or shipping data: ${(error as Error).message}`, 'warning');
    } finally {
      setLoadingReturns(false);
      setLoadingRefunds(false);
      setLoadingShipments(false);
    }
  };

  useEffect(() => {
    void loadAnalytics(true);
    void loadAdminCatalogAndInventory(true);
    void loadCustomersAndCoupons(true);
    void loadReturnsRefundsAndShipping(true);
    refreshOrders().catch((error: Error) => addToast(`Could not load orders: ${error.message}`, 'warning'));
  }, []);

  useEffect(() => {
    if (analyticsRange === 'custom' && !analyticsStartDate) return;
    void loadAnalytics(false, {
      range: analyticsRange,
      granularity: analyticsGranularity,
      startDate: analyticsStartDate,
      endDate: analyticsEndDate
    });
  }, [analyticsRange, analyticsGranularity, analyticsStartDate, analyticsEndDate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadAnalytics(false),
      loadAdminCatalogAndInventory(false),
      loadCustomersAndCoupons(false),
      loadReturnsRefundsAndShipping(false),
      refreshProducts().catch((error: Error) => {
        addToast(`Could not refresh storefront products: ${error.message}`, 'warning');
      }),
      refreshOrders().catch((error: Error) => {
        addToast(`Could not refresh orders: ${error.message}`, 'warning');
      }),
      refreshCoupons().catch((error: Error) => {
        addToast(`Could not refresh coupons: ${error.message}`, 'warning');
      })
    ]);
    setIsRefreshing(false);
  };

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
      await Promise.all([loadAdminCatalogAndInventory(false), loadAnalytics(false)]);
    }
  };

  const handleToggleProductVisibility = async (product: Product, nextActive: boolean) => {
    try {
      const { product: updated } = await api.toggleProductVisibility(product.id, nextActive);
      setAdminProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await Promise.all([refreshProducts(), loadAdminCatalogAndInventory(false), loadAnalytics(false)]);
      addToast(
        nextActive
          ? `"${updated.name}" is now active on the storefront.`
          : `"${updated.name}" has been hidden from the storefront.`
      );
    } catch (error) {
      addToast(`Could not update product visibility: ${(error as Error).message}`, 'warning');
    }
  };

  const handleAdjustStock = async (data: {
    productId: string;
    adjustment: number;
    reason: Exclude<InventoryAdjustmentReason, 'order_sale' | 'order_cancel_restock' | 'return_restock'>;
    note?: string;
  }): Promise<boolean> => {
    try {
      const { product: updated } = await api.adjustInventory(data);
      setAdminProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await Promise.all([refreshProducts(), loadAdminCatalogAndInventory(false), loadAnalytics(false)]);
      addToast(
        `Inventory updated for "${updated.name}" (Stock: ${updated.stockQuantity}).`
      );
      return true;
    } catch (error) {
      addToast(`Could not adjust stock: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleUpdateThreshold = async (productId: string, threshold: number): Promise<boolean> => {
    try {
      const { product: updated } = await api.updateProductThreshold(productId, threshold);
      setAdminProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      await Promise.all([refreshProducts(), loadAdminCatalogAndInventory(false), loadAnalytics(false)]);
      addToast(`Low-stock alert threshold set to ≤ ${threshold} for "${updated.name}".`);
      return true;
    } catch (error) {
      addToast(`Could not update threshold: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleFetchInventoryLogs = async (params?: {
    productId?: string;
    reason?: string;
    search?: string;
  }) => {
    try {
      const res = await api.inventoryLogs({ ...params, limit: 200 });
      return res.logs;
    } catch (error) {
      addToast(`Could not load inventory logs: ${(error as Error).message}`, 'warning');
      return [];
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus, note?: string) => {
    setUpdatingOrderId(orderId);
    const succeeded = await updateOrderStatus(orderId, status, note);
    setUpdatingOrderId('');
    if (succeeded) {
      await Promise.all([
        loadAnalytics(false),
        loadReturnsRefundsAndShipping(false),
        ...(status === 'cancelled' ? [loadAdminCatalogAndInventory(false), refreshProducts()] : [])
      ]);
    }
    return succeeded;
  };

  const handleShipmentUpdate = async (orderId: string, shipment: OrderShipmentInfo) => {
    const succeeded = await updateOrderShipment(orderId, shipment);
    if (succeeded) {
      await Promise.all([loadAnalytics(false), loadReturnsRefundsAndShipping(false), refreshOrders()]);
    }
    return succeeded;
  };

  const handleUpdateReturnStatus = async (
    returnId: string,
    status: ReturnStatus,
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      await api.updateReturnStatus(returnId, status, adminNotes);
      await loadReturnsRefundsAndShipping(false);
      addToast(`Return ${returnId} updated to ${status.replace(/_/g, ' ')}.`);
      return true;
    } catch (error) {
      addToast(`Could not update return status: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleInspectReturnItems = async (
    returnId: string,
    items: {
      productId: string;
      receivedQuantity: number;
      restockableQuantity: number;
      damagedQuantity: number;
    }[],
    adminNotes?: string
  ): Promise<boolean> => {
    try {
      await api.inspectReturnItems(returnId, items, adminNotes);
      await Promise.all([
        loadReturnsRefundsAndShipping(false),
        loadAdminCatalogAndInventory(false),
        refreshProducts(),
        loadAnalytics(false)
      ]);
      addToast(`Inspection recorded and eligible stock restored for ${returnId}.`);
      return true;
    } catch (error) {
      addToast(`Could not complete return inspection: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleProcessRefund = async (payload: {
    orderId: string;
    returnId?: string;
    mode: 'razorpay' | 'manual';
    method: RefundMethod;
    amount: number;
    idempotencyKey: string;
    referenceId?: string;
    notes?: string;
    markCompleted?: boolean;
  }): Promise<boolean> => {
    try {
      const { refund } = await api.processRefund(payload);
      await Promise.all([loadReturnsRefundsAndShipping(false), loadAnalytics(false)]);
      addToast(`Refund ${refund.id} saved (${refund.status.replace(/_/g, ' ')}).`);
      return true;
    } catch (error) {
      await loadReturnsRefundsAndShipping(false);
      addToast(`Refund error: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleUpdateRefund = async (
    refundId: string,
    payload: {
      status: Extract<RefundStatus, 'manually_completed' | 'failed'>;
      referenceId?: string;
      notes?: string;
    }
  ): Promise<boolean> => {
    try {
      const { refund } = await api.updateRefund(refundId, payload);
      await loadReturnsRefundsAndShipping(false);
      addToast(`Refund ${refund.id} marked ${refund.status.replace(/_/g, ' ')}.`);
      return true;
    } catch (error) {
      addToast(`Could not update refund: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleSyncRazorpayRefund = async (refundId: string): Promise<boolean> => {
    try {
      const { refund } = await api.syncRazorpayRefund(refundId);
      await loadReturnsRefundsAndShipping(false);
      addToast(`Razorpay status synced: ${refund.status.replace(/_/g, ' ')}.`);
      return true;
    } catch (error) {
      addToast(`Could not verify Razorpay refund status: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingTarget(true);
    let ok = false;
    if (deleteTarget.type === 'product') {
      ok = await deleteProduct(deleteTarget.product.id);
    } else {
      ok = await removeCategory(deleteTarget.category.id);
    }
    setDeletingTarget(false);
    if (ok) {
      setDeleteTarget(null);
      await Promise.all([loadAdminCatalogAndInventory(false), loadAnalytics(false)]);
    }
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

  const handleInspectCustomer = async (customerId: string): Promise<AdminCustomerDetail | null> => {
    try {
      return await api.adminCustomer(customerId);
    } catch (error) {
      addToast(`Could not load customer details: ${(error as Error).message}`, 'warning');
      return null;
    }
  };

  const handleToggleCustomerStatus = async (
    customer: AdminCustomer,
    nextActive: boolean
  ): Promise<boolean> => {
    try {
      const { customer: updated } = await api.updateCustomerStatus(customer.id, nextActive);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await loadCustomersAndCoupons(false);
      addToast(
        nextActive
          ? `"${updated.name}" account has been activated.`
          : `"${updated.name}" account has been deactivated.`
      );
      return true;
    } catch (error) {
      addToast(`Could not update customer status: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleCreateCoupon = async (coupon: Coupon): Promise<boolean> => {
    try {
      const { coupon: created } = await api.addCoupon(coupon);
      await Promise.all([loadCustomersAndCoupons(false), refreshCoupons()]);
      addToast(`Coupon "${created.code}" created.`);
      return true;
    } catch (error) {
      addToast(`Could not create coupon: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleUpdateCoupon = async (code: string, coupon: Coupon): Promise<boolean> => {
    try {
      const { coupon: updated } = await api.updateCoupon(code, coupon);
      await Promise.all([loadCustomersAndCoupons(false), refreshCoupons()]);
      addToast(`Coupon "${updated.code}" updated.`);
      return true;
    } catch (error) {
      addToast(`Could not update coupon: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleToggleCouponStatus = async (code: string, nextActive: boolean): Promise<boolean> => {
    try {
      const { coupon: updated } = await api.toggleCouponStatus(code, nextActive);
      await Promise.all([loadCustomersAndCoupons(false), refreshCoupons()]);
      addToast(
        nextActive
          ? `Coupon "${updated.code}" activated.`
          : `Coupon "${updated.code}" paused.`
      );
      return true;
    } catch (error) {
      addToast(`Could not update coupon status: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const handleDeleteCoupon = async (code: string): Promise<boolean> => {
    try {
      await api.deleteCoupon(code);
      await Promise.all([loadCustomersAndCoupons(false), refreshCoupons()]);
      addToast(`Coupon "${code}" deleted.`, 'info');
      return true;
    } catch (error) {
      addToast(`Could not delete coupon: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  const inventoryAlertCount =
    (inventoryData?.summary.lowStockCount ?? 0) + (inventoryData?.summary.outOfStockCount ?? 0);
  const pendingReturnsCount = returnSummary?.stats.pendingReturns ?? 0;

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
        <nav className="mt-3 space-y-1 overflow-y-auto pr-1">
          {tabItems.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} onClick={() => chooseTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${tab === id ? 'bg-[#5b112b] text-white shadow-md shadow-[#5b112b]/15' : 'text-[#71615a] hover:bg-[#f7f0eb] hover:text-[#4c1b27]'}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {id === 'orders' && <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] ${tab === id ? 'bg-white/15' : 'bg-[#f3ebe4]'}`}>{orders.length}</span>}
              {id === 'returns' && pendingReturnsCount > 0 && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${tab === id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {pendingReturnsCount}
                </span>
              )}
              {id === 'inventory' && inventoryAlertCount > 0 && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${tab === id ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {inventoryAlertCount}
                </span>
              )}
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
            <AdminOverview
              analytics={analytics}
              loading={isLoading}
              range={analyticsRange}
              granularity={analyticsGranularity}
              startDate={analyticsStartDate}
              endDate={analyticsEndDate}
              onRangeChange={setAnalyticsRange}
              onGranularityChange={setAnalyticsGranularity}
              onStartDateChange={setAnalyticsStartDate}
              onEndDateChange={setAnalyticsEndDate}
              onStartNewProduct={startNewProduct}
              onNavigateOrders={(statusFilter = 'all') => {
                setOrderStatusPreset(statusFilter);
                chooseTab('orders');
              }}
              onNavigateProducts={(nextStock = 'all') => {
                setProductStockFilterPreset(nextStock);
                chooseTab('products');
              }}
              onInspectOrder={(order) => {
                setOrderDetails(order);
                chooseTab('orders');
              }}
            />
          )}

          {tab === 'products' && (
            <AdminProducts
              products={adminProducts}
              categories={categories}
              initialStockFilter={productStockFilterPreset}
              onStartNew={startNewProduct}
              onEdit={(product) => {
                setEditingProductId(product.id);
                setProductModal({ ...product });
              }}
              onToggleVisibility={handleToggleProductVisibility}
              onDelete={(product) => setDeleteTarget({ type: 'product', product })}
              onOpenInventoryForProduct={(product) => {
                setInventoryFocusProductId(product.id);
                chooseTab('inventory');
              }}
            />
          )}

          {tab === 'inventory' && (
            <AdminInventory
              inventory={inventoryData}
              categories={categories}
              loading={loadingInventory}
              initialFocusProductId={inventoryFocusProductId}
              onClearFocusProduct={() => setInventoryFocusProductId(null)}
              onAdjustStock={handleAdjustStock}
              onUpdateThreshold={handleUpdateThreshold}
              onFetchLogs={handleFetchInventoryLogs}
            />
          )}

          {tab === 'orders' && (
            <AdminOrders
              orders={orders}
              products={adminProducts.length ? adminProducts : products}
              initialStatusFilter={orderStatusPreset}
              updatingOrderId={updatingOrderId}
              selectedOrder={orderDetails}
              onSelectOrder={setOrderDetails}
              onUpdateStatus={handleStatusChange}
              onUpdateShipment={handleShipmentUpdate}
            />
          )}

          {tab === 'shipping' && (
            <AdminShipping
              data={shipmentSummary}
              loading={loadingShipments}
              onUpdateShipment={handleShipmentUpdate}
            />
          )}

          {tab === 'returns' && (
            <AdminReturns
              data={returnSummary}
              loading={loadingReturns}
              onUpdateStatus={handleUpdateReturnStatus}
              onInspectItems={handleInspectReturnItems}
              onOpenRefundForReturn={(ret) => {
                setPreselectedReturnForRefund(ret);
                chooseTab('refunds');
              }}
            />
          )}

          {tab === 'refunds' && (
            <AdminRefunds
              data={refundSummary}
              returns={returnSummary?.returns || []}
              loading={loadingRefunds}
              preselectedReturn={preselectedReturnForRefund}
              onClearPreselectedReturn={() => setPreselectedReturnForRefund(null)}
              onProcessRefund={handleProcessRefund}
              onUpdateRefund={handleUpdateRefund}
              onSyncRazorpayRefund={handleSyncRazorpayRefund}
            />
          )}

          {tab === 'categories' && (
            <section className={cardClass}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">Store taxonomy</p><h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Curated categories</h2><p className="mt-1 text-xs text-[#8e7d74]">Category updates appear in storefront navigation and product filters.</p></div>
                <button type="button" onClick={() => startCategory()} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5b112b] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#42101f]"><Plus className="h-3.5 w-3.5" />Add category</button>
              </div>
              <div className="grid gap-4 border-t border-[#eee4dc] bg-[#fdfbf9] p-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => {
                  const catalogSource = adminProducts.length ? adminProducts : products;
                  const productCount = catalogSource.filter((product) => product.category === category.id).length;
                  return (
                  <article key={category.id} className="overflow-hidden rounded-2xl border border-[#eee4dc] bg-white">
                    {category.image ? <img src={category.image} alt="" className="h-32 w-full bg-[#f5efea] object-cover" /> : <div className="grid h-32 place-items-center bg-gradient-to-br from-[#f7eee6] to-[#ead9d0] text-[#9b7770]"><Tag className="h-7 w-7" /></div>}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-serif text-lg text-[#45252a]">{category.label}</h3><p className="mt-1 text-[10px] text-[#a08d82]">/{category.id} · {productCount} products</p></div><div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${category.label}`} onClick={() => startCategory(category)} className="rounded-lg p-2 text-[#836c62] hover:bg-[#f4ece6]"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Delete ${category.label}`} onClick={() => {
                          if (productCount) {
                            addToast('Move or remove products from this category before deleting it.', 'warning');
                            return;
                          }
                          setDeleteTarget({ type: 'category', category });
                        }} className="rounded-lg p-2 text-[#a17777] hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div></div>
                      <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-5 text-[#78675f]">{category.description || 'Add a short collection description to introduce this department.'}</p>
                    </div>
                  </article>
                  );
                })}
                {!categories.length && <p className="col-span-full py-12 text-center text-sm text-[#95847b]">No categories yet. Add one to start organizing the catalog.</p>}
              </div>
            </section>
          )}

          {tab === 'customers' && (
            <AdminCustomers
              customers={customers}
              stats={customerStats}
              loading={loadingCustomers}
              currentUserId={currentUser?.id}
              onInspectCustomer={handleInspectCustomer}
              onToggleCustomerStatus={handleToggleCustomerStatus}
            />
          )}

          {tab === 'coupons' && (
            <AdminCoupons
              data={couponSummary}
              categories={categories}
              loading={loadingCoupons}
              onCreateCoupon={handleCreateCoupon}
              onUpdateCoupon={handleUpdateCoupon}
              onToggleCouponStatus={handleToggleCouponStatus}
              onDeleteCoupon={handleDeleteCoupon}
            />
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
      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === 'product'
            ? `Delete “${deleteTarget.product.name}”?`
            : deleteTarget?.type === 'category'
              ? `Delete “${deleteTarget.category.label}” category?`
              : 'Confirm deletion'
        }
        description={
          deleteTarget?.type === 'product'
            ? 'This removes the product from your live storefront catalog immediately.'
            : 'This removes the empty category from storefront navigation and admin filters.'
        }
        confirmLabel={deleteTarget?.type === 'product' ? 'Delete Product' : 'Delete Category'}
        cancelLabel="Cancel"
        tone="danger"
        busy={deletingTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deletingTarget) setDeleteTarget(null);
        }}
      />
    </div>
  );
};
