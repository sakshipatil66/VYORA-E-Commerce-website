import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
  X
} from 'lucide-react';
import {
  AdminShipmentSummary,
  Order,
  OrderShipmentInfo,
  ShipmentStatus
} from '../../types';

interface AdminShippingProps {
  data: AdminShipmentSummary | null;
  loading: boolean;
  onUpdateShipment: (orderId: string, shipment: OrderShipmentInfo) => Promise<boolean>;
}

const COURIER_PRESETS = ['BlueDart Express', 'Delhivery Air', 'DTDC Priority', 'India Post Speed', 'Ecom Express'];

const ALLOWED_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['packed', 'dispatched', 'shipped', 'in_transit', 'cancelled'],
  packed: ['dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'cancelled'],
  dispatched: ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'],
  shipped: ['in_transit', 'out_for_delivery', 'delivered', 'failed'],
  in_transit: ['out_for_delivery', 'delivered', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  failed: ['packed', 'dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

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

const statusBadge = (status: ShipmentStatus) => {
  switch (status) {
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'out_for_delivery':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'dispatched':
    case 'shipped':
    case 'in_transit':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'packed':
      return 'bg-violet-50 text-violet-800 border-violet-200';
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
};

export const AdminShipping: React.FC<AdminShippingProps> = ({
  data,
  loading,
  onUpdateShipment
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_dispatch' | ShipmentStatus>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [draft, setDraft] = useState<OrderShipmentInfo>({});
  const [saving, setSaving] = useState(false);

  const orders = data?.shipments || [];
  const stats = data?.stats;

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const openEditor = (order: Order) => {
    setSelectedOrderId(order.id);
    setDraft({
      courierName: order.shipment?.courierName || order.courierName || '',
      trackingNumber: order.shipment?.trackingNumber || order.trackingNumber || '',
      shipmentStatus: order.shipment?.shipmentStatus || 'pending',
      dispatchDate: order.shipment?.dispatchDate || '',
      estimatedDeliveryDate: order.shipment?.estimatedDeliveryDate || order.estimatedDeliveryDate || '',
      actualDeliveryDate: order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate || '',
      notes: order.shipment?.notes || ''
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((ord) => {
      const shipStatus: ShipmentStatus = ord.shipment?.shipmentStatus || 'pending';
      if (statusFilter === 'needs_dispatch') {
        if (ord.status === 'cancelled' || (shipStatus !== 'pending' && shipStatus !== 'packed')) {
          return false;
        }
      } else if (statusFilter !== 'all' && shipStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [
        ord.id,
        ord.customerName || ord.shippingAddress.fullName,
        ord.shippingAddress.city,
        ord.shippingAddress.state,
        ord.shipment?.courierName || ord.courierName || '',
        ord.shipment?.trackingNumber || ord.trackingNumber || ''
      ].some((v) => v.toLowerCase().includes(q));
    });
  }, [orders, search, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    const ok = await onUpdateShipment(selectedOrder.id, draft);
    setSaving(false);
    if (ok) {
      setSelectedOrderId(null);
    }
  };

  const currentStatus: ShipmentStatus = selectedOrder?.shipment?.shipmentStatus || 'pending';
  const selectableStatuses: ShipmentStatus[] = [
    currentStatus,
    ...(ALLOWED_SHIPMENT_TRANSITIONS[currentStatus] || [])
  ];

  const cardClass =
    'min-w-0 rounded-2xl border border-[#eadfd5] bg-white shadow-[0_8px_24px_rgba(47,20,20,.035)]';

  return (
    <>
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Pending Dispatch</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-amber-700">
            {loading && !stats ? '—' : stats?.pendingDispatch ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Pending &amp; packed orders</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">In Transit</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-sky-700">
            {loading && !stats ? '—' : stats?.inTransit ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Shipped / courier transit</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Out For Delivery</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-indigo-700">
            {loading && !stats ? '—' : stats?.outForDelivery ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Last-mile courier run</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Delivered</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {loading && !stats ? '—' : stats?.delivered ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Confirmed deliveries</p>
        </article>
        <article className={`${cardClass} p-5`}>
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#96847a]">Failed Attempts</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-700">
            {loading && !stats ? '—' : stats?.failed ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-[#8b7a71]">Requires re-attempt or hold</p>
        </article>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#96847a]">
              Courier dispatch &amp; tracking
            </p>
            <h2 className="mt-1 font-serif text-2xl text-[#3b191e]">Shipping &amp; consignments</h2>
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
              {filtered.length} consignment{filtered.length === 1 ? '' : 's'}
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
              placeholder="Search order ID, customer, city, courier or AWB tracking…"
              className="w-full rounded-full border border-[#e9ded5] bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-[#9a5d69]"
            />
          </label>
          <select
            aria-label="Filter shipments by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-full border border-[#e9ded5] bg-white px-4 py-2 text-xs text-[#5b4b44] outline-none"
          >
            <option value="all">All shipments</option>
            <option value="needs_dispatch">Requires dispatch (Pending / Packed)</option>
            <option value="pending">Pending</option>
            <option value="packed">Packed</option>
            <option value="dispatched">Dispatched</option>
            <option value="shipped">Shipped</option>
            <option value="in_transit">In Transit</option>
            <option value="out_for_delivery">Out For Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Shipments Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-[#eee4dc] bg-[#fcf9f6] text-[10px] uppercase tracking-[.14em] text-[#897970]">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Courier &amp; AWB</th>
                <th className="px-4 py-3 font-semibold">Dispatch &amp; Delivery Dates</th>
                <th className="px-4 py-3 font-semibold">Shipment Status</th>
                <th className="px-4 py-3 text-right font-semibold">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1e9e2]">
              {loading && !data ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    Loading shipments…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#8e7d74]">
                    No consignments match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => {
                  const shipStatus: ShipmentStatus = ord.shipment?.shipmentStatus || 'pending';
                  const courier = ord.shipment?.courierName || ord.courierName;
                  const awb = ord.shipment?.trackingNumber || ord.trackingNumber;
                  const actualDel = ord.shipment?.actualDeliveryDate || ord.shipment?.deliveredDate;
                  return (
                    <tr key={ord.id} className="text-xs transition hover:bg-[#fdfaf7]">
                      <td className="px-4 py-3.5">
                        <p className="font-mono font-bold text-[#4c2226]">#{ord.id}</p>
                        <p className="mt-0.5 text-[10px] text-[#8d7c72]">
                          {ord.items.length} item{ord.items.length === 1 ? '' : 's'} · Order {humanize(ord.status)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#3d302b]">
                          {ord.customerName || ord.shippingAddress.fullName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#8a7970]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {ord.shippingAddress.city}, {ord.shippingAddress.state} {ord.shippingAddress.pincode}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#3d302b]">{courier || 'Unassigned'}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#7c6a61]">
                          {awb ? `AWB: ${awb}` : 'No tracking ID'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] font-mono tabular-nums text-[#594842]">
                        <p>Dispatch: {ord.shipment?.dispatchDate || '—'}</p>
                        <p className="text-[10px] text-[#8d7c72]">
                          {actualDel
                            ? `Delivered: ${actualDel}`
                            : `ETA: ${ord.shipment?.estimatedDeliveryDate || ord.estimatedDeliveryDate}`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge(shipStatus)}`}
                        >
                          {humanize(shipStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(ord)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e7dbd0] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#5b112b] hover:bg-[#faf4ef]"
                        >
                          <Truck className="h-3 w-3" />
                          {ord.status === 'cancelled' ? 'View' : 'Dispatch / Track'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Shipment Detail & History Modal */}
      {selectedOrder && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setSelectedOrderId(null);
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b0c0e]/55 p-3 backdrop-blur-sm sm:p-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="my-auto w-full max-w-2xl rounded-2xl border border-white/60 bg-[#fffdfa] p-5 shadow-2xl sm:p-7 space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#eee4dc] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#a88243]">
                  Consignment management
                </p>
                <h3 className="mt-1 font-serif text-2xl text-[#341016]">Order #{selectedOrder.id}</h3>
                <p className="mt-1 text-xs text-[#806f65]">
                  {selectedOrder.shippingAddress.fullName} · {selectedOrder.shippingAddress.street},{' '}
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                  {selectedOrder.shippingAddress.pincode}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close shipping dialog"
                onClick={() => !saving && setSelectedOrderId(null)}
                className="rounded-full p-2 text-[#806f65] hover:bg-[#f5eee8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedOrder.status === 'cancelled' && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This order was cancelled; shipment modifications are locked.
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Courier Partner
                  <input
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.courierName || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, courierName: e.target.value }))}
                    placeholder="BlueDart, Delhivery, DTDC…"
                    list="vyora-courier-presets"
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                  <datalist id="vyora-courier-presets">
                    {COURIER_PRESETS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Tracking / AWB Number
                  <input
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.trackingNumber || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="e.g. BD-884120934IN"
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Shipment Status
                  <select
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.shipmentStatus || 'pending'}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        shipmentStatus: e.target.value as ShipmentStatus
                      }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  >
                    {selectableStatuses.map((st) => (
                      <option key={st} value={st}>
                        {humanize(st)}{st === currentStatus ? ' (Current)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Dispatch Date
                  <input
                    type="date"
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.dispatchDate || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, dispatchDate: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Estimated Delivery Date
                  <input
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.estimatedDeliveryDate || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, estimatedDeliveryDate: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                </label>

                <label className="text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Actual Delivery Date
                  <input
                    type="date"
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.actualDeliveryDate || ''}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, actualDeliveryDate: e.target.value }))
                    }
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 font-mono text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                </label>

                <label className="sm:col-span-2 text-[10px] font-semibold uppercase tracking-[.11em] text-[#79675e]">
                  Carrier / Dispatch Notes
                  <input
                    disabled={selectedOrder.status === 'cancelled'}
                    value={draft.notes || ''}
                    onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Hub scan, doorstep delivery note, or failed attempt reason…"
                    className="mt-1.5 w-full rounded-lg border border-[#e7dbd0] bg-[#fdfbf9] px-3 py-2 text-xs text-[#30231f] outline-none focus:border-[#8c3448] disabled:opacity-65"
                  />
                </label>
              </div>

              {selectedOrder.status !== 'cancelled' && (
                <div className="flex justify-end gap-2 border-t border-[#eee4dc] pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setSelectedOrderId(null)}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-[#796b63] hover:bg-[#f7f1ec]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#5b112b] px-5 py-2 text-xs font-semibold text-white hover:bg-[#42101f] disabled:opacity-60"
                  >
                    {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {saving ? 'Saving…' : 'Save Shipment Update'}
                  </button>
                </div>
              )}
            </form>

            {/* Shipment History */}
            <div className="border-t border-[#eee4dc] pt-3">
              <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a8579]">
                <Clock className="h-3.5 w-3.5 text-[#a88243]" /> Shipment History
              </p>
              {(selectedOrder.shipment?.shipmentHistory || []).length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#eee4dc] bg-[#fdfbf9] px-3.5 py-3 text-xs text-[#8d7c72]">
                  <Package className="h-4 w-4 text-[#a88243]" />
                  No courier dispatch events recorded yet.
                </div>
              ) : (
                <div className="max-h-44 space-y-2.5 overflow-y-auto pr-1">
                  {(selectedOrder.shipment?.shipmentHistory || [])
                    .slice()
                    .reverse()
                    .map((ev) => (
                      <div key={ev.id} className="flex gap-2.5 text-xs">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#7a1438]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-[#3d302b]">
                              {humanize(ev.shipmentStatus)}
                              {ev.courierName ? ` · ${ev.courierName}` : ''}
                              {ev.trackingNumber ? ` (${ev.trackingNumber})` : ''}
                            </span>
                            <span className="text-[10px] text-[#928178]">{dateTimeLabel(ev.createdAt)}</span>
                          </div>
                          {ev.notes && <p className="mt-0.5 text-[11px] text-[#726159]">{ev.notes}</p>}
                          {ev.updatedBy && <p className="text-[10px] text-[#9a877d]">By {ev.updatedBy}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
