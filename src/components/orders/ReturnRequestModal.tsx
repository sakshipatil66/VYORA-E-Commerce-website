import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Order, ReturnReason, ReturnRequest } from '../../types';

interface ReturnRequestModalProps {
  order: Order;
  existingReturns: ReturnRequest[];
  onSubmit: (data: {
    orderId: string;
    reason: ReturnReason;
    description?: string;
    items: { productId: string; quantity: number }[];
  }) => Promise<ReturnRequest | null>;
  onClose: () => void;
}

const RETURN_WINDOW_DAYS = 7;

const RETURN_REASONS: { id: ReturnReason; label: string }[] = [
  { id: 'damaged', label: 'Item arrived damaged' },
  { id: 'defective', label: 'Defective or not working' },
  { id: 'wrong_item', label: 'Wrong item or variant received' },
  { id: 'missing_item', label: 'Missing part or item from package' },
  { id: 'other', label: 'Other reason' }
];

export const getOrderReturnEligibility = (order: Order, existingReturns: ReturnRequest[]) => {
  if (order.status !== 'delivered') {
    return { eligible: false, reason: 'Available after delivery', daysRemaining: 0, remainingByProduct: new Map<string, number>() };
  }

  const deliveredEvent = [...(order.statusHistory || [])].reverse().find((ev) => ev.status === 'delivered');
  const rawDate =
    order.shipment?.actualDeliveryDate ||
    order.shipment?.deliveredDate ||
    deliveredEvent?.timestamp ||
    order.createdAt;
  const parsedMs = rawDate
    ? Date.parse(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00.000Z`)
    : NaN;
  const deliveredMs = Number.isNaN(parsedMs) ? Date.now() : parsedMs;
  const eligibleUntilMs = deliveredMs + RETURN_WINDOW_DAYS * 86400000;
  const msRemaining = eligibleUntilMs - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));

  const alreadyRequested = new Map<string, number>();
  for (const rr of existingReturns) {
    if (rr.orderId !== order.id || rr.status === 'rejected') continue;
    for (const item of rr.items) {
      alreadyRequested.set(item.productId, (alreadyRequested.get(item.productId) || 0) + item.requestedQuantity);
    }
  }

  const orderedByProduct = new Map<string, number>();
  for (const item of order.items) {
    orderedByProduct.set(item.productId, (orderedByProduct.get(item.productId) || 0) + item.quantity);
  }

  const remainingByProduct = new Map<string, number>();
  let totalRemaining = 0;
  for (const [productId, orderedQty] of orderedByProduct.entries()) {
    const rem = Math.max(0, orderedQty - (alreadyRequested.get(productId) || 0));
    remainingByProduct.set(productId, rem);
    totalRemaining += rem;
  }

  if (msRemaining < 0) {
    return {
      eligible: false,
      reason: `${RETURN_WINDOW_DAYS}-day return window closed`,
      daysRemaining: 0,
      remainingByProduct
    };
  }
  if (totalRemaining <= 0) {
    return {
      eligible: false,
      reason: 'All items already requested for return',
      daysRemaining,
      remainingByProduct
    };
  }

  return {
    eligible: true,
    reason: `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining in return window`,
    daysRemaining,
    remainingByProduct
  };
};

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  order,
  existingReturns,
  onSubmit,
  onClose
}) => {
  const eligibility = useMemo(
    () => getOrderReturnEligibility(order, existingReturns),
    [order, existingReturns]
  );

  // Deduplicate order items by productId for clean quantity selection
  const consolidatedItems = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; price: number; orderedQty: number }>();
    for (const item of order.items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.orderedQty += item.quantity;
      } else {
        map.set(item.productId, {
          productId: item.productId,
          name: item.name,
          price: item.price,
          orderedQty: item.quantity
        });
      }
    }
    return Array.from(map.values()).map((it) => ({
      ...it,
      remainingQty: eligibility.remainingByProduct.get(it.productId) || 0
    }));
  }, [order.items, eligibility]);

  const [selectedQty, setSelectedQty] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const firstEligible = consolidatedItems.find((i) => i.remainingQty > 0);
    if (firstEligible) {
      initial[firstEligible.productId] = 1;
    }
    return initial;
  });
  const [reason, setReason] = useState<ReturnReason>('damaged');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const estimatedRefund = useMemo(() => {
    const itemsSubtotal = order.items.reduce((s, it) => s + it.price * it.quantity, 0);
    const ratio = itemsSubtotal > 0 ? Math.max(0, itemsSubtotal - (order.couponDiscount || 0)) / itemsSubtotal : 1;
    let selectedGross = 0;
    for (const item of consolidatedItems) {
      const qty = selectedQty[item.productId] || 0;
      if (qty > 0) selectedGross += item.price * qty;
    }
    return Math.min(order.total, Math.round(selectedGross * ratio));
  }, [order, consolidatedItems, selectedQty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const items = consolidatedItems
      .map((item) => ({ productId: item.productId, quantity: selectedQty[item.productId] || 0 }))
      .filter((it) => it.quantity > 0);

    if (items.length === 0) {
      setError('Select at least one item and quantity to return.');
      return;
    }

    setSubmitting(true);
    const created = await onSubmit({
      orderId: order.id,
      reason,
      description: description.trim() || undefined,
      items
    });
    setSubmitting(false);
    if (created) {
      onClose();
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-sm sm:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="my-auto w-full max-w-xl rounded-2xl border border-[#EBE4DD] bg-white p-5 shadow-2xl sm:p-7"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-[#F3ECE7] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7A1438]">
                {RETURN_WINDOW_DAYS}-Day Easy Returns
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-neutral-900">
                Request Return · #{order.id}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{eligibility.reason}</p>
            </div>
            <button
              type="button"
              aria-label="Close return dialog"
              onClick={() => !submitting && onClose()}
              className="rounded-full p-2 text-neutral-500 hover:bg-[#FAF7F5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Item Selection */}
          <div className="space-y-2.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              Select Items &amp; Return Quantities *
            </span>
            <div className="divide-y divide-[#F3ECE7] rounded-xl border border-[#EBE4DD] bg-[#FAF7F5]/60">
              {consolidatedItems.map((item) => {
                const qty = selectedQty[item.productId] || 0;
                const disabled = item.remainingQty <= 0;
                return (
                  <div key={item.productId} className="flex items-center justify-between gap-3 p-3.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{item.name}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-500 font-mono tabular-nums">
                        ₹{item.price.toLocaleString('en-IN')} · Ordered: {item.orderedQty} · Eligible: {item.remainingQty}
                      </p>
                    </div>
                    <select
                      aria-label={`Return quantity for ${item.name}`}
                      disabled={disabled}
                      value={qty}
                      onChange={(e) =>
                        setSelectedQty((prev) => ({
                          ...prev,
                          [item.productId]: Number(e.target.value)
                        }))
                      }
                      className="rounded-lg border border-[#EBE4DD] bg-white px-2.5 py-1.5 font-mono text-xs text-neutral-800 outline-none focus:border-[#5B112B] disabled:opacity-50"
                    >
                      <option value={0}>Do not return</option>
                      {Array.from({ length: item.remainingQty }, (_, idx) => idx + 1).map((n) => (
                        <option key={n} value={n}>
                          Return {n}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason & Description */}
          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
            Reason for Return *
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="mt-1.5 w-full rounded-lg border border-[#EBE4DD] bg-white px-3 py-2.5 text-xs text-neutral-900 outline-none focus:border-[#5B112B]"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600">
            Additional Details (Optional)
            <textarea
              rows={3}
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue, damage location, or missing piece…"
              className="mt-1.5 w-full rounded-lg border border-[#EBE4DD] bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-[#5B112B]"
            />
          </label>

          {/* Refund Estimate */}
          <div className="flex items-center justify-between rounded-xl border border-[#EBE4DD] bg-[#FAF7F5] px-4 py-3 text-xs">
            <span className="font-medium text-neutral-700">Estimated Prorated Refund</span>
            <span className="font-mono text-base font-bold tabular-nums text-[#5B112B]">
              ₹{estimatedRefund.toLocaleString('en-IN')}
            </span>
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-[#F3ECE7] pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-md px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-[#FAF7F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !eligibility.eligible}
              className="inline-flex items-center gap-2 rounded-md bg-[#5B112B] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#430C1F] disabled:opacity-55"
            >
              {submitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {submitting ? 'Submitting…' : 'Submit Return Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ReturnStatusTimelineCard: React.FC<{ returnRequest: ReturnRequest }> = ({
  returnRequest
}) => (
  <div className="rounded-xl border border-[#EBE4DD] bg-[#FAF7F5]/70 p-4 text-xs space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <span className="font-mono font-bold text-[#4A0E17]">{returnRequest.id}</span>
        <span className="ml-2 text-neutral-500">
          · {returnRequest.reason.replace(/_/g, ' ')}
        </span>
      </div>
      <span
        className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
          returnRequest.status === 'rejected'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : returnRequest.status === 'refunded'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        Return: {returnRequest.status.replace(/_/g, ' ')}
      </span>
    </div>

    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600">
      <span>
        Items:{' '}
        {returnRequest.items
          .map((it) => `${it.productName} (×${it.requestedQuantity})`)
          .join(', ')}
      </span>
      <span className="font-mono font-semibold text-[#4A0E17]">
        Est. Refund: ₹{returnRequest.estimatedRefundAmount.toLocaleString('en-IN')}
      </span>
      {returnRequest.refundedAmount > 0 && (
        <span className="font-mono font-semibold text-emerald-700">
          Refunded: ₹{returnRequest.refundedAmount.toLocaleString('en-IN')}
        </span>
      )}
    </div>

    {returnRequest.adminNotes && (
      <p className="rounded-lg border border-[#EBE4DD] bg-white px-3 py-2 text-[11px] text-neutral-700">
        <strong>Store Note:</strong> {returnRequest.adminNotes}
      </p>
    )}

    <div className="space-y-1.5 border-t border-[#EBE4DD] pt-2.5">
      {returnRequest.timeline
        .slice()
        .reverse()
        .map((ev, i) => (
          <div key={`${ev.status}-${ev.timestamp}-${i}`} className="flex items-start gap-2 text-[11px]">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#7A1438]" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-neutral-800">
                {ev.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </span>
              {ev.note && <span className="text-neutral-600"> — {ev.note}</span>}
              <span className="ml-2 font-mono text-[10px] text-neutral-400">
                {new Date(ev.timestamp).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        ))}
    </div>
  </div>
);
