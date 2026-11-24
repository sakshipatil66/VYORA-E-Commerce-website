import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Package, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { AdminAnalyticsData, AdminCouponSummary, AdminInventorySummary, AdminRefundSummary, AdminReturnSummary, AnalyticsGranularity, AnalyticsRange, CmsPermission, Order, Product, StoreCategory } from '../../types';

type ReportKind = 'Sales' | 'Revenue' | 'Orders' | 'Products' | 'Categories' | 'Customers' | 'Inventory' | 'Coupons' | 'Returns & refunds' | 'Payments';
const kinds: ReportKind[] = ['Sales', 'Revenue', 'Orders', 'Products', 'Categories', 'Customers', 'Inventory', 'Coupons', 'Returns & refunds', 'Payments'];
const money = (value: number) => `â‚¹${Math.round(value || 0).toLocaleString('en-IN')}`;
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

interface Props {
  analytics: AdminAnalyticsData | null;
  orders: Order[];
  products: Product[];
  categories: StoreCategory[];
  loading: boolean;
  range: AnalyticsRange;
  granularity: AnalyticsGranularity;
  startDate: string;
  endDate: string;
  onRangeChange: (value: AnalyticsRange) => void;
  onGranularityChange: (value: AnalyticsGranularity) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onOpenProduct: (id: string) => void;
  onOpenCategory: (id: string) => void;
  canAccess: (permission: CmsPermission) => boolean;
}

