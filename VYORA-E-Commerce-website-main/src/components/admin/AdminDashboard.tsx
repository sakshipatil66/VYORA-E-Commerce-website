import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Boxes, ChartNoAxesCombined, Check, ChevronDown, CircleDollarSign, Clock3, Download, Image as ImageIcon, LayoutDashboard, LogOut, Package, Pencil, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag, Tag, Trash2, Users, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CategoryId, OrderStatus, Product } from '../../types';
import { AdminOverview, api, ContactInquiry, HomeBanner, StoreCmsContent } from '../../lib/api';
import { ORDERED_CATEGORIES } from '../../data/categories';
import { ProductImage } from '../common/ProductImage';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

type Section = 'overview' | 'products' | 'categories' | 'orders' | 'customers' | 'inventory' | 'reports' | 'content' | 'activity';
const nav: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Boxes }, { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users }, { id: 'inventory', label: 'Inventory', icon: Activity },
  { id: 'reports', label: 'Sales reports', icon: ChartNoAxesCombined }, { id: 'content', label: 'Homepage content', icon: ImageIcon },
  { id: 'activity', label: 'Activity log', icon: Activity }
];
const formatAuditLogDate = (value: string) => {
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const normalized = hasTimezone ? value : `${value.replace(' ', 'T')}Z`;

  return new Date(normalized).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata'
  });
};
const money = (value: number) => `\u20B9${Math.round(value || 0).toLocaleString('en-IN')}`;
const statusLabel: Record<OrderStatus, string> = { placed: 'Placed', confirmed: 'Confirmed', processing: 'Processing', packed: 'Packed', shipped: 'Shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered' };

