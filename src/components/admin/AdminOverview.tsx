import React from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  CircleAlert,
  Clock,
  Eye,
  Layers,
  Package,
  PackageX,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  XCircle
} from 'lucide-react';
import {
  AdminAnalyticsData,
  AnalyticsGranularity,
  AnalyticsRange,
  Order
} from '../../types';

interface AdminOverviewProps {
  analytics: AdminAnalyticsData | null;
  loading: boolean;
  range: AnalyticsRange;
  granularity: AnalyticsGranularity;
  startDate: string;
  endDate: string;
  onRangeChange: (range: AnalyticsRange) => void;
  onGranularityChange: (granularity: AnalyticsGranularity) => void;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onStartNewProduct: () => void;
  onNavigateOrders: (statusFilter?: string) => void;
  onNavigateProducts: (stockFilter?: 'all' | 'low' | 'out') => void;
  onInspectOrder: (order: Order) => void;
}

const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateLabel = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const rangeOptions: { id: AnalyticsRange; label: string }[] = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
  { id: '1y', label: '1 Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' }
];

const granularityOptions: { id: AnalyticsGranularity; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' }
];

const DeltaBadge: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f4eee8] px-2 py-0.5 text-[10px] font-medium text-[#8a7970]">
        No prior baseline
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {positive ? '+' : ''}
      {value}% vs prev
    </span>
  );
};

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  analytics,
  loading,
  range,
  granularity,
  startDate,
  endDate,
  onRangeChange,
  onGranularityChange,
  onStartDateChange,
  onEndDateChange,
  onStartNewProduct,
  onNavigateOrders,
  onNavigateProducts,
  onInspectOrder
}) => {
  const kpis = analytics?.kpis;
  const comparison = analytics?.comparison;
  const series = analytics?.revenueSeries || [];
  const categorySales = analytics?.categorySales || [];
  const bestSellers = analytics?.bestSellers || [];
  const recentOrders = analytics?.recentOrders || [];
  const recentCustomers = analytics?.recentCustomers || [];
  const lowStock = analytics?.lowStock || [];

  const maxBucketRevenue = Math.max(1, ...series.map((bucket) => bucket.revenue));
  const totalSeriesRevenue = series.reduce((sum, bucket) => sum + bucket.revenue, 0);
  const totalSeriesOrders = series.reduce((sum, bucket) => sum + bucket.orders, 0);
  const maxCategoryRevenue = Math.max(1, ...categorySales.map((cat) => cat.revenue));

  const pipelineTiles = [
    {
      label: 'Pending',
      value: kpis?.pendingOrders ?? 0,
      icon: Clock,
      tone: 'text-amber-800 bg-amber-50 border-amber-200/70',
      onClick: () => onNavigateOrders('placed')
    },
    {
      label: 'Processing',
      value: kpis?.processingOrders ?? 0,
      icon: Layers,
      tone: 'text-sky-800 bg-sky-50 border-sky-200/70',
      onClick: () => onNavigateOrders('processing')
    },
    {
      label: 'Shipped',
      value: kpis?.shippedOrders ?? 0,
      icon: Truck,
      tone: 'text-indigo-800 bg-indigo-50 border-indigo-200/70',
      onClick: () => onNavigateOrders('shipped')
    },
    {
      label: 'Delivered',
      value: kpis?.deliveredOrders ?? 0,
      icon: CheckCircle2,
      tone: 'text-emerald-800 bg-emerald-50 border-emerald-200/70',
      onClick: () => onNavigateOrders('delivered')
    },
    {
      label: 'Cancelled',
      value: kpis?.cancelledOrders ?? 0,
      icon: XCircle,
      tone: 'text-rose-800 bg-rose-50 border-rose-200/70',
      onClick: () => onNavigateOrders('cancelled')
    },
    {
      label: 'Low Stock',
      value: kpis?.lowStockProducts ?? 0,
      icon: CircleAlert,
      tone: 'text-orange-800 bg-orange-50 border-orange-200/70',
      onClick: () => onNavigateProducts('low')
    },
    {
      label: 'Out of Stock',
      value: kpis?.outOfStockProducts ?? 0,
      icon: PackageX,
      tone: 'text-red-800 bg-red-50 border-red-200/70',
      onClick: () => onNavigateProducts('out')
    }
  ];

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <div className="space-y-6">
      {/* Atelier Hero Banner */}
      <section className="relative overflow-hidden rounded-[24px] bg-[#3c111a] px-6 py-7 text-white sm:px-9 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-[#ddbd78]/20" />
        <div className="pointer-events-none absolute -right-1 top-4 h-48 w-48 rounded-full border border-[#ddbd78]/15" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.21em] text-[#dfc47f]">
              <Sparkles className="h-3.5 w-3.5" /> The atelier, in focus
            </p>
            <h2 className="mt-2.5 max-w-xl font-serif text-3xl leading-tight sm:text-[36px]">
              A considered view of your store.
            </h2>
            <p className="mt-2 max-w-lg text-xs leading-5 text-[#f0dfda]/75">
              Live revenue, order fulfillment pipeline, category performance, and inventory health from your database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onStartNewProduct}
              className="inline-flex items-center gap-2 rounded-full bg-[#d7bd7d] px-4 py-2.5 text-xs font-bold text-[#3b1119] hover:bg-[#e6d5aa]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add product
            </button>
            <button
              type="button"
              onClick={() => onNavigateOrders('all')}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              Review orders
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Date Range & Granularity Filter Bar */}
      <section className={`${cardClass} p-4 sm:px-5`}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b786e]">
              <Calendar className="h-3.5 w-3.5 text-[#a88243]" />
              Date range
            </span>
            {rangeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onRangeChange(option.id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  range === option.id
                    ? 'bg-[#5b112b] text-white shadow-xs'
                    : 'bg-[#f8f3ee] text-[#6d5b53] hover:bg-[#efe6dd]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {range === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="date"
                  aria-label="Analytics start date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-2.5 py-1.5 text-xs text-[#3d302b] outline-none focus:border-[#8c3448]"
                />
                <span className="text-[11px] text-[#8d7c73]">to</span>
                <input
                  type="date"
                  aria-label="Analytics end date"
                  value={endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-2.5 py-1.5 text-xs text-[#3d302b] outline-none focus:border-[#8c3448]"
                />
              </div>
            )}

            <div className="flex items-center gap-1 rounded-full border border-[#eadfd5] bg-[#fbf7f2] p-1">
              {granularityOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onGranularityChange(option.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                    granularity === option.id
                      ? 'bg-[#3c111a] text-[#e7ce91]'
                      : 'text-[#74635b] hover:text-[#3c111a]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Primary KPI Row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Net Revenue
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-[#341016] tabular-nums">
                {loading && !kpis ? '—' : money(kpis?.totalRevenue ?? 0)}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5eee0] text-[#987235]">
              <TrendingUp className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <DeltaBadge value={comparison?.revenueChangePercent ?? null} />
            <span className="text-[10px] text-[#8c7b72]">Excludes cancelled</span>
          </div>
          <p className="mt-2 text-[11px] text-[#8b7b72]">
            Gross {money(kpis?.grossRevenue ?? 0)} · Discounts {money(kpis?.totalDiscounts ?? 0)}
            {(kpis?.cancelledRevenue ?? 0) > 0 && ` · Cancelled ${money(kpis?.cancelledRevenue ?? 0)}`}
          </p>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Total Orders
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-[#341016] tabular-nums">
                {loading && !kpis ? '—' : kpis?.totalOrders ?? 0}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6e9eb] text-[#853c4a]">
              <ShoppingBag className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <DeltaBadge value={comparison?.ordersChangePercent ?? null} />
            <span className="text-[10px] text-[#8c7b72]">
              AOV {money(kpis?.avgOrderValue ?? 0)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#8b7b72]">
            {(kpis?.pendingOrders ?? 0) + (kpis?.processingOrders ?? 0) + (kpis?.shippedOrders ?? 0)}{' '}
            in active fulfillment
          </p>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Total Customers
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-[#341016] tabular-nums">
                {loading && !kpis ? '—' : kpis?.totalCustomers ?? 0}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eeeaf4] text-[#705a8d]">
              <Users className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <DeltaBadge value={comparison?.customersChangePercent ?? null} />
            <span className="text-[10px] text-[#8c7b72]">New signups</span>
          </div>
          <p className="mt-2 text-[11px] text-[#8b7b72]">
            Registered customer accounts
          </p>
        </div>

        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Total Products
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-[#341016] tabular-nums">
                {loading && !kpis ? '—' : kpis?.totalProducts ?? 0}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf0e9] text-[#4d7450]">
              <Package className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
              {kpis?.lowStockProducts ?? 0} low stock
            </span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
              {kpis?.outOfStockProducts ?? 0} out of stock
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#8b7b72]">
            Live items in catalog
          </p>
        </div>
      </section>

      {/* Fulfillment & Inventory Status Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {pipelineTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              className="group rounded-2xl border border-[#eadfd5] bg-white p-3.5 text-left transition hover:border-[#cfb8a7] hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#8a786e]">
                  {tile.label}
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-lg border ${tile.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 font-serif text-2xl text-[#341016] tabular-nums group-hover:text-[#5b112b]">
                {loading && !kpis ? '—' : tile.value}
              </p>
            </button>
          );
        })}
      </section>

      {/* Revenue Trends + Category Sales */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Revenue & order trends
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">
                {humanize(granularity)} performance
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef4ec] px-2.5 py-1 text-[10px] font-semibold text-[#517553]">
              <Activity className="h-3 w-3" /> Live database
            </span>
          </div>

          {series.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-xs text-[#928178]">
              No orders recorded in this date window.
            </div>
          ) : (
            <div className="mt-7 overflow-x-auto pb-2">
              <div className="flex h-52 min-w-[420px] items-end gap-2 border-b border-l border-[#eee4dc] px-3 sm:gap-3">
                {series.map((bucket, index) => {
                  const height = bucket.revenue > 0 ? Math.max(8, (bucket.revenue / maxBucketRevenue) * 100) : 3;
                  const isLast = index === series.length - 1;
                  return (
                    <div
                      key={bucket.key}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div className="pointer-events-none absolute -top-2 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg bg-[#2e1015] px-2.5 py-1.5 text-[10px] text-white shadow-lg group-hover:block">
                        <p className="font-semibold text-[#e2c47d]">{bucket.label}</p>
                        <p>{money(bucket.revenue)}</p>
                        <p className="text-white/75">
                          {bucket.orders} order{bucket.orders === 1 ? '' : 's'}
                          {bucket.cancelled > 0 ? ` · ${bucket.cancelled} cancelled` : ''}
                        </p>
                      </div>
                      <span className="mb-1 text-[9px] font-semibold text-[#7a6158] opacity-0 transition group-hover:opacity-100">
                        {bucket.revenue > 0 ? money(bucket.revenue) : '—'}
                      </span>
                      <div
                        className={`w-full max-w-[36px] rounded-t-md transition-all ${
                          isLast ? 'bg-[#7a2639]' : 'bg-[#ddc9c0] group-hover:bg-[#aa6a72]'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="mt-2 truncate text-[9px] text-[#928178] max-w-[54px]">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8c7b72]">
            <span>
              {totalSeriesOrders} total order{totalSeriesOrders === 1 ? '' : 's'} in selected view
            </span>
            <span className="font-semibold text-[#6d343d]">
              {money(totalSeriesRevenue)} net period revenue
            </span>
          </div>
        </div>

        {/* Category-wise Sales */}
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Department breakdown
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">Category-wise sales</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-[#a88243]" />
          </div>

          <div className="mt-5 space-y-3.5">
            {categorySales.length === 0 ? (
              <p className="py-12 text-center text-xs text-[#928178]">
                No completed category sales in this period yet.
              </p>
            ) : (
              categorySales.slice(0, 6).map((cat) => (
                <div key={cat.categoryId}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#45312b] truncate">{cat.label}</span>
                    <span className="font-mono text-[11px] font-semibold text-[#5b112b]">
                      {money(cat.revenue)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1eae4]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#5b112b] to-[#a88243]"
                      style={{ width: `${Math.max(5, (cat.revenue / maxCategoryRevenue) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-[#938279]">
                    <span>{cat.unitsSold} unit{cat.unitsSold === 1 ? '' : 's'} sold</span>
                    <span>{cat.ordersCount} order{cat.ordersCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Best-Selling Products + Low Stock Watch */}
      <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className={cardClass}>
          <div className="flex items-center justify-between border-b border-[#f0e8e1] p-5 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Catalog performance
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">Best-selling products</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateProducts('all')}
              className="text-[11px] font-semibold text-[#7d3b49] hover:underline"
            >
              View catalog
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Units Sold</th>
                  <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                  <th className="px-5 py-3 font-semibold text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1e9e2]">
                {bestSellers.map((item) => (
                  <tr key={item.productId} className="text-xs hover:bg-[#fdfaf7]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="h-10 w-10 rounded-lg bg-[#f6f0eb] object-cover shrink-0"
                          />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f6f0eb] text-[#9d8a7f] shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <span className="max-w-[210px] truncate font-semibold text-[#40312c]">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#7a685f]">{item.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#3d302b]">
                      {item.unitsSold}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#5b112b]">
                      {money(item.revenue)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.currentStock === 0
                            ? 'bg-rose-50 text-rose-700'
                            : item.currentStock <= 10
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {item.currentStock}
                      </span>
                    </td>
                  </tr>
                ))}
                {!bestSellers.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-xs text-[#93837a]">
                      No product sales recorded in this period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Inventory watch
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">Low stock alerts</h3>
            </div>
            <CircleAlert className="h-5 w-5 text-[#b17041]" />
          </div>
          <div className="mt-4 divide-y divide-[#f0e8e1]">
            {lowStock.slice(0, 6).map((product) => (
              <div key={product.id} className="flex items-center gap-3 py-3">
                <img
                  src={product.primaryImage || undefined}
                  alt=""
                  className="h-11 w-11 rounded-lg bg-[#f6f0eb] object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#49342e]">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-[#94847a]">{product.category}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                    product.stockQuantity === 0
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {product.stockQuantity === 0 ? 'Out' : `${product.stockQuantity} left`}
                </span>
              </div>
            ))}
            {!lowStock.length && (
              <p className="py-10 text-center text-xs text-[#918178]">
                All catalog items are sufficiently stocked.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigateProducts('low')}
            className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-[#6b2838] hover:underline"
          >
            Review inventory
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* Recent Orders & Recent Customer Activity */}
      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className={cardClass}>
          <div className="flex items-center justify-between border-b border-[#f0e8e1] p-5 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Latest transactions
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">Recent orders</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateOrders('all')}
              className="text-[11px] font-semibold text-[#7d3b49] hover:underline"
            >
              All orders
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left">
              <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1e9e2]">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="text-xs hover:bg-[#fdfaf7]">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-[#4c2226]">#{order.id}</p>
                      <p className="mt-0.5 text-[10px] text-[#97867c]">
                        {dateLabel(order.createdAt || order.date)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#3d302b]">
                        {order.customerName || order.shippingAddress.fullName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#97867c]">
                        {order.shippingAddress.city}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          order.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700'
                            : order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-[#f6eee6] text-[#6d343d]'
                        }`}
                      >
                        {humanize(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#3d302b]">
                      {money(order.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Inspect order ${order.id}`}
                        onClick={() => onInspectOrder(order)}
                        className="rounded-full p-1.5 text-[#8b6a61] hover:bg-[#f5ece6] hover:text-[#5b112b]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!recentOrders.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-xs text-[#93837a]">
                      No orders have been placed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customer Registrations */}
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Patron growth
              </p>
              <h3 className="mt-1 font-serif text-xl text-[#3b191e]">Recent customers</h3>
            </div>
            <UserPlus className="h-5 w-5 text-[#705a8d]" />
          </div>
          <div className="mt-4 divide-y divide-[#f0e8e1]">
            {recentCustomers.slice(0, 6).map((customer) => (
              <div key={customer.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-[#3d302b]">{customer.name}</p>
                    <span className="rounded-full bg-[#f5eee0] px-2 py-0.5 text-[9px] font-bold text-[#8d6a35]">
                      {customer.clubTier}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-[#928178]">
                    {customer.email || customer.phone || 'Registered patron'} · Joined{' '}
                    {dateLabel(customer.createdAt)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-xs font-semibold text-[#4c2226]">
                    {money(customer.totalSpent)}
                  </p>
                  <p className="text-[10px] text-[#928178]">
                    {customer.orderCount} order{customer.orderCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ))}
            {!recentCustomers.length && (
              <p className="py-10 text-center text-xs text-[#918178]">
                No customer registrations yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
