import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  UserX,
  Wallet,
  X
} from 'lucide-react';
import { AdminCustomer, AdminCustomerDetail, OrderStatus } from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminCustomersProps {
  customers: AdminCustomer[];
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalLifetimeValue: number;
  } | null;
  loading: boolean;
  currentUserId?: string;
  onInspectCustomer: (customerId: string) => Promise<AdminCustomerDetail | null>;
  onToggleCustomerStatus: (customer: AdminCustomer, nextActive: boolean) => Promise<boolean>;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type DateRangeFilter = 'all' | '7d' | '30d' | '90d' | 'custom';
type SortKey = 'joined_desc' | 'joined_asc' | 'spent_desc' | 'orders_desc' | 'name';

const money = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const dateLabel = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const orderStatusLabel = (status: OrderStatus) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const orderStatusTone = (status: OrderStatus) => {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelled':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'shipped':
    case 'out_for_delivery':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
};

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  stats,
  loading,
  currentUserId,
  onInspectCustomer,
  onToggleCustomerStatus
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('joined_desc');
  const [page, setPage] = useState(1);

  const [detailLoadingId, setDetailLoadingId] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<AdminCustomerDetail | null>(null);
  const [confirmToggleTarget, setConfirmToggleTarget] = useState<{
    customer: AdminCustomer;
    nextActive: boolean;
  } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return [...customers]
      .filter((customer) => {
        const matchesQuery =
          !q ||
          [customer.name, customer.email, customer.phone, customer.clubTier]
            .some((field) => (field || '').toLowerCase().includes(q));

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && customer.isActive) ||
          (statusFilter === 'inactive' && !customer.isActive);

        let matchesDate = true;
        const createdMs = Date.parse(customer.createdAt);
        if (!Number.isNaN(createdMs)) {
          if (dateRange === '7d') matchesDate = nowMs - createdMs <= 7 * dayMs;
          else if (dateRange === '30d') matchesDate = nowMs - createdMs <= 30 * dayMs;
          else if (dateRange === '90d') matchesDate = nowMs - createdMs <= 90 * dayMs;
          else if (dateRange === 'custom') {
            if (startDate) {
              const startMs = Date.parse(`${startDate}T00:00:00`);
              if (!Number.isNaN(startMs) && createdMs < startMs) matchesDate = false;
            }
            if (endDate) {
              const endMs = Date.parse(`${endDate}T23:59:59.999`);
              if (!Number.isNaN(endMs) && createdMs > endMs) matchesDate = false;
            }
          }
        }

        return matchesQuery && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        if (sortBy === 'joined_asc') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
        if (sortBy === 'spent_desc') return b.lifetimeSpent - a.lifetimeSpent;
        if (sortBy === 'orders_desc') return b.totalOrders - a.totalOrders || b.lifetimeSpent - a.lifetimeSpent;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
  }, [customers, search, statusFilter, dateRange, startDate, endDate, sortBy]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleCustomers = filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasFilters =
    Boolean(search) || statusFilter !== 'all' || dateRange !== 'all' || Boolean(startDate) || Boolean(endDate);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handleOpenDetail = async (customerId: string) => {
    setDetailLoadingId(customerId);
    const detail = await onInspectCustomer(customerId);
    setDetailLoadingId('');
    if (detail) {
      setSelectedDetail(detail);
    }
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggleTarget) return;
    setTogglingStatus(true);
    const ok = await onToggleCustomerStatus(
      confirmToggleTarget.customer,
      confirmToggleTarget.nextActive
    );
    setTogglingStatus(false);
    if (ok) {
      if (selectedDetail?.customer.id === confirmToggleTarget.customer.id) {
        setSelectedDetail((prev) =>
          prev
            ? {
                ...prev,
                customer: { ...prev.customer, isActive: confirmToggleTarget.nextActive }
              }
            : null
        );
      }
      setConfirmToggleTarget(null);
    }
  };

  const totalCount = stats?.totalCustomers ?? customers.length;
  const activeCount = stats?.activeCustomers ?? customers.filter((c) => c.isActive).length;
  const inactiveCount = stats?.inactiveCustomers ?? customers.filter((c) => !c.isActive).length;
  const totalLtv = stats?.totalLifetimeValue ?? customers.reduce((s, c) => s + c.lifetimeSpent, 0);

  return (
    <div className="space-y-5">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Customer directory</span>
            <Users className="h-4 w-4 text-[#5b112b]" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#341016] tabular-nums">
            {totalCount}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Registered customer accounts</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Active accounts</span>
            <UserCheck className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-emerald-800 tabular-nums">
            {activeCount}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Eligible to sign in and order</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Deactivated accounts</span>
            <UserX className="h-4 w-4 text-rose-700" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-rose-800 tabular-nums">
            {inactiveCount}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Access suspended · records kept</p>
        </div>

        <div className="rounded-2xl border border-[#eadfd5] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-[#8a786e]">
            <span>Lifetime customer value</span>
            <Wallet className="h-4 w-4 text-[#a88243]" />
          </div>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#341016] tabular-nums">
            {money(totalLtv)}
          </p>
          <p className="mt-1 text-[11px] text-[#8d7b72]">Net completed &amp; active spend</p>
        </div>
      </div>

      {/* Main Directory Card */}
      <section className="overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]">
        <div className="border-b border-[#efe6de] p-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
                Patron CRM
              </p>
              <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Customer directory</h2>
              <p className="mt-0.5 text-xs text-[#8e7d74]">
                Review purchase insights, order history, and account access controls.
              </p>
            </div>
            <div className="text-xs font-medium text-[#7e6d64] font-mono tabular-nums">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(140px,1fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a08e84]" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or phone…"
                className="w-full rounded-xl border border-[#eadfd5] bg-[#fdfbf9] py-2.5 pl-9 pr-3 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              aria-label="Filter by account status"
              className="rounded-xl border border-[#eadfd5] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active customers</option>
              <option value="inactive">Deactivated</option>
            </select>

            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRangeFilter);
                setPage(1);
              }}
              aria-label="Filter by registration date"
              className="rounded-xl border border-[#eadfd5] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
            >
              <option value="all">Joined: Any time</option>
              <option value="7d">Joined: Last 7 days</option>
              <option value="30d">Joined: Last 30 days</option>
              <option value="90d">Joined: Last 90 days</option>
              <option value="custom">Joined: Custom range</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort customers"
              className="rounded-xl border border-[#eadfd5] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
            >
              <option value="joined_desc">Newest registered</option>
              <option value="spent_desc">Highest lifetime spend</option>
              <option value="orders_desc">Most orders placed</option>
              <option value="name">Name (A–Z)</option>
              <option value="joined_asc">Oldest registered</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#79675e]">
              <Calendar className="h-3.5 w-3.5 text-[#a88243]" />
              <span>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#eadfd5] bg-[#fdfbf9] px-2.5 py-1.5 text-xs outline-none focus:border-[#8c3448]"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-[#eadfd5] bg-[#fdfbf9] px-2.5 py-1.5 text-xs outline-none focus:border-[#8c3448]"
              />
            </div>
          )}

          {hasFilters && (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#7a1438] hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset filters
              </button>
            </div>
          )}
        </div>

        {loading && customers.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#8d7b72]">
            Loading customer directory…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-[#eee4dc] bg-[#faf7f4] text-[10px] font-bold uppercase tracking-[.12em] text-[#8d7b72]">
                <tr>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Orders</th>
                  <th className="px-4 py-3.5">Lifetime spend</th>
                  <th className="px-4 py-3.5">Avg. order</th>
                  <th className="px-4 py-3.5">Joined · Last order</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ebe4]">
                {visibleCustomers.map((customer) => {
                  const isSelf = Boolean(currentUserId && customer.id === currentUserId);
                  return (
                    <tr key={customer.id} className="transition hover:bg-[#fcfaf8]">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#301e1c]">{customer.name}</div>
                        <div className="mt-0.5 text-[10px] text-[#8d7b72]">
                          {customer.clubTier} Tier ·{' '}
                          <span className="font-mono tabular-nums">
                            {customer.clubPoints.toLocaleString('en-IN')} pts
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#5b4b44]">
                        <div>{customer.email || '—'}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-[#8d7b72]">
                          {customer.phone || 'No phone'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-[#341016]">
                        <span className="font-semibold">{customer.totalOrders}</span>
                        {customer.cancelledOrders > 0 && (
                          <span className="ml-1 text-[10px] text-rose-700">
                            ({customer.cancelledOrders} cancelled)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold tabular-nums text-[#341016]">
                        {money(customer.lifetimeSpent)}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-[#67574f]">
                        {customer.avgOrderValue > 0 ? money(customer.avgOrderValue) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-[#6d5c54] font-mono tabular-nums">
                        <div>{dateLabel(customer.createdAt)}</div>
                        <div className="mt-0.5 text-[10px] text-[#9b8980]">
                          Last: {dateLabel(customer.lastOrderDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                            customer.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-rose-200 bg-rose-50 text-rose-800'
                          }`}
                        >
                          {customer.isActive ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3 w-3" />
                              Deactivated
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleOpenDetail(customer.id)}
                            disabled={detailLoadingId === customer.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#eadfd5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5b112b] hover:bg-[#f9f3ee] disabled:opacity-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{detailLoadingId === customer.id ? 'Loading…' : 'View'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() =>
                              setConfirmToggleTarget({
                                customer,
                                nextActive: !customer.isActive
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                              customer.isActive
                                ? 'border-rose-200 bg-rose-50/70 text-rose-800 hover:bg-rose-100'
                                : 'border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {customer.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visibleCustomers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[#8d7b72]">
                      {hasFilters
                        ? 'No customers match the active search or filters.'
                        : 'No customer accounts have been registered yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#efe6de] px-5 py-3.5 text-xs text-[#79675e]">
            <span className="font-mono tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#eadfd5] px-2.5 py-1 text-xs font-medium hover:bg-[#faf5f0] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#eadfd5] px-2.5 py-1 text-xs font-medium hover:bg-[#faf5f0] disabled:opacity-40 cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Customer Detail Modal */}
      {selectedDetail && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedDetail(null);
          }}
          className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/60 p-3 backdrop-blur-xs sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#eadfd5] bg-[#fffdfa] p-5 shadow-2xl sm:p-7"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#efe6de] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a88243]">
                  Customer Profile &amp; Insights
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-2xl font-semibold text-[#341016]">
                    {selectedDetail.customer.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                      selectedDetail.customer.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    {selectedDetail.customer.isActive ? 'Active Account' : 'Deactivated'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#79675e]">
                  {selectedDetail.customer.clubTier} Member ·{' '}
                  <span className="font-mono tabular-nums">
                    {selectedDetail.customer.clubPoints.toLocaleString('en-IN')} Club Points
                  </span>{' '}
                  · Joined {dateLabel(selectedDetail.customer.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentUserId !== selectedDetail.customer.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmToggleTarget({
                        customer: selectedDetail.customer,
                        nextActive: !selectedDetail.customer.isActive
                      })
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      selectedDetail.customer.isActive
                        ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {selectedDetail.customer.isActive ? 'Deactivate Account' : 'Activate Account'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close customer profile"
                  onClick={() => setSelectedDetail(null)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Organized Info Panels */}
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {/* Panel 1: Contact & Profile */}
              <div className="rounded-xl border border-[#eadfd5] bg-white p-4 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#96847a]">
                  Contact details
                </p>
                <div className="space-y-2 text-xs text-[#3b2926]">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#8b5d48] shrink-0" />
                    <span className="truncate">{selectedDetail.customer.email || 'No email on file'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#8b5d48] shrink-0" />
                    <span className="font-mono">{selectedDetail.customer.phone || 'No phone on file'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-[#8b5d48] shrink-0" />
                    <span>
                      {selectedDetail.customer.addresses.length}{' '}
                      {selectedDetail.customer.addresses.length === 1 ? 'saved address' : 'saved addresses'}
                    </span>
                  </div>
                </div>
                {selectedDetail.customer.addresses.length > 0 && (
                  <div className="border-t border-[#f0e8e1] pt-2.5 space-y-1.5 text-[11px] text-[#6d5c54]">
                    {selectedDetail.customer.addresses.slice(0, 2).map((addr) => (
                      <div key={addr.id} className="leading-relaxed">
                        <span className="font-semibold text-[#3b2926]">{addr.type}:</span>{' '}
                        {addr.street}, {addr.city}, {addr.state} {addr.pincode}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel 2: Spending & Order Metrics */}
              <div className="rounded-xl border border-[#eadfd5] bg-white p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#96847a]">
                  Purchase metrics
                </p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-[#8d7b72]">Lifetime spend</p>
                    <p className="mt-0.5 font-serif text-lg font-semibold text-[#341016] tabular-nums">
                      {money(selectedDetail.customer.lifetimeSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8d7b72]">Avg. order value</p>
                    <p className="mt-0.5 font-serif text-lg font-semibold text-[#341016] tabular-nums">
                      {money(selectedDetail.customer.avgOrderValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8d7b72]">Total orders</p>
                    <p className="mt-0.5 font-mono font-semibold text-[#341016] tabular-nums">
                      {selectedDetail.customer.totalOrders}{' '}
                      <span className="text-[10px] font-normal text-[#8d7b72]">
                        ({selectedDetail.customer.completedOrders} delivered)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#8d7b72]">Last order</p>
                    <p className="mt-0.5 font-mono font-medium text-[#341016]">
                      {dateLabel(selectedDetail.customer.lastOrderDate)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel 3: Activity & Purchase Insights */}
              <div className="rounded-xl border border-[#eadfd5] bg-white p-4 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#96847a]">
                  Purchase insights
                </p>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] text-[#8d7b72] flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#a88243]" />
                      Top departments
                    </p>
                    {selectedDetail.insights.topCategories.length > 0 ? (
                      <ul className="mt-1 space-y-1 text-[11px] text-[#3b2926]">
                        {selectedDetail.insights.topCategories.slice(0, 3).map((cat) => (
                          <li key={cat.categoryId} className="flex justify-between gap-2">
                            <span className="truncate">{cat.label}</span>
                            <span className="font-mono tabular-nums font-semibold">
                              {money(cat.totalSpent)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-[11px] text-[#9b8980]">No completed purchases yet</p>
                    )}
                  </div>

                  <div className="border-t border-[#f0e8e1] pt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#8d7b72] flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> Payment modes
                    </span>
                    <span className="font-medium text-[#3b2926]">
                      {selectedDetail.insights.paymentMethods.length > 0
                        ? selectedDetail.insights.paymentMethods
                            .map((m) => `${m.method} (${m.count})`)
                            .join(', ')
                        : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#8d7b72] flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Coupon savings
                    </span>
                    <span className="font-mono font-semibold text-[#5b112b] tabular-nums">
                      {money(selectedDetail.insights.totalCouponSavings)}
                      {selectedDetail.insights.couponsUsed.length > 0
                        ? ` (${selectedDetail.insights.couponsUsed.join(', ')})`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Order History */}
            <div className="mt-5 overflow-hidden rounded-xl border border-[#eadfd5] bg-white">
              <div className="flex items-center justify-between border-b border-[#efe6de] px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#341016]">
                  <ShoppingBag className="h-4 w-4 text-[#5b112b]" />
                  <span>Complete Order History ({selectedDetail.orders.length})</span>
                </div>
              </div>

              {selectedDetail.orders.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#8d7b72]">
                  This customer has not placed any orders yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-[#faf7f4] text-[10px] font-bold uppercase tracking-[.12em] text-[#8d7b72]">
                      <tr>
                        <th className="px-4 py-2.5">Order ID</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Items</th>
                        <th className="px-4 py-2.5">Payment</th>
                        <th className="px-4 py-2.5">Coupon</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2ebe4]">
                      {selectedDetail.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#fcfaf8]">
                          <td className="px-4 py-2.5 font-mono font-semibold text-[#5b112b]">
                            {order.id}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#6d5c54]">
                            {dateLabel(order.createdAt || order.date)}
                          </td>
                          <td className="px-4 py-2.5 text-[#49342e]">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                          </td>
                          <td className="px-4 py-2.5 text-[#5b4b44]">
                            {order.paymentMethod} · {order.paymentStatus}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#7a1438]">
                            {order.couponApplied ? `${order.couponApplied} (-${money(order.couponDiscount)})` : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${orderStatusTone(order.status)}`}
                            >
                              {orderStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-[#341016]">
                            {money(order.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activate / Deactivate Confirmation Modal */}
      <AdminConfirmModal
        open={Boolean(confirmToggleTarget)}
        title={
          confirmToggleTarget?.nextActive
            ? `Activate “${confirmToggleTarget.customer.name}”?`
            : `Deactivate “${confirmToggleTarget?.customer.name}”?`
        }
        description={
          confirmToggleTarget?.nextActive
            ? 'This customer will be able to sign in and place orders again. Their historical orders remain intact.'
            : 'This customer will be immediately signed out, blocked from signing in, and prevented from placing new orders.'
        }
        notice={
          confirmToggleTarget?.nextActive
            ? undefined
            : 'Existing order records and transaction history are permanently preserved.'
        }
        confirmLabel={confirmToggleTarget?.nextActive ? 'Activate Account' : 'Deactivate Account'}
        cancelLabel="Cancel"
        tone={confirmToggleTarget?.nextActive ? 'primary' : 'danger'}
        busy={togglingStatus}
        onConfirm={handleConfirmToggle}
        onCancel={() => {
          if (!togglingStatus) setConfirmToggleTarget(null);
        }}
      />
    </div>
  );
};
