import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Check,
  History,
  Layers,
  PackageCheck,
  PackageX,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import {
  AdminInventorySummary,
  InventoryAdjustmentReason,
  InventoryLog,
  Product,
  StoreCategory
} from '../../types';

interface AdminInventoryProps {
  inventory: AdminInventorySummary | null;
  categories: StoreCategory[];
  loading: boolean;
  initialFocusProductId?: string | null;
  onClearFocusProduct?: () => void;
  onAdjustStock: (data: {
    productId: string;
    adjustment: number;
    reason: Exclude<InventoryAdjustmentReason, 'order_sale' | 'order_cancel_restock' | 'return_restock'>;
    note?: string;
  }) => Promise<boolean>;
  onUpdateThreshold: (productId: string, threshold: number) => Promise<boolean>;
  onFetchLogs: (params?: {
    productId?: string;
    reason?: string;
    search?: string;
  }) => Promise<InventoryLog[]>;
}

const REASON_OPTIONS: {
  id: Exclude<InventoryAdjustmentReason, 'order_sale' | 'order_cancel_restock' | 'return_restock'>;
  label: string;
  defaultDirection: 'add' | 'deduct';
}[] = [
  { id: 'restock', label: 'Restock / Purchase Received', defaultDirection: 'add' },
  { id: 'returned', label: 'Customer Return Restock', defaultDirection: 'add' },
  { id: 'damaged', label: 'Damaged / Spoilage Write-off', defaultDirection: 'deduct' },
  { id: 'correction', label: 'Cycle Count Correction', defaultDirection: 'add' },
  { id: 'manual', label: 'Manual Adjustment', defaultDirection: 'add' }
];

const reasonLabel = (reason: string) => {
  const map: Record<string, string> = {
    restock: 'Restock',
    damaged: 'Damaged',
    returned: 'Returned',
    return_restock: 'Return Inspection Restock',
    correction: 'Correction',
    manual: 'Manual Adjustment',
    order_sale: 'Order Placed',
    order_cancel_restock: 'Order Cancelled'
  };
  return map[reason] || reason.replace(/_/g, ' ');
};

