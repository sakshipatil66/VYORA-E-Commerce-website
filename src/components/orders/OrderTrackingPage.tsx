import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  Home,
  RefreshCw,
  RotateCcw,
  MessageSquare,
  ChevronRight,
  XCircle,
  type LucideIcon
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import {
  ReturnRequestModal,
  ReturnStatusTimelineCard,
  getOrderReturnEligibility
} from './ReturnRequestModal';

export const OrderTrackingPage: React.FC = () => {
  const {
    currentOrder,
    orders,
    returns,
    products,
    refreshOrder,
    refreshReturns,
    createReturnRequest,
    setActivePage,
    addToast
  } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);

  const order = currentOrder || orders[0];

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">No orders found</h2>
        <button
          onClick={() => setActivePage('shop')}
          className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-md"
        >
          Explore Collections
        </button>
      </div>
    );
  }

  const orderReturns = returns.filter((r) => r.orderId === order.id);
  const eligibility = getOrderReturnEligibility(order, returns);

  const statusProgress: Record<OrderStatus, number> = {
    placed: 0,
    confirmed: 2,
    processing: 2,
    packed: 3,
    shipped: 4,
    out_for_delivery: 5,
    delivered: 6,
    cancelled: -1
  };
  const isCancelled = order.status === 'cancelled';
  const statusProgressIndex = statusProgress[order.status];
  const activeIdx = isCancelled ? -1 : Math.max(statusProgressIndex, order.paymentStatus === 'Paid' ? 1 : 0);
  const courierName = order.shipment?.courierName || order.courierName;
  const trackingNumber = order.shipment?.trackingNumber || order.trackingNumber;
  const dispatchDate = order.shipment?.dispatchDate;
  const actualDeliveryDate = order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate;
  const shipmentHistory = order.shipment?.shipmentHistory || [];
  const steps: { label: string; desc: string; icon: LucideIcon; isComplete: boolean }[] = [
    { label: 'Order Placed', desc: `Placed ${order.date}`, icon: Clock, isComplete: true },
    {
      label: 'Payment Confirmed',
      desc: order.paymentStatus === 'Paid' ? 'Payment verified by Razorpay' : 'Payment is not yet confirmed',
      icon: CheckCircle2,
      isComplete: order.paymentStatus === 'Paid'
    },
    { label: 'Processing', desc: 'Order is being prepared', icon: Package, isComplete: statusProgressIndex >= 2 },
    { label: 'Packed', desc: 'Order packed for dispatch', icon: Package, isComplete: statusProgressIndex >= 3 },
    { label: 'Shipped', desc: 'Dispatched by the store', icon: Truck, isComplete: statusProgressIndex >= 4 },
    { label: 'Out for Delivery', desc: 'Order is out for delivery', icon: MapPin, isComplete: statusProgressIndex >= 5 },
    { label: 'Delivered', desc: actualDeliveryDate ? `Delivered ${actualDeliveryDate}` : 'Delivery completed', icon: Home, isComplete: statusProgressIndex >= 6 }
  ];
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshOrder(order.id), refreshReturns()]);
      addToast('Order and return progress refreshed.');
    } catch (error) {
      addToast(`Could not refresh order progress: ${(error as Error).message}`, 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6 font-medium">
        <button onClick={() => setActivePage('home')} className="hover:text-neutral-900">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <button onClick={() => setActivePage('my_orders')} className="hover:text-neutral-900">
          My Orders
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 font-semibold font-mono">Consignment #{order.id}</span>
      </nav>

      {/* Main Tracking Card */}
      <div className="bg-white rounded-2xl border border-[#EBE4DD] p-6 sm:p-8 shadow-xs space-y-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE4DD]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-serif text-xl font-bold text-neutral-900 sm:text-2xl">
                Tracking Order #{order.id}
              </span>
              <span
                className={`text-xs uppercase font-bold px-2 py-0.5 rounded border ${
                  isCancelled
                    ? 'text-rose-800 bg-rose-50 border-rose-200'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}
              >
                {order.status.replace(/_/g, ' ')}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1 rounded-md border border-[#EBE4DD] px-2 py-1 text-[11px] font-semibold text-[#5B112B] disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Placed on {order.date} · Order ID: <strong className="font-mono">{order.id}</strong>
            </p>
          </div>

          {eligibility.eligible && (
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#5B112B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#430C1F] shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Request Return
            </button>
          )}
        </div>

        {/* Multi-Step Timeline or Cancelled Notice */}
        {isCancelled ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <XCircle className="w-5 h-5 shrink-0" />
              <span>This order has been cancelled</span>
            </div>
            {order.cancellationReason && (
              <p className="text-xs text-rose-900/80">
                Reason: {order.cancellationReason}
              </p>
            )}
            {order.cancelledAt && (
              <p className="text-[11px] text-rose-700">
                Cancelled on{' '}
                {new Date(order.cancelledAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="relative pt-4 pb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = step.isComplete;
                const isCurrent = idx === activeIdx;

                return (
                  <div key={step.label} className="flex flex-col items-center text-center relative group">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? 'bg-[#7A1438] text-white ring-4 ring-rose-100 scale-110 shadow-md'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F3ECE7] text-neutral-400 border border-[#EBE4DD]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <h5 className={`text-xs font-bold mt-2.5 ${isCompleted || isCurrent ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      {step.label}
                    </h5>
                    <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight max-w-[120px]">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {(courierName || trackingNumber || dispatchDate || actualDeliveryDate) ? (
              <div className="mt-8 rounded-lg border border-[#EBE4DD] bg-[#FAF7F5] p-3.5 text-xs text-neutral-700 flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                {courierName && (
                  <span>Courier: <strong className="text-[#4A0E17]">{courierName}</strong></span>
                )}
                {trackingNumber && (
                  <span>AWB / Tracking ID: <strong className="font-mono text-[#4A0E17]">{trackingNumber}</strong></span>
                )}
                {dispatchDate && (
                  <span>Dispatched: <strong className="font-mono">{dispatchDate}</strong></span>
                )}
                {actualDeliveryDate && (
                  <span>Delivered: <strong className="font-mono text-emerald-800">{actualDeliveryDate}</strong></span>
                )}
              </div>
            ) : (
              <p className="mt-8 rounded-lg border border-[#EBE4DD] bg-[#FAF7F5] p-3 text-center text-xs text-neutral-600">
                This timeline reflects the latest order status recorded by VYORA. Courier tracking details will appear here once dispatched.
              </p>
            )}
          </div>
        )}

        {/* Courier Shipment History */}
        {shipmentHistory.length > 0 && (
          <div className="border-t border-[#EBE4DD] pt-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1438]">
              Shipment Tracking History
            </h3>
            <div className="space-y-2 rounded-xl border border-[#EBE4DD] bg-[#FAF7F5]/60 p-4">
              {shipmentHistory
                .slice()
                .reverse()
                .map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-neutral-900">
                        {ev.shipmentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      {ev.courierName && <span className="text-neutral-600"> · {ev.courierName}</span>}
                      {ev.trackingNumber && <span className="font-mono text-neutral-600"> ({ev.trackingNumber})</span>}
                      {ev.notes && <p className="text-[11px] text-neutral-500 mt-0.5">{ev.notes}</p>}
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500 shrink-0">
                      {new Date(ev.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Returns & Refunds Status Section */}
        {(order.status === 'delivered' || orderReturns.length > 0) && (
          <div className="border-t border-[#EBE4DD] pt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#7A1438]">
                  Returns &amp; Refunds
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">{eligibility.reason}</p>
              </div>
              {eligibility.eligible && (
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#EBE4DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#5B112B] hover:bg-[#FAF7F5]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Initiate Return
                </button>
              )}
            </div>
            {orderReturns.length > 0 ? (
              <div className="space-y-2.5">
                {orderReturns.map((rr) => (
                  <ReturnStatusTimelineCard key={rr.id} returnRequest={rr} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-[#EBE4DD] bg-[#FAF7F5] px-4 py-3 text-xs text-neutral-600">
                No return requests submitted for this order.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#EBE4DD] pt-5 text-xs">
          <span className="text-neutral-500">Items subtotal</span>
          <span className="text-right font-mono">₹{order.subtotal.toLocaleString('en-IN')}</span>
          <span className="text-neutral-500">Discounts</span>
          <span className="text-right font-mono text-emerald-700">−₹{(order.discount + order.couponDiscount).toLocaleString('en-IN')}</span>
          {order.giftWrap && <>
            <span className="text-neutral-500">Gift wrap</span>
            <span className="text-right font-mono">₹99</span>
          </>}
          <span className="text-neutral-500">Delivery</span>
          <span className="text-right font-mono">{order.deliveryFee ? `₹${order.deliveryFee.toLocaleString('en-IN')}` : 'Free'}</span>
          <span className="font-bold text-neutral-900">Order total</span>
          <span className="text-right font-mono font-bold text-[#4A0E17]">₹{order.total.toLocaleString('en-IN')}</span>
          <span className="text-neutral-500">Payment</span>
          <span className="text-right font-semibold">{order.paymentMethod} · {order.paymentStatus}</span>
        </div>

        {/* Items & Shipping Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#EBE4DD]">
          {/* Destination */}
          <div className="p-4 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A1438]">
              <MapPin className="w-4 h-4" />
              <span>Consignment Destination</span>
            </div>
            <p className="font-bold text-neutral-900 text-sm">{order.shippingAddress.fullName}</p>
            <p className="text-neutral-700 leading-relaxed">
              {order.shippingAddress.street &&
              order.shippingAddress.street !==
                `${order.shippingAddress.city}, ${order.shippingAddress.state}, India`
                ? `${order.shippingAddress.street}, `
                : ''}
              {order.shippingAddress.city}, {order.shippingAddress.state}, India
              {order.shippingAddress.pincode ? ` · ${order.shippingAddress.pincode}` : ''}
            </p>
            {order.shippingAddress.phone && (
              <p className="text-neutral-500 font-mono">Contact: {order.shippingAddress.phone}</p>
            )}
            {!isCancelled && (
              <div className="pt-2 text-emerald-800 font-medium">
                {actualDeliveryDate ? (
                  <>Delivered On: <strong>{actualDeliveryDate}</strong></>
                ) : (
                  <>Estimated Delivery: <strong>{order.estimatedDeliveryDate}</strong></>
                )}
              </div>
            )}
          </div>

          {/* Package items */}
          <div className="p-4 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] space-y-3 text-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A1438]">
              <Package className="w-4 h-4" />
              <span>Package Summary ({order.items.length})</span>
            </div>
            <div className="space-y-2">
              {order.items.map((it, i) => {
                const matchedProd = products.find((p) => p.id === it.productId);
                const imgSrc = matchedProd
                  ? getVariantProductImage(matchedProd, it.color)
                  : it.image;
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ProductImage
                        src={imgSrc}
                        alt={it.name}
                        category={matchedProd?.category}
                        compact
                        className="w-10 h-10 object-cover rounded bg-white shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-neutral-900 truncate max-w-[180px]">{it.name}</p>
                        <p className="text-[11px] text-neutral-500">
                          Qty: {it.quantity}
                          {it.size ? ` · Size: ${it.size}` : ''}
                          {it.color ? ` · ${it.color}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-[#4A0E17]">
                      ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Concierge Support */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Need assistance with delivery reschedule or doorstep inspection?</span>
          </div>
          <button
            onClick={() => setActivePage('contact')}
            className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md transition-colors"
          >
            Contact VYORA Support
          </button>
        </div>
      </div>

      {returnModalOpen && (
        <ReturnRequestModal
          order={order}
          existingReturns={returns}
          onSubmit={createReturnRequest}
          onClose={() => setReturnModalOpen(false)}
        />
      )}
    </div>
  );
};
