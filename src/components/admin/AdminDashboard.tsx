import React, { useState } from 'react';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Tag,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, OrderStatus, CategoryId, Coupon } from '../../types';
import { ProductImage } from '../common/ProductImage';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    refreshOrders,
    updateOrderStatus,
    coupons,
    addCoupon,
    setActivePage,
    addToast
  } = useStore();

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'coupons' | 'analytics'>('products');
  const [productSearch, setProductSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);

  const handleRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      await refreshOrders();
      addToast('Order list refreshed.');
    } catch (error) {
      addToast(`Could not refresh orders: ${(error as Error).message}`, 'warning');
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  // Add Product Form state
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('Vyora Atelier');
  const [newCategory, setNewCategory] = useState<CategoryId>('fashion');
  const [newSubCategory, setNewSubCategory] = useState('Festive Wear');
  const [newOriginalPrice, setNewOriginalPrice] = useState(9999);
  const [newDiscountPrice, setNewDiscountPrice] = useState(6999);
  const [newStock, setNewStock] = useState(25);
  const [newOrigin, setNewOrigin] = useState('Varanasi, Uttar Pradesh');
  const [newFabric, setNewFabric] = useState('100% Handloom Mulberry Silk');
  const [newImage, setNewImage] = useState('https://cdn.shopify.com/s/files/1/1224/2138/products/RoohiRS0002RedPureKatanSilkShikaargahSaree18.jpg?width=1200');
  const [newBadge, setNewBadge] = useState('New Drop');

  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponVal, setNewCouponVal] = useState(15);
  const [newCouponMin, setNewCouponMin] = useState(1499);

  // Calculations for Sales KPI
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrderCount = orders.length;
  const lowStockCount = products.filter((p) => p.stockQuantity < 15).length;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const discountPercent = Math.round(((newOriginalPrice - newDiscountPrice) / newOriginalPrice) * 100);
    addProduct({
      name: newName,
      brand: newBrand,
      category: newCategory,
      subCategory: newSubCategory,
      tagline: 'Authentic artisan crafted creation',
      description: `Artisan crafted ${newName} curated by Vyora atelier.`,
      originalPrice: Number(newOriginalPrice),
      discountPrice: Number(newDiscountPrice),
      discountPercent: Math.max(0, discountPercent),
      rating: 4.9,
      reviewCount: 1,
      images: [newImage],
      primaryImage: newImage,
      badge: newBadge,
      sizes: ['S', 'M', 'L'],
      colors: [{ name: 'Burgundy', hex: '#5B112B' }],
      inStock: newStock > 0,
      stockQuantity: Number(newStock),
      artisanOrigin: newOrigin,
      fabricDetails: newFabric,
      highlights: ['Authentic certified artisan craft', 'Quality inspected', 'Includes branded dust cover']
    });

    setIsAddModalOpen(false);
    setNewName('');
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct);
    setEditingProduct(null);
  };

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    const c: Coupon = {
      code: newCouponCode.trim().toUpperCase(),
      description: `${newCouponVal}% promotional coupon`,
      discountType: 'percentage',
      discountValue: Number(newCouponVal),
      minOrderValue: Number(newCouponMin)
    };
    addCoupon(c);
    setNewCouponCode('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Admin Header Strip */}
      <div className="bg-white p-6 rounded-2xl border border-[#EBE4DD] shadow-2xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Store Operations Console</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900 mt-0.5">
            VYORA Marketplace Admin
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('shop')}
            className="py-2 px-4 text-xs font-medium text-neutral-700 bg-[#FAF7F5] hover:bg-[#F3ECE7] border border-[#EBE4DD] rounded-md transition-colors"
          >
            Preview Live Storefront
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="py-2 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Creation</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-mono tabular-nums">
        <div className="p-5 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-sans font-semibold">Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-[#4A0E17]">
            ₹{(totalRevenue / 100000).toFixed(2)}L
          </p>
          <p className="text-[11px] text-emerald-700 font-sans font-medium mt-1">
            Revenue from recorded orders
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-sans font-semibold">Total Consignments</span>
            <ShoppingBag className="w-4 h-4 text-[#7A1438]" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {totalOrderCount}
          </p>
          <p className="text-[11px] text-neutral-500 font-sans mt-1">
            {orders.filter((o) => o.status !== 'delivered').length} active shipments in transit
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-sans font-semibold">Active Catalog SKUs</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {products.length}
          </p>
          <p className="text-[11px] text-amber-700 font-sans font-medium mt-1">
            {lowStockCount} items below safe stock threshold
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-sans font-semibold">Delivered Rate</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {orders.length === 0
              ? '—'
              : `${((orders.filter((order) => order.status === 'delivered').length / orders.length) * 100).toFixed(1)}%`}
          </p>
          <p className="text-[11px] text-emerald-700 font-sans font-medium mt-1">
            Delivered orders
          </p>
        </div>
      </div>

      {/* Tabs (Interactive Filter Controls) */}
      <div className="flex items-center gap-2 border-b border-[#EBE4DD] mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'products'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Product Catalog & Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Live Orders & Status Dispatch ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'coupons'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Coupons & Campaigns ({coupons.length})
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & INVENTORY */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-[#EBE4DD]">
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products by title, category, or guild artisan..."
              className="w-full text-xs text-neutral-900 bg-transparent focus:outline-none"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="text-xs text-neutral-400">
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#EBE4DD] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F5] border-b border-[#EBE4DD] text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Creation</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price (INR)</th>
                    <th className="py-3 px-4">Inventory</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE7]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F5]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProductImage
                            src={p.primaryImage}
                            alt={p.name}
                            category={p.category}
                            compact
                            className="w-10 h-12 object-cover rounded bg-[#FAF7F5] shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-neutral-900 line-clamp-1">{p.name}</p>
                            <p className="text-[11px] text-neutral-400">{p.brand} · {p.artisanOrigin?.split(',')[0]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize text-neutral-700">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <span className="font-bold text-[#4A0E17]">₹{p.discountPrice.toLocaleString('en-IN')}</span>
                        {p.originalPrice > p.discountPrice && (
                          <span className="text-[11px] text-neutral-400 line-through ml-1.5">
                            ₹{p.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateProduct({ ...p, stockQuantity: Math.max(0, p.stockQuantity - 1) })}
                            className="w-5 h-5 bg-[#FAF7F5] border border-[#EBE4DD] rounded text-neutral-700 hover:bg-[#EBE4DD]"
                          >
                            -
                          </button>
                          <span className={`font-semibold ${p.stockQuantity < 15 ? 'text-amber-700' : 'text-neutral-900'}`}>
                            {p.stockQuantity}
                          </span>
                          <button
                            onClick={() => updateProduct({ ...p, stockQuantity: p.stockQuantity + 1 })}
                            className="w-5 h-5 bg-[#FAF7F5] border border-[#EBE4DD] rounded text-neutral-700 hover:bg-[#EBE4DD]"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        ★ {p.rating} ({p.reviewCount})
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingProduct(p)}
                            title="Edit"
                            className="p-1.5 text-neutral-500 hover:text-black rounded"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            title="Delete"
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={isRefreshingOrders}
              className="inline-flex items-center gap-2 rounded-md border border-[#EBE4DD] bg-white px-3 py-2 text-xs font-semibold text-[#5B112B] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingOrders ? 'animate-spin' : ''}`} />
              Refresh orders
            </button>
          </div>
          <div className="bg-white rounded-xl border border-[#EBE4DD] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F5] border-b border-[#EBE4DD] text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Total (INR)</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Consignment Status</th>
                    <th className="py-3 px-4 text-right">Items & Delivery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE7]">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF7F5]/60 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums">
                        <p className="font-bold text-[#4A0E17]">{ord.id}</p>
                        <p className="text-[11px] text-neutral-400">{ord.date}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-neutral-900">{ord.shippingAddress.fullName}</p>
                        <p className="text-[11px] text-neutral-400">
                          {ord.shippingAddress.city}, {ord.shippingAddress.state}, India
                        </p>
                        <p className="text-[11px] text-neutral-400">{ord.shippingAddress.phone}</p>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums font-bold text-neutral-900">
                        ₹{ord.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {ord.paymentMethod}
                        </span>
                        <span className="block text-[10px] text-neutral-400">{ord.paymentStatus}</span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={ord.status}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="text-xs bg-[#FAF7F5] border border-[#EBE4DD] rounded px-2 py-1 font-semibold text-[#4A0E17] focus:outline-none"
                        >
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="packed">Packed & QC</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right text-[11px]">
                        <p className="text-neutral-700">{ord.items.length} item{ord.items.length === 1 ? '' : 's'}</p>
                        <p className="text-neutral-400">Est. {ord.estimatedDeliveryDate}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COUPONS MANAGEMENT */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coupon Creation Card */}
          <div className="bg-white p-5 rounded-xl border border-[#EBE4DD] space-y-3">
            <h3 className="font-serif text-base font-bold text-[#4A0E17]">Issue Promo Coupon</h3>
            <form onSubmit={handleAddCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI30"
                  className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md uppercase font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Discount %</label>
                <input
                  type="number"
                  required
                  min={5}
                  max={70}
                  value={newCouponVal}
                  onChange={(e) => setNewCouponVal(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Min Order Value (₹)</label>
                <input
                  type="number"
                  required
                  value={newCouponMin}
                  onChange={(e) => setNewCouponMin(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md"
              >
                Create Coupon Code
              </button>
            </form>
          </div>

          {/* Active Coupons List */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-serif text-base font-bold text-neutral-900">Active Campaign Vouchers</h3>
            <div className="space-y-2">
              {coupons.map((c) => (
                <div key={c.code} className="p-4 bg-white rounded-xl border border-[#EBE4DD] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#7A1438] bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {c.code}
                      </span>
                      <span className="text-xs font-semibold text-neutral-800">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">{c.description}</p>
                    <p className="text-[11px] text-neutral-400 font-mono">Min Order: ₹{c.minOrderValue}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#EBE4DD] p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#4A0E17]">
              Add New Handcrafted Creation to Catalog
            </h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Kanchipuram Gold Zari Silk Saree"
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Brand Atelier *</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md capitalize"
                  >
                    <option value="fashion">Couture & Fashion</option>
                    <option value="jewellery">Fine & Temple Jewellery</option>
                    <option value="beauty">Ayurveda & Luxury Beauty</option>
                    <option value="electronics">Tech & Audio Essentials</option>
                    <option value="home">Living, Furnishings & Decor</option>
                    <option value="footwear">Handcrafted Footwear</option>
                    <option value="bags">Bags, Clutches & Luggage</option>
                    <option value="toys">Toys, Crafts & Board Games</option>
                    <option value="stationery">Journaling & Heritage Stationery</option>
                    <option value="fitness">Yoga, Wellness & Activewear</option>
                    <option value="essentials">Pure Gourmet & Organic Essentials</option>
                    <option value="gifting">Festive Hampers & Gift Keepsakes</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1 font-sans">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1 font-sans">Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newDiscountPrice}
                    onChange={(e) => setNewDiscountPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1 font-sans">Initial Stock *</label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Artisan Origin Guild</label>
                  <input
                    type="text"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="e.g. Kanchipuram, Tamil Nadu"
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Editorial Stamp / Badge</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. Silk Mark Certified"
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Image URL</label>
                <input
                  type="text"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-4 text-neutral-600 hover:text-black font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors"
                >
                  Publish Creation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#EBE4DD] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#4A0E17]">
              Edit Creation: {editingProduct.name}
            </h3>
            <form onSubmit={handleSaveEditProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1 font-sans">Offer Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.discountPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, discountPrice: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1 font-sans">Stock Count</label>
                  <input
                    type="number"
                    value={editingProduct.stockQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="py-2 px-4 text-neutral-600 hover:text-black font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
