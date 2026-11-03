import React from 'react';
import { CheckCircle2, Truck, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';

export const OrderConfirmationPage: React.FC = () => {
  const { currentOrder, products, trackOrder, setActivePage, addToast } = useStore();

  if (!currentOrder) {
    return (
      <div className="vyora-container vyora-page max-w-2xl text-center space-y-4">
        <h2 className="typo-h2 text-neutral-900">No active order</h2>
        <button
          onClick={() => setActivePage('shop')}
          className="min-h-11 py-2.5 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors cursor-pointer"
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
    <div className="vyora-container vyora-page max-w-3xl">
      <div className="bg-white rounded-2xl border border-[#EBE4DD] p-6 sm:p-10 shadow-lg text-center space-y-6">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <p className="typo-eyebrow text-[#7A1438]">
            Order Confirmed & Allocated
          </p>
          <h1 className="typo-h1 text-neutral-900">
            Dhanyavaad, Patron!
          </h1>
          <p className="typo-body text-neutral-600 max-w-md mx-auto">
            Your creation is being handpicked and prepared by our master guild artisans.
          </p>
        </div>

        {/* Order Identifier Strip */}
        <div className="bg-[#FAF7F5] p-4 rounded-xl border border-[#EBE4DD] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left sm:text-center typo-body-sm typo-tabular">
          <div>
            <span className="typo-label text-neutral-500 block">Order Identifier</span>
            <span className="font-bold text-[#4A0E17] mt-0.5 block">{currentOrder.id}</span>
          </div>
          <div>
            <span className="typo-label text-neutral-500 block">Payment Mode</span>
            <span className="font-semibold text-neutral-800 mt-0.5 block">{currentOrder.paymentMethod} ({currentOrder.paymentStatus})</span>
          </div>
          <div>
            <span className="typo-label text-neutral-500 block">Est. Delivery</span>
            <span className="font-semibold text-emerald-800 mt-0.5 block">{currentOrder.estimatedDeliveryDate}</span>
          </div>
          <div>
            <span className="typo-label text-neutral-500 block">Total Paid</span>
            <span className="typo-price text-[#4A0E17] mt-0.5 block">₹{currentOrder.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Item preview */}
        <div className="border-t border-b border-[#F3ECE7] py-4 text-left space-y-3">
          <h4 className="typo-label text-neutral-700">
            Package Contents ({currentOrder.items.length})
          </h4>
          <div className="space-y-3">
            {currentOrder.items.map((item, idx) => {
              const matchedProd = products.find((p) => p.id === item.productId);
              const imgSrc = matchedProd
                ? getVariantProductImage(matchedProd, item.color)
                : item.image;
              return (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductImage
                      src={imgSrc}
                      alt={item.name}
                      category={matchedProd?.category}
                      compact
                      className="w-12 h-15 object-cover rounded-lg bg-[#FAF7F5] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="typo-card-title text-neutral-900 line-clamp-1">{item.name}</p>
                      <p className="typo-meta text-neutral-500 mt-0.5">
                        Qty: {item.quantity} {item.size && `· Size: ${item.size}`} {item.color && `· ${item.color}`}
                      </p>
                    </div>
                  </div>
                  <span className="typo-price text-[#4A0E17] shrink-0">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address Details */}
        <div className="text-left typo-body-sm bg-[#FAF7F5] p-4 rounded-xl border border-[#EBE4DD] space-y-1">
          <p className="typo-label text-neutral-900">Delivering to:</p>
          <p className="font-semibold text-neutral-800 typo-tabular">
            {currentOrder.shippingAddress.fullName}
            {currentOrder.shippingAddress.phone ? ` · ${currentOrder.shippingAddress.phone}` : ''}
          </p>
          <p className="text-neutral-600 typo-tabular">
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
            className="w-full sm:w-auto min-h-11 py-3 px-6 typo-btn text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Track Consignment Live</span>
          </button>
          <button
            onClick={handleDownloadInvoice}
            className="w-full sm:w-auto min-h-11 py-3 px-6 typo-btn text-neutral-800 bg-white hover:bg-[#F3ECE7] border border-[#EBE4DD] rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tax Invoice</span>
          </button>
          <button
            onClick={() => setActivePage('shop')}
            className="w-full sm:w-auto min-h-11 py-3 px-5 typo-btn text-[#5B112B] hover:underline cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