export const AdminDashboard: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, orders, refreshOrders, updateOrderStatus, currentUser, logout, addToast, setActivePage } = useStore();
  const [section, setSection] = useState<Section>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [cmsContent, setCmsContent] = useState<StoreCmsContent | null>(null);
  const [cmsTab, setCmsTab] = useState<'about' | 'contact' | 'faq' | 'policies' | 'footer' | 'seo'>('about');
  const [cmsSaving, setCmsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productModal, setProductModal] = useState<Product | 'new' | null>(null);
  const [bannerModal, setBannerModal] = useState<HomeBanner | 'new' | null>(null);
  const [orderFilter, setOrderFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [auditData, setAuditData] = useState<Awaited<ReturnType<typeof api.adminAuditLogs>> | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditAction, setAuditAction] = useState('all');
  const [auditEntity, setAuditEntity] = useState('all');
  const [auditActor, setAuditActor] = useState('all');
  const [customerTab, setCustomerTab] = useState<'customers' | 'inquiries'>('customers');
  const [contactInquiries, setContactInquiries] = useState<ContactInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inquiriesRefresh, setInquiriesRefresh] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [data, campaignData, cmsData] = await Promise.all([api.adminOverview(), api.homeBanners(), api.cmsContent()]);
      setOverview(data); setBanners(campaignData.banners); setCmsContent(cmsData.content);
    } catch (error) { addToast(`Could not load store operations: ${(error as Error).message}`, 'warning'); }
    finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (section !== 'activity') return;
    let cancelled = false;
    setAuditLoading(true);
    api.adminAuditLogs({
      page: auditPage,
      pageSize: 20,
      ...(auditAction !== 'all' ? { action: auditAction } : {}),
      ...(auditEntity !== 'all' ? { entity: auditEntity } : {}),
      ...(auditActor !== 'all' ? { actorId: auditActor } : {})
    })
      .then((data) => {
        if (!cancelled) setAuditData(data);
      })
      .catch((error) => {
        if (!cancelled) addToast(`Could not load activity log: ${(error as Error).message}`, 'warning');
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => { cancelled = true; };
  }, [section, auditPage, auditAction, auditEntity, auditActor, auditRefresh, addToast]);

  useEffect(() => {
    if (section !== 'customers' || customerTab !== 'inquiries') return;
    let cancelled = false;
    setInquiriesLoading(true);
    api.adminContactInquiries()
      .then((data) => {
        if (!cancelled) setContactInquiries(data.inquiries);
      })
      .catch((error) => {
        if (!cancelled) addToast(`Could not load contact inquiries: ${(error as Error).message}`, 'warning');
      })
      .finally(() => {
        if (!cancelled) setInquiriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [section, customerTab, inquiriesRefresh, addToast]);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (categoryFilter === 'all' || product.category === categoryFilter);
  }), [products, query, categoryFilter]);
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesQuery = `${order.id} ${order.shippingAddress.fullName} ${order.shippingAddress.phone}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (orderFilter === 'all' || order.status === orderFilter);
  }), [orders, query, orderFilter]);

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!productModal) return; const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim(); const category = String(form.get('category')) as CategoryId;
    const originalPrice = Number(form.get('originalPrice')); const discountPrice = Number(form.get('discountPrice')); const stockQuantity = Number(form.get('stockQuantity'));
    if (!name || discountPrice > originalPrice || originalPrice <= 0 || stockQuantity < 0) { addToast('Check the product name, price and stock values.', 'warning'); return; }
    const image = String(form.get('image') || '');
    const patch: Product = { ...(productModal === 'new' ? {} as Product : productModal), id: productModal === 'new' ? '' : productModal.id,
      name, brand: String(form.get('brand') || 'VYORA'), category, subCategory: String(form.get('subCategory') || ''),
      tagline: productModal === 'new' ? 'A considered VYORA original' : productModal.tagline,
      description: productModal === 'new' ? `${name}, selected by VYORA.` : productModal.description,
      originalPrice, discountPrice, discountPercent: Math.max(0, Math.round((originalPrice - discountPrice) / originalPrice * 100)),
      stockQuantity, inStock: stockQuantity > 0, primaryImage: image, images: [image], rating: productModal === 'new' ? 0 : productModal.rating,
      reviewCount: productModal === 'new' ? 0 : productModal.reviewCount, highlights: productModal === 'new' ? ['Selected for the VYORA collection'] : productModal.highlights };
    setSaving(true);
    if (productModal === 'new') addProduct(patch); else updateProduct(patch);
    setSaving(false); setProductModal(null);
  };

  const saveBanner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!bannerModal) return; const form = new FormData(event.currentTarget);
    const item: HomeBanner = { id: bannerModal === 'new' ? `campaign-${crypto.randomUUID()}` : bannerModal.id,
      kicker: String(form.get('kicker') || ''), edition: String(form.get('edition') || ''), title: String(form.get('title') || ''),
      subtitle: String(form.get('subtitle') || ''), image: String(form.get('image') || ''), category: String(form.get('category')),
      ctaText: String(form.get('ctaText') || 'Explore the collection'), secondaryCta: String(form.get('secondaryCta') || 'Shop all'),
      secondaryCategory: String(form.get('secondaryCategory') || 'all'), active: form.get('active') === 'on' };
    const next = bannerModal === 'new' ? [...banners, item] : banners.map((banner) => banner.id === item.id ? item : banner);
    setSaving(true);
    try { const saved = await api.saveHomeBanners(next); setBanners(saved.banners); setBannerModal(null); addToast('Homepage campaign saved.'); }
    catch (error) { addToast(`Could not save campaign: ${(error as Error).message}`, 'warning'); }
    finally { setSaving(false); }
  };
  const updateCmsField = (section: keyof StoreCmsContent, field: string, value: unknown) => {
    setCmsContent((current) => {
      if (!current) return current;
      return {
        ...current,
        [section]: {
          ...current[section],
          [field]: value
        }
      };
    });
  };

  const saveCmsContent = async () => {
    if (!cmsContent) return;
    setCmsSaving(true);
    try {
      const result = await api.saveCmsContent(cmsContent);
      setCmsContent(result.content);
      addToast('Storefront CMS content saved successfully.');
    } catch (error) {
      addToast(`Could not save CMS content: ${(error as Error).message}`, 'warning');
    } finally {
      setCmsSaving(false);
    }
  };
  const saveBanners = async (next: HomeBanner[]) => {
    try { const result = await api.saveHomeBanners(next); setBanners(result.banners); addToast('Homepage campaign updated.'); }
    catch (error) { addToast(`Could not update campaign: ${(error as Error).message}`, 'warning'); }
  };
  const refreshAll = async () => { setRefreshing(true); try { await Promise.all([reload(), refreshOrders()]); } finally { setRefreshing(false); } };
  const exportReport = () => {
    if (!overview) return;
    const rows = [['Month', 'Orders', 'Sales (INR)'], ...overview.monthlySales.map((row) => [row.month, row.orders, Math.round(row.revenue)])];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = 'vyora-sales-report.csv'; link.click(); URL.revokeObjectURL(href);
  };

  const stat = overview?.stats;
  const maxSales = Math.max(1, ...(overview?.monthlySales.map((month) => month.revenue) || [1]));
  const topSellingProducts = useMemo(() => {
    const sales = new Map<string, { name: string; quantity: number; revenue: number }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productId || item.name;
        const current = sales.get(key) || { name: item.name, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.price * item.quantity;
        sales.set(key, current);
      });
    });
    return Array.from(sales.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [orders]);

  const orderStatusAnalytics = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((order) => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  }, [orders]);
  return <div className="min-h-[80vh] bg-[#F6F1EC] text-[#25211e]">
    <div className="sticky top-0 z-30 border-b border-[#E8DDD5] bg-white/95 shadow-[0_4px_18px_rgba(50,16,30,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-7 sm:py-3.5 lg:px-10">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#5b112b] text-[#d4af73]"><span className="font-serif text-xl">V</span></div><div><div className="font-serif text-lg font-semibold tracking-[.18em] text-[#481022]">VYORA</div><div className="text-[10px] uppercase tracking-[.19em] text-neutral-500">ATELIER Â· ADMIN WORKSPACE</div></div></div>
        <div className="flex items-center gap-3">
  <div className="hidden text-right sm:block">
    <div className="text-xs font-semibold">{currentUser?.name}</div>
    <div className="text-[11px] text-neutral-500">Administrator</div>
  </div>

  <button
    onClick={() => setActivePage('home')}
    className="flex h-9 items-center rounded-lg border border-[#E8DDD5] px-3 text-xs font-medium text-[#5B112B] transition-all duration-200 hover:border-[#C5A46D] hover:bg-[#F3E7EB]"
  >
    <span>View Storefront</span>
  </button>

  <button
    onClick={refreshAll}
    disabled={refreshing}
    className="grid h-9 w-9 place-items-center rounded-lg border border-[#E8DDD5] text-[#5B112B] transition-all duration-200 hover:border-[#C5A46D] hover:bg-[#F3E7EB]"
    aria-label="Refresh dashboard"
  >
    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>
  </button>

 <button
  onClick={() => void logout()}
  className="flex h-9 items-center gap-2.5 rounded-xl border border-[#E8DDD5] px-3 text-xs font-medium text-[#5B112B] transition-all duration-200 hover:border-[#C5A46D] hover:bg-[#F3E7EB]"
>
  <LogOut size={14} />
  <span className="hidden sm:inline">Sign out</span>
</button>
</div>
    </div>
    </div>
    <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="border-b border-[#32101E] bg-[#32101E] p-3 lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:border-b-0 lg:border-r lg:border-[#4A1B2C] lg:p-5"><div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin] lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setQuery(''); }} className={`flex min-h-11 shrink-0 whitespace-nowrap items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A46D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#32101E] ${section === id ? 'bg-[#5B112B] text-[#C5A46D] shadow-[inset_3px_0_0_#C5A46D]' : 'text-[#E8DDD5] hover:bg-[#4A1B2C] hover:text-white'}`}><Icon size={16}/>{label}{id === 'orders' && stat?.pending ? <span className="ml-auto rounded-full bg-[#f1e7dc] px-2 py-0.5 text-[10px]">{stat.pending}</span> : null}</button>)}</div><div className="mt-8 hidden rounded-xl border border-[#684052] bg-[#3B1728] p-3 lg:block"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} className="text-[#C5A46D]"/> Secure admin session</div><p className="mt-1 text-[11px] leading-relaxed text-[#D8C8CE]">Your store tools are protected by your VYORA administrator account.</p></div></aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-8"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8b5d48]">VYORA / {section.replace('-', ' ')}</p><h1 className="mt-1 font-serif text-2xl font-semibold text-[#30151e] sm:text-3xl">{nav.find((item) => item.id === section)?.label}</h1></div><div className="flex gap-2">{section === 'products' && <button onClick={() => setProductModal('new')} className="flex items-center gap-2 rounded-lg bg-[#5B112B] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(91,17,43,0.18)] transition-all duration-200 hover:bg-[#32101E] hover:shadow-[0_6px_18px_rgba(91,17,43,0.25)]"><Plus size={15}/> Add product</button>}{section === 'content' && <button onClick={() => setBannerModal('new')} className="flex items-center gap-2 rounded-lg bg-[#5B112B] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(91,17,43,0.18)] transition-all duration-200 hover:bg-[#32101E] hover:shadow-[0_6px_18px_rgba(91,17,43,0.25)]"><Plus size={15}/> Add campaign</button>}{section === 'reports' && <button onClick={exportReport} className="flex items-center gap-2.5 rounded-xl border border-[#ded7d0] bg-white px-3 py-2.5 text-xs font-semibold"><Download size={14}/> Export CSV</button>}</div></div>
        {loading && !overview ? <div className="rounded-xl border border-[#E8DDD5] bg-white p-8 text-sm text-neutral-500">Loading live store data...</div> : <>
          {section === 'overview' && <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl border border-[#684052] bg-gradient-to-br from-[#32101E] via-[#5B112B] to-[#742D49] p-6 text-white shadow-[0_12px_32px_rgba(50,16,30,0.16)] sm:p-8 lg:p-9">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border border-[#C5A46D]/20 bg-[#C5A46D]/5"/>
              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#D8BC88]">VYORA Â· ATELIER ADMIN</p>
                  <h2 className="mt-3 font-serif text-2xl font-semibold leading-tight tracking-wide sm:text-3xl">Welcome back, {currentUser?.name || 'Administrator'}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#E8DDD5]">Your store overview is ready. Let's keep your business moving beautifully.</p>
                  <p className="mt-4 inline-flex rounded-full border border-[#C5A46D]/30 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-[#D8BC88]">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="relative grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-2.5">
                  <button onClick={() => setProductModal('new')} className="flex items-center justify-center gap-2.5 rounded-xl border border-[#C5A46D]/50 bg-[#C5A46D] px-3 py-2.5 text-xs font-semibold text-[#32101E] transition-all hover:bg-[#D8BC88]"><Plus size={15}/> Add product</button>
                  <button onClick={() => setSection('orders')} className="flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/20"><ShoppingBag size={15}/> View orders</button>
                  <button onClick={() => setSection('inventory')} className="flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/20"><Activity size={15}/> Inventory</button>
                  <button onClick={() => setSection('reports')} className="flex items-center justify-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/20"><ChartNoAxesCombined size={15}/> Reports</button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Gross sales', value: money(stat?.revenue || 0), note: 'Recorded order value', icon: CircleDollarSign, accent: 'text-[#5B112B]', bg: 'bg-[#F3E7EB]' },
                { label: 'Orders', value: stat?.orders || 0, note: `${stat?.pending || 0} awaiting delivery`, icon: ShoppingBag, accent: 'text-[#5B112B]', bg: 'bg-[#F3E7EB]' },
                { label: 'Customers', value: stat?.customers || 0, note: 'Registered store accounts', icon: Users, accent: 'text-[#5B112B]', bg: 'bg-[#F3E7EB]' },
                { label: 'Catalog health', value: `${stat?.products || 0} products`, note: `${stat?.lowStock || 0} products below 15 units`, icon: Package, accent: 'text-[#98733D]', bg: 'bg-[#F5EFE3]' }
              ].map(({ label, value, note, icon: Icon, accent, bg }) => (
                <div key={label} className="group relative overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white p-5 shadow-[0_5px_22px_rgba(50,16,30,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_15px_32px_rgba(91,17,43,0.11)] sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold tracking-wide text-[#74645F]">{label}</span>
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                      <Icon size={20} className={accent} />
                    </div>
                  </div>
                  <div className="mt-6 break-words font-serif text-2xl font-semibold tracking-tight text-[#321720] sm:text-3xl">{value}</div>
                  <div className="mt-2 text-xs leading-relaxed text-[#746A66]">{note}</div>
                  <div className="absolute bottom-0 left-5 right-5 h-[2px] origin-left scale-x-0 rounded-full bg-[#C5A46D] transition-transform duration-300 group-hover:scale-x-100" />
                </div>
              ))}
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#32101E]">Revenue Trend</h2>
                    <p className="mt-1 text-xs text-neutral-500">Monthly revenue from recorded orders</p>
                  </div>
                  <span className="rounded-full bg-[#F6F1EC] px-3 py-1.5 text-[10px] font-medium text-[#5B112B]">Monthly performance</span>
                </div>
                {(overview?.monthlySales || []).length > 0 ? (
                  <div className="mt-6 h-[320px] w-full sm:h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overview?.monthlySales || []} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
                        <defs>
                          <linearGradient id="vyoraRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5B112B" stopOpacity={0.24}/>
                            <stop offset="95%" stopColor="#C5A46D" stopOpacity={0.03}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#F5EFEB" strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="month" tickFormatter={(value) => String(value).split(" ")[0]} axisLine={false} tickLine={false} tick={{ fill: "#74645F", fontSize: 11, fontWeight: 500 }} />
                        <YAxis tickFormatter={(value) => `\u20B9${Number(value).toLocaleString("en-IN")}`} axisLine={false} tickLine={false} width={76} tick={{ fill: "#74645F", fontSize: 11, fontWeight: 500 }}/>
                        <Tooltip formatter={(value) => [money(Number(value)), "Revenue"]} contentStyle={{ borderRadius: 14, border: "1px solid #DCCFC5", boxShadow: "0 12px 28px rgba(50,16,30,0.12)", padding: "10px 14px", fontSize: 13 }} labelStyle={{ color: "#32101E", fontWeight: 700, marginBottom: 5 }}/>
                        <Area type="monotone" dataKey="revenue" stroke="#5B112B" strokeWidth={3} fill="url(#vyoraRevenueFill)" activeDot={{ r: 5, fill: "#C5A46D", stroke: "#5B112B", strokeWidth: 2 }} dot={{ r: 3, fill: "#C5A46D", stroke: "#5B112B", strokeWidth: 1.5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E8DDD5] bg-[#F6F1EC]/60 px-6 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl font-serif text-[#C5A46D] shadow-sm">ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¹</div><p className="mt-4 text-sm font-semibold text-[#32101E]">No revenue data yet</p><p className="mt-2 max-w-xs text-xs leading-5 text-neutral-500">Your monthly revenue insights will appear here as soon as customer orders start coming in.</p></div>}
              </div>

              <div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#32101E]">Category Distribution</h2>
                    <p className="mt-1 text-xs text-neutral-500">Products available in each collection</p>
                  </div>
                  <Tag size={17} className="text-[#C5A46D]"/>
                </div>
                {(overview?.categories || []).filter((category) => category.products > 0).length > 0 ? (
                  <div className="mt-5 h-[360px] w-full sm:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(overview?.categories || []).filter((category) => category.products > 0).slice(0, 8).map((category) => ({ ...category, label: ORDERED_CATEGORIES.find((item) => item.id === category.id)?.label || category.label }))} layout="vertical" margin={{ top: 4, right: 18, left: 6, bottom: 4 }}>
                        <CartesianGrid stroke="#F0E9E4" strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#74645F", fontSize: 12, fontWeight: 500 }}/>
                        <YAxis type="category" dataKey="label" width={175} axisLine={false} tickLine={false} tick={{ fill: "#6F625D", fontSize: 11 }}/>
                        <Tooltip formatter={(value) => [Number(value), "Products"]} contentStyle={{ borderRadius: 12, border: "1px solid #E8DDD5", boxShadow: "0 8px 24px rgba(50,16,30,0.08)", fontSize: 12 }}/>
                        <Bar dataKey="products" fill="#5B112B" radius={[0, 8, 8, 0]} barSize={16} onClick={(data) => { const category = data?.payload; if (category?.id) { setCategoryFilter(category.id); setSection("categories"); } }} cursor="pointer">
                          {((overview?.categories || []).filter((category) => category.products > 0).slice(0, 8)).map((category, index) => <Cell key={category.id} fill={index % 3 === 0 ? "#5B112B" : index % 3 === 1 ? "#8B5269" : "#C5A46D"}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="py-16 text-center text-xs text-neutral-500">Category distribution will appear when products are available.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2"><div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-lg font-semibold text-[#32101E]">Recent orders</h2><p className="mt-1 text-xs text-neutral-500">Latest customer purchases</p></div><button onClick={() => setSection('orders')} className="text-xs font-semibold text-[#5B112B]">View orders â†’</button></div><div className="mt-5 divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">{orders.slice(0, 5).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-xs transition-all duration-200 hover:bg-[#F8F2ED]"><div className="min-w-0"><div className="truncate font-semibold">{order.shippingAddress.fullName}</div><div className="mt-1 text-[10px] text-neutral-500">{order.id}  |  {new Date(order.date).toLocaleDateString('en-IN')}</div></div><div className="text-right"><div className="font-semibold">{money(order.total)}</div><div className="mt-1 text-[10px] capitalize text-neutral-500">{statusLabel[order.status]}</div></div></div>)}</div>{orders.length === 0 && <p className="py-8 text-center text-xs text-neutral-500">No orders have been recorded yet.</p>}</div><div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]"><div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-lg font-semibold text-[#32101E]">Stock watch</h2><p className="mt-1 text-xs text-neutral-500">Products with fewer than 15 units</p></div><button onClick={() => setSection('inventory')} className="text-xs font-semibold text-[#5B112B]">Manage stock â†’</button></div><div className="mt-5 divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">{products.filter((product) => product.stockQuantity < 15).slice(0, 5).map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3.5 text-xs transition-all duration-200 hover:bg-[#F8F2ED]"><div className="min-w-0 truncate font-medium">{product.name}</div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${product.stockQuantity === 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{product.stockQuantity} left</span></div>)}{!products.some((product) => product.stockQuantity < 15) && <p className="py-8 text-center text-xs text-neutral-500">All products are above the low stock threshold.</p>}</div></div></div>
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#32101E]">Top Selling Products</h2>
                    <p className="mt-1 text-xs text-neutral-500">Best performing products by units sold</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F3E7EB] text-[#5B112B]"><ShoppingBag size={17}/></div>
                </div>
                <div className="mt-6 space-y-6">
                  {topSellingProducts.map((product, index) => {
                    const maxQuantity = Math.max(1, topSellingProducts[0]?.quantity || 1);
                    return <div key={product.name} className="flex items-center gap-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6F1EC] font-serif text-sm font-semibold text-[#5B112B]">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[#32101E]">{product.name}</span>
                          <span className="shrink-0 text-[10px] font-semibold text-[#8B5D48]">{product.quantity} sold</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0E9E4]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#5B112B] to-[#C5A46D] transition-all duration-500" style={{width: `${Math.min(100, product.quantity / maxQuantity * 100)}%`}}/>
                        </div>
                        <div className="mt-1.5 text-[11px] text-neutral-500">Revenue {money(product.revenue)}</div>
                      </div>
                    </div>;
                  })}
                  {topSellingProducts.length === 0 && <p className="py-8 text-center text-xs text-neutral-500">Product sales will appear here once orders are recorded.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-[#32101E]">Order Status Analytics</h2>
                    <p className="mt-1 text-xs text-neutral-500">Live order fulfilment overview</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F3E7EB] text-[#5B112B]"><Activity size={17}/></div>
                </div>
                                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-center">
                  <div className="relative h-[240px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(statusLabel).map(([status, label]) => ({
                            name: label,
                            status,
                            value: orderStatusAnalytics[status] || 0
                          })).filter((item) => item.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={3}
                        >
                          {Object.entries(statusLabel)
                            .filter(([status]) => (orderStatusAnalytics[status] || 0) > 0)
                            .map(([status], index) => {
                              const colors = ['#5B112B', '#B67077', '#C5A46D', '#7A927A', '#8FA9C2', '#8B5D48', '#32101E'];
                              return <Cell key={status} fill={colors[index % colors.length]} />;
                            })}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-400">Total orders</span>
                      <span className="font-serif text-2xl font-semibold text-[#32101E]">{orders.length}</span>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {Object.entries(statusLabel).map(([status, label], index) => {
                      const count = orderStatusAnalytics[status] || 0;
                      const percentage = orders.length ? count / orders.length * 100 : 0;
                      const colors = ['#5B112B', '#B67077', '#C5A46D', '#7A927A', '#8FA9C2', '#8B5D48', '#32101E'];

                      return (
                        <div key={status} className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                            <span className="truncate text-xs text-neutral-600">{label}</span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-xs font-semibold text-[#32101E]">{count}</span>
                            <span className="ml-2 rounded-full bg-[#F6F1EC] px-2 py-1 text-[10px] font-medium text-[#7B334A]">{Math.round(percentage)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-xl bg-[#32101E] px-4 py-3 text-white">
                  <span className="text-xs text-[#E5CFA7]">Total orders tracked</span>
                  <span className="font-serif text-xl font-semibold">{orders.length}</span>
                </div>
              </div>
            </div>
          </div>}

          {(section === 'products' || section === 'categories' || section === 'inventory') && <div className="space-y-4">
            {section === 'categories' && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{(overview?.categories || []).map((category) => <button key={category.id} onClick={() => {setCategoryFilter(categoryFilter === category.id ? 'all' : category.id);setSection('products');}} className={`group rounded-2xl border p-4 sm:p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_12px_28px_rgba(91,17,43,0.09)] ${categoryFilter === category.id ? 'border-[#5B112B] bg-[#F3E7EB] ring-1 ring-[#C5A46D]/40' : 'border-[#E8DDD5] bg-white transition-colors duration-200 hover:bg-[#F3E7EB]'}`}><div className="text-xs font-semibold">{category.label}</div><div className="mt-3 font-serif text-2xl text-[#5b112b]">{category.products}</div><div className="mt-1 text-[10px] text-neutral-500">Active products  |  select to manage</div></button>)}</div>}
            <div className="flex flex-wrap gap-2 rounded-xl border border-[#E8DDD5] bg-white p-3"><div className="flex min-w-[200px] flex-1 items-center gap-2 px-2"><Search size={15} className="text-neutral-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." className="w-full bg-transparent py-1.5 text-xs outline-none"/></div><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs"><option value="all">All categories</option>{ORDERED_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.shortLabel}</option>)}</select><span className="self-center px-2 text-[11px] text-neutral-500">{filteredProducts.length} products</span></div>
            <div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:border-[#C5A46D]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-[#F8F4F0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B112B]">
                    <tr>
                      <th className="px-4 py-3.5">Product</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Price</th>
                      <th className="px-4 py-3.5">On hand</th>
                      <th className="px-4 py-3 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="transition-colors duration-200 hover:bg-[#F3E7EB]">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <ProductImage
                              src={product.primaryImage}
                              alt={product.name}
                              category={product.category}
                              compact
                              className="h-12 w-10 shrink-0 rounded object-cover"
                            />
                            <div className="max-w-[240px]">
                              <div className="truncate font-semibold">{product.name}</div>
                              <div className="mt-1 text-[10px] text-neutral-500">{product.brand}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-neutral-600">
                          {ORDERED_CATEGORIES.find((category) => category.id === product.category)?.shortLabel || product.category}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {money(product.discountPrice)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${product.stockQuantity < 15 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                            {product.stockQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setProductModal(product)}
                              aria-label={`Edit ${product.name}`}
                              className="rounded-md p-2 text-neutral-500 hover:bg-[#F6F1EC] hover:text-[#5b112b]"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Remove "${product.name}" from the catalog?`)) {
                                  deleteProduct(product.id);
                                }
                              }}
                              aria-label={`Delete ${product.name}`}
                              className="rounded-md p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
  
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredProducts.length === 0 && (
                <p className="p-8 text-center text-xs text-neutral-500">
                  No products match this view.
                </p>
              )}
            </div>
          </div>}


          {section === 'orders' && <div className="space-y-4"><div className="flex flex-wrap gap-2 rounded-xl border border-[#E8DDD5] bg-white p-3"><div className="flex min-w-[180px] flex-1 items-center gap-2 px-2"><Search size={15} className="text-neutral-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order or customer..." className="w-full bg-transparent py-1.5 text-xs outline-none"/></div><select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)} className="rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs"><option value="all">All statuses</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div><div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:border-[#C5A46D]"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-[#F8F4F0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B112B]"><tr><th className="px-4 py-3.5">Order</th><th className="px-4 py-3.5">Customer</th><th className="px-4 py-3.5">Total / payment</th><th className="px-4 py-3.5">Items</th><th className="px-4 py-3.5">Fulfillment</th></tr></thead><tbody className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">{filteredOrders.map((order) => <tr key={order.id}><td className="px-4 py-3.5"><div className="font-semibold text-[#5b112b]">{order.id}</div><div className="mt-1 text-[10px] text-neutral-500">{new Date(order.date).toLocaleDateString('en-IN')}</div></td><td className="px-4 py-3.5"><div className="font-medium">{order.shippingAddress.fullName}</div><div className="mt-1 text-[10px] text-neutral-500">{order.shippingAddress.phone}  |  {order.shippingAddress.city}</div></td><td className="px-4 py-3.5"><div className="font-semibold">{money(order.total)}</div><div className="mt-1 text-[10px] text-neutral-500">{order.paymentMethod}  |  {order.paymentStatus}</div></td><td className="px-4 py-3.5">{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</td><td className="px-4 py-3.5"><select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value as OrderStatus)} className="rounded-lg border border-[#E8DDD5] bg-white px-2 py-2 text-[11px] font-medium">{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td></tr>)}</tbody></table></div>{filteredOrders.length === 0 && <p className="p-8 text-center text-xs text-neutral-500">No orders match this search.</p>}</div></div>}

          {section === 'customers' && <div className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-xl border border-[#E8DDD5] bg-white p-2">
              <button type="button" onClick={() => { setCustomerTab('customers'); setQuery(''); }} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${customerTab === 'customers' ? 'bg-[#5B112B] text-white' : 'text-[#5B112B] hover:bg-[#F6F1EC]'}`}>
                <Users size={14} className="mr-2 inline"/> Customers
              </button>
              <button type="button" onClick={() => setCustomerTab('inquiries')} className={`rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors ${customerTab === 'inquiries' ? 'bg-[#5B112B] text-white' : 'text-[#5B112B] hover:bg-[#F6F1EC]'}`}>
                <Activity size={14} className="mr-2 inline"/> Contact Inquiries
                {contactInquiries.length > 0 && <span className="ml-2 rounded-full bg-[#C5A46D] px-2 py-0.5 text-[10px] text-[#32101E]">{contactInquiries.length}</span>}
              </button>
            </div>

            {customerTab === 'customers' ? <div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:border-[#C5A46D]">
              <div className="flex items-center gap-2 border-b border-[#f0ece7] p-3">
                <Search size={15} className="text-neutral-400"/>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers by name, email or phone..." className="w-full bg-transparent py-1 text-xs outline-none"/>
                <span className="whitespace-nowrap text-[10px] text-neutral-500">{overview?.customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.toLowerCase())).length} customers</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-[#F8F4F0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B112B]"><tr><th className="px-4 py-3.5">Customer</th><th className="px-4 py-3.5">Joined</th><th className="px-4 py-3.5">Orders</th><th className="px-4 py-3.5">Lifetime spend</th><th className="px-4 py-3.5">Last order</th></tr></thead>
                  <tbody className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">
                    {(overview?.customers || []).filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.toLowerCase())).map((customer) => <tr key={customer.id}>
                      <td className="px-4 py-3.5"><div className="font-semibold">{customer.name}</div><div className="mt-1 text-[10px] text-neutral-500">{customer.email || customer.phone || 'No contact details'}</div></td>
                      <td className="px-4 py-3 text-neutral-600">{new Date(customer.joined).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3.5">{customer.orders}</td>
                      <td className="px-4 py-3 font-semibold">{money(customer.spend)}</td>
                      <td className="px-4 py-3 text-neutral-600">{customer.lastOrder ? new Date(customer.lastOrder).toLocaleDateString('en-IN') : '-'}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            </div> : <div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DDD5] p-4 sm:p-5">
                <div><h2 className="font-serif text-lg font-semibold text-[#30151e]">Contact inquiries</h2><p className="mt-1 text-xs text-neutral-500">Messages submitted through the VYORA storefront contact form.</p></div>
                <button type="button" onClick={() => setInquiriesRefresh((value) => value + 1)} disabled={inquiriesLoading} className="rounded-lg border border-[#E8DDD5] px-3 py-2 text-xs font-medium text-[#5B112B] hover:bg-[#F6F1EC] disabled:opacity-50">
                  <RefreshCw size={13} className={`mr-1 inline ${inquiriesLoading ? 'animate-spin' : ''}`}/> Refresh
                </button>
              </div>
              {inquiriesLoading ? <p className="p-8 text-center text-xs text-neutral-500">Loading contact inquiries...</p> :
                contactInquiries.length === 0 ? <div className="p-10 text-center"><Activity size={26} className="mx-auto text-[#C5A46D]"/><p className="mt-3 text-sm font-semibold text-[#32101E]">No inquiries yet</p><p className="mt-1 text-xs text-neutral-500">New contact form submissions will appear here.</p></div> :
                <div className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">
                  {contactInquiries.map((inquiry) => <article key={inquiry.id} className="p-4 transition-colors hover:bg-[#FCFAF8] sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><h3 className="text-sm font-semibold leading-snug text-[#32101E]">{inquiry.subject}</h3><p className="mt-1 text-xs text-neutral-600">{inquiry.name} <span className="px-1 text-neutral-300">·</span> <a href={`mailto:${inquiry.email}`} className="text-[#7A334D] hover:underline">{inquiry.email}</a></p></div>
                      <div className="flex items-center gap-2"><span className="rounded-full bg-[#F3E7EB] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#5B112B]">{inquiry.status}</span><time className="text-[10px] text-neutral-500">{new Date(inquiry.createdAt).toLocaleString('en-IN')}</time></div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-neutral-700">{inquiry.message}</p>
                  </article>)}
                </div>
              }
            </div>}
          </div>}
          {section === 'reports' && <div className="space-y-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:'Gross sales',value:money(stat?.revenue||0),icon:CircleDollarSign},{label:'Orders',value:stat?.orders||0,icon:ShoppingBag},{label:'Average order',value:money(stat?.orders ? (stat.revenue/stat.orders) : 0),icon:ArrowUpRight},{label:'Pending fulfillment',value:stat?.pending||0,icon:Clock3}].map(({label,value,icon:Icon})=><div key={label} className="group rounded-2xl border border-[#E8DDD5] bg-white p-5 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]"><Icon size={16} className="text-[#7b334a]"/><div className="mt-3 text-xl font-semibold">{value}</div><div className="mt-1 text-[11px] text-neutral-500">{label}</div></div>)}</div><div className="rounded-2xl border border-[#E8DDD5] bg-white p-5 sm:p-6 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]"><div className="flex items-center justify-between"><div><h2 className="font-serif text-lg font-semibold">Monthly sales</h2><p className="mt-1 text-xs text-neutral-500">Revenue and order count from the live order database</p></div><button onClick={exportReport} className="flex items-center gap-2.5 rounded-xl border border-[#E8DDD5] px-3 py-2 text-xs font-medium"><Download size={14}/> Export</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead className="border-b border-[#E8DDD5] bg-[#F6F1EC] text-[10px] font-semibold uppercase tracking-wider text-[#5B112B]"><tr><th className="py-3">Month</th><th className="py-3">Orders</th><th className="py-3">Sales</th><th className="py-3">Share</th></tr></thead><tbody className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">{(overview?.monthlySales||[]).map((month)=><tr key={month.month}><td className="py-3 font-medium">{month.month}</td><td className="py-3">{month.orders}</td><td className="py-3 font-semibold">{money(month.revenue)}</td><td className="py-3"><div className="h-2 w-32 rounded-full bg-[#E9DED6]"><div className="h-2 rounded-full bg-gradient-to-r from-[#5B112B] to-[#C5A46D]" style={{width:`${Math.max(2, month.revenue/(stat?.revenue||1)*100)}%`}}/></div></td></tr>)}</tbody></table>{overview?.monthlySales.length===0&&<p className="py-10 text-center text-xs text-neutral-500">Sales data will appear here after an order is placed.</p>}</div></div></div>}

          {section === 'activity' && <div className="space-y-4">
            <div className="group rounded-2xl border border-[#E8DDD5] bg-white p-5 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#30151e]">Administrator activity</h2>
                  <p className="mt-1 text-xs text-neutral-500">Review actions performed in the VYORA admin panel.</p>
                </div>
                <button type="button" onClick={() => setAuditRefresh((value) => value + 1)} className="rounded-lg border border-[#E8DDD5] px-3 py-2 text-xs font-medium hover:bg-[#faf8f5]">
                  <RefreshCw size={13} className="mr-1 inline"/> Refresh
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-[11px] font-medium text-neutral-600">Action
                  <select value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(1); }} className="mt-1.5 w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2.5 text-xs">
                    <option value="all">All actions</option>
                    {(auditData?.actions || []).map((action) => <option key={action} value={action}>{action.replace(/[_-]/g, ' ')}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-medium text-neutral-600">Entity
                  <select value={auditEntity} onChange={(event) => { setAuditEntity(event.target.value); setAuditPage(1); }} className="mt-1.5 w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2.5 text-xs">
                    <option value="all">All entities</option>
                    {(auditData?.entities || []).map((entity) => <option key={entity} value={entity}>{entity.replace(/[_-]/g, ' ')}</option>)}
                  </select>
                </label>
                <label className="text-[11px] font-medium text-neutral-600">Administrator
                  <select value={auditActor} onChange={(event) => { setAuditActor(event.target.value); setAuditPage(1); }} className="mt-1.5 w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2.5 text-xs">
                    <option value="all">All administrators</option>
                    {(auditData?.actors || []).map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:border-[#C5A46D]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-[#F8F4F0] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B112B]">
                    <tr>
                      <th className="px-4 py-3.5">Administrator</th>
                      <th className="px-4 py-3.5">Action</th>
                      <th className="px-4 py-3.5">Entity / Target</th>
                      <th className="px-4 py-3.5">Date &amp; time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEE6DF] [&>tr]:transition-colors [&>tr:hover]:bg-[#FCF9F6]">
                    {(auditData?.logs || []).map((log) => <tr key={log.id}>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#30151e]">{log.actorName || 'Administrator'}</div>
                        <div className="mt-1 text-[10px] text-neutral-500">{log.actorRole || 'Admin'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex rounded-full bg-[#f7f0ed] px-2.5 py-1 text-[10px] font-semibold text-[#6b263d]">{log.action.replace(/[_-]/g, ' ')}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium">{log.targetEntity.replace(/[_-]/g, ' ') || 'â€”'}</div>
                        <div className="mt-1 text-[10px] text-neutral-500">{log.targetId || 'â€”'}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[11px] font-medium text-[#74645F]">{formatAuditLogDate(log.createdAt)}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              {auditLoading && <p className="p-8 text-center text-xs text-neutral-500">Loading activity records...</p>}
              {!auditLoading && (auditData?.logs.length || 0) === 0 && <p className="p-8 text-center text-xs text-neutral-500">No activity records found for these filters.</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0ece7] px-4 py-3">
                <span className="text-[11px] text-neutral-500">
                  {auditData ? `Showing ${auditData.logs.length ? (auditData.page - 1) * auditData.pageSize + 1 : 0}-${Math.min(auditData.page * auditData.pageSize, auditData.total)} of ${auditData.total} records` : 'Activity records'}
                </span>
                <div className="flex gap-2">
                  <button type="button" disabled={auditPage <= 1 || auditLoading} onClick={() => setAuditPage((page) => Math.max(1, page - 1))} className="rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs font-semibold text-[#5B112B] transition-colors duration-200 hover:border-[#C5A46D] hover:bg-[#F8F4F0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#E8DDD5] disabled:hover:bg-white">Previous</button>
                  <button type="button" disabled={!auditData || auditPage >= Math.ceil(auditData.total / auditData.pageSize) || auditLoading} onClick={() => setAuditPage((page) => page + 1)} className="rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs font-semibold text-[#5B112B] transition-colors duration-200 hover:border-[#C5A46D] hover:bg-[#F8F4F0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#E8DDD5] disabled:hover:bg-white">Next</button>
                </div>
              </div>
            </div>
          </div>}

          {section === 'content' && <div className="space-y-4"><div className="group rounded-2xl border border-[#E8DDD5] bg-white p-5 shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C5A46D] hover:shadow-[0_14px_32px_rgba(91,17,43,0.09)] text-xs leading-relaxed text-neutral-600">These campaigns appear in the VYORA storefront hero carousel. Changes are saved to the store database and shown to shoppers.</div><div className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)]">
  <div className="border-b border-[#E8DDD5] p-5">
    <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9A7652]">Storefront CMS</p>
    <h2 className="mt-1 font-serif text-xl font-semibold text-[#32101E]">Manage website content</h2>
    <p className="mt-1 text-xs text-neutral-500">Edit the content displayed across your VYORA storefront pages.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {(['about','contact','faq','policies','footer','seo'] as const).map((tab) => (
        <button key={tab} type="button" onClick={() => setCmsTab(tab)}
          className={`rounded-xl px-4 py-2.5 text-[11px] font-semibold capitalize transition-all duration-200 ${cmsTab === tab ? 'bg-[#5B112B] text-white' : 'border border-[#E8DDD5] bg-[#F6F1EC] text-[#5B112B] hover:border-[#C5A46D]'}`}>
          {tab === 'seo' ? 'SEO' : tab}
        </button>
      ))}
    </div>
  </div>
  {!cmsContent ? <div className="p-6 text-xs text-neutral-500">Loading CMS content...</div> : <div className="space-y-4 p-5">
    {cmsTab === 'about' && <>
      {([
        ['eyebrow','Eyebrow',cmsContent.about.eyebrow],
        ['title','Page title',cmsContent.about.title],
        ['description','About description',cmsContent.about.description],
        ['promiseTitle','Promise heading',cmsContent.about.promiseTitle],
        ['promiseDescription','Promise description',cmsContent.about.promiseDescription]
      ] as const).map(([field,label,value]) => <label key={field} className="block text-[11px] font-semibold text-neutral-600">{label}
        {field.includes('description') ? <textarea rows={4} value={value} onChange={(e) => updateCmsField('about',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/> : <input value={value} onChange={(e) => updateCmsField('about',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/>}
      </label>)}
    </>}
    {cmsTab === 'contact' && <>
      {([
        ['eyebrow','Eyebrow',cmsContent.contact.eyebrow],
        ['title','Page title',cmsContent.contact.title],
        ['description','Description',cmsContent.contact.description],
        ['email','Contact email',cmsContent.contact.email],
        ['hours','Business hours',cmsContent.contact.hours],
        ['location','Business location',cmsContent.contact.location],
        ['conciergeTitle','Concierge heading',cmsContent.contact.conciergeTitle],
        ['conciergeDescription','Concierge description',cmsContent.contact.conciergeDescription]
      ] as const).map(([field,label,value]) => <label key={field} className="block text-[11px] font-semibold text-neutral-600">{label}
        {field.toLowerCase().includes('description') ? <textarea rows={3} value={value} onChange={(e) => updateCmsField('contact',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/> : <input value={value} onChange={(e) => updateCmsField('contact',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/>}
      </label>)}
    </>}
    {cmsTab === 'faq' && <>
      {([
        ['eyebrow','Eyebrow',cmsContent.faq.eyebrow],
        ['title','Page title',cmsContent.faq.title],
        ['description','Introduction',cmsContent.faq.description]
      ] as const).map(([field,label,value]) => <label key={field} className="block text-[11px] font-semibold text-neutral-600">{label}<input value={value} onChange={(e) => updateCmsField('faq',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/></label>)}
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold leading-snug text-[#32101E]">Frequently asked questions</h3><button type="button" onClick={() => updateCmsField('faq','items',[...cmsContent.faq.items,{category:'General',question:'',answer:''}])} className="rounded-xl border border-[#E8DDD5] bg-white px-4 py-2.5 text-[11px] font-semibold text-[#5B112B] transition-all duration-200 hover:border-[#C5A46D] hover:bg-[#F8F4F0]"><Plus size={13} className="mr-1 inline"/>Add question</button></div>
      {cmsContent.faq.items.map((item,index) => <div key={index} className="space-y-3 rounded-2xl border border-[#E8DDD5] bg-[#FCFAF8] p-4 shadow-[0_3px_12px_rgba(50,16,30,0.035)] transition-all duration-200 hover:border-[#D8C4AE]">
        <div className="flex justify-between"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#9A7652]">Question {index+1}</span><button type="button" onClick={() => updateCmsField('faq','items',cmsContent.faq.items.filter((_,i)=>i!==index))} className="rounded-md px-2 py-1 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-50">Remove</button></div>
        <input aria-label="FAQ category" placeholder="Category" value={item.category} onChange={(e)=>updateCmsField('faq','items',cmsContent.faq.items.map((x,i)=>i===index?{...x,category:e.target.value}:x))} className="w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs"/>
        <input aria-label="FAQ question" placeholder="Question" value={item.question} onChange={(e)=>updateCmsField('faq','items',cmsContent.faq.items.map((x,i)=>i===index?{...x,question:e.target.value}:x))} className="w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs"/>
        <textarea aria-label="FAQ answer" rows={3} placeholder="Answer" value={item.answer} onChange={(e)=>updateCmsField('faq','items',cmsContent.faq.items.map((x,i)=>i===index?{...x,answer:e.target.value}:x))} className="w-full rounded-lg border border-[#E8DDD5] bg-white px-3 py-2 text-xs"/>
      </div>)}
    </>}
    {cmsTab === 'policies' && <>
      {(['shipping','returns','privacy','terms'] as const).map((policy) => <div key={policy} className="space-y-3 rounded-2xl border border-[#E8DDD5] bg-[#FCFAF8] p-5 shadow-[0_3px_12px_rgba(50,16,30,0.035)] transition-all duration-200 hover:border-[#D8C4AE]">
        <h3 className="font-serif text-base font-semibold capitalize text-[#32101E]">{policy === 'returns' ? 'Returns & Exchanges' : `${policy} policy`}</h3>
        <label className="block text-[11px] font-semibold text-neutral-600">Title<input value={cmsContent.policies[policy].title} onChange={(e)=>updateCmsField('policies',policy,{...cmsContent.policies[policy],title:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E8DDD5] bg-[#F8F5F2] px-3 py-2 text-xs font-normal"/></label>
        <label className="block text-[11px] font-semibold text-neutral-600">Summary<input value={cmsContent.policies[policy].summary} onChange={(e)=>updateCmsField('policies',policy,{...cmsContent.policies[policy],summary:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E8DDD5] bg-[#F8F5F2] px-3 py-2 text-xs font-normal"/></label>
        <label className="block text-[11px] font-semibold text-neutral-600">Policy content<textarea rows={5} value={cmsContent.policies[policy].body} onChange={(e)=>updateCmsField('policies',policy,{...cmsContent.policies[policy],body:e.target.value})} className="mt-1 w-full rounded-lg border border-[#E8DDD5] bg-[#F8F5F2] px-3 py-2 text-xs font-normal"/></label>
      </div>)}
    </>}
    {cmsTab === 'footer' && <>
      <div className="space-y-4">
      {([
        ['description','Brand description',cmsContent.footer.description],
        ['email','Support email',cmsContent.footer.email],
        ['newsletterTitle','Newsletter heading',cmsContent.footer.newsletterTitle],
        ['newsletterDescription','Newsletter description',cmsContent.footer.newsletterDescription]
      ] as const).map(([field,label,value]) => <label key={field} className="block text-[11px] font-semibold text-neutral-600">{label}{field.toLowerCase().includes('description') ? <textarea rows={3} value={value} onChange={(e)=>updateCmsField('footer',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/> : <input value={value} onChange={(e)=>updateCmsField('footer',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/>}</label>)}
      </div>
    </>}
    {cmsTab === 'seo' && <>
      <div className="space-y-4">
      {([
        ['title','Browser / page title',cmsContent.seo.title],
        ['description','Meta description',cmsContent.seo.description],
        ['keywords','SEO keywords',cmsContent.seo.keywords],
        ['ogTitle','Social sharing title',cmsContent.seo.ogTitle],
        ['ogDescription','Social sharing description',cmsContent.seo.ogDescription]
      ] as const).map(([field,label,value]) => <label key={field} className="block text-[11px] font-semibold text-neutral-600">{label}{field.toLowerCase().includes('description') ? <textarea rows={3} value={value} onChange={(e)=>updateCmsField('seo',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/> : <input value={value} onChange={(e)=>updateCmsField('seo',field,e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 font-normal"/>}</label>)}
      </div>
    </>}
    <div className="flex justify-end border-t border-[#E8DDD5] pt-4">
      <button type="button" onClick={() => void saveCmsContent()} disabled={cmsSaving}
        className="rounded-lg bg-[#5B112B] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#32101E] disabled:cursor-not-allowed disabled:opacity-50">
        {cmsSaving ? 'Saving changes...' : 'Save CMS changes'}
      </button>
    </div>
  </div>}
</div><div className="grid gap-4 xl:grid-cols-2">{banners.map((banner,index)=><article key={banner.id} className="overflow-hidden rounded-2xl border border-[#E8DDD5] bg-white shadow-[0_5px_22px_rgba(50,16,30,0.055)] transition-all duration-300 hover:border-[#C5A46D]"><div className="relative h-40 bg-[#32151e]"><img src={banner.image} alt="" className="h-full w-full object-cover opacity-70"/><div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"/><div className="absolute bottom-4 left-4 right-4 text-white"><div className="text-[9px] uppercase tracking-[.18em] text-[#e4c88b]">{banner.kicker}</div><div className="mt-1 line-clamp-2 font-serif text-lg font-semibold">{banner.title}</div></div><span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-semibold ${banner.active?'bg-emerald-100 text-emerald-800':'bg-white/90 text-neutral-600'}`}>{banner.active?'Live':'Hidden'}</span></div><div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-[10px] text-neutral-500">Slide {index+1}  |  {ORDERED_CATEGORIES.find((item)=>item.id===banner.category)?.shortLabel||banner.category}</span><div className="flex shrink-0 gap-1">
  <button type="button" disabled={index === 0} onClick={() => { const next = [...banners]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; void saveBanners(next); }} title="Move up" aria-label="Move campaign up" className="rounded-md px-2 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-[#F6F1EC] disabled:cursor-not-allowed disabled:opacity-30">?</button>
  <button type="button" disabled={index === banners.length - 1} onClick={() => { const next = [...banners]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; void saveBanners(next); }} title="Move down" aria-label="Move campaign down" className="rounded-md px-2 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-[#F6F1EC] disabled:cursor-not-allowed disabled:opacity-30">?</button><button onClick={()=>void saveBanners(banners.map((item)=>item.id===banner.id?{...item,active:!item.active}:item))} className="rounded-md px-2 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-[#F6F1EC]">{banner.active?'Hide':'Publish'}</button><button onClick={()=>setBannerModal(banner)} aria-label="Edit campaign" className="rounded-md p-2 text-neutral-500 hover:bg-[#F6F1EC]"><Pencil size={14}/></button><button onClick={()=>{if(window.confirm('Remove this homepage campaign?')) void saveBanners(banners.filter((item)=>item.id!==banner.id));}} aria-label="Remove campaign" className="rounded-md p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={14}/></button></div></div></article>)}</div>{banners.length===0&&<div className="rounded-xl border border-dashed border-[#d8cec5] bg-white p-10 text-center text-xs text-neutral-500">No homepage campaigns. Add one to feature a collection.</div>}</div>}
        </>}
      </main>
    </div>

    {productModal && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3"><form onSubmit={saveProduct} className="max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.18em] text-[#8b5d48]">Catalog management</div><h2 className="mt-1 font-serif text-xl font-semibold">{productModal==='new'?'Add product':'Edit product'}</h2></div><button type="button" onClick={()=>setProductModal(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-neutral-100"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2">{[['name','Product name',productModal==='new'?'':productModal.name],['brand','Brand',productModal==='new'?'VYORA':productModal.brand],['subCategory','Subcategory',productModal==='new'?'':productModal.subCategory],['image','Image URL',productModal==='new'?'':productModal.primaryImage]].map(([name,label,value])=><label key={name} className="text-[11px] font-medium text-neutral-600">{label}<input name={name} required={name==='name'} defaultValue={value} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15 text-neutral-900 outline-none focus:border-[#9b6672]"/></label>)}<label className="text-[11px] font-medium text-neutral-600">Category<select name="category" defaultValue={productModal==='new'?'fashion':productModal.category} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15">{ORDERED_CATEGORIES.map((category)=><option key={category.id} value={category.id}>{category.shortLabel}</option>)}</select></label>{[['originalPrice','List price (Rs.)',productModal==='new'?0:productModal.originalPrice],['discountPrice','Selling price (Rs.)',productModal==='new'?0:productModal.discountPrice],['stockQuantity','Stock units',productModal==='new'?0:productModal.stockQuantity]].map(([name,label,value])=><label key={String(name)} className="text-[11px] font-medium text-neutral-600">{label}<input name={String(name)} type="number" min="0" required defaultValue={value} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15"/></label>)}</div><div className="flex justify-end gap-2 border-t border-[#f0ece7] pt-4"><button type="button" onClick={()=>setProductModal(null)} className="rounded-lg px-4 py-2.5 text-xs font-medium text-neutral-600">Cancel</button><button disabled={saving} className="rounded-lg bg-[#5b112b] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving?'Saving...':'Save product'}</button></div></form></div>}

    {bannerModal && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3"><form onSubmit={saveBanner} className="max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-[.18em] text-[#8b5d48]">Storefront content</div><h2 className="mt-1 font-serif text-xl font-semibold">{bannerModal==='new'?'New homepage campaign':'Edit homepage campaign'}</h2></div><button type="button" onClick={()=>setBannerModal(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-neutral-100"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2">{[['kicker','Eyebrow',bannerModal==='new'?'':bannerModal.kicker],['edition','Collection note',bannerModal==='new'?'':bannerModal.edition],['title','Headline',bannerModal==='new'?'':bannerModal.title],['subtitle','Description',bannerModal==='new'?'':bannerModal.subtitle],['image','Image URL',bannerModal==='new'?'':bannerModal.image],['ctaText','Primary button',bannerModal==='new'?'Explore the collection':bannerModal.ctaText],['secondaryCta','Secondary button',bannerModal==='new'?'Shop all':bannerModal.secondaryCta]].map(([name,label,value])=><label key={name} className={`text-[11px] font-medium text-neutral-600 ${name==='subtitle'?'sm:col-span-2':''}`}>{label}{name==='subtitle'?<textarea name={name} required defaultValue={value} rows={3} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15"/>:<input name={name} required={['title','image'].includes(name)} defaultValue={value} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15"/>}</label>)}<label className="text-[11px] font-medium text-neutral-600">Primary category<select name="category" defaultValue={bannerModal==='new'?'fashion':bannerModal.category} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15">{[{id:'all',shortLabel:'Shop all'},...ORDERED_CATEGORIES].map((category)=><option key={category.id} value={category.id}>{category.shortLabel}</option>)}</select></label><label className="text-[11px] font-medium text-neutral-600">Secondary category<select name="secondaryCategory" defaultValue={bannerModal==='new'?'all':bannerModal.secondaryCategory} className="mt-1.5 w-full rounded-lg border border-[#E5DAD2] bg-[#FCFAF8] px-3 py-2.5 text-xs text-[#30242A] outline-none transition-all duration-200 placeholder:text-neutral-400 focus:border-[#9B6672] focus:ring-2 focus:ring-[#9B6672]/15">{[{id:'all',shortLabel:'Shop all'},...ORDERED_CATEGORIES].map((category)=><option key={category.id} value={category.id}>{category.shortLabel}</option>)}</select></label><label className="flex items-center gap-2 text-xs text-neutral-700"><input name="active" type="checkbox" defaultChecked={bannerModal==='new'||bannerModal.active} className="accent-[#5b112b]"/> Publish on storefront</label></div><div className="flex justify-end gap-2 border-t border-[#f0ece7] pt-4"><button type="button" onClick={()=>setBannerModal(null)} className="rounded-lg px-4 py-2.5 text-xs font-medium text-neutral-600">Cancel</button><button disabled={saving} className="rounded-lg bg-[#5b112b] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving?'Saving...':'Save campaign'}</button></div></form></div>}
  </div>;
};



































































