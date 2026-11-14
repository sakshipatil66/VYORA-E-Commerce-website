import React, { useMemo, useState } from 'react';
import {
  BadgePercent,
  Calendar,
  Check,
  History,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X
} from 'lucide-react';
import { AdminCouponSummary, Coupon, StoreCategory } from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminCouponsProps {
  data: AdminCouponSummary | null;
  categories: StoreCategory[];
  loading: boolean;
  onCreateCoupon: (coupon: Coupon) => Promise<boolean>;
  onUpdateCoupon: (code: string, coupon: Coupon) => Promise<boolean>;
  onToggleCouponStatus: (code: string, nextActive: boolean) => Promise<boolean>;
  onDeleteCoupon: (code: string) => Promise<boolean>;
}

type CouponStatusBadge = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'inactive';

const money = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const dateTimeLabel = (value?: string | null) => {
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

const toDatetimeLocalInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromDatetimeLocalInput = (val: string): string | null => {
  if (!val.trim()) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const getCouponStatus = (coupon: Coupon): CouponStatusBadge => {
  if (coupon.isActive === false) return 'inactive';
  const now = Date.now();
  if (coupon.startsAt && !Number.isNaN(Date.parse(coupon.startsAt)) && now < Date.parse(coupon.startsAt)) {
    return 'scheduled';
  }
  if (coupon.expiresAt && !Number.isNaN(Date.parse(coupon.expiresAt)) && now > Date.parse(coupon.expiresAt)) {
    return 'expired';
  }
  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    (coupon.usedCount ?? 0) >= coupon.usageLimit
  ) {
    return 'exhausted';
  }
  return 'active';
};

const statusBadgeMeta: Record<CouponStatusBadge, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  scheduled: { label: 'Scheduled', cls: 'border-sky-200 bg-sky-50 text-sky-800' },
  expired: { label: 'Expired', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  exhausted: { label: 'Limit Reached', cls: 'border-rose-200 bg-rose-50 text-rose-800' },
  inactive: { label: 'Inactive', cls: 'border-stone-200 bg-stone-100 text-stone-700' }
};

interface CouponDraft {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  perUserLimit: string;
  applicableCategories: string[];
  isActive: boolean;
}

const createEmptyDraft = (): CouponDraft => ({
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 15,
  minOrderValue: 1499,
  maxDiscount: '1500',
  startsAt: '',
  expiresAt: '',
  usageLimit: '',
  perUserLimit: '',
  applicableCategories: [],
  isActive: true
});

const draftFromCoupon = (coupon: Coupon): CouponDraft => ({
  code: coupon.code,
  description: coupon.description,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  minOrderValue: coupon.minOrderValue,
  maxDiscount: coupon.maxDiscount !== undefined && coupon.maxDiscount !== null ? String(coupon.maxDiscount) : '',
  startsAt: toDatetimeLocalInput(coupon.startsAt),
  expiresAt: toDatetimeLocalInput(coupon.expiresAt),
  usageLimit: coupon.usageLimit !== undefined && coupon.usageLimit !== null ? String(coupon.usageLimit) : '',
  perUserLimit: coupon.perUserLimit !== undefined && coupon.perUserLimit !== null ? String(coupon.perUserLimit) : '',
  applicableCategories: coupon.applicableCategories || [],
  isActive: coupon.isActive !== false
});

export const AdminCoupons: React.FC<AdminCouponsProps> = ({
  data,
  categories,
  loading,
  onCreateCoupon,
  onUpdateCoupon,
  onToggleCouponStatus,
  onDeleteCoupon
}) => {
  const [subView, setSubView] = useState<'coupons' | 'history'>('coupons');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CouponStatusBadge>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');

  const [historySearch, setHistorySearch] = useState('');

  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(createEmptyDraft);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [togglingCode, setTogglingCode] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const coupons = data?.coupons || [];
  const usages = data?.usages || [];
  const stats = data?.stats;

  const categoryLabelMap = useMemo(
    () => new Map(categories.map((cat) => [cat.id, cat.label || cat.id])),
    [categories]
  );

  const filteredCoupons = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const matchesQuery =
        !q ||
        coupon.code.toLowerCase().includes(q) ||
        coupon.description.toLowerCase().includes(q);
      const status = getCouponStatus(coupon);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesType = typeFilter === 'all' || coupon.discountType === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [coupons, search, statusFilter, typeFilter]);

  const filteredUsages = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return usages.filter((usage) => {
      if (!q) return true;
      return [usage.couponCode, usage.orderId, usage.customerName, usage.customerEmail]
        .some((val) => (val || '').toLowerCase().includes(q));
    });
  }, [usages, historySearch]);

  const openCreateModal = () => {
    setDraft(createEmptyDraft());
    setFormError('');
    setEditorMode('create');
  };

  const openEditModal = (coupon: Coupon) => {
    setDraft(draftFromCoupon(coupon));
    setFormError('');
    setEditorMode('edit');
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((prev) => {
      const exists = prev.applicableCategories.includes(categoryId);
      return {
        ...prev,
        applicableCategories: exists
          ? prev.applicableCategories.filter((id) => id !== categoryId)
          : [...prev.applicableCategories, categoryId]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = draft.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      setFormError('Coupon code must be 3–30 uppercase letters, digits, hyphens, or underscores.');
      return;
    }
    if (!draft.description.trim()) {
      setFormError('Enter a clear customer-facing coupon description.');
      return;
    }
    if (!Number.isFinite(draft.discountValue) || draft.discountValue <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }
    if (draft.discountType === 'percentage' && draft.discountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }
    if (!Number.isFinite(draft.minOrderValue) || draft.minOrderValue < 0) {
      setFormError('Minimum order value cannot be negative.');
      return;
    }

    const maxDiscountNum = draft.maxDiscount.trim() ? Number(draft.maxDiscount.trim()) : undefined;
    if (maxDiscountNum !== undefined && (!Number.isFinite(maxDiscountNum) || maxDiscountNum <= 0)) {
      setFormError('Maximum discount cap must be a positive amount.');
      return;
    }

    const usageLimitNum = draft.usageLimit.trim() ? Number(draft.usageLimit.trim()) : null;
    if (usageLimitNum !== null && (!Number.isInteger(usageLimitNum) || usageLimitNum < 1)) {
      setFormError('Total usage limit must be a positive whole number.');
      return;
    }

    const perUserLimitNum = draft.perUserLimit.trim() ? Number(draft.perUserLimit.trim()) : null;
    if (perUserLimitNum !== null && (!Number.isInteger(perUserLimitNum) || perUserLimitNum < 1)) {
      setFormError('Per-customer usage limit must be a positive whole number.');
      return;
    }

    const startsIso = fromDatetimeLocalInput(draft.startsAt);
    const expiresIso = fromDatetimeLocalInput(draft.expiresAt);
    if (startsIso && expiresIso && Date.parse(expiresIso) < Date.parse(startsIso)) {
      setFormError('Expiry date cannot be earlier than start date.');
      return;
    }

    const payload: Coupon = {
      code,
      description: draft.description.trim(),
      discountType: draft.discountType,
      discountValue: draft.discountValue,
      minOrderValue: draft.minOrderValue,
      ...(draft.discountType === 'percentage' && maxDiscountNum !== undefined ? { maxDiscount: maxDiscountNum } : {}),
      isActive: draft.isActive,
      startsAt: startsIso,
      expiresAt: expiresIso,
      usageLimit: usageLimitNum,
      perUserLimit: perUserLimitNum,
      applicableCategories: draft.applicableCategories
    };

    setFormError('');
    setSaving(true);
    const ok = editorMode === 'edit'
      ? await onUpdateCoupon(code, payload)
      : await onCreateCoupon(payload);
    setSaving(false);
    if (ok) {
      setEditorMode(null);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    const nextActive = coupon.isActive === false;
    setTogglingCode(coupon.code);
    await onToggleCouponStatus(coupon.code, nextActive);
    setTogglingCode('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const ok = await onDeleteCoupon(deleteTarget.code);
    setDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  const hasCouponFilters = Boolean(search) || statusFilter !== 'all' || typeFilter !== 'all';
  const fieldClass =
    'mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none transition focus:border-[#8c3448]';
  const labelClass = 'text-[10px] font-semibold uppercase tracking-[.12em] text-[#79675e]';

  return (
    <div className="space-y-5">
      {/* Performance KPI Row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Total coupons</span>
            <BadgePercent className="h-4 w-4 text-[#5b112b]" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#341016] tabular-nums">
            {stats?.totalCoupons ?? coupons.length}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Configured promo campaigns</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Live offers</span>
            <Sparkles className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-emerald-800 tabular-nums">
            {stats?.activeCoupons ?? coupons.filter((c) => getCouponStatus(c) === 'active').length}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Active &amp; redeemable on storefront</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Total redemptions</span>
            <Tag className="h-4 w-4 text-[#a88243]" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#341016] tabular-nums">
            {stats?.totalRedemptions ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Confirmed voucher applications</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Total discount granted</span>
            <Layers className="h-4 w-4 text-[#7a1438]" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#341016] tabular-nums">
            {money(stats?.totalDiscountGiven ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Across recorded order usages</p>
        </div>
      </div>

      {/* Main Coupon Workspace Card */}
      <section className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]">
        <div className="border-b border-[#efe6de] p-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Promotional Studio
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">
                Coupons &amp; Offer Rules
              </h2>
              <p className="mt-0.5 text-xs text-[#8e7d74]">
                Manage eligibility rules, category restrictions, usage caps, and redemption logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-[#eadfd5] bg-[#faf7f4] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSubView('coupons')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                    subView === 'coupons'
                      ? 'bg-[#5b112b] text-white'
                      : 'text-[#6e5d55] hover:text-[#341016]'
                  }`}
                >
                  Coupons ({coupons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('history')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer ${
                    subView === 'history'
                      ? 'bg-[#5b112b] text-white'
                      : 'text-[#6e5d55] hover:text-[#341016]'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Usage History ({usages.length})
                </button>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create coupon
              </button>
            </div>
          </div>

          {subView === 'coupons' ? (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a08e84]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or description…"
                  className="w-full rounded-xl border border-[#eadfd5] bg-[#fdfbf9] py-2.5 pl-9 pr-3 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | CouponStatusBadge)}
                aria-label="Filter by coupon status"
                className="rounded-xl border border-[#eadfd5] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="exhausted">Limit Reached</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'percentage' | 'fixed')}
                aria-label="Filter by discount type"
                className="rounded-xl border border-[#eadfd5] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
              >
                <option value="all">All discount types</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount (₹)</option>
              </select>
            </div>
          ) : (
            <div className="mt-4 max-w-md">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a08e84]" />
                <input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filter usage logs by code, order ID, or customer…"
                  className="w-full rounded-xl border border-[#eadfd5] bg-[#fdfbf9] py-2.5 pl-9 pr-3 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                />
              </label>
            </div>
          )}

          {subView === 'coupons' && hasCouponFilters && (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#7a1438] hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            </div>
          )}
        </div>

        {loading && coupons.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#8d7b72]">Loading coupons…</div>
        ) : subView === 'coupons' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="border-b border-[#eee4dc] bg-[#faf7f4] text-[10px] font-bold uppercase tracking-[.12em] text-[#8d7b72]">
                <tr>
                  <th className="px-5 py-3.5">Coupon &amp; details</th>
                  <th className="px-4 py-3.5">Discount</th>
                  <th className="px-4 py-3.5">Conditions</th>
                  <th className="px-4 py-3.5">Validity window</th>
                  <th className="px-4 py-3.5">Redemptions</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ebe4]">
                {filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  const meta = statusBadgeMeta[status];
                  const used = coupon.usedCount ?? 0;
                  const remaining =
                    coupon.usageLimit !== null && coupon.usageLimit !== undefined
                      ? Math.max(0, coupon.usageLimit - used)
                      : null;
                  const cats = (coupon.applicableCategories || []).map(
                    (id) => categoryLabelMap.get(id) || id
                  );

                  return (
                    <tr key={coupon.code} className="transition hover:bg-[#fcfaf8]">
                      <td className="px-5 py-3.5 max-w-[260px]">
                        <div className="font-mono text-xs font-bold tracking-wider text-[#5b112b]">
                          {coupon.code}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6b5a52]">
                          {coupon.description}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 font-mono tabular-nums">
                        <div className="font-semibold text-[#341016]">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% OFF`
                            : `${money(coupon.discountValue)} OFF`}
                        </div>
                        <div className="mt-0.5 text-[10px] font-sans text-[#8d7b72]">
                          {coupon.discountType === 'percentage'
                            ? coupon.maxDiscount
                              ? `Cap ${money(coupon.maxDiscount)}`
                              : 'No max cap'
                            : 'Fixed rebate'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-[11px] text-[#5b4b44]">
                        <div className="font-mono tabular-nums">
                          Min order: {money(coupon.minOrderValue)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[#8d7b72]">
                          {cats.length > 0 ? `Categories: ${cats.join(', ')}` : 'All departments'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[10px] text-[#6d5c54]">
                        <div>Start: {coupon.startsAt ? dateTimeLabel(coupon.startsAt) : 'Immediate'}</div>
                        <div className="mt-0.5">
                          End: {coupon.expiresAt ? dateTimeLabel(coupon.expiresAt) : 'No expiry'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] tabular-nums text-[#341016]">
                        <div>
                          Used:{' '}
                          <span className="font-semibold">
                            {used}
                            {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] font-sans text-[#8d7b72]">
                          {[
                            remaining !== null ? `${remaining} left` : 'Unlimited total',
                            coupon.perUserLimit ? `${coupon.perUserLimit}/customer` : ''
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={togglingCode === coupon.code}
                            onClick={() => void handleToggle(coupon)}
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                              coupon.isActive !== false
                                ? 'border-[#eadfd5] bg-white text-[#6b5a52] hover:bg-[#faf5f0]'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {coupon.isActive !== false ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            aria-label={`Edit ${coupon.code}`}
                            onClick={() => openEditModal(coupon)}
                            className="rounded-lg p-2 text-[#79675e] hover:bg-[#f4ece6] hover:text-[#5b112b] cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${coupon.code}`}
                            onClick={() => setDeleteTarget(coupon)}
                            className="rounded-lg p-2 text-[#a17777] hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#8d7b72]">
                      {hasCouponFilters
                        ? 'No coupons match the selected filters.'
                        : 'No coupons configured yet. Create your first promotional voucher.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-[#eee4dc] bg-[#faf7f4] text-[10px] font-bold uppercase tracking-[.12em] text-[#8d7b72]">
                <tr>
                  <th className="px-5 py-3.5">Date &amp; time</th>
                  <th className="px-4 py-3.5">Coupon code</th>
                  <th className="px-4 py-3.5">Order ID</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5 text-right">Discount given</th>
                  <th className="px-5 py-3.5 text-right">Order total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ebe4]">
                {filteredUsages.map((usage) => (
                  <tr key={usage.id} className="hover:bg-[#fcfaf8]">
                    <td className="px-5 py-3.5 font-mono text-[11px] text-[#6d5c54]">
                      {dateTimeLabel(usage.usedAt)}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-[#5b112b]">
                      {usage.couponCode}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[#341016]">
                      {usage.orderId}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#341016]">{usage.customerName}</div>
                      <div className="text-[10px] text-[#8d7b72]">{usage.customerEmail || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-800 tabular-nums">
                      -{money(usage.discountAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-[#341016] tabular-nums">
                      {money(usage.orderTotal)}
                    </td>
                  </tr>
                ))}

                {filteredUsages.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#8d7b72]">
                      {historySearch
                        ? 'No coupon redemptions match this search.'
                        : 'No coupon redemptions have been recorded yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Coupon Modal */}
      {editorMode && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setEditorMode(null);
          }}
          className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/60 p-3 backdrop-blur-xs sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-5 shadow-2xl sm:p-7"
          >
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
              <div className="flex items-start justify-between gap-4 border-b border-[#efe6de] pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a88243]">
                    Promotional Studio
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-[#341016]">
                    {editorMode === 'edit' ? `Edit coupon ${draft.code}` : 'Create promotional coupon'}
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  aria-label="Close coupon editor"
                  onClick={() => setEditorMode(null)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Coupon code *
                  <input
                    required
                    disabled={editorMode === 'edit'}
                    minLength={3}
                    maxLength={30}
                    placeholder="FESTIVE25"
                    className={`${fieldClass} font-mono uppercase disabled:bg-[#f2ebe4] disabled:text-[#79675e]`}
                    value={draft.code}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                      }))
                    }
                  />
                </label>

                <label className={labelClass}>
                  Discount type *
                  <select
                    className={fieldClass}
                    value={draft.discountType}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        discountType: e.target.value as 'percentage' | 'fixed'
                      }))
                    }
                  >
                    <option value="percentage">Percentage discount (%)</option>
                    <option value="fixed">Fixed amount rebate (₹)</option>
                  </select>
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  Customer-facing description *
                  <input
                    required
                    maxLength={250}
                    placeholder="25% off Royal Weaves & Jewellery above ₹3,999"
                    className={fieldClass}
                    value={draft.description}
                    onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </label>

                <label className={labelClass}>
                  {draft.discountType === 'percentage' ? 'Discount % (1–100) *' : 'Discount amount (₹) *'}
                  <input
                    type="number"
                    required
                    min={1}
                    max={draft.discountType === 'percentage' ? 100 : undefined}
                    step="1"
                    className={`${fieldClass} font-mono`}
                    value={draft.discountValue}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, discountValue: Number(e.target.value) }))
                    }
                  />
                </label>

                <label className={labelClass}>
                  Minimum order value (₹) *
                  <input
                    type="number"
                    required
                    min={0}
                    step="1"
                    className={`${fieldClass} font-mono`}
                    value={draft.minOrderValue}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, minOrderValue: Number(e.target.value) }))
                    }
                  />
                </label>

                {draft.discountType === 'percentage' && (
                  <label className={labelClass}>
                    Max discount cap (₹ · optional)
                    <input
                      type="number"
                      min={1}
                      step="1"
                      placeholder="Unlimited"
                      className={`${fieldClass} font-mono`}
                      value={draft.maxDiscount}
                      onChange={(e) => setDraft((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                    />
                  </label>
                )}

                <label className={labelClass}>
                  Total usage limit (optional)
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="Unlimited redemptions"
                    className={`${fieldClass} font-mono`}
                    value={draft.usageLimit}
                    onChange={(e) => setDraft((prev) => ({ ...prev, usageLimit: e.target.value }))}
                  />
                </label>

                <label className={labelClass}>
                  Per-customer limit (optional)
                  <input
                    type="number"
                    min={1}
                    step="1"
                    placeholder="Unlimited per customer"
                    className={`${fieldClass} font-mono`}
                    value={draft.perUserLimit}
                    onChange={(e) => setDraft((prev) => ({ ...prev, perUserLimit: e.target.value }))}
                  />
                </label>

                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#a88243]" /> Start date &amp; time (optional)
                  </span>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={draft.startsAt}
                    onChange={(e) => setDraft((prev) => ({ ...prev, startsAt: e.target.value }))}
                  />
                </label>

                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#a88243]" /> Expiry date &amp; time (optional)
                  </span>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    value={draft.expiresAt}
                    onChange={(e) => setDraft((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </label>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>
                      Applicable categories (leave empty for all departments)
                    </span>
                    {draft.applicableCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, applicableCategories: [] }))
                        }
                        className="text-[11px] font-semibold text-[#7a1438] hover:underline cursor-pointer"
                      >
                        Clear ({draft.applicableCategories.length})
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.map((cat) => {
                      const checked = draft.applicableCategories.includes(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition cursor-pointer ${
                            checked
                              ? 'border-[#8c3448] bg-[#f8eef1] font-semibold text-[#5b112b]'
                              : 'border-[#eadfd5] bg-[#fdfbf9] text-[#594842] hover:border-[#cbb8aa]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(cat.id)}
                            className="accent-[#5b112b]"
                          />
                          <span className="truncate">{cat.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-medium text-[#3b191e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="accent-[#5b112b]"
                  />
                  Coupon active &amp; enabled for checkout
                </label>
              </div>

              {formError && (
                <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditorMode(null)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#42101f] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {saving ? 'Saving…' : editorMode === 'edit' ? 'Save changes' : 'Create coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Coupon Confirmation Modal */}
      <AdminConfirmModal
        open={Boolean(deleteTarget)}
        title={`Delete coupon “${deleteTarget?.code}”?`}
        description="This permanently removes the coupon from checkout validation and storefront offers."
        notice="Historical usage records for past orders remain intact."
        confirmLabel="Delete Coupon"
        cancelLabel="Cancel"
        tone="danger"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
};
