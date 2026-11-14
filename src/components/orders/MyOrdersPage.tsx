import React, { useState } from 'react';
import { Package, RefreshCw, RotateCcw, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import {
  ReturnRequestModal,
  ReturnStatusTimelineCard,
  getOrderReturnEligibility
} from './ReturnRequestModal';

export const MyOrdersPage: React.FC = () => {
  const {
    orders,
    returns,
    products,
    refreshOrders,
    refreshReturns,
    createReturnRequest,
    trackOrder,
    setActivePage,
    addToast,
    addToCart,
    setIsCartDrawerOpen
  } = useStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [returnTargetOrder, setReturnTargetOrder] = useState<Order | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshOrders(), refreshReturns()]);
      addToast('Your order and return history is up to date.');
    } catch (error) {
      addToast(`Could not refresh orders: ${(error as Error).message}`, 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'delivered' && o.status !== 'cancelled';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  const handleReorder = (order: typeof orders[0]) => {
    let added = 0;
    for (const item of order.items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product || !product.inStock || product.isActive === false) continue;
      addToCart(product, item.quantity, item.size, item.color);
      added += 1;
    }
    if (added === 0) {
      addToast('These products are no longer available to reorder.', 'warning');
      return;
    }
    setActivePage('shop');
    setIsCartDrawerOpen(true);
    if (added < order.items.length) addToast('Some order items are no longer available.', 'warning');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8 border-b border-[#EBE4DD] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
            Patron Records
          </p>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 mt-1">
            My Orders &amp; Consignments
          </h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#EBE4DD] bg-white px-3 py-2 text-xs font-semibold text-[#5B112B] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-1.5 bg-[#FAF7F5] p-1 rounded-lg border border-[#EBE4DD]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
              }`}
            >
              All Orders ({orders.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'active' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Active ({orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length})
            </button>
            <button
              onClick={() => setFilter('delivered')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === 'delivered' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
              }`}
            >
              Delivered ({orders.filter((o) => o.status === 'delivered').length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-[#EBE4DD] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-bold text-neutral-900">No orders found</h3>
          <p className="text-xs text-neutral-500">You haven&apos;t placed any orders in this category yet.</p>
          <button
            onClick={() => setActivePage('shop')}
            className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-md hover:bg-[#430C1F]"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((ord) => {
            const orderReturns = returns.filter((r) => r.orderId === ord.id);
            const eligibility = getOrderReturnEligibility(ord, returns);
            const courier = ord.shipment?.courierName || ord.courierName;
            const tracking = ord.shipment?.trackingNumber || ord.trackingNumber;
            const actualDel = ord.shipment?.actualDeliveryDate || ord.shipment?.deliveredDate;

            return (
              <div
                key={ord.id}
                className="bg-white rounded-xl border border-[#EBE4DD] overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
              >
                {/* Card Header Strip */}
                <div className="bg-[#FAF7F5] px-5 py-3.5 border-b border-[#EBE4DD] flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums">
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-sans uppercase tracking-wider block">Order ID</span>
                      <span className="font-bold text-[#4A0E17]">{ord.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-sans uppercase tracking-wider block">Placed On</span>
                      <span className="text-neutral-700">{ord.date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-sans uppercase tracking-wider block">Total Amount</span>
                      <span className="font-bold text-neutral-900">₹{ord.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs uppercase font-bold px-2 py-0.5 rounded border ${
                        ord.status === 'cancelled'
                          ? 'text-rose-800 bg-rose-50 border-rose-200'
                          : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {ord.status.replace(/_/g, ' ')}
                    </span>
                    {eligibility.eligible && (
                      <button
                        type="button"
                        onClick={() => setReturnTargetOrder(ord)}
                        className="py-1 px-3 text-xs font-semibold text-[#7A1438] hover:text-white bg-white hover:bg-[#7A1438] border border-[#EBE4DD] rounded-md transition-colors flex items-center gap-1.5 font-sans"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Return</span>
                      </button>
                    )}
                    <button
                      onClick={() => { void trackOrder(ord.id); }}
                      className="py-1 px-3 text-xs font-semibold text-[#5B112B] hover:text-white bg-white hover:bg-[#5B112B] border border-[#EBE4DD] rounded-md transition-colors flex items-center gap-1.5 font-sans"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Details &amp; Track</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-5 divide-y divide-[#F3ECE7] space-y-4">
                  {ord.items.map((it, idx) => {
                    const matchedProd = products.find((p) => p.id === it.productId);
                    const imgSrc = matchedProd
                      ? getVariantProductImage(matchedProd, it.color)
                      : it.image;
                    return (
                      <div key={idx} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <ProductImage
                            src={imgSrc}
                            alt={it.name}
                            category={matchedProd?.category}
                            compact
                            className="w-16 h-20 object-cover rounded-md bg-[#FAF7F5] shrink-0"
                          />
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-900">{it.name}</h4>
                            {/* Zero-Pill discipline: unboxed metadata */}
                            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
                              <span>Qty: {it.quantity}</span>
                              {it.size && (
                                <>
                                  <span>·</span>
                                  <span>Size: {it.size}</span>
                                </>
                              )}
                              {it.color && (
                                <>
                                  <span>·</span>
                                  <span>Color: {it.color}</span>
                                </>
                              )}
                            </div>
                            {ord.status === 'cancelled' ? (
                              <p className="text-xs text-rose-700 font-medium mt-1">
                                Order cancelled{ord.cancellationReason ? ` · ${ord.cancellationReason}` : ''}
                              </p>
                            ) : ord.status === 'delivered' ? (
                              <p className="text-xs text-emerald-800 font-medium mt-1">
                                Delivered{actualDel ? ` on ${actualDel}` : ''} · {eligibility.reason}
                              </p>
                            ) : (
                              <p className="text-xs text-emerald-800 font-medium mt-1">
                                Estimated Delivery by {ord.estimatedDeliveryDate}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                          <span className="font-mono tabular-nums font-bold text-sm text-[#4A0E17]">
                            ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submitted Returns for this Order */}
                {orderReturns.length > 0 && (
                  <div className="px-5 pb-4 space-y-2.5">
                    {orderReturns.map((rr) => (
                      <ReturnStatusTimelineCard key={rr.id} returnRequest={rr} />
                    ))}
                  </div>
                )}

                {/* Footer Strip */}
                <div className="bg-[#FAF7F5]/50 px-5 py-3 border-t border-[#F3ECE7] flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>
                    {ord.paymentMethod} · {ord.paymentStatus} · {ord.items.length} item{ord.items.length === 1 ? '' : 's'}
                    {courier ? ` · ${courier}` : ''}
                    {tracking ? ` (AWB: ${tracking})` : ''}
                  </span>
                  <button
                    onClick={() => handleReorder(ord)}
                    className="font-semibold text-[#7A1438] hover:text-[#5B112B] underline"
                  >
                    Buy Again
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {returnTargetOrder && (
        <ReturnRequestModal
          order={returnTargetOrder}
          existingReturns={returns}
          onSubmit={createReturnRequest}
          onClose={() => setReturnTargetOrder(null)}
        />
      )}
    </div>
  );
};
