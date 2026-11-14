import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Wallet,
  X
} from 'lucide-react';
import {
  AdminRefundSummary,
  RefundMethod,
  RefundRecord,
  RefundStatus,
  ReturnRequest
} from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminRefundsProps {
  data: AdminRefundSummary | null;
  returns: ReturnRequest[];
  loading: boolean;
  preselectedReturn?: ReturnRequest | null;
  onClearPreselectedReturn?: () => void;
  onProcessRefund: (payload: {
    orderId: string;
    returnId?: string;
    mode: 'razorpay' | 'manual';
    method: RefundMethod;
    amount: number;
    idempotencyKey: string;
    referenceId?: string;
    notes?: string;
    markCompleted?: boolean;
  }) => Promise<boolean>;
  onUpdateRefund: (
    refundId: string,
    payload: {
      status: Extract<RefundStatus, 'manually_completed' | 'failed'>;
      referenceId?: string;
      notes?: string;
    }
  ) => Promise<boolean>;
  onSyncRazorpayRefund: (refundId: string) => Promise<boolean>;
}

const money = (amount: number) =>
  `₹${Math.round(amount * 100) / 100}`.includes('.')
    ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `₹${Math.round(amount).toLocaleString('en-IN')}`;

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

const statusBadge = (status: RefundStatus) => {
  switch (status) {
    case 'successful':
    case 'manually_completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'processing':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'pending':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'failed':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
};

const createIdempotencyKey = () =>
  `RFD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const AdminRefunds: React.FC<AdminRefundsProps> = ({
  data,
  returns,
  loading,
  preselectedReturn,
  onClearPreselectedReturn,
  onProcessRefund,
  onUpdateRefund,
  onSyncRazorpayRefund
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RefundStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedReturnId, setSelectedReturnId] = useState('');
  const [mode, setMode] = useState<'razorpay' | 'manual'>('manual');
  const [method, setMethod] = useState<RefundMethod>('manual_cod');
  const [amountInput, setAmountInput] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [completeTarget, setCompleteTarget] = useState<RefundRecord | null>(null);
  const [updatingRefundId, setUpdatingRefundId] = useState('');

  const refunds = data?.refunds || [];
  const refundableOrders = data?.refundableOrders || [];
  const stats = data?.stats;
  const razorpayConfigured = Boolean(data?.razorpayConfigured);

  const eligibleReturns = useMemo(
    () =>
      returns.filter(
        (r) =>
          r.status === 'inspected' || (r.status === 'approved' && r.reason === 'missing_item')
      ),
    [returns]
  );

  const selectedOrderSummary = useMemo(
    () => refundableOrders.find((o) => o.orderId === selectedOrderId) || null,
    [refundableOrders, selectedOrderId]
  );

  const openModalForReturn = (ret?: ReturnRequest | null) => {
    setFormError('');
    setReferenceId('');
    setIdempotencyKey(createIdempotencyKey());
    if (ret) {
      setSelectedReturnId(ret.id);
      setSelectedOrderId(ret.orderId);
      const ord = refundableOrders.find((o) => o.orderId === ret.orderId);
      const canRazorpay = Boolean(
        razorpayConfigured && ord && ord.paymentMethod !== 'COD' && ord.paymentStatus === 'Paid' && ord.paymentId
      );
      setMode(canRazorpay ? 'razorpay' : 'manual');
      setMethod(
        canRazorpay
          ? 'razorpay'
          : ord?.paymentMethod === 'COD'
            ? 'manual_cod'
            : 'manual_bank'
      );
      const capped = ord
        ? Math.min(ret.estimatedRefundAmount, ord.remainingRefundable)
        : ret.estimatedRefundAmount;
      setAmountInput(String(capped));
      setNotes(`Refund for return ${ret.id} (${humanize(ret.reason)})`);
      setMarkCompleted(true);
    } else {
      const firstEligible = refundableOrders.find((o) => o.remainingRefundable > 0);
      setSelectedReturnId('');
      setSelectedOrderId(firstEligible?.orderId || '');
      const canRazorpay = Boolean(
        razorpayConfigured &&
          firstEligible &&
          firstEligible.paymentMethod !== 'COD' &&
          firstEligible.paymentStatus === 'Paid' &&
          firstEligible.paymentId
      );
      setMode(canRazorpay ? 'razorpay' : 'manual');
      setMethod(
        canRazorpay
          ? 'razorpay'
          : firstEligible?.paymentMethod === 'COD'
            ? 'manual_cod'
            : 'manual_bank'
      );
      setAmountInput(firstEligible ? String(firstEligible.remainingRefundable) : '');
      setNotes('');
      setMarkCompleted(true);
    }
    setModalOpen(true);
  };

  useEffect(() => {
    if (preselectedReturn) {
      openModalForReturn(preselectedReturn);
      onClearPreselectedReturn?.();
    }
  }, [preselectedReturn]);

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId);
    const matchedReturn = eligibleReturns.find((r) => r.orderId === orderId);
    setSelectedReturnId(matchedReturn?.id || '');
    const ord = refundableOrders.find((o) => o.orderId === orderId);
    if (ord) {
      const canRazorpay = Boolean(
        razorpayConfigured && ord.paymentMethod !== 'COD' && ord.paymentStatus === 'Paid' && ord.paymentId
      );
      setMode(canRazorpay ? 'razorpay' : 'manual');
      setMethod(canRazorpay ? 'razorpay' : ord.paymentMethod === 'COD' ? 'manual_cod' : 'manual_bank');
      const suggested = matchedReturn
        ? Math.min(matchedReturn.estimatedRefundAmount, ord.remainingRefundable)
        : ord.remainingRefundable;
      setAmountInput(String(suggested));
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedOrderSummary) {
      setFormError('Select an eligible order to refund.');
      return;
    }
    const amt = Number(amountInput);
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Enter a valid positive refund amount.');
      return;
    }
    if (amt > selectedOrderSummary.remainingRefundable) {
      setFormError(
        `Amount cannot exceed remaining refundable balance (${money(selectedOrderSummary.remainingRefundable)}).`
      );
      return;
    }
    if (mode === 'manual' && markCompleted && !referenceId.trim() && !notes.trim()) {
      setFormError('Enter a payout reference ID or completion note when marking a manual refund completed.');
      return;
    }

    setSubmitting(true);
    const ok = await onProcessRefund({
      orderId: selectedOrderSummary.orderId,
      returnId: selectedReturnId || undefined,
      mode,
      method,
      amount: amt,
      idempotencyKey,
      referenceId: referenceId.trim() || undefined,
      notes: notes.trim() || undefined,
      markCompleted: mode === 'manual' ? markCompleted : undefined
    });
    setSubmitting(false);
    if (ok) {
      setModalOpen(false);
    }
  };

  const handleCompleteManual = async (refAndNote: string) => {
    if (!completeTarget) return;
    setUpdatingRefundId(completeTarget.id);
    const ok = await onUpdateRefund(completeTarget.id, {
      status: 'manually_completed',
      referenceId: refAndNote.trim().slice(0, 80),
      notes: refAndNote.trim()
    });
    setUpdatingRefundId('');
    if (ok) setCompleteTarget(null);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return refunds.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [
        r.id,
        r.orderId,
        r.returnId || '',
        r.customerName,
        r.customerEmail,
        r.paymentId || '',
        r.gatewayRefundId || '',
        r.referenceId || ''
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [refunds, search, statusFilter]);

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <>
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Total Refunded</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#3b191e]">
            {loading && !stats ? '—' : money(stats?.totalRefundedAmount ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">
            {(stats?.successfulRefunds ?? 0) + (stats?.manualCompletedRefunds ?? 0)} settled payouts
          </p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Pending / Processing</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {loading && !stats ? '—' : (stats?.pendingRefunds ?? 0) + (stats?.processingRefunds ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">
            {stats?.processingRefunds ?? 0} awaiting gateway · {stats?.pendingRefunds ?? 0} manual pending
          </p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Returns Ready for Refund</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[#5b112b]">
            {eligibleReturns.length}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Inspected returns awaiting payout</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Razorpay Refund API</p>
          <p className={`mt-2 text-base font-bold ${razorpayConfigured ? 'text-emerald-700' : 'text-amber-800'}`}>
            {razorpayConfigured ? 'Live Test Mode Ready' : 'Manual Fallback Active'}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">
            {razorpayConfigured ? 'Direct gateway & manual COD tracking' : 'Configure .env keys for live Razorpay API'}
          </p>
        </article>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Verified payouts &amp; COD tracking
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Refund ledger &amp; processing</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={() => openModalForReturn(null)}
              className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f]"
            >
              <Plus className="h-3.5 w-3.5" />
              Issue refund
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-3 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search refund ID, order ID, return ID, customer or gateway ref…"
              className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'pending', 'processing', 'successful', 'manually_completed', 'failed'] as const).map(
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

        {/* Refund Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
              <tr>
                <th className="px-4 py-3 font-semibold">Refund / Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Method &amp; Reference</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Notes &amp; Audit</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e9e2]">
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    Loading refund ledger…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    No refund records yet. Process a refund from an inspected return or click &ldquo;Issue refund&rdquo;.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="text-xs transition hover:bg-[#fdfaf7]">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-bold text-[#4c2226]">{r.id}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#7c6a61]">
                        Order #{r.orderId}
                        {r.returnId ? ` · ${r.returnId}` : ''}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#9a887e]">{dateTimeLabel(r.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#3d302b]">{r.customerName}</p>
                      <p className="mt-0.5 text-[10px] text-[#8d7c72]">{r.customerEmail || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#3d302b]">{humanize(r.method)}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-[#7c6a61]">
                        {r.gatewayRefundId || r.referenceId || r.paymentId || 'No external ref'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold tabular-nums text-[#3d302b]">
                      {money(r.amount)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(r.status)}`}
                      >
                        {humanize(r.status)}
                      </span>
                      {r.gatewayStatus && (
                        <p className="mt-1 text-[10px] text-[#8c7b72]">GW: {r.gatewayStatus}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-[240px]">
                      <p className="line-clamp-2 text-[11px] text-[#594842]">{r.notes || '—'}</p>
                      <p className="mt-0.5 text-[10px] text-[#9a887e]">
                        {r.completedAt
                          ? `Completed ${dateTimeLabel(r.completedAt)}`
                          : r.processedBy
                            ? `By ${r.processedBy}`
                            : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {r.status === 'processing' && r.gatewayRefundId && (
                          <button
                            type="button"
                            disabled={updatingRefundId === r.id}
                            onClick={async () => {
                              setUpdatingRefundId(r.id);
                              await onSyncRazorpayRefund(r.id);
                              setUpdatingRefundId('');
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-55"
                          >
                            <RefreshCw className={`h-3 w-3 ${updatingRefundId === r.id ? 'animate-spin' : ''}`} />
                            Verify Status
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'failed') && (
                          <button
                            type="button"
                            disabled={updatingRefundId === r.id}
                            onClick={() => setCompleteTarget(r)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#5b112b] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#42101f] disabled:opacity-55"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete Payout
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Process Refund Modal */}
      {modalOpen && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalOpen(false);
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-xl rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7"
          >
            <form onSubmit={(e) => void handleSubmitRefund(e)} className="space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-[#eee4dc] pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">
                    Refund authorization
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-[#341016]">Issue customer refund</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close refund dialog"
                  onClick={() => !submitting && setModalOpen(false)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                Eligible Order *
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                >
                  <option value="">Select a paid or delivered order…</option>
                  {refundableOrders
                    .filter((o) => o.remainingRefundable > 0)
                    .map((ord) => (
                      <option key={ord.orderId} value={ord.orderId}>
                        #{ord.orderId} — {ord.customerName} ({ord.paymentMethod} · Remaining {money(ord.remainingRefundable)})
                      </option>
                    ))}
                </select>
              </label>

              {selectedOrderSummary && (
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-[.08em] text-[#96847a]">Order Paid</span>
                    <p className="mt-0.5 font-mono font-bold text-[#3d302b]">
                      {money(selectedOrderSummary.orderTotal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[.08em] text-[#96847a]">Already Refunded</span>
                    <p className="mt-0.5 font-mono font-semibold text-emerald-700">
                      {money(selectedOrderSummary.alreadyRefunded + selectedOrderSummary.pendingOrProcessing)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[.08em] text-[#96847a]">Max Refundable</span>
                    <p className="mt-0.5 font-mono font-bold text-[#5b112b]">
                      {money(selectedOrderSummary.remainingRefundable)}
                    </p>
                  </div>
                </div>
              )}

              {eligibleReturns.some((r) => r.orderId === selectedOrderId) && (
                <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Linked Return Request (Optional)
                  <select
                    value={selectedReturnId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedReturnId(nextId);
                      const matched = eligibleReturns.find((r) => r.id === nextId);
                      if (matched && selectedOrderSummary) {
                        setAmountInput(
                          String(Math.min(matched.estimatedRefundAmount, selectedOrderSummary.remainingRefundable))
                        );
                      }
                    }}
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                  >
                    <option value="">Standalone order refund</option>
                    {eligibleReturns
                      .filter((r) => r.orderId === selectedOrderId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.id} — Est. {money(r.estimatedRefundAmount)} ({humanize(r.reason)})
                        </option>
                      ))}
                  </select>
                </label>
              )}

              {/* Execution mode */}
              <div className="space-y-2">
                <span className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Refund Method *
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={
                      !razorpayConfigured ||
                      !selectedOrderSummary?.paymentId ||
                      selectedOrderSummary?.paymentMethod === 'COD'
                    }
                    onClick={() => {
                      setMode('razorpay');
                      setMethod('razorpay');
                    }}
                    className={`rounded-xl border p-3 text-left text-xs transition ${
                      mode === 'razorpay'
                        ? 'border-[#5b112b] bg-[#5b112b]/5 text-[#3b191e]'
                        : 'border-[#e7dbd0] bg-white text-[#6f5e56]'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CreditCard className="h-3.5 w-3.5 text-[#7a1438]" />
                      Razorpay Gateway
                    </div>
                    <p className="mt-1 text-[10px] text-[#8d7c72]">
                      {!razorpayConfigured
                        ? 'Razorpay keys not configured'
                        : selectedOrderSummary?.paymentMethod === 'COD'
                          ? 'Unavailable for COD orders'
                          : 'Verified live API refund'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('manual');
                      setMethod(selectedOrderSummary?.paymentMethod === 'COD' ? 'manual_cod' : 'manual_bank');
                    }}
                    className={`rounded-xl border p-3 text-left text-xs transition ${
                      mode === 'manual'
                        ? 'border-[#5b112b] bg-[#5b112b]/5 text-[#3b191e]'
                        : 'border-[#e7dbd0] bg-white text-[#6f5e56]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Wallet className="h-3.5 w-3.5 text-[#7a1438]" />
                      Manual Refund Tracking
                    </div>
                    <p className="mt-1 text-[10px] text-[#8d7c72]">
                      COD payout or manual NEFT / UPI reference
                    </p>
                  </button>
                </div>
              </div>

              {mode === 'manual' && !razorpayConfigured && selectedOrderSummary?.paymentMethod !== 'COD' && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-[11px] text-amber-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Razorpay Test Mode credentials are missing, so automatic gateway refunds are disabled. Manual tracking never fabricates gateway status.
                  </span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Refund Amount (₹) *
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    max={selectedOrderSummary?.remainingRefundable ?? undefined}
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                  />
                </label>

                {mode === 'manual' && (
                  <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                    Payout Channel
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as RefundMethod)}
                      className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                    >
                      <option value="manual_cod">COD Cash / Store Credit</option>
                      <option value="manual_bank">Manual Bank / UPI Transfer</option>
                    </select>
                  </label>
                )}
              </div>

              {mode === 'manual' && (
                <>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#3b191e]">
                    <input
                      type="checkbox"
                      checked={markCompleted}
                      onChange={(e) => setMarkCompleted(e.target.checked)}
                      className="accent-[#6c2134]"
                    />
                    Mark manual payout completed now (otherwise save as Pending)
                  </label>

                  {markCompleted && (
                    <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                      Bank / UPI / Payout Reference ID *
                      <input
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value)}
                        placeholder="e.g. UTR-41209841 or COD-CASH-009"
                        className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                      />
                    </label>
                  )}
                </>
              )}

              <label className="block text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                Admin Refund Notes
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason, partial deduction note, or finance audit remarks…"
                  className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2.5 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                />
              </label>

              {formError && (
                <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-[#eee4dc] pt-4">
                <span className="font-mono text-[10px] text-[#9b8980]">Key: {idempotencyKey}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setModalOpen(false)}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-60"
                  >
                    {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
                    {submitting ? 'Processing…' : mode === 'razorpay' ? 'Submit Razorpay Refund' : 'Save Refund'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {completeTarget && (
        <AdminConfirmModal
          open={Boolean(completeTarget)}
          title={`Complete Payout ${completeTarget.id}?`}
          description={`Mark ₹${completeTarget.amount.toLocaleString('en-IN')} refund for Order #${completeTarget.orderId} as manually completed.`}
          confirmLabel="Confirm Payout Completed"
          tone="primary"
          busy={updatingRefundId === completeTarget.id}
          inputLabel="Payout Reference / Note *"
          inputPlaceholder="e.g. UTR 9021849102 — NEFT settled"
          inputRequired
          onConfirm={handleCompleteManual}
          onCancel={() => {
            if (!updatingRefundId) setCompleteTarget(null);
          }}
        />
      )}
    </>
  );
};
