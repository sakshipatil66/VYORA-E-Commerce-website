import React, { useState } from 'react';
import { Package, Truck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';

export const MyOrdersPage: React.FC = () => {
  const { currentUser, orders, products, trackOrder, addToCart, setIsCartDrawerOpen, setActivePage, addToast } = useStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'delivered';
    if (filter === 'delivered') return o.status === 'delivered';
    return true;
  });

  const handleReorder = (order: typeof orders[0]) => {
    let added = 0;
    order.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        addToCart(prod, it.quantity, it.size, it.color);
        added += 1;
      }
    });
    if (added > 0) {
      setIsCartDrawerOpen(true);
    } else {
      addToast('Selected items are currently unavailable.', 'warning');
    }
  };

  return (
    <div className="vyora-container vyora-page max-w-5xl">
      {/* Header */}
      <div className="mb-8 border-b border-[#EBE4DD] pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="typo-eyebrow text-[#7A1438]">
            {currentUser ? `${currentUser.name} · Personal Order Vault` : 'Patron Records'}
          </p>
          <h1 className="typo-h1 text-neutral-900 mt-1">
            My Orders & Consignments
          </h1>
        </div>

        {/* Filter Tabs (Interactive Filter Controls) */}
        <div className="flex items-center gap-1.5 bg-[#FAF7F5] p-1 rounded-xl border border-[#EBE4DD] self-start overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setFilter('all')}
            className={`min-h-9 px-3.5 py-1.5 typo-btn-sm whitespace-nowrap rounded-lg transition-colors cursor-pointer ${
              filter === 'all' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`min-h-9 px-3.5 py-1.5 typo-btn-sm whitespace-nowrap rounded-lg transition-colors cursor-pointer ${
              filter === 'active' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Active ({orders.filter((o) => o.status !== 'delivered').length})
          </button>
          <button
            onClick={() => setFilter('delivered')}
            className={`min-h-9 px-3.5 py-1.5 typo-btn-sm whitespace-nowrap rounded-lg transition-colors cursor-pointer ${
              filter === 'delivered' ? 'bg-[#5B112B] text-white shadow-xs' : 'text-neutral-600 hover:text-black'
            }`}
          >
            Delivered ({orders.filter((o) => o.status === 'delivered').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white p-10 sm:p-12 rounded-2xl border border-[#EBE4DD] text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#FAF2EB] text-[#7A1438] flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="typo-h3 text-neutral-900">No orders found</h3>
          <p className="typo-body-sm text-neutral-500">You haven't placed any orders in this category yet.</p>
          <button
            onClick={() => setActivePage('shop')}
            className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] rounded-lg hover:bg-[#430C1F] transition-colors cursor-pointer"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-2xl border border-[#EBE4DD] overflow-hidden shadow-2xs hover:shadow-xs transition-shadow"
            >
              {/* Card Header Strip */}
              <div className="bg-[#FAF7F5] px-5 py-3.5 border-b border-[#EBE4DD] flex flex-wrap items-center justify-between gap-3 typo-body-sm typo-tabular">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="typo-label text-neutral-400 block">Order ID</span>
                    <span className="font-bold text-[#4A0E17]">{ord.id}</span>
                  </div>
                  <div>
                    <span className="typo-label text-neutral-400 block">Placed On</span>
                    <span className="text-neutral-700">{ord.date}</span>
                  </div>
                  <div>
                    <span className="typo-label text-neutral-400 block">Total Amount</span>
                    <span className="font-bold text-neutral-900">₹{ord.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="typo-badge text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {ord.status.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => trackOrder(ord.id)}
                    className="min-h-9 py-1.5 px-3.5 typo-btn-sm text-[#5B112B] hover:text-white bg-white hover:bg-[#5B112B] border border-[#EBE4DD] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Live</span>
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
                    <div key={idx} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <ProductImage
                          src={imgSrc}
                          alt={it.name}
                          category={matchedProd?.category}
                          compact
                          className="w-16 h-20 object-cover rounded-lg bg-[#FAF7F5] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="typo-card-title text-neutral-900">{it.name}</h4>
                          {/* Zero-Pill discipline: unboxed metadata */}
                          <div className="flex flex-wrap items-center gap-2 typo-meta text-neutral-500 mt-1">
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
                          <p className="typo-meta text-emerald-800 font-medium mt-1">
                            Estimated Delivery by {ord.estimatedDeliveryDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0">
                        <span className="typo-price text-[#4A0E17]">
                          ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Strip */}
              <div className="bg-[#FAF7F5]/50 px-5 py-3 border-t border-[#F3ECE7] flex flex-wrap items-center justify-between gap-2 typo-meta text-neutral-500">
                <span>
                  Shipping via {ord.courierName} (AWB: <strong className="typo-tabular">{ord.trackingNumber}</strong>)
                </span>
                <button
                  onClick={() => handleReorder(ord)}
                  className="typo-btn-sm text-[#7A1438] hover:text-[#5B112B] underline cursor-pointer"
                >
                  Buy Again
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