const dateTimeLabel = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
};

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  inventory,
  categories,
  loading,
  initialFocusProductId,
  onClearFocusProduct,
  onAdjustStock,
  onUpdateThreshold,
  onFetchLogs
}) => {
  const [subView, setSubView] = useState<'stock' | 'history'>('stock');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'healthy' | 'low' | 'out'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'stock_asc' | 'stock_desc' | 'name' | 'updated_desc'>('stock_asc');

  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [quantityInput, setQuantityInput] = useState<number>(5);
  const [reason, setReason] =
    useState<Exclude<InventoryAdjustmentReason, 'order_sale' | 'order_cancel_restock' | 'return_restock'>>('restock');
  const [note, setNote] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const [thresholdTarget, setThresholdTarget] = useState<Product | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(10);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const [logReasonFilter, setLogReasonFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<InventoryLog[] | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const products = inventory?.products || [];
  const logs = filteredLogs ?? inventory?.logs ?? [];
  const summary = inventory?.summary;

  const categoryMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.label || cat.id])),
    [categories]
  );

  // If navigated from Products tab ("Adjust in Inventory"), open the modal on that product
  useEffect(() => {
    if (initialFocusProductId && products.length > 0) {
      const target = products.find((p) => p.id === initialFocusProductId);
      if (target) {
        openAdjustModal(target);
      }
      onClearFocusProduct?.();
    }
  }, [initialFocusProductId, products]);

  const openAdjustModal = (product: Product) => {
    setAdjustTarget(product);
    setDirection('add');
    setReason('restock');
    setQuantityInput(5);
    setNote('');
    setAdjustError('');
  };

  const openThresholdModal = (product: Product) => {
    setThresholdTarget(product);
    setThresholdInput(product.lowStockThreshold ?? 10);
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...products]
      .filter((product) => {
        const matchesQuery =
          !q ||
          [product.name, product.sku || '', product.brand, product.category]
            .some((val) => val.toLowerCase().includes(q));
        const matchesCat = categoryFilter === 'all' || product.category === categoryFilter;
        const threshold = product.lowStockThreshold ?? 10;
        const matchesHealth =
          healthFilter === 'all' ||
          (healthFilter === 'out' && product.stockQuantity === 0) ||
          (healthFilter === 'low' && product.stockQuantity > 0 && product.stockQuantity <= threshold) ||
          (healthFilter === 'healthy' && product.stockQuantity > threshold);
        const isActive = product.isActive !== false;
        const matchesVis =
          visibilityFilter === 'all' ||
          (visibilityFilter === 'active' && isActive) ||
          (visibilityFilter === 'inactive' && !isActive);
        return matchesQuery && matchesCat && matchesHealth && matchesVis;
      })
      .sort((a, b) => {
        if (sortBy === 'stock_desc') return b.stockQuantity - a.stockQuantity;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'updated_desc') {
          const ta = a.updatedAt ? Date.parse(a.updatedAt) : 0;
          const tb = b.updatedAt ? Date.parse(b.updatedAt) : 0;
          return tb - ta || a.name.localeCompare(b.name);
        }
        return a.stockQuantity - b.stockQuantity;
      });
  }, [products, search, categoryFilter, healthFilter, visibilityFilter, sortBy]);

  const alertProducts = useMemo(
    () =>
      products
        .filter((p) => p.stockQuantity <= (p.lowStockThreshold ?? 10))
        .sort((a, b) => a.stockQuantity - b.stockQuantity),
    [products]
  );

  const handleAdjustSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustTarget) return;
    if (!Number.isInteger(quantityInput) || quantityInput <= 0) {
      setAdjustError('Enter a positive whole number quantity.');
      return;
    }
    const delta = direction === 'add' ? quantityInput : -quantityInput;
    const projected = adjustTarget.stockQuantity + delta;
    if (projected < 0) {
      setAdjustError(
        `Cannot deduct ${quantityInput} units. Only ${adjustTarget.stockQuantity} units available.`
      );
      return;
    }
    setAdjustError('');
    setSubmittingAdjust(true);
    const ok = await onAdjustStock({
      productId: adjustTarget.id,
      adjustment: delta,
      reason,
      note: note.trim() || undefined
    });
    setSubmittingAdjust(false);
    if (ok) {
      setAdjustTarget(null);
      if (subView === 'history') {
        void loadMovementLogs(logReasonFilter, logSearch);
      } else {
        setFilteredLogs(null);
      }
    }
  };

  const handleThresholdSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!thresholdTarget) return;
    if (!Number.isInteger(thresholdInput) || thresholdInput < 0 || thresholdInput > 10000) return;
    setSavingThreshold(true);
    const ok = await onUpdateThreshold(thresholdTarget.id, thresholdInput);
    setSavingThreshold(false);
    if (ok) setThresholdTarget(null);
  };

  const loadMovementLogs = async (nextReason: string, nextSearch: string) => {
    setLoadingLogs(true);
    const next = await onFetchLogs({
      reason: nextReason === 'all' ? undefined : nextReason,
      search: nextSearch.trim() || undefined
    });
    setFilteredLogs(next);
    setLoadingLogs(false);
  };

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${cardClass} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Total Stock Units
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-[#341016] tabular-nums">
                {loading && !summary ? '—' : (summary?.totalUnits ?? 0).toLocaleString('en-IN')}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f5eee0] text-[#987235]">
              <Boxes className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-xs text-[#8b7b72]">
            Across {summary?.totalSkus ?? products.length} tracked SKUs ({summary?.activeSkus ?? 0}{' '}
            active)
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubView('stock');
            setHealthFilter('healthy');
          }}
          className={`${cardClass} p-5 text-left transition hover:border-[#cfb8a7]`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Healthy SKUs
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-emerald-800 tabular-nums">
                {loading && !summary
                  ? '—'
                  : Math.max(
                      0,
                      (summary?.totalSkus ?? 0) -
                        (summary?.lowStockCount ?? 0) -
                        (summary?.outOfStockCount ?? 0)
                    )}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <PackageCheck className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-xs text-[#8b7b72]">Above individual low-stock thresholds</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('stock');
            setHealthFilter('low');
          }}
          className={`${cardClass} p-5 text-left transition hover:border-amber-300`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Low-Stock Alerts
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-amber-800 tabular-nums">
                {loading && !summary ? '—' : summary?.lowStockCount ?? 0}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-xs text-[#8b7b72]">At or below low-stock threshold</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubView('stock');
            setHealthFilter('out');
          }}
          className={`${cardClass} p-5 text-left transition hover:border-rose-300`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#89786e]">
                Out of Stock
              </p>
              <p className="mt-2.5 font-serif text-[28px] leading-none text-rose-700 tabular-nums">
                {loading && !summary ? '—' : summary?.outOfStockCount ?? 0}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <PackageX className="h-[18px] w-[18px]" />
            </span>
          </div>
          <p className="mt-3 text-xs text-[#8b7b72]">SKUs requiring immediate restock</p>
        </button>
      </section>

      {/* Low-Stock & Out-of-Stock Quick Restock Strip */}
      {alertProducts.length > 0 && (
        <section className="rounded-2xl border border-amber-200/80 bg-[#fff9f0] p-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <span>
                Inventory Attention: {alertProducts.length} SKU{alertProducts.length === 1 ? '' : 's'} at or below threshold
              </span>
            </div>
            <span className="text-[11px] text-amber-800/80">
              Click any item to restock immediately
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {alertProducts.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openAdjustModal(item)}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-medium text-[#3d2d27] transition hover:border-[#7a1438] hover:text-[#5b112b]"
              >
                <span className="font-mono text-[10px] font-bold text-[#7a1438]">{item.sku}</span>
                <span className="max-w-[160px] truncate">{item.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                    item.stockQuantity === 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {item.stockQuantity === 0 ? 'OUT' : `${item.stockQuantity} left`}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Main Inventory Workspace Card */}
      <section className={cardClass}>
        <div className="flex flex-col gap-4 border-b border-[#eee4dc] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Warehouse & SKU ledger
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">
              {subView === 'stock' ? 'SKU-wise stock & thresholds' : 'Inventory movement history'}
            </h2>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-[#eadfd5] bg-[#fbf7f2] p-1">
            <button
              type="button"
              onClick={() => setSubView('stock')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                subView === 'stock'
                  ? 'bg-[#5b112b] text-white shadow-xs'
                  : 'text-[#6e5c54] hover:text-[#3c111a]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Stock Levels ({products.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubView('history');
                void loadMovementLogs(logReasonFilter, logSearch);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                subView === 'history'
                  ? 'bg-[#5b112b] text-white shadow-xs'
                  : 'text-[#6e5c54] hover:text-[#3c111a]'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Movement History ({logs.length})
            </button>
          </div>
        </div>

        {subView === 'stock' ? (
          <>
            {/* Stock Filters */}
            <div className="grid gap-2.5 border-b border-[#eee4dc] bg-[#fdfbf9] p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search SKU, product name or brand"
                  className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
                />
              </label>

              <select
                aria-label="Filter inventory by category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter inventory by health"
                value={healthFilter}
                onChange={(event) =>
                  setHealthFilter(event.target.value as 'all' | 'healthy' | 'low' | 'out')
                }
                className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
              >
                <option value="all">All stock health</option>
                <option value="healthy">Healthy</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>

              <select
                aria-label="Filter inventory by visibility"
                value={visibilityFilter}
                onChange={(event) =>
                  setVisibilityFilter(event.target.value as 'all' | 'active' | 'inactive')
                }
                className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
              >
                <option value="all">All visibility</option>
                <option value="active">Active SKUs</option>
                <option value="inactive">Hidden SKUs</option>
              </select>

              <select
                aria-label="Sort inventory"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as 'stock_asc' | 'stock_desc' | 'name' | 'updated_desc'
                  )
                }
                className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
              >
                <option value="stock_asc">Stock: Low to High</option>
                <option value="stock_desc">Stock: High to Low</option>
                <option value="updated_desc">Recently updated</option>
                <option value="name">Name A–Z</option>
              </select>

              {(search ||
                categoryFilter !== 'all' ||
                healthFilter !== 'all' ||
                visibilityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setHealthFilter('all');
                    setVisibilityFilter('all');
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-[#e7dbd0] px-3 py-2 text-xs font-semibold text-[#6b5a52] hover:bg-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>

            {/* SKU Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left">
                <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold text-right">Available Qty</th>
                    <th className="px-4 py-3 font-semibold text-right">Low Threshold</th>
                    <th className="px-4 py-3 font-semibold">Health</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e9e2]">
                  {filteredProducts.map((product) => {
                    const threshold = product.lowStockThreshold ?? 10;
                    const isOut = product.stockQuantity === 0;
                    const isLow = !isOut && product.stockQuantity <= threshold;
                    return (
                      <tr key={product.id} className="text-xs hover:bg-[#fdfaf7]">
                        <td className="px-5 py-3">
                          <span className="inline-block rounded-md border border-[#eadfd5] bg-[#faf6f2] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#5b2631]">
                            {product.sku || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.primaryImage || undefined}
                              alt=""
                              className="h-10 w-10 rounded-lg bg-[#f5efea] object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="max-w-[240px] truncate font-semibold text-[#40312c]">
                                {product.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-[#95847b]">
                                {product.brand}
                                {product.isActive === false ? ' · Hidden on storefront' : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#725f56]">
                          {categoryMap.get(product.category) || product.category}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#341016]">
                          {product.stockQuantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openThresholdModal(product)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e7dbd0] bg-white px-2.5 py-1 font-mono text-[11px] text-[#5b4b44] hover:border-[#8c3448] hover:text-[#5b112b]"
                            title="Edit low-stock alert threshold"
                          >
                            <SlidersHorizontal className="h-3 w-3" />
                            ≤ {threshold}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-50 text-rose-700'
                                : isLow
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'Healthy'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openAdjustModal(product)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#42101f]"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredProducts.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#95847b]">
                        No inventory SKUs match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Movement History Filters */}
            <div className="flex flex-col gap-2.5 border-b border-[#eee4dc] bg-[#fdfbf9] p-4 sm:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
                <input
                  value={logSearch}
                  onChange={(event) => {
                    const next = event.target.value;
                    setLogSearch(next);
                    void loadMovementLogs(logReasonFilter, next);
                  }}
                  placeholder="Search log by product, SKU, admin or note"
                  className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
                />
              </label>

              <select
                aria-label="Filter movement history by reason"
                value={logReasonFilter}
                onChange={(event) => {
                  const next = event.target.value;
                  setLogReasonFilter(next);
                  void loadMovementLogs(next, logSearch);
                }}
                className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
              >
                <option value="all">All movement reasons</option>
                <option value="restock">Restock</option>
                <option value="returned">Returned</option>
                <option value="return_restock">Return Inspection Restock</option>
                <option value="damaged">Damaged</option>
                <option value="correction">Correction</option>
                <option value="manual">Manual Adjustment</option>
                <option value="order_sale">Order Placed</option>
                <option value="order_cancel_restock">Order Cancelled Restock</option>
              </select>
            </div>

            {/* Inventory Movement History Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date & Time</th>
                    <th className="px-4 py-3 font-semibold">Product & SKU</th>
                    <th className="px-4 py-3 font-semibold text-right">Previous</th>
                    <th className="px-4 py-3 font-semibold text-right">Adjustment</th>
                    <th className="px-4 py-3 font-semibold text-right">New Qty</th>
                    <th className="px-4 py-3 font-semibold">Reason & Note</th>
                    <th className="px-5 py-3 font-semibold">Updated By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e9e2]">
                  {logs.map((entry) => {
                    const positive = entry.adjustedQuantity > 0;
                    return (
                      <tr key={entry.id} className="text-xs hover:bg-[#fdfaf7]">
                        <td className="px-5 py-3 text-[11px] text-[#6d5d55] whitespace-nowrap">
                          {dateTimeLabel(entry.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-[230px] truncate font-semibold text-[#40312c]">
                            {entry.productName}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#7a1438]">
                            {entry.sku || entry.productId}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[#7c6a61]">
                          {entry.previousQuantity}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                              positive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {positive ? `+${entry.adjustedQuantity}` : entry.adjustedQuantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#341016]">
                          {entry.newQuantity}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-[#f5eee6] px-2.5 py-0.5 text-[10px] font-semibold text-[#5b2631]">
                            {reasonLabel(entry.reason)}
                          </span>
                          {entry.note && (
                            <p className="mt-1 max-w-[220px] truncate text-[11px] text-[#7d6c63]">
                              {entry.note}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[#5b4b44]">
                          {entry.adminName || 'System'}
                        </td>
                      </tr>
                    );
                  })}
                  {!logs.length && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#95847b]">
                        {loadingLogs
                          ? 'Loading movement history…'
                          : 'No inventory movements recorded yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submittingAdjust) setAdjustTarget(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/60 p-4 backdrop-blur-xs"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-6 shadow-2xl"
          >
            <form onSubmit={(event) => void handleAdjustSubmit(event)} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">
                    Stock adjustment
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-[#341016]">{adjustTarget.name}</h3>
                  <p className="mt-1 text-xs text-[#79675e]">
                    SKU <strong className="font-mono text-[#5b112b]">{adjustTarget.sku}</strong> ·
                    Current stock: <strong>{adjustTarget.stockQuantity}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submittingAdjust}
                  aria-label="Close stock adjustment modal"
                  onClick={() => setAdjustTarget(null)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDirection('add');
                    setAdjustError('');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    direction === 'add'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-[#e7dbd0] bg-white text-[#6b5a52]'
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Add Stock (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirection('deduct');
                    setAdjustError('');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    direction === 'deduct'
                      ? 'border-rose-600 bg-rose-50 text-rose-800'
                      : 'border-[#e7dbd0] bg-white text-[#6b5a52]'
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Deduct Stock (−)
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Quantity *
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    required
                    value={quantityInput}
                    onChange={(event) => {
                      setQuantityInput(Number(event.target.value));
                      setAdjustError('');
                    }}
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 font-mono text-sm text-[#30231f] outline-none focus:border-[#8c3448]"
                  />
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Adjustment Reason *
                  <select
                    value={reason}
                    onChange={(event) => {
                      const next = event.target.value as Exclude<
                        InventoryAdjustmentReason,
                        'order_sale' | 'order_cancel_restock' | 'return_restock'
                      >;
                      setReason(next);
                      const matched = REASON_OPTIONS.find((r) => r.id === next);
                      if (matched) setDirection(matched.defaultDirection);
                    }}
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                  >
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                Audit Note (optional)
                <input
                  maxLength={300}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Supplier batch, inspection reference, or reason details…"
                  className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                />
              </label>

              {(() => {
                const delta = direction === 'add' ? quantityInput : -quantityInput;
                const projected = adjustTarget.stockQuantity + (Number.isFinite(delta) ? delta : 0);
                return (
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-center justify-between ${
                      projected < 0
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : 'border-[#eee4dc] bg-[#faf6f2] text-[#45312b]'
                    }`}
                  >
                    <span>Projected stock after adjustment</span>
                    <span className="font-mono font-bold">
                      {adjustTarget.stockQuantity} → {Number.isFinite(projected) ? projected : '—'}
                    </span>
                  </div>
                );
              })()}

              {adjustError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {adjustError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
                <button
                  type="button"
                  disabled={submittingAdjust}
                  onClick={() => setAdjustTarget(null)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-60"
                >
                  {submittingAdjust ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low-Stock Threshold Modal */}
      {thresholdTarget && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingThreshold) setThresholdTarget(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/60 p-4 backdrop-blur-xs"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-6 shadow-2xl"
          >
            <form onSubmit={(event) => void handleThresholdSubmit(event)} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">
                    Alert configuration
                  </p>
                  <h3 className="mt-1 font-serif text-xl text-[#341016]">Low-stock threshold</h3>
                  <p className="mt-1 text-xs text-[#7a685f]">
                    {thresholdTarget.name} (<span className="font-mono">{thresholdTarget.sku}</span>)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setThresholdTarget(null)}
                  className="rounded-full p-1.5 text-[#806f65] hover:bg-[#f5eee8]"
                  aria-label="Close threshold dialog"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                Trigger low-stock alert when quantity ≤
                <input
                  type="number"
                  min={0}
                  max={10000}
                  step={1}
                  required
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(Number(event.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 font-mono text-sm text-[#30231f] outline-none focus:border-[#8c3448]"
                />
              </label>

              <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
                <button
                  type="button"
                  onClick={() => setThresholdTarget(null)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingThreshold}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-60"
                >
                  {savingThreshold ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save Threshold
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
