import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Flower2,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  User,
  X,
  XCircle
} from 'lucide-react';
import {
  Order,
  OrderShipmentInfo,
  OrderStatus,
  Product,
  ShipmentStatus
} from '../../types';
import { AdminConfirmModal } from './AdminConfirmModal';

interface AdminOrdersProps {
  orders: Order[];
  products: Product[];
  initialStatusFilter?: string;
  updatingOrderId: string;
  selectedOrder: Order | null;
  onSelectOrder: (order: Order | null) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<boolean>;
  onUpdateShipment: (orderId: string, shipment: OrderShipmentInfo) => Promise<boolean>;
}

const ALL_ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'processing', 'packed', 'cancelled'],
  confirmed: ['processing', 'packed', 'cancelled'],
  processing: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'out_for_delivery', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: []
};

const SHIPMENT_STATUS_OPTIONS: ShipmentStatus[] = [
  'pending',
  'packed',
  'dispatched',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'cancelled'
];

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

const dateTimeLabel = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
};

const parseOrderTimeMs = (order: Order): number => {
  if (order.createdAt) {
    const ms = Date.parse(order.createdAt);
    if (!Number.isNaN(ms)) return ms;
  }
  const fallback = Date.parse(order.date);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const statusBadgeClass = (status: OrderStatus) => {
  if (status === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'shipped' || status === 'out_for_delivery')
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (status === 'processing' || status === 'packed')
    return 'bg-sky-50 text-sky-800 border-sky-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  products,
  initialStatusFilter = 'all',
  updatingOrderId,
  selectedOrder,
  onSelectOrder,
  onUpdateStatus,
  onUpdateShipment
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [statusNote, setStatusNote] = useState('');
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [shipmentDraft, setShipmentDraft] = useState<OrderShipmentInfo>({});
  const [savingShipment, setSavingShipment] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
    setPage(1);
  }, [initialStatusFilter]);

  // Keep inspected order synced with live orders list
  const liveSelectedOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find((o) => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  useEffect(() => {
    if (liveSelectedOrder) {
      setShipmentDraft({
        courierName: liveSelectedOrder.shipment?.courierName || liveSelectedOrder.courierName || '',
        trackingNumber:
          liveSelectedOrder.shipment?.trackingNumber || liveSelectedOrder.trackingNumber || '',
        shipmentStatus: liveSelectedOrder.shipment?.shipmentStatus || 'pending',
        dispatchDate: liveSelectedOrder.shipment?.dispatchDate || '',
        estimatedDeliveryDate:
          liveSelectedOrder.shipment?.estimatedDeliveryDate ||
          liveSelectedOrder.estimatedDeliveryDate ||
          '',
        notes: liveSelectedOrder.shipment?.notes || ''
      });
      setStatusNote('');
    }
  }, [liveSelectedOrder?.id]);

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove('vyora-printing-invoice');
    };
    window.addEventListener('afterprint', cleanup);
    return () => {
      cleanup();
      window.removeEventListener('afterprint', cleanup);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00.000Z`) : null;
    const toMs = dateTo ? Date.parse(`${dateTo}T23:59:59.999Z`) : null;

    return orders.filter((order) => {
      const matchesQuery =
        !q ||
        [
          order.id,
          order.customerName || '',
          order.customerEmail || '',
          order.customerPhone || '',
          order.shippingAddress.fullName,
          order.shippingAddress.phone,
          order.shippingAddress.city
        ].some((val) => val.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

      const ms = parseOrderTimeMs(order);
      const matchesFrom = fromMs === null || Number.isNaN(fromMs) || (ms > 0 && ms >= fromMs);
      const matchesTo = toMs === null || Number.isNaN(toMs) || (ms > 0 && ms <= toMs);

      return matchesQuery && matchesStatus && matchesPayment && matchesFrom && matchesTo;
    });
  }, [orders, search, statusFilter, paymentFilter, dateFrom, dateTo]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleStatusUpdate = async (order: Order, nextStatus: OrderStatus, note?: string) => {
    if (nextStatus === 'cancelled') {
      setCancelTargetOrder(order);
      return;
    }
    const ok = await onUpdateStatus(order.id, nextStatus, note);
    if (ok) {
      setStatusNote('');
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTargetOrder) return;
    setCancelling(true);
    const ok = await onUpdateStatus(cancelTargetOrder.id, 'cancelled', reason);
    setCancelling(false);
    if (ok) {
      setCancelTargetOrder(null);
    }
  };

  const handleShipmentSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!liveSelectedOrder) return;
    setSavingShipment(true);
    await onUpdateShipment(liveSelectedOrder.id, shipmentDraft);
    setSavingShipment(false);
  };

  const triggerPrintInvoice = () => {
    document.body.classList.add('vyora-printing-invoice');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('vyora-printing-invoice');
    }, 1000);
  };

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <>
      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Client fulfillment & dispatch
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Orders & invoices</h2>
          </div>
          <div className="flex items-center gap-2">
            {(search || statusFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7dbd0] px-3 py-1.5 text-[11px] font-semibold text-[#6b5a52] hover:bg-[#faf4ef]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
            <span className="rounded-full bg-[#f7eee8] px-3 py-1.5 text-[11px] font-semibold text-[#805c50]">
              {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Multi-criteria Filter Bar */}
        <div className="grid gap-2.5 border-y border-[#eee4dc] bg-[#fdfbf9] p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9c8980]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search order ID, customer, email, phone or city"
              className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
            />
          </label>

          <select
            aria-label="Filter by order status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All fulfillment statuses</option>
            {ALL_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {humanize(status)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payment status"
            value={paymentFilter}
            onChange={(event) => {
              setPaymentFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All payment statuses</option>
            <option value="Paid">Paid (Online)</option>
            <option value="Pending COD">Pending COD</option>
            <option value="Pending">Pending</option>
          </select>

          <input
            type="date"
            aria-label="Filter orders from date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          />

          <input
            type="date"
            aria-label="Filter orders to date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            className="rounded-full border border-[#e9ded5] bg-white px-3 py-2 text-xs text-[#5b4b44] outline-none"
          />
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Fulfillment</th>
                <th className="px-4 py-3 font-semibold">Quick Advance</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e9e2]">
              {visibleOrders.map((order) => {
                const allowedNext = ALLOWED_TRANSITIONS[order.status] || [];
                const canCancel = allowedNext.includes('cancelled');
                const tracking = order.shipment?.trackingNumber || order.trackingNumber;
                return (
                  <tr key={order.id} className="text-xs transition hover:bg-[#fdfaf7]">
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-semibold text-[#4c2226]">#{order.id}</p>
                      <p className="mt-0.5 text-[10px] text-[#97867c]">
                        {dateLabel(order.createdAt || order.date)}
                      </p>
                      {tracking && (
                        <p className="mt-0.5 font-mono text-[10px] text-[#7a645a]">AWB: {tracking}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-[#3d302b]">
                        {order.customerName || order.shippingAddress.fullName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#97867c]">
                        {order.shippingAddress.city} · {order.shippingAddress.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono font-semibold text-[#3d302b]">{money(order.total)}</p>
                      <p className="mt-0.5 text-[10px] text-[#97867c]">
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                        {order.couponApplied ? ` · ${order.couponApplied}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-[#55463f]">{order.paymentMethod}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadgeClass(order.status)}`}
                      >
                        {humanize(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {allowedNext.length > 0 ? (
                        <select
                          aria-label={`Update order ${order.id} status`}
                          disabled={updatingOrderId === order.id}
                          value={order.status}
                          onChange={(event) => {
                            const next = event.target.value as OrderStatus;
                            if (next !== order.status) {
                              void handleStatusUpdate(order, next);
                            }
                          }}
                          className="max-w-[165px] rounded-full border border-[#e7dcd3] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#5b2631] outline-none focus:border-[#9b5363] disabled:opacity-60"
                        >
                          <option value={order.status}>{humanize(order.status)} (Current)</option>
                          {allowedNext.map((nextStatus) => (
                            <option key={nextStatus} value={nextStatus}>
                              → {humanize(nextStatus)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] italic text-[#9b8a80]">
                          {order.status === 'cancelled' ? 'Cancelled · Locked' : 'Completed'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          aria-label={`Inspect order ${order.id}`}
                          title="Order details & shipment"
                          className="rounded-full p-2 text-[#8b6a61] transition hover:bg-[#f5ece6] hover:text-[#5b112b]"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          aria-label={`Print invoice for order ${order.id}`}
                          title="View & print invoice"
                          className="rounded-full p-2 text-[#8b6a61] transition hover:bg-[#f5ece6] hover:text-[#5b112b]"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetOrder(order)}
                            aria-label={`Cancel order ${order.id}`}
                            title="Cancel order & restore stock"
                            className="rounded-full p-2 text-[#a76f73] transition hover:bg-rose-50 hover:text-rose-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visibleOrders.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#93837a]">
                    No orders match your current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#eee4dc] px-4 py-3 text-[11px] text-[#897970]">
          <span>
            {filteredOrders.length
              ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredOrders.length)} of ${filteredOrders.length}`
              : '0 results'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
              className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
              className="rounded-lg border border-[#eadfd5] p-1.5 disabled:opacity-35"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Order Detail & Shipment Management Modal */}
      {liveSelectedOrder && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onSelectOrder(null);
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-xs sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-4xl rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7 space-y-6"
          >
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee4dc] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">
                  Consignment record
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-2xl text-[#341016]">#{liveSelectedOrder.id}</h2>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(liveSelectedOrder.status)}`}
                  >
                    {humanize(liveSelectedOrder.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#897970]">
                  Placed {dateTimeLabel(liveSelectedOrder.createdAt || liveSelectedOrder.date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(liveSelectedOrder)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c6b8] bg-white px-4 py-2 text-xs font-semibold text-[#5b112b] hover:bg-[#faf4ef]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Invoice
                </button>
                <button
                  type="button"
                  aria-label="Close order details"
                  onClick={() => onSelectOrder(null)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Customer, Shipping, Billing */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-[#eee4dc] bg-[#faf6f2] p-4 space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">
                  <User className="h-3.5 w-3.5 text-[#7a1438]" /> Customer
                </p>
                <p className="pt-1 text-sm font-semibold text-[#44322c]">
                  {liveSelectedOrder.customerName || liveSelectedOrder.shippingAddress.fullName}
                </p>
                {liveSelectedOrder.customerEmail && (
                  <p className="text-xs text-[#78665e] break-all">
                    {liveSelectedOrder.customerEmail}
                  </p>
                )}
                <p className="font-mono text-xs text-[#78665e]">
                  {liveSelectedOrder.customerPhone || liveSelectedOrder.shippingAddress.phone}
                </p>
                <p className="pt-1 text-[11px] font-medium text-[#5b112b]">
                  {liveSelectedOrder.paymentMethod} · {liveSelectedOrder.paymentStatus}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee4dc] bg-[#faf6f2] p-4 space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">
                  <MapPin className="h-3.5 w-3.5 text-[#7a1438]" /> Shipping Address
                </p>
                <p className="pt-1 text-sm font-semibold text-[#44322c]">
                  {liveSelectedOrder.shippingAddress.fullName}
                </p>
                <p className="text-xs leading-5 text-[#78665e]">
                  {liveSelectedOrder.shippingAddress.street},{' '}
                  {liveSelectedOrder.shippingAddress.landmark
                    ? `${liveSelectedOrder.shippingAddress.landmark}, `
                    : ''}
                  {liveSelectedOrder.shippingAddress.city},{' '}
                  {liveSelectedOrder.shippingAddress.state}{' '}
                  {liveSelectedOrder.shippingAddress.pincode}
                </p>
                <p className="font-mono text-xs text-[#78665e]">
                  {liveSelectedOrder.shippingAddress.phone}
                </p>
              </div>

              <div className="rounded-xl border border-[#eee4dc] bg-[#faf6f2] p-4 space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">
                  <FileText className="h-3.5 w-3.5 text-[#7a1438]" /> Billing Address
                </p>
                {(() => {
                  const billing = liveSelectedOrder.billingAddress || liveSelectedOrder.shippingAddress;
                  return (
                    <>
                      <p className="pt-1 text-sm font-semibold text-[#44322c]">
                        {billing.fullName}
                      </p>
                      <p className="text-xs leading-5 text-[#78665e]">
                        {billing.street}, {billing.city}, {billing.state} {billing.pincode}
                      </p>
                      <p className="font-mono text-xs text-[#78665e]">{billing.phone}</p>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Fulfillment Transition Controls + Shipment Foundation */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Validated Status Transitions & Timeline */}
              <div className="rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                    Validated workflow transitions
                  </p>
                  {liveSelectedOrder.status === 'cancelled' ? (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                      <p className="font-semibold">Order cancelled</p>
                      {liveSelectedOrder.cancellationReason && (
                        <p className="mt-1">Reason: {liveSelectedOrder.cancellationReason}</p>
                      )}
                      {liveSelectedOrder.stockRestored && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-800">
                          ✓ Product stock was restored to catalog.
                        </p>
                      )}
                    </div>
                  ) : ALLOWED_TRANSITIONS[liveSelectedOrder.status].length === 0 ? (
                    <p className="mt-2 text-xs text-[#78665e]">
                      This order has reached its final delivered state.
                    </p>
                  ) : (
                    <div className="mt-2.5 space-y-2.5">
                      <input
                        type="text"
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        placeholder="Optional status update note for timeline…"
                        className="w-full rounded-lg border border-[#e7dbd0] bg-white px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448]"
                      />
                      <div className="flex flex-wrap gap-2">
                        {ALLOWED_TRANSITIONS[liveSelectedOrder.status]
                          .filter((s) => s !== 'cancelled')
                          .map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={updatingOrderId === liveSelectedOrder.id}
                              onClick={() =>
                                void handleStatusUpdate(liveSelectedOrder, nextStatus, statusNote)
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#42101f] disabled:opacity-55"
                            >
                              {updatingOrderId === liveSelectedOrder.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Mark {humanize(nextStatus)}
                            </button>
                          ))}
                        {ALLOWED_TRANSITIONS[liveSelectedOrder.status].includes('cancelled') && (
                          <button
                            type="button"
                            disabled={updatingOrderId === liveSelectedOrder.id}
                            onClick={() => setCancelTargetOrder(liveSelectedOrder)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-55"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status History Timeline */}
                <div className="border-t border-[#eee4dc] pt-3">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                    <Clock className="h-3.5 w-3.5 text-[#a88243]" /> Status history
                  </p>
                  <div className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
                    {(liveSelectedOrder.statusHistory || [])
                      .slice()
                      .reverse()
                      .map((ev, index) => (
                        <div key={`${ev.status}-${ev.timestamp}-${index}`} className="flex gap-2.5 text-xs">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7a1438]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-[#3d302b]">
                                {humanize(ev.status)}
                              </span>
                              <span className="text-[10px] text-[#928178]">
                                {dateTimeLabel(ev.timestamp)}
                              </span>
                            </div>
                            {ev.note && (
                              <p className="mt-0.5 text-[11px] text-[#726159]">{ev.note}</p>
                            )}
                            {ev.updatedBy && (
                              <p className="text-[10px] text-[#9a877d]">By {ev.updatedBy}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Shipment & Dispatch Management */}
              <form
                onSubmit={(event) => void handleShipmentSave(event)}
                className="rounded-xl border border-[#eee4dc] bg-[#fdfbf9] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                    <Truck className="h-3.5 w-3.5 text-[#7a1438]" /> Shipment & courier details
                  </p>
                  {liveSelectedOrder.status === 'cancelled' && (
                    <span className="text-[10px] font-semibold text-rose-700">Locked</span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Courier partner
                    <input
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.courierName || ''}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({ ...prev, courierName: event.target.value }))
                      }
                      placeholder="BlueDart, Delhivery, DTDC…"
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    />
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Tracking / AWB number
                    <input
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.trackingNumber || ''}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({
                          ...prev,
                          trackingNumber: event.target.value
                        }))
                      }
                      placeholder="Enter real AWB if dispatched"
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    />
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Shipment status
                    <select
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.shipmentStatus || 'pending'}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({
                          ...prev,
                          shipmentStatus: event.target.value as ShipmentStatus
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    >
                      {SHIPMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {humanize(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Dispatch date
                    <input
                      type="date"
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.dispatchDate || ''}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({ ...prev, dispatchDate: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    />
                  </label>
                  <label className="sm:col-span-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Estimated delivery date
                    <input
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.estimatedDeliveryDate || ''}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({
                          ...prev,
                          estimatedDeliveryDate: event.target.value
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    />
                  </label>
                  <label className="sm:col-span-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[#79675e]">
                    Dispatch notes
                    <input
                      disabled={liveSelectedOrder.status === 'cancelled'}
                      value={shipmentDraft.notes || ''}
                      onChange={(event) =>
                        setShipmentDraft((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Handling notes or courier pickup ref…"
                      className="mt-1 w-full rounded-lg border border-[#e7dbd0] bg-white px-2.5 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:bg-[#f4eee8]"
                    />
                  </label>
                </div>

                {liveSelectedOrder.status !== 'cancelled' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingShipment}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#3c111a] px-4 py-2 text-[11px] font-semibold text-[#e7ce91] hover:bg-[#521825] disabled:opacity-60"
                    >
                      {savingShipment ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Save shipment details
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Ordered Items & Full Breakdown */}
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">
                  <Package className="h-3.5 w-3.5 text-[#7a1438]" /> Items ·{' '}
                  {liveSelectedOrder.items.length}
                </p>
                <div className="max-h-60 divide-y divide-[#eee4dc] overflow-y-auto rounded-xl border border-[#eee4dc]">
                  {liveSelectedOrder.items.map((item, index) => {
                    const catalogProduct = products.find((p) => p.id === item.productId);
                    const img = item.image || catalogProduct?.primaryImage;
                    return (
                      <div key={`${item.productId}-${index}`} className="flex items-center gap-3 p-3">
                        <img
                          src={img || undefined}
                          alt=""
                          className="h-12 w-12 rounded-lg bg-[#f5efea] object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-[#44322c]">{item.name}</p>
                          <p className="mt-1 text-[10px] text-[#928178]">
                            {item.size || item.color
                              ? [item.size, item.color].filter(Boolean).join(' · ')
                              : 'Standard'}{' '}
                            · Qty {item.quantity} × {money(item.price)}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#58303a]">
                          {money(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-[#eee4dc] bg-[#faf6f2] p-4 space-y-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9a8579]">
                  Financial summary
                </p>
                <div className="flex justify-between text-[#77665e]">
                  <span>Items subtotal</span>
                  <span className="font-mono">{money(liveSelectedOrder.subtotal)}</span>
                </div>
                {liveSelectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Catalog savings</span>
                    <span className="font-mono">−{money(liveSelectedOrder.discount)}</span>
                  </div>
                )}
                {liveSelectedOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      Coupon {liveSelectedOrder.couponApplied ? `(${liveSelectedOrder.couponApplied})` : ''}
                    </span>
                    <span className="font-mono">−{money(liveSelectedOrder.couponDiscount)}</span>
                  </div>
                )}
                {liveSelectedOrder.giftWrap && (
                  <div className="flex justify-between text-[#77665e]">
                    <span>Luxury gift wrap</span>
                    <span className="font-mono">₹99</span>
                  </div>
                )}
                <div className="flex justify-between text-[#77665e]">
                  <span>Delivery fee</span>
                  <span className="font-mono">
                    {liveSelectedOrder.deliveryFee > 0 ? money(liveSelectedOrder.deliveryFee) : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#eadfd5] pt-2 text-sm font-bold text-[#431720]">
                  <span>Order Total</span>
                  <span className="font-mono">{money(liveSelectedOrder.total)}</span>
                </div>
                {(liveSelectedOrder.paymentId || liveSelectedOrder.paymentOrderId) && (
                  <div className="border-t border-[#eadfd5] pt-2 text-[10px] text-[#8b7a71] space-y-0.5">
                    {liveSelectedOrder.paymentId && (
                      <p className="break-all font-mono">Payment ID: {liveSelectedOrder.paymentId}</p>
                    )}
                    {liveSelectedOrder.paymentOrderId && (
                      <p className="break-all font-mono">
                        Gateway Order: {liveSelectedOrder.paymentOrderId}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {invoiceOrder && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInvoiceOrder(null);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/65 p-3 backdrop-blur-xs sm:p-6"
        >
          <div
            id="vyora-printable-invoice"
            className="my-auto w-full max-w-3xl rounded-2xl border border-[#eadfd5] bg-white p-6 shadow-2xl sm:p-9 space-y-6"
          >
            {/* Modal Toolbar (hidden during print) */}
            <div className="vyora-no-print flex items-center justify-between border-b border-[#eee4dc] pb-4">
              <span className="text-xs font-semibold text-[#79675e]">
                Order Invoice Preview · #{invoiceOrder.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={triggerPrintInvoice}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#42101f]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(null)}
                  className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
                  aria-label="Close invoice preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Invoice Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#eadfd5] pb-5 sm:flex-row sm:items-start">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#5b112b] text-[#e2c47d]">
                  <Flower2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold tracking-[.14em] text-[#3c111a]">
                    VYORA
                  </h2>
                  <p className="text-[10px] uppercase tracking-[.2em] text-[#8d7668]">
                    Luxury Heritage Atelier · Tax & Order Invoice
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right text-xs space-y-1">
                <p className="font-mono font-bold text-[#3c111a]">Invoice #{invoiceOrder.id}</p>
                <p className="text-[#6f5e56]">
                  Date: {dateLabel(invoiceOrder.createdAt || invoiceOrder.date)}
                </p>
                <p className="text-[#6f5e56]">
                  Status: <strong className="uppercase">{humanize(invoiceOrder.status)}</strong>
                </p>
                <p className="text-[#6f5e56]">
                  Payment: {invoiceOrder.paymentMethod} ({invoiceOrder.paymentStatus})
                </p>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid gap-6 sm:grid-cols-2 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                  Billed To
                </p>
                {(() => {
                  const billing = invoiceOrder.billingAddress || invoiceOrder.shippingAddress;
                  return (
                    <div className="mt-1.5 space-y-0.5 text-[#43332d]">
                      <p className="font-semibold">{billing.fullName}</p>
                      <p>{billing.street}</p>
                      <p>
                        {billing.city}, {billing.state} {billing.pincode}
                      </p>
                      <p className="font-mono">{billing.phone}</p>
                      {invoiceOrder.customerEmail && <p>{invoiceOrder.customerEmail}</p>}
                    </div>
                  );
                })()}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                  Shipped To
                </p>
                <div className="mt-1.5 space-y-0.5 text-[#43332d]">
                  <p className="font-semibold">{invoiceOrder.shippingAddress.fullName}</p>
                  <p>{invoiceOrder.shippingAddress.street}</p>
                  <p>
                    {invoiceOrder.shippingAddress.city}, {invoiceOrder.shippingAddress.state}{' '}
                    {invoiceOrder.shippingAddress.pincode}
                  </p>
                  <p className="font-mono">{invoiceOrder.shippingAddress.phone}</p>
                  {(invoiceOrder.shipment?.courierName || invoiceOrder.courierName) && (
                    <p className="pt-1 text-[#5b112b]">
                      Courier: {invoiceOrder.shipment?.courierName || invoiceOrder.courierName}
                      {invoiceOrder.shipment?.trackingNumber || invoiceOrder.trackingNumber
                        ? ` · AWB ${invoiceOrder.shipment?.trackingNumber || invoiceOrder.trackingNumber}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-hidden rounded-xl border border-[#eadfd5]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#eadfd5] bg-[#faf6f2] text-[10px] uppercase tracking-[.12em] text-[#7c6a61]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Item</th>
                    <th className="px-4 py-2.5 font-semibold">Variant</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Qty</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Unit Price</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1e9e2]">
                  {invoiceOrder.items.map((item, idx) => (
                    <tr key={`${item.productId}-${idx}`}>
                      <td className="px-4 py-2.5 font-medium text-[#3c2d28]">{item.name}</td>
                      <td className="px-4 py-2.5 text-[#75645c]">
                        {[item.size, item.color].filter(Boolean).join(' / ') || 'Standard'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(item.price)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#3c111a]">
                        {money(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="text-[11px] text-[#7e6d64] space-y-1">
                {invoiceOrder.paymentId && (
                  <p className="font-mono">Payment Ref: {invoiceOrder.paymentId}</p>
                )}
                <p>Thank you for patronizing VYORA Luxury Heritage Collections.</p>
              </div>
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#6f5e56]">
                  <span>Subtotal</span>
                  <span className="font-mono">{money(invoiceOrder.subtotal)}</span>
                </div>
                {invoiceOrder.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      Coupon {invoiceOrder.couponApplied ? `(${invoiceOrder.couponApplied})` : ''}
                    </span>
                    <span className="font-mono">−{money(invoiceOrder.couponDiscount)}</span>
                  </div>
                )}
                {invoiceOrder.giftWrap && (
                  <div className="flex justify-between text-[#6f5e56]">
                    <span>Luxury Gift Wrap</span>
                    <span className="font-mono">₹99</span>
                  </div>
                )}
                <div className="flex justify-between text-[#6f5e56]">
                  <span>Delivery</span>
                  <span className="font-mono">
                    {invoiceOrder.deliveryFee > 0 ? money(invoiceOrder.deliveryFee) : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#d8c6b8] pt-2 text-sm font-bold text-[#3c111a]">
                  <span>Grand Total</span>
                  <span className="font-mono">{money(invoiceOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      <AdminConfirmModal
        open={Boolean(cancelTargetOrder)}
        title={cancelTargetOrder ? `Cancel order #${cancelTargetOrder.id}?` : 'Cancel order'}
        description="Cancelling this consignment marks the order as cancelled and excludes its value from active net revenue."
        notice="All item quantities in this order will be restored to live catalog inventory automatically."
        confirmLabel="Cancel Order & Restore Stock"
        cancelLabel="Keep Order"
        tone="danger"
        inputLabel="Cancellation reason"
        inputPlaceholder="e.g. Customer requested cancellation before dispatch"
        inputRequired
        busy={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          if (!cancelling) setCancelTargetOrder(null);
        }}
      />
    </>
  );
};
