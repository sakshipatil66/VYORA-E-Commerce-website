import React from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  Home,
  Copy,
  MessageSquare,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus } from '../../types';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';

export const OrderTrackingPage: React.FC = () => {
  const { currentOrder, orders, products, updateOrderStatus, setActivePage, addToast } = useStore();

  const order = currentOrder || orders[0];

  if (!order) {
    return (
      <div className="vyora-container vyora-page max-w-2xl text-center space-y-4">
        <h2 className="typo-h2 text-neutral-900">No orders found</h2>
        <button
          onClick={() => setActivePage('shop')}
          className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
        >
          Explore Collections
        </button>
      </div>
    );
  }

  const steps: { key: OrderStatus; label: string; desc: string; icon: any }[] = [
    { key: 'placed', label: 'Order Placed', desc: 'Received & payment verified', icon: Clock },
    { key: 'confirmed', label: 'Artisan Confirmed', desc: 'Allocated from master guild', icon: CheckCircle2 },
    { key: 'packed', label: 'Quality Checked', desc: 'Inspected with Silk/BIS hallmark', icon: Package },
    { key: 'shipped', label: 'In Air Transit', desc: 'Blue Dart AWB Air Express', icon: Truck },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider en route to your address', icon: MapPin },
    { key: 'delivered', label: 'Delivered', desc: 'Handed over safely to patron', icon: Home }
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);
  const activeIdx = currentStepIndex === -1 ? 1 : currentStepIndex;

  const handleCopyAWB = () => {
    navigator.clipboard.writeText(order.trackingNumber);
    addToast('AWB Tracking code copied!');
  };

  const advanceNextStatus = () => {
    const nextStatuses: OrderStatus[] = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    const curIdx = nextStatuses.indexOf(order.status);
    if (curIdx < nextStatuses.length - 1) {
      const next = nextStatuses[curIdx + 1];
      updateOrderStatus(order.id, next);
    } else {
      addToast('Order has already reached final Delivered state!', 'info');
    }
  };

  return (
    <div className="vyora-container vyora-page max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 typo-meta text-neutral-500 mb-6 font-medium">
        <button onClick={() => setActivePage('home')} className="hover:text-neutral-900 cursor-pointer">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <button onClick={() => setActivePage('my_orders')} className="hover:text-neutral-900 cursor-pointer">
          My Orders
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-neutral-900 font-semibold typo-tabular">Consignment #{order.id}</span>
      </nav>

      {/* Main Tracking Card */}
      <div className="bg-white rounded-2xl border border-[#EBE4DD] p-5 sm:p-8 shadow-xs space-y-8">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBE4DD]">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="typo-h2 text-neutral-900">
                Tracking Order #{order.id}
              </h1>
              <span className="typo-badge text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <p className="typo-body-sm text-neutral-500 mt-1">
              Placed on {order.date} · Courier: <strong>{order.courierName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#FAF7F5] px-3 py-2 rounded-lg border border-[#EBE4DD] typo-body-sm typo-tabular self-start sm:self-auto">
            <span className="text-neutral-500">AWB:</span>
            <span className="font-bold text-neutral-900">{order.trackingNumber}</span>
            <button
              onClick={handleCopyAWB}
              title="Copy AWB Number"
              className="p-1.5 text-neutral-500 hover:text-black cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Step Timeline */}
        <div className="relative pt-2 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 sm:gap-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCompleted = idx <= activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div key={step.key} className="flex flex-col items-center text-center relative group">
                  {/* Circle Icon */}
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

                  {/* Text */}
                  <h5 className={`typo-btn-sm mt-2.5 ${isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {step.label}
                  </h5>
                  <p className="typo-meta text-neutral-500 mt-0.5 max-w-[130px]">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Interactive Simulation Bar for Testing */}
          <div className="mt-8 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 typo-body-sm">
            <div className="flex items-start sm:items-center gap-2 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Live Simulation:</strong> Advance delivery checkpoint to test tracking flow
              </span>
            </div>
            <button
              onClick={advanceNextStatus}
              className="min-h-10 py-2 px-4 bg-amber-800 hover:bg-amber-900 text-white typo-btn-sm rounded-lg transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
            >
              Advance to Next Status ➔
            </button>
          </div>
        </div>

        {/* Items & Shipping Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[#EBE4DD]">
          {/* Destination */}
          <div className="p-4 sm:p-5 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] space-y-2 typo-body-sm">
            <div className="flex items-center gap-2 typo-label text-[#7A1438]">
              <MapPin className="w-4 h-4" />
              <span>Consignment Destination</span>
            </div>
            <p className="typo-card-title font-bold text-neutral-900">{order.shippingAddress.fullName}</p>
            <p className="text-neutral-700 typo-tabular">
              {order.shippingAddress.street &&
              order.shippingAddress.street !==
                `${order.shippingAddress.city}, ${order.shippingAddress.state}, India`
                ? `${order.shippingAddress.street}, `
                : ''}
              {order.shippingAddress.city}, {order.shippingAddress.state}, India
              {order.shippingAddress.pincode ? ` · ${order.shippingAddress.pincode}` : ''}
            </p>
            {order.shippingAddress.phone && (
              <p className="typo-meta text-neutral-500 typo-tabular">Contact: {order.shippingAddress.phone}</p>
            )}
            <div className="pt-2 text-emerald-800 font-medium">
              Estimated Delivery: <strong>{order.estimatedDeliveryDate}</strong>
            </div>
          </div>

          {/* Package items */}
          <div className="p-4 sm:p-5 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] space-y-3 typo-body-sm">
            <div className="flex items-center gap-2 typo-label text-[#7A1438]">
              <Package className="w-4 h-4" />
              <span>Package Summary ({order.items.length})</span>
            </div>
            <div className="space-y-2.5">
              {order.items.map((it, i) => {
                const matchedProd = products.find((p) => p.id === it.productId);
                const imgSrc = matchedProd
                  ? getVariantProductImage(matchedProd, it.color)
                  : it.image;
                return (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ProductImage
                        src={imgSrc}
                        alt={it.name}
                        category={matchedProd?.category}
                        compact
                        className="w-11 h-13 object-cover rounded-lg bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="typo-card-title text-neutral-900 truncate">{it.name}</p>
                        <p className="typo-meta text-neutral-500">Qty: {it.quantity}</p>
                      </div>
                    </div>
                    <span className="typo-price text-[#4A0E17] shrink-0">
                      ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* WhatsApp Concierge Support */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 typo-body-sm text-neutral-600">
          <div className="flex items-start sm:items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>Need assistance with delivery reschedule or doorstep inspection?</span>
          </div>
          <button
            onClick={() => addToast('Connecting you to Vyora 24/7 WhatsApp Concierge...')}
            className="min-h-10 py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white typo-btn-sm rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
          >
            WhatsApp Concierge
          </button>
        </div>
      </div>
    </div>
  );
};
