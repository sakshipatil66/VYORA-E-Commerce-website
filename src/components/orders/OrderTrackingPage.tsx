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
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold text-neutral-900">
                Tracking Order #{order.id}
              </span>
              <span className="text-xs uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Placed on {order.date} · Courier: <strong>{order.courierName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#FAF7F5] p-2.5 rounded-lg border border-[#EBE4DD] font-mono text-xs">
            <span className="text-neutral-500">AWB:</span>
            <span className="font-bold text-neutral-900">{order.trackingNumber}</span>
            <button
              onClick={handleCopyAWB}
              title="Copy AWB Number"
              className="p-1 text-neutral-500 hover:text-black"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Multi-Step Timeline */}
        <div className="relative pt-4 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                  <h5 className={`text-xs font-bold mt-2.5 ${isCompleted ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {step.label}
                  </h5>
                  <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight max-w-[120px]">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Interactive Simulation Bar for Testing */}
          <div className="mt-8 p-3 bg-amber-50/80 rounded-lg border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>
                <strong>Live Simulation:</strong> Advance delivery checkpoint to test tracking flow
              </span>
            </div>
            <button
              onClick={advanceNextStatus}
              className="py-1.5 px-3.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-md transition-colors shrink-0"
            >
              Advance to Next Status ➔
            </button>
          </div>
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
            <div className="pt-2 text-emerald-800 font-medium">
              Estimated Delivery: <strong>{order.estimatedDeliveryDate}</strong>
            </div>
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
                        <p className="text-[11px] text-neutral-500">Qty: {it.quantity}</p>
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

        {/* WhatsApp Concierge Support */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Need assistance with delivery reschedule or doorstep inspection?</span>
          </div>
          <button
            onClick={() => addToast('Connecting you to Vyora 24/7 WhatsApp Concierge...')}
            className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md transition-colors"
          >
            WhatsApp Concierge
          </button>
        </div>
      </div>
    </div>
  );
};
