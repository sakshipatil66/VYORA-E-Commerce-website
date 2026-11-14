import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eye,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  Wallet,
  X,
  XCircle
} from 'lucide-react';
import { AdminReturnSummary, ReturnRequest, ReturnStatus } from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminReturnsProps {
  data: AdminReturnSummary | null;
  loading: boolean;
  onUpdateStatus: (returnId: string, status: ReturnStatus, adminNotes?: string) => Promise<boolean>;
  onInspectItems: (
    returnId: string,
    items: {
      productId: string;
      receivedQuantity: number;
      restockableQuantity: number;
      damagedQuantity: number;
    }[],
    adminNotes?: string
  ) => Promise<boolean>;
  onOpenRefundForReturn: (ret: ReturnRequest) => void;
}

const money = (amount: number) =>
  `₹${Math.round(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const humanize = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

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

const statusBadge = (status: ReturnStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'approved':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'received':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'inspected':
      return 'bg-violet-50 text-violet-800 border-violet-200';
    case 'refunded':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
};

export const AdminReturns: React.FC<AdminReturnsProps> = ({
  data,
  loading,
  onUpdateStatus,
  onInspectItems,
  onOpenRefundForReturn
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReturnStatus>('all');
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<ReturnRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const [inspectionDraft, setInspectionDraft] = useState<
    Record<string, { received: number; restockable: number; damaged: number }>
  >({});
  const [inspectionNote, setInspectionNote] = useState('');
  const [inspectionError, setInspectionError] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);

  const returns = data?.returns || [];
  const stats = data?.stats;

  const selectedReturn = useMemo(
    () => returns.find((r) => r.id === selectedReturnId) || null,
    [returns, selectedReturnId]
  );

  const openModal = (ret: ReturnRequest) => {
    setSelectedReturnId(ret.id);
    setAdminNote(ret.adminNotes || '');
    setInspectionNote('');
    setInspectionError('');
    const draft: Record<string, { received: number; restockable: number; damaged: number }> = {};
    for (const item of ret.items) {
      draft[item.productId] = {
        received: item.inspectionStatus === 'inspected' ? item.receivedQuantity : item.requestedQuantity,
        restockable: item.inspectionStatus === 'inspected' ? item.restockableQuantity : 0,
        damaged:
          item.inspectionStatus === 'inspected'
            ? item.damagedQuantity
            : ret.reason === 'damaged' || ret.reason === 'defective'
              ? item.requestedQuantity
              : 0
      };
    }
    setInspectionDraft(draft);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [
        r.id,
        r.orderId,
        r.customerName,
        r.customerEmail,
        r.customerPhone,
        ...r.items.map((it) => it.productName)
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [returns, search, statusFilter]);

  const handleTransition = async (ret: ReturnRequest, next: ReturnStatus) => {
    setSavingStatus(true);
    const ok = await onUpdateStatus(ret.id, next, adminNote.trim() || undefined);
    setSavingStatus(false);
    if (ok) {
      setAdminNote('');
    }
  };

  const handleConfirmReject = async (note: string) => {
    if (!rejectTarget) return;
    setRejecting(true);
    const ok = await onUpdateStatus(rejectTarget.id, 'rejected', note);
    setRejecting(false);
    if (ok) {
      setRejectTarget(null);
    }
  };

  const handleSubmitInspection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedReturn) return;
    setInspectionError('');

    const payload = selectedReturn.items.map((item) => {
      const entry = inspectionDraft[item.productId] || {
        received: item.requestedQuantity,
        restockable: 0,
        damaged: 0
      };
      return {
        productId: item.productId,
        productName: item.productName,
        requested: item.requestedQuantity,
        receivedQuantity: Number(entry.received),
        restockableQuantity: Number(entry.restockable),
        damagedQuantity: Number(entry.damaged),
        alreadyRestocked: item.restocked
      };
    });

    for (const line of payload) {
      if (line.alreadyRestocked) {
        setInspectionError(`Stock for "${line.productName}" was already restored and cannot be duplicated.`);
        return;
      }
      if (
        !Number.isInteger(line.receivedQuantity) ||
        line.receivedQuantity < 0 ||
        line.receivedQuantity > line.requested
      ) {
        setInspectionError(`Received quantity for "${line.productName}" must be between 0 and ${line.requested}.`);
        return;
      }
      if (
        !Number.isInteger(line.restockableQuantity) ||
        line.restockableQuantity < 0 ||
        !Number.isInteger(line.damagedQuantity) ||
        line.damagedQuantity < 0 ||
        line.restockableQuantity + line.damagedQuantity > line.receivedQuantity
      ) {
        setInspectionError(
          `Restockable + damaged units for "${line.productName}" cannot exceed received quantity (${line.receivedQuantity}).`
        );
        return;
      }
    }

    setSubmittingInspection(true);
    const ok = await onInspectItems(
      selectedReturn.id,
      payload.map(({ productId, receivedQuantity, restockableQuantity, damagedQuantity }) => ({
        productId,
        receivedQuantity,
        restockableQuantity,
        damagedQuantity
      })),
      inspectionNote.trim() || undefined
    );
    setSubmittingInspection(false);
    if (ok) {
      setInspectionNote('');
    }
  };

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <>
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Total Return Requests</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#3b191e]">
            {loading && !stats ? '—' : stats?.totalReturns ?? returns.length}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">
            {stats?.rejectedReturns ?? 0} rejected · {stats?.refundedReturns ?? 0} refunded
          </p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Pending Review</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {loading && !stats ? '—' : stats?.pendingReturns ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Awaiting approval or rejection</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Awaiting Inspection</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#5b112b]">
            {loading && !stats ? '—' : (stats?.approvedReturns ?? 0) + (stats?.receivedReturns ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">
            {stats?.pendingInspectionItems ?? 0} line items pending QC
          </p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Ready for Refund</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-violet-700">
            {loading && !stats ? '—' : stats?.inspectedReturns ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Inspected &amp; verified by warehouse</p>
        </article>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Reverse logistics &amp; quality control
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Customer returns &amp; inspection</h2>
          </div>
          <div className="flex items-center gap-2">
            {(search || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7dbd0] px-3 py-1.5 text-[11px] font-semibold text-[#6b5a52] hover:bg-[#faf4ef]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
            <span className="rounded-full bg-[#f7eee8] px-3 py-1.5 text-[11px] font-semibold text-[#805c50]">
              {filtered.length} request{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search return ID, order ID, customer or product…"
              className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'approved', 'received', 'inspected', 'refunded', 'rejected'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    statusFilter === st
                      ? 'bg-[#5b112b] text-white'
                      : 'border border-[#e9ded5] bg-white text-[#6a5850] hover:bg-[#faf4ef]'
                  }`}
                >
                  {st === 'all' ? 'All' : humanize(st)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
              <tr>
                <th className="px-4 py-3 font-semibold">Return / Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Items &amp; Reason</th>
                <th className="px-4 py-3 font-semibold">Inspection</th>
                <th className="px-4 py-3 font-semibold text-right">Est. Refund</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e9e2]">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    Loading return requests…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    No return requests match your current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => {
                  const totalRequestedUnits = ret.items.reduce((s, it) => s + it.requestedQuantity, 0);
                  const totalRestockUnits = ret.items.reduce((s, it) => s + it.restockableQuantity, 0);
                  const totalDamagedUnits = ret.items.reduce((s, it) => s + it.damagedQuantity, 0);
                  const allInspected = ret.items.every((it) => it.inspectionStatus === 'inspected');
                  return (
                    <tr key={ret.id} className="text-xs transition hover:bg-[#fdfaf7]">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-[#4c2226]">{ret.id}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#7c6a61]">Order #{ret.orderId}</p>
                        <p className="mt-0.5 text-[10px] text-[#9a887e]">{dateTimeLabel(ret.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#3d302b]">{ret.customerName}</p>
                        <p className="mt-0.5 text-[10px] text-[#8d7c72]">{ret.customerEmail || ret.customerPhone || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#3d302b]">
                          {totalRequestedUnits} unit{totalRequestedUnits === 1 ? '' : 's'} · {humanize(ret.reason)}
                        </p>
                        <p className="mt-0.5 truncate max-w-[240px] text-[10px] text-[#8a7970]">
                          {ret.items.map((it) => `${it.productName} (×${it.requestedQuantity})`).join(', ')}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {allInspected ? (
                          <div className="space-y-0.5 text-[11px]">
                            <p className="font-semibold text-emerald-700">
                              {totalRestockUnits} restockable
                            </p>
                            {totalDamagedUnits > 0 && (
                              <p className="text-rose-700">{totalDamagedUnits} damaged (held)</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-800">Pending QC</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        <p className="font-bold text-[#3d302b]">{money(ret.estimatedRefundAmount)}</p>
                        {ret.refundedAmount > 0 && (
                          <p className="mt-0.5 text-[10px] text-emerald-700">
                            Paid: {money(ret.refundedAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(ret.status)}`}
                        >
                          {humanize(ret.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openModal(ret)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#e7dbd0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5b112b] hover:bg-[#faf4ef]"
                          >
                            <Eye className="h-3 w-3" />
                            Manage
                          </button>
                          {(ret.status === 'inspected' || (ret.status === 'approved' && ret.reason === 'missing_item')) && (
                            <button
                              type="button"
                              onClick={() => onOpenRefundForReturn(ret)}
                              className="inline-flex items-center gap-1 rounded-full bg-[#5b112b] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#42101f]"
                            >
                              <Wallet className="h-3 w-3" />
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Return Detail & Inspection Modal */}
      {selectedReturn && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedReturnId(null);
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-3xl rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eee4dc] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-[.14em] text-[#a88243]">
                    {selectedReturn.id}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadge(selectedReturn.status)}`}
                  >
                    {humanize(selectedReturn.status)}
                  </span>
                </div>
                <h3 className="mt-1 font-serif text-2xl text-[#341016]">
                  Return for Order #{selectedReturn.orderId}
                </h3>
                <p className="mt-1 text-xs text-[#806f65]">
                  Customer: <strong>{selectedReturn.customerName}</strong>
                  {selectedReturn.customerEmail ? ` · ${selectedReturn.customerEmail}` : ''}
                  {selectedReturn.customerPhone ? ` · ${selectedReturn.customerPhone}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close return dialog"
                onClick={() => setSelectedReturnId(null)}
                className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metadata strip */}
            <div className="grid gap-3 rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-[10px] uppercase tracking-[.1em] text-[#96847a]">Reason &amp; Window</span>
                <p className="mt-1 font-semibold text-[#3d302b]">{humanize(selectedReturn.reason)}</p>
                <p className="text-[11px] text-[#837168]">
                  {selectedReturn.returnWindowDays}-day return window
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[.1em] text-[#96847a]">Payment Mode</span>
                <p className="mt-1 font-semibold text-[#3d302b]">
                  {selectedReturn.orderPaymentMethod || '—'} · {selectedReturn.orderPaymentStatus || '—'}
                </p>
                <p className="text-[11px] text-[#837168]">
                  Order Total: <span className="font-mono">{money(selectedReturn.orderTotal || 0)}</span>
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[.1em] text-[#96847a]">Estimated Prorated Refund</span>
                <p className="mt-1 font-mono text-base font-bold text-[#5b112b]">
                  {money(selectedReturn.estimatedRefundAmount)}
                </p>
                {selectedReturn.refundedAmount > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Refunded: {money(selectedReturn.refundedAmount)}
                  </p>
                )}
              </div>
              {selectedReturn.description && (
                <div className="sm:col-span-3 border-t border-[#eee4dc] pt-2.5">
                  <span className="text-[10px] uppercase tracking-[.1em] text-[#96847a]">Customer Explanation</span>
                  <p className="mt-1 text-xs text-[#4b3b35]">{selectedReturn.description}</p>
                </div>
              )}
            </div>

            {/* Approval / Receipt Controls */}
            {(['pending', 'approved'] as ReturnStatus[]).includes(selectedReturn.status) && (
              <div className="rounded-xl border border-[#eee4dc] bg-white p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#96847a]">
                  Return Workflow Decision
                </p>
                <input
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional admin decision note (stored on timeline)…"
                  className="w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                />
                <div className="flex flex-wrap gap-2">
                  {selectedReturn.status === 'pending' && (
                    <button
                      type="button"
                      disabled={savingStatus}
                      onClick={() => void handleTransition(selectedReturn, 'approved')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-55"
                    >
                      {savingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve Return
                    </button>
                  )}
                  {selectedReturn.status === 'approved' && (
                    <button
                      type="button"
                      disabled={savingStatus}
                      onClick={() => void handleTransition(selectedReturn, 'received')}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-55"
                    >
                      {savingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5" />}
                      Mark Package Received
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => setRejectTarget(selectedReturn)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-55"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject Return
                  </button>
                </div>
              </div>
            )}

            {/* Returned Item Inspection & Conditional Restocking */}
            <form
              onSubmit={(e) => void handleSubmitInspection(e)}
              className="rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#96847a]">
                  <ClipboardCheck className="h-3.5 w-3.5 text-[#7a1438]" />
                  Returned Items &amp; Stock Inspection
                </p>
                <span className="text-[11px] text-[#7c6a61]">
                  Damaged units are held out of sellable stock
                </span>
              </div>

              <div className="space-y-3">
                {selectedReturn.items.map((item) => {
                  const canInspect = ['approved', 'received', 'inspected'].includes(selectedReturn.status) && !item.restocked;
                  const draft = inspectionDraft[item.productId] || {
                    received: item.receivedQuantity,
                    restockable: item.restockableQuantity,
                    damaged: item.damagedQuantity
                  };
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#eee4dc] bg-white p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#3d302b]">{item.productName}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#8d7c72]">
                            SKU: {item.sku || '—'} · Unit: {money(item.unitPrice)} · Ordered: {item.orderedQuantity} · Requested: {item.requestedQuantity}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            item.inspectionStatus === 'inspected'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {item.restocked
                            ? `Restocked (+${item.restockableQuantity})`
                            : humanize(item.inspectionStatus)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <label className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#79675e]">
                          Received Qty
                          <input
                            type="number"
                            min={0}
                            max={item.requestedQuantity}
                            disabled={!canInspect}
                            value={draft.received}
                            onChange={(e) => {
                              const received = Math.max(0, Math.min(item.requestedQuantity, Number(e.target.value) || 0));
                              setInspectionDraft((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  received,
                                  restockable: Math.min(prev[item.productId]?.restockable || 0, received),
                                  damaged: Math.min(prev[item.productId]?.damaged || 0, received)
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-2.5 py-1.5 font-mono text-xs disabled:opacity-65"
                          />
                        </label>
                        <label className="text-[10px] font-semibold uppercase tracking-[.08em] text-emerald-800">
                          Restockable Qty
                          <input
                            type="number"
                            min={0}
                            max={draft.received}
                            disabled={!canInspect}
                            value={draft.restockable}
                            onChange={(e) => {
                              const restockable = Math.max(0, Math.min(draft.received, Number(e.target.value) || 0));
                              setInspectionDraft((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...draft,
                                  restockable,
                                  damaged: Math.max(0, Math.min(draft.damaged, draft.received - restockable))
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-emerald-200 bg-emerald-50/40 px-2.5 py-1.5 font-mono text-xs disabled:opacity-65"
                          />
                        </label>
                        <label className="text-[10px] font-semibold uppercase tracking-[.08em] text-rose-800">
                          Damaged / Hold
                          <input
                            type="number"
                            min={0}
                            max={draft.received}
                            disabled={!canInspect}
                            value={draft.damaged}
                            onChange={(e) => {
                              const damaged = Math.max(0, Math.min(draft.received, Number(e.target.value) || 0));
                              setInspectionDraft((prev) => ({
                                ...prev,
                                [item.productId]: {
                                  ...draft,
                                  damaged,
                                  restockable: Math.max(0, Math.min(draft.restockable, draft.received - damaged))
                                }
                              }));
                            }}
                            className="mt-1 w-full rounded-lg border border-rose-200 bg-rose-50/40 px-2.5 py-1.5 font-mono text-xs disabled:opacity-65"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {(['approved', 'received', 'inspected'].includes(selectedReturn.status) &&
                selectedReturn.items.some((it) => !it.restocked && it.inspectionStatus !== 'inspected')) && (
                <>
                  <input
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    placeholder="Inspection & condition summary note…"
                    className="w-full rounded-lg border border-[#e7dbd0] bg-white px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                  />
                  {inspectionError && (
                    <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {inspectionError}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingInspection}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-55"
                    >
                      {submittingInspection ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ClipboardCheck className="h-3.5 w-3.5" />
                      )}
                      {submittingInspection ? 'Recording QC…' : 'Complete Inspection & Restock Approved Units'}
                    </button>
                  </div>
                </>
              )}

              {selectedReturn.status === 'inspected' && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-3.5 py-2.5 text-xs">
                  <span className="font-medium text-violet-900">
                    Inspection completed. Issue refund for verified return amount ({money(selectedReturn.estimatedRefundAmount)}).
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedReturn;
                      setSelectedReturnId(null);
                      onOpenRefundForReturn(target);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#42101f]"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Proceed to Refund
                  </button>
                </div>
              )}
            </form>

            {/* Return Status Timeline */}
            <div className="border-t border-[#eee4dc] pt-3">
              <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                <Clock className="h-3.5 w-3.5 text-[#a88243]" /> Return Status Timeline
              </p>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {selectedReturn.timeline
                  .slice()
                  .reverse()
                  .map((ev, idx) => (
                    <div key={`${ev.status}-${ev.timestamp}-${idx}`} className="flex gap-2.5 text-xs">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7a1438]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#3d302b]">{humanize(ev.status)}</span>
                          <span className="text-[10px] text-[#928178]">{dateTimeLabel(ev.timestamp)}</span>
                        </div>
                        {ev.note && <p className="mt-0.5 text-[11px] text-[#726159]">{ev.note}</p>}
                        {ev.updatedBy && <p className="text-[10px] text-[#9a877d]">By {ev.updatedBy}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <AdminConfirmModal
          open={Boolean(rejectTarget)}
          title={`Reject Return ${rejectTarget.id}?`}
          description={`Please provide a clear rejection reason for ${rejectTarget.customerName}.`}
          confirmLabel="Reject Return"
          tone="danger"
          busy={rejecting}
          inputLabel="Rejection reason *"
          inputPlaceholder="e.g. Outside return condition guidelines or missing serial tag…"
          inputRequired
          onConfirm={handleConfirmReject}
          onCancel={() => {
            if (!rejecting) setRejectTarget(null);
          }}
        />
      )}
    </>
  );
};
