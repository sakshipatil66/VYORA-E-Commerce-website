import React from 'react';
import { CheckCircle2, Truck, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';

export const OrderConfirmationPage: React.FC = () => {
  const { currentOrder, products, trackOrder, setActivePage, addToast } = useStore();

  if (!currentOrder) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">No active order</h2>
        <button
          onClick={() => setActivePage('shop')}
          className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-md"
        >
          Explore Collections
        </button>
      </div>
    );
  }

  const handleDownloadInvoice = () => {
    addToast(`Invoice for ${currentOrder.id} downloaded successfully!`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-2xl border border-[#EBE4DD] p-6 sm:p-10 shadow-lg text-center space-y-6">
        
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-[#7A1438] font-bold">
            Order Confirmed & Allocated
          </p>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">
            Dhanyavaad, Patron!
          </h1>
          <p className="text-xs text-neutral-600 max-w-md mx-auto">
            Your creation is being handpicked and prepared by our master guild artisans.
          </p>
        </div>

        {/* Order Identifier Strip */}
        <div className="bg-[#FAF7F5] p-4 rounded-xl border border-[#EBE4DD] flex flex-wrap items-center justify-around gap-4 text-xs font-mono tabular-nums">
          <div>
            <span className="text-neutral-500 block text-[10px] font-sans">Order Identifier</span>
            <span className="font-bold text-[#4A0E17] text-sm">{currentOrder.id}</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px] font-sans">Payment Mode</span>
            <span className="font-semibold text-neutral-800">{currentOrder.paymentMethod} ({currentOrder.paymentStatus})</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px] font-sans">Est. Delivery</span>
            <span className="font-semibold text-emerald-800">{currentOrder.estimatedDeliveryDate}</span>
          </div>
          <div>
            <span className="text-neutral-500 block text-[10px] font-sans">Total Paid</span>
            <span className="font-bold text-[#4A0E17] text-sm">₹{currentOrder.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Item preview */}
        <div className="border-t border-b border-[#F3ECE7] py-4 text-left space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Package Contents ({currentOrder.items.length})
          </h4>
          <div className="space-y-2">
            {currentOrder.items.map((item, idx) => {
              const matchedProd = products.find((p) => p.id === item.productId);
              const imgSrc = matchedProd
                ? getVariantProductImage(matchedProd, item.color)
                : item.image;
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <ProductImage
                      src={imgSrc}
                      alt={item.name}
                      category={matchedProd?.category}
                      compact
                      className="w-12 h-14 object-cover rounded bg-[#FAF7F5] shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-neutral-900">{item.name}</p>
                      <p className="text-[11px] text-neutral-500">
                        Qty: {item.quantity} {item.size && `· Size: ${item.size}`} {item.color && `· ${item.color}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-bold text-[#4A0E17]">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address Details */}
        <div className="text-left text-xs bg-[#FAF7F5] p-4 rounded-xl border border-[#EBE4DD] space-y-1">
          <p className="font-bold text-neutral-900">Delivering to:</p>
          <p className="text-neutral-700">
            {currentOrder.shippingAddress.fullName}
            {currentOrder.shippingAddress.phone ? ` · ${currentOrder.shippingAddress.phone}` : ''}
          </p>
          <p className="text-neutral-600">
            {currentOrder.shippingAddress.street &&
            currentOrder.shippingAddress.street !==
              `${currentOrder.shippingAddress.city}, ${currentOrder.shippingAddress.state}, India`
              ? `${currentOrder.shippingAddress.street}, `
              : ''}
            {currentOrder.shippingAddress.city}, {currentOrder.shippingAddress.state}, India
            {currentOrder.shippingAddress.pincode
              ? ` · ${currentOrder.shippingAddress.pincode}`
              : ''}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => trackOrder(currentOrder.id)}
            className="w-full sm:w-auto py-3 px-6 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Truck className="w-4 h-4" />
            <span>Track Consignment Live</span>
          </button>
          <button
            onClick={handleDownloadInvoice}
            className="w-full sm:w-auto py-3 px-6 text-xs font-semibold text-neutral-800 bg-white hover:bg-[#F3ECE7] border border-[#EBE4DD] rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Tax Invoice</span>
          </button>
          <button
            onClick={() => setActivePage('shop')}
            className="w-full sm:w-auto py-3 px-6 text-xs font-semibold text-[#5B112B] hover:underline"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