export const AdminReports: React.FC<Props> = (props) => {
  const [kind, setKind] = useState<ReportKind>('Sales');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [inventory, setInventory] = useState<AdminInventorySummary | null>(null);
  const [coupons, setCoupons] = useState<AdminCouponSummary | null>(null);
  const [returns, setReturns] = useState<AdminReturnSummary | null>(null);
  const [refunds, setRefunds] = useState<AdminRefundSummary | null>(null);
  const [auxError, setAuxError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      props.canAccess('manage_inventory') ? api.adminInventory() : Promise.resolve(null),
      props.canAccess('manage_coupons') ? api.adminCoupons() : Promise.resolve(null),
      props.canAccess('manage_returns') ? api.adminReturns() : Promise.resolve(null),
      props.canAccess('manage_refunds') ? api.adminRefunds() : Promise.resolve(null)
    ])
      .then(([inv, coup, ret, ref]) => { if (alive) { if(inv)setInventory(inv); if(coup)setCoupons(coup); if(ret)setReturns(ret); if(ref)setRefunds(ref); setAuxError(''); } })
      .catch((error: Error) => { if (alive) setAuxError(error.message || 'Some operational reports could not be loaded.'); });
    return () => { alive = false; };
  }, []);

  const analytics = props.analytics;
  const orderWindow = useMemo(() => {
    if (props.range === 'all') return { from: Number.NEGATIVE_INFINITY, to: Number.POSITIVE_INFINITY };
    if (props.range === 'custom') return {
      from: props.startDate ? Date.parse(`${props.startDate}T00:00:00`) : Number.NEGATIVE_INFINITY,
      to: props.endDate ? Date.parse(`${props.endDate}T23:59:59.999`) : Number.POSITIVE_INFINITY
    };
    const now = new Date();
    let from = new Date(now);
    let to = new Date(now);
    if (props.range === 'today') from.setUTCHours(0, 0, 0, 0);
    else if (props.range === 'yesterday') { from.setUTCDate(from.getUTCDate() - 1); from.setUTCHours(0,0,0,0); to = new Date(from.getTime() + 86400000 - 1); }
    else if (props.range === 'thisMonth') from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    else if (props.range === 'previousMonth') { from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)); to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 1); }
    else if (props.range === 'thisYear') from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    else { const days = props.range === '7d' ? 7 : props.range === '90d' ? 90 : props.range === '1y' ? 365 : 30; from = new Date(now.getTime() - days * 86400000); }
    return { from: from.getTime(), to: to.getTime() };
  }, [props.range, props.startDate, props.endDate]);
  const filteredOrders = useMemo(() => props.orders.filter((order) => {
    const date = Date.parse(order.createdAt || order.date);
    const productMatch = productFilter === 'all' || order.items.some((item) => item.productId === productFilter);
    const categoryMatch = categoryFilter === 'all' || order.items.some((item) => props.products.find((p) => p.id === item.productId)?.category === categoryFilter);
    return (!Number.isFinite(date) || (date >= orderWindow.from && date <= orderWindow.to)) && productMatch && categoryMatch && (orderFilter === 'all' || order.status === orderFilter);
  }), [props.orders, props.products, orderWindow, productFilter, categoryFilter, orderFilter]);

  const lowStock = inventory?.products.filter((product) => product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold ?? 10)) || [];
  const outOfStock = inventory?.products.filter((product) => product.stockQuantity === 0) || [];
  const topCategory = analytics?.categorySales[0];
  const topProduct = analytics?.bestSellers[0];
  const cancellationRate = analytics?.kpis.totalOrders ? analytics.kpis.cancelledOrders / analytics.kpis.totalOrders * 100 : 0;
  const maxRevenue = Math.max(1, ...(analytics?.revenueSeries || []).map((point) => point.revenue));
  const linePoints = (analytics?.revenueSeries || []).map((point, index, series) => `${series.length < 2 ? 50 : 4 + index * 92 / (series.length - 1)},${92 - point.revenue / maxRevenue * 82}`).join(' ');

  const exportCsv = async () => {
    setExporting(true);
    try {
      let rows: unknown[][];
      if (kind === 'Orders' || kind === 'Payments') {
        rows = [['Order ID', 'Date', 'Status', 'Payment method', 'Payment status', 'Items', 'Subtotal', 'Discount', 'Total'], ...filteredOrders.map((order) => [order.id, order.createdAt || order.date, order.status, order.paymentMethod, order.paymentStatus, order.items.reduce((sum, item) => sum + item.quantity, 0), order.subtotal, order.discount + order.couponDiscount, order.total])];
      } else if (kind === 'Products') {
        rows = [['Product ID', 'Product', 'Category', 'Units sold', 'Revenue', 'Current stock'], ...(analytics?.bestSellers || []).filter((p) => productFilter === 'all' || p.productId === productFilter).map((p) => [p.productId, p.name, p.category, p.unitsSold, p.revenue, p.currentStock])];
      } else if (kind === 'Categories') {
        rows = [['Category ID', 'Category', 'Units sold', 'Revenue', 'Orders'], ...(analytics?.categorySales || []).filter((c) => categoryFilter === 'all' || c.categoryId === categoryFilter).map((c) => [c.categoryId, c.label, c.unitsSold, c.revenue, c.ordersCount])];
      } else if (kind === 'Inventory') {
        rows = [['Product ID', 'Product', 'SKU', 'Category', 'Stock', 'Low stock threshold'], ...(inventory?.products || []).filter((p) => categoryFilter === 'all' || p.category === categoryFilter).map((p) => [p.id, p.name, p.sku, p.category, p.stockQuantity, p.lowStockThreshold ?? 10])];
      } else if (kind === 'Coupons') {
        const usageRows = (coupons?.usages || []).filter((usage) => { const time = Date.parse(usage.usedAt); return !Number.isFinite(time) || (time >= orderWindow.from && time <= orderWindow.to); });
        rows = [['Coupon', 'Order ID', 'Discount', 'Order total', 'Used at'], ...usageRows.map((u) => [u.couponCode, u.orderId, u.discountAmount, u.orderTotal, u.usedAt])];
      } else if (kind === 'Returns & refunds') {
        rows = [['Record type', 'ID', 'Order ID', 'Status', 'Amount', 'Created'], ...(returns?.returns || []).map((r) => ['Return', r.id, r.orderId, r.status, r.refundedAmount || r.estimatedRefundAmount, r.createdAt]), ...(refunds?.refunds || []).map((r) => ['Refund', r.id, r.orderId, r.status, r.amount, r.createdAt])];
      } else if (kind === 'Customers') {
        const customers = new Map<string, Order[]>();
        for (const order of filteredOrders) {
          const key = order.customerEmail || order.customerName || order.id;
          customers.set(key, [...(customers.get(key) || []), order]);
        }
        rows = [['Customer reference', 'Orders', 'Net spend'], ...Array.from(customers.values()).map((list, index) => [`Customer ${index + 1}`, list.length, list.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)])];
      } else {
        rows = [['Period', 'Revenue', 'Orders', 'Cancelled orders'], ...(analytics?.revenueSeries || []).map((point) => [point.label, point.revenue, point.orders, point.cancelled])];
      }
      const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `vyora-${kind.toLowerCase().replace(/[^a-z]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setExporting(false); }
  };

  const control = 'rounded-xl border border-[#e7dbd0] bg-white px-3 py-2.5 text-xs text-[#49352f] outline-none focus:border-[#8c3448]';
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a88243]">Commerce intelligence</p><h2 className="mt-1 font-serif text-3xl text-[#3b191e]">Reports &amp; insights</h2><p className="mt-2 max-w-2xl text-sm text-[#83736b]">Live calculations from VYORA orders and operational records. Cancelled orders are excluded from recognized revenue; all placed orders are counted in order totals.</p></div><button type="button" disabled={exporting || props.loading} onClick={() => void exportCsv()} className="inline-flex items-center gap-2 rounded-xl bg-[#5b112b] px-4 py-3 text-xs font-semibold text-white disabled:opacity-50">{exporting ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}{exporting ? 'Preparing CSVâ€¦' : 'Export selected report'}</button></div>
    <div className="grid gap-3 rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-4 sm:grid-cols-2 lg:grid-cols-5">
      <select className={control} value={props.range} onChange={(e) => props.onRangeChange(e.target.value as AnalyticsRange)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="thisMonth">This month</option><option value="previousMonth">Previous month</option><option value="thisYear">This year</option><option value="1y">Last year</option><option value="all">All time</option><option value="custom">Custom range</option></select>
      <select className={control} value={props.granularity} onChange={(e) => props.onGranularityChange(e.target.value as AnalyticsGranularity)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
      <input aria-label="Report start date" className={control} type="date" value={props.startDate} onChange={(e) => props.onStartDateChange(e.target.value)} />
      <input aria-label="Report end date" className={control} type="date" value={props.endDate} onChange={(e) => props.onEndDateChange(e.target.value)} />
      <select aria-label="Filter by category" className={control} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{props.categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select>
      <select aria-label="Filter by product" className={control} value={productFilter} onChange={(e) => setProductFilter(e.target.value)}><option value="all">All products</option>{props.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
      <select aria-label="Filter by order status" className={control} value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}><option value="all">All order statuses</option>{['placed','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled'].map((status) => <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select>
    </div>
    <div className="flex gap-2 overflow-x-auto pb-1">{kinds.map((item) => <button key={item} type="button" onClick={() => setKind(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${kind === item ? 'bg-[#5b112b] text-white' : 'border border-[#e7dbd0] bg-white text-[#77675f] hover:border-[#b8995c]'}`}>{item}</button>)}</div>
    {props.loading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-[#eee5dc]" />)}</div> : !analytics ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-800">Reports could not load. Refresh the dashboard to retry.</div> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Net sales', money(analytics.kpis.totalRevenue), analytics.comparison.revenueChangePercent === null ? 'No previous baseline' : `${analytics.comparison.revenueChangePercent > 0 ? '+' : ''}${analytics.comparison.revenueChangePercent}% vs previous period`],
        ['Gross revenue', money(analytics.kpis.grossRevenue), 'Non-cancelled orders Â· before discounts'],
        ['Orders', analytics.kpis.totalOrders.toLocaleString(), `${analytics.kpis.cancelledOrders} cancelled Â· ${cancellationRate.toFixed(1)}%`],
        ['Average order value', money(analytics.kpis.avgOrderValue), `${analytics.kpis.totalOrders - analytics.kpis.cancelledOrders} non-cancelled orders`]
      ].map(([label, value, note]) => <article key={label} className="rounded-2xl border border-[#eadfd5] bg-white p-5 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#9b8174]">{label}</p><p className="mt-2 font-serif text-2xl text-[#3b191e]">{value}</p><p className="mt-1 text-[11px] text-[#88786e]">{note}</p></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-[#eadfd5] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-serif text-xl text-[#3b191e]">Revenue trend</h3><p className="mt-1 text-xs text-[#88786e]">{props.granularity} Â· net of cancelled orders</p></div><BarChart3 className="h-5 w-5 text-[#9b7541]"/></div><div className="mt-5 flex h-56 items-end gap-1 overflow-x-auto border-b border-[#eee5dd] px-1">{analytics.revenueSeries.map((point) => <div key={point.key} title={`${point.label}: ${money(point.revenue)} Â· ${point.orders} orders Â· ${point.cancelled} cancelled`} className="group flex h-full min-w-[12px] flex-1 flex-col items-center justify-end"><div className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-[#5b112b] to-[#b7985a] transition-opacity group-hover:opacity-75" style={{height:`${Math.max(point.revenue ? 5 : 0, point.revenue/maxRevenue*88)}%`}}/><span className="mt-2 max-w-10 truncate text-[9px] text-[#917e73]">{point.label}</span></div>)}</div>{analytics.revenueSeries.length > 0 && <div className="mt-5"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#9b887c]">Line view Â· revenue by period</p><svg className="h-20 w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Revenue line chart">{linePoints && <polyline points={linePoints} fill="none" stroke="#7a2440" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}{analytics.revenueSeries.map((point, index) => { const x = analytics.revenueSeries.length < 2 ? 50 : 4 + index * 92 / (analytics.revenueSeries.length - 1); const y = 92 - point.revenue / maxRevenue * 82; return <circle key={point.key} cx={x} cy={y} r="1.5" fill="#b7985a" stroke="white" strokeWidth=".7" vectorEffect="non-scaling-stroke"><title>{point.label}: {money(point.revenue)} Â· {point.orders} orders</title></circle>; })}</svg></div>}{analytics.revenueSeries.length === 0 && <p className="py-10 text-center text-sm text-[#88786e]">No revenue recorded in this period.</p>}</article>
        <article className="rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-5"><h3 className="font-serif text-xl text-[#3b191e]">Measured observations</h3><p className="mt-1 text-xs text-[#88786e]">Facts from the selected period</p><div className="mt-4 space-y-3">{[
          topCategory ? `Highest revenue category: ${topCategory.label} (${money(topCategory.revenue)}, ${analytics.categorySales.reduce((n,c)=>n+c.revenue,0) ? (topCategory.revenue/analytics.categorySales.reduce((n,c)=>n+c.revenue,0)*100).toFixed(1) : '0.0'}% of category sales).` : 'No category sales recorded in this period.',
          topProduct ? `Best seller: ${topProduct.name} (${topProduct.unitsSold} units; ${money(topProduct.revenue)}).` : 'No product sales recorded in this period.',
          `Revenue ${analytics.comparison.revenueChangePercent === null ? 'has no previous-period baseline.' : `${analytics.comparison.revenueChangePercent >= 0 ? 'increased' : 'decreased'} ${Math.abs(analytics.comparison.revenueChangePercent)}% versus the previous period.`}`,
          `Inventory attention: ${lowStock.length} low-stock and ${outOfStock.length} out-of-stock products.`
        ].map((line) => <p key={line} className="rounded-xl border border-[#eee5dd] bg-white p-3 text-xs leading-5 text-[#624e46]">{line}</p>)}</div><p className="mt-4 text-[10px] leading-4 text-[#9b887c]">Recommendations are not generated; observations above are direct database calculations.</p></article>
      </div>
      {auxError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Operational report data: {auxError}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white"><div className="border-b border-[#eee5dd] px-5 py-4"><h3 className="font-serif text-xl text-[#3b191e]">{kind} detail</h3><p className="mt-1 text-xs text-[#88786e]">Filtered order records: {filteredOrders.length.toLocaleString()} Â· contact details omitted from exports</p></div>
          {kind === 'Products' || kind === 'Sales' || kind === 'Revenue' || kind === 'Categories' ? <div className="divide-y divide-[#f0e9e2]">{kind === 'Categories' ? analytics.categorySales.filter((c) => categoryFilter === 'all' || c.categoryId === categoryFilter).map((c) => <button key={c.categoryId} disabled={!props.canAccess('manage_categories')} onClick={() => props.onOpenCategory(c.categoryId)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-[#fcf8f4]"><span className="text-sm font-medium text-[#4f3831]">{c.label}<small className="ml-2 text-[#9b887c]">{c.unitsSold} units Â· {c.ordersCount} orders</small></span><b className="text-sm text-[#5b112b]">{money(c.revenue)}</b></button>) : analytics.bestSellers.filter((p) => productFilter === 'all' || p.productId === productFilter).map((p) => <button key={p.productId} disabled={!props.canAccess('manage_products')} onClick={() => props.onOpenProduct(p.productId)} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-[#fcf8f4]"><span className="min-w-0 truncate text-sm font-medium text-[#4f3831]">{p.name}<small className="ml-2 text-[#9b887c]">{p.unitsSold} units Â· stock {p.currentStock}</small></span><b className="text-sm text-[#5b112b]">{money(p.revenue)}</b></button>)}</div> : kind === 'Inventory' ? <div className="divide-y divide-[#f0e9e2]">{lowStock.slice(0,8).map((p) => <button key={p.id} onClick={() => props.onOpenProduct(p.id)} className="flex w-full justify-between px-5 py-3 text-left text-sm hover:bg-[#fcf8f4]"><span>{p.name}<small className="ml-2 text-amber-700">Low stock</small></span><b>{p.stockQuantity} left</b></button>)}{outOfStock.slice(0,5).map((p) => <button key={p.id} onClick={() => props.onOpenProduct(p.id)} className="flex w-full justify-between px-5 py-3 text-left text-sm hover:bg-[#fcf8f4]"><span>{p.name}<small className="ml-2 text-rose-700">Out of stock</small></span><b>0 left</b></button>)}{!lowStock.length && !outOfStock.length && <p className="p-6 text-sm text-[#88786e]">No products currently need restocking.</p>}</div> : kind === 'Coupons' ? <div className="divide-y divide-[#f0e9e2]">{(coupons?.usages || []).slice(0,12).map((u) => <div key={u.id} className="flex justify-between px-5 py-3 text-sm"><span>{u.couponCode}<small className="ml-2 text-[#9b887c]">{u.orderId}</small></span><b>{money(u.discountAmount)}</b></div>)}{!coupons?.usages.length && <p className="p-6 text-sm text-[#88786e]">No coupon usage recorded.</p>}</div> : kind === 'Returns & refunds' ? <div className="divide-y divide-[#f0e9e2]">{(refunds?.refunds || []).slice(0,10).map((r) => <div key={r.id} className="flex justify-between px-5 py-3 text-sm"><span>Refund Â· {r.orderId}<small className="ml-2 text-[#9b887c]">{r.status}</small></span><b>{money(r.amount)}</b></div>)}{(returns?.returns || []).slice(0,10).map((r) => <div key={r.id} className="flex justify-between px-5 py-3 text-sm"><span>Return Â· {r.orderId}<small className="ml-2 text-[#9b887c]">{r.status}</small></span><b>{money(r.refundedAmount || r.estimatedRefundAmount)}</b></div>)}{!refunds?.refunds.length && !returns?.returns.length && <p className="p-6 text-sm text-[#88786e]">No return or refund records.</p>}</div> : kind === 'Customers' ? <div className="divide-y divide-[#f0e9e2]">{Array.from(new Map(filteredOrders.map((o) => [o.customerName || 'Customer', {name:o.customerName || 'Customer'}])).values()).slice(0,12).map((customer) => { const rows = filteredOrders.filter((o) => (o.customerName || 'Customer') === customer.name); const spend=rows.filter((o)=>o.status!=='cancelled').reduce((sum,o)=>sum+o.total,0); return <div key={customer.name} className="flex justify-between px-5 py-3 text-sm"><span>{customer.name}<small className="ml-2 text-[#9b887c]">{rows.length} orders</small></span><b>{money(spend)}</b></div>; })}</div> : <div className="divide-y divide-[#f0e9e2]">{filteredOrders.slice(0,30).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span className="truncate">#{order.id} Â· {order.status}<small className="ml-2 text-[#9b887c]">{order.paymentMethod} Â· {order.paymentStatus}</small></span><b>{money(order.total)}</b></div>)}{!filteredOrders.length && <p className="p-6 text-sm text-[#88786e]">No matching records for this selection.</p>}</div>}
        </article>
        <article className="rounded-2xl border border-[#eadfd5] bg-white p-5"><div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#9b7541]"/><h3 className="font-serif text-xl text-[#3b191e]">Report coverage</h3></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs">{[['Inventory SKUs', inventory?.summary.totalSkus ?? 'â€”'],['Coupon redemptions', coupons?.stats.totalRedemptions ?? 'â€”'],['Return requests', returns?.stats.totalReturns ?? 'â€”'],['Refund records', refunds?.stats.totalRefunds ?? 'â€”'],['New customers', analytics.comparison.previousCustomers > 0 ? `${analytics.comparison.customersChangePercent ?? 'â€”'}% vs prior` : 'No prior baseline'],['Orders in filters', filteredOrders.length]].map(([label,value])=><div key={label} className="rounded-xl bg-[#faf6f1] p-4"><p className="text-[#8d796e]">{label}</p><p className="mt-1 font-semibold text-[#4d252d]">{value}</p></div>)}</div><div className="mt-4 flex items-center gap-2 rounded-xl border border-[#eee5dd] p-3 text-[11px] leading-5 text-[#79675e]"><Users className="h-4 w-4 shrink-0 text-[#9b7541]"/>Customer breakdown uses order names only. No emails, phone numbers, addresses, or customer IDs are included in report exports.</div><div className="mt-3 flex items-center gap-2 rounded-xl border border-[#eee5dd] p-3 text-[11px] leading-5 text-[#79675e]"><Package className="h-4 w-4 shrink-0 text-[#9b7541]"/>Inventory exports show current stock; movement history remains available in Inventory management.</div></article>
      </div>
    </>}
  </section>;
};
