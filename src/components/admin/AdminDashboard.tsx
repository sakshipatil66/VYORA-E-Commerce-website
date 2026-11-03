import React, { useState } from 'react';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Plus,
  Trash2,
  Edit,
  Search,
  ShieldCheck
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
    adminOrders,
    updateOrderStatus,
    setActivePage,
    addToast
  } = useStore();
  const orders = adminOrders;

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'coupons' | 'analytics'>('products');
  const [productSearch, setProductSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Coupon Admin Form State
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([
    {
      code: 'FIRST500',
      description: 'Flat ₹500 off for first-time patrons',
      discountType: 'fixed',
      discountValue: 500,
      minOrderValue: 1999
    },
    {
      code: 'FESTIVE25',
      description: '25% off festive couture',
      discountType: 'percentage',
      discountValue: 25,
      minOrderValue: 3999,
      maxDiscount: 2500
    },
    {
      code: 'VYORA10',
      description: '10% instant checkout discount',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 999
    }
  ]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponVal, setNewCouponVal] = useState(15);
  const [newCouponMin, setNewCouponMin] = useState(1499);

  // Calculations for Sales KPI
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0) + 184500; // baseline seeded revenue
  const totalOrderCount = orders.length + 42;
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
    setAdminCoupons([...adminCoupons, c]);
    setNewCouponCode('');
    addToast(`Coupon "${c.code}" created successfully!`);
  };

  return (
    <div className="vyora-container vyora-page">
      {/* Admin Header Strip */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE4DD] shadow-2xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 typo-eyebrow text-[#7A1438]">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Store Operations Console</span>
          </div>
          <h1 className="typo-h1 text-neutral-900 mt-1">
            VYORA Marketplace Admin
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActivePage('shop')}
            className="min-h-10 py-2 px-4 typo-btn-sm text-neutral-700 bg-[#FAF7F5] hover:bg-[#F3ECE7] border border-[#EBE4DD] rounded-lg transition-colors cursor-pointer"
          >
            Preview Live Storefront
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="min-h-10 py-2 px-4 typo-btn-sm text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Creation</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 typo-tabular">
        <div className="p-5 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="typo-meta font-semibold">Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="typo-h2 font-sans text-[#4A0E17]">
            ₹{(totalRevenue / 100000).toFixed(2)}L
          </p>
          <p className="typo-meta text-emerald-700 font-medium mt-1.5">
            +18.4% vs previous festive cycle
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="typo-meta font-semibold">Total Consignments</span>
            <ShoppingBag className="w-4 h-4 text-[#7A1438]" />
          </div>
          <p className="typo-h2 font-sans text-neutral-900">
            {totalOrderCount}
          </p>
          <p className="typo-meta text-neutral-500 mt-1.5">
            {orders.filter((o) => o.status !== 'delivered').length} active shipments in transit
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="typo-meta font-semibold">Active Catalog SKUs</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <p className="typo-h2 font-sans text-neutral-900">
            {products.length}
          </p>
          <p className="typo-meta text-amber-700 font-medium mt-1.5">
            {lowStockCount} items below safe stock threshold
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#EBE4DD] shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="typo-meta font-semibold">Patron Repeat Rate</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="typo-h2 font-sans text-neutral-900">
            44.2%
          </p>
          <p className="typo-meta text-emerald-700 font-medium mt-1.5">
            Tier-1 Gold & Platinum patron loyalty
          </p>
        </div>
      </div>

      {/* Tabs (Interactive Filter Controls) */}
      <div className="flex items-center gap-2 border-b border-[#EBE4DD] mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('products')}
          className={`min-h-11 py-2.5 px-4 typo-btn-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'products'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Product Catalog & Inventory ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`min-h-11 py-2.5 px-4 typo-btn-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Live Orders & Status Dispatch ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`min-h-11 py-2.5 px-4 typo-btn-sm whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'coupons'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Coupons & Campaigns ({adminCoupons.length})
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG & INVENTORY */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 min-h-11 rounded-xl border border-[#EBE4DD]">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products by title, category, or guild artisan..."
              className="w-full typo-input-bare text-neutral-900 bg-transparent focus:outline-none"
            />
            {productSearch && (
              <button onClick={() => setProductSearch('')} className="typo-btn-sm text-neutral-400 hover:text-neutral-700 cursor-pointer shrink-0">
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left typo-body-sm min-w-[700px]">
                <thead className="bg-[#FAF7F5] border-b border-[#EBE4DD] text-neutral-600 typo-label">
                  <tr>
                    <th className="py-3.5 px-4">Creation</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Price (INR)</th>
                    <th className="py-3.5 px-4">Inventory</th>
                    <th className="py-3.5 px-4">Rating</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
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
                            <p className="typo-card-title text-neutral-900 line-clamp-1">{p.name}</p>
                            <p className="typo-meta text-neutral-400">{p.brand} · {p.artisanOrigin?.split(',')[0]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize text-neutral-700">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 typo-tabular">
                        <span className="typo-price text-[#4A0E17]">₹{p.discountPrice.toLocaleString('en-IN')}</span>
                        {p.originalPrice > p.discountPrice && (
                          <span className="typo-meta text-neutral-400 line-through ml-1.5">
                            ₹{p.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 typo-tabular">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateProduct({ ...p, stockQuantity: Math.max(0, p.stockQuantity - 1) })}
                            aria-label={`Decrease stock for ${p.name}`}
                            className="w-7 h-7 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md text-neutral-700 hover:bg-[#EBE4DD] flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className={`font-semibold min-w-[2ch] text-center ${p.stockQuantity < 15 ? 'text-amber-700' : 'text-neutral-900'}`}>
                            {p.stockQuantity}
                          </span>
                          <button
                            onClick={() => updateProduct({ ...p, stockQuantity: p.stockQuantity + 1 })}
                            aria-label={`Increase stock for ${p.name}`}
                            className="w-7 h-7 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md text-neutral-700 hover:bg-[#EBE4DD] flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 typo-tabular text-neutral-700">
                        ★ {p.rating} ({p.reviewCount})
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct(p)}
                            title="Edit"
                            aria-label={`Edit ${p.name}`}
                            className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-black hover:bg-[#FAF7F5] rounded-lg cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            title="Delete"
                            aria-label={`Delete ${p.name}`}
                            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left typo-body-sm min-w-[700px]">
                <thead className="bg-[#FAF7F5] border-b border-[#EBE4DD] text-neutral-600 typo-label">
                  <tr>
                    <th className="py-3.5 px-4">Order ID & Date</th>
                    <th className="py-3.5 px-4">Patron Recipient</th>
                    <th className="py-3.5 px-4">Total (INR)</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Consignment Status</th>
                    <th className="py-3.5 px-4 text-right">Courier Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3ECE7]">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF7F5]/60 transition-colors">
                      <td className="py-3 px-4 typo-tabular">
                        <p className="font-bold text-[#4A0E17]">{ord.id}</p>
                        <p className="typo-meta text-neutral-400">{ord.date}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="typo-card-title text-neutral-900">{ord.shippingAddress.fullName}</p>
                        <p className="typo-meta text-neutral-400">
                          {ord.shippingAddress.city}, {ord.shippingAddress.state}, India
                        </p>
                      </td>
                      <td className="py-3 px-4 typo-price text-neutral-900">
                        ₹{ord.total.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="typo-meta font-semibold text-neutral-700">
                          {ord.paymentMethod}
                        </span>
                        <span className="block typo-meta text-neutral-400">{ord.paymentStatus}</span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={ord.status}
                          onChange={(e) => updateOrderStatus(ord.id, e.target.value as OrderStatus)}
                          className="min-h-9 typo-btn-sm bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg px-2.5 py-1.5 text-[#4A0E17] focus:outline-none cursor-pointer"
                        >
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed & QC</option>
                          <option value="shipped">In Air Transit</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right typo-tabular typo-meta">
                        <p className="text-neutral-700 font-medium">{ord.courierName}</p>
                        <p className="text-neutral-400">{ord.trackingNumber}</p>
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
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EBE4DD] space-y-4">
            <h3 className="typo-h3 text-[#4A0E17]">Issue Promo Coupon</h3>
            <form onSubmit={handleAddCoupon} className="space-y-3.5">
              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIWALI30"
                  className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg uppercase typo-tabular focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">Discount %</label>
                <input
                  type="number"
                  required
                  min={5}
                  max={70}
                  value={newCouponVal}
                  onChange={(e) => setNewCouponVal(Number(e.target.value))}
                  className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg typo-tabular focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">Min Order Value (₹)</label>
                <input
                  type="number"
                  required
                  value={newCouponMin}
                  onChange={(e) => setNewCouponMin(Number(e.target.value))}
                  className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg typo-tabular focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-11 py-2.5 px-4 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
              >
                Create Coupon Code
              </button>
            </form>
          </div>

          {/* Active Coupons List */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="typo-h3 text-neutral-900">Active Campaign Vouchers</h3>
            <div className="space-y-2.5">
              {adminCoupons.map((c) => (
                <div key={c.code} className="p-4 bg-white rounded-2xl border border-[#EBE4DD] flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="typo-tabular font-bold typo-body-sm text-[#7A1438] bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                        {c.code}
                      </span>
                      <span className="typo-card-title text-neutral-800 typo-tabular">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                      </span>
                    </div>
                    <p className="typo-body-sm text-neutral-500">{c.description}</p>
                    <p className="typo-meta text-neutral-400 typo-tabular">Min Order: ₹{c.minOrderValue.toLocaleString('en-IN')}</p>
                  </div>
                  <span className="typo-badge text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded">
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
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#EBE4DD] p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="typo-h3 text-[#4A0E17]">
              Add New Handcrafted Creation to Catalog
            </h3>
            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Kanchipuram Gold Zari Silk Saree"
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Brand Atelier *</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryId)}
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg capitalize focus:outline-none focus:border-[#7A1438]"
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
                  <label className="typo-label text-neutral-700 block mb-1.5">Subcategory</label>
                  <input
                    type="text"
                    value={newSubCategory}
                    onChange={(e) => setNewSubCategory(e.target.value)}
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(Number(e.target.value))}
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newDiscountPrice}
                    onChange={(e) => setNewDiscountPrice(Number(e.target.value))}
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Initial Stock *</label>
                  <input
                    type="number"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Artisan Origin Guild</label>
                  <input
                    type="text"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    placeholder="e.g. Kanchipuram, Tamil Nadu"
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Editorial Stamp / Badge</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="e.g. Silk Mark Certified"
                    className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={newImage}
                  onChange={(e) => setNewImage(e.target.value)}
                  className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-10 py-2 px-4 typo-btn-sm text-neutral-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
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
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#EBE4DD] p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="typo-h3 text-[#4A0E17]">
              Edit Creation: {editingProduct.name}
            </h3>
            <form onSubmit={handleSaveEditProduct} className="space-y-3.5">
              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="typo-input bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Offer Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.discountPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, discountPrice: Number(e.target.value) })}
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">Stock Count</label>
                  <input
                    type="number"
                    value={editingProduct.stockQuantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })}
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#EBE4DD] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="min-h-10 py-2 px-4 typo-btn-sm text-neutral-600 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
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
