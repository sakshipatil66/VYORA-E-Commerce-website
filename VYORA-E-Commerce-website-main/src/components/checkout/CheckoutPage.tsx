import React, { useRef, useState } from 'react';
import {
  Banknote,
  CreditCard,
  Landmark,
  Lock,
  Plus,
  Gift,
  MapPin,
  Check,
  Smartphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Address } from '../../types';
import { api } from '../../lib/api';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import {
  SELECTABLE_INDIAN_LOCATIONS,
  formatLocationLabel,
  findLocationByCityOrState,
  formatEstimatedDate
} from '../../data/locations';

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckout {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  notes: { preferredPaymentMethod: string };
  config: {
    display: {
      blocks: Record<string, { name: string; instruments: { method: string }[] }>;
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
  theme: { color: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const loadRazorpayCheckout = async () => {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your connection and try again.'));
    document.body.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Razorpay checkout did not initialize. Please try again.');
};

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    cartTotal,
    cartDiscount,
    couponDiscountAmount,
    appliedCoupon,
    currentUser,
    updateUserAddresses,
    createOrder,
    setActivePage,
    selectedLocation,
    setSelectedLocation,
    addToast
  } = useStore();

  const savedAddresses: Address[] = currentUser?.addresses || [];

  const initialAddr =
    savedAddresses.find(
      (a) => a.city.toLowerCase() === selectedLocation.city.toLowerCase()
    ) ||
    savedAddresses.find((a) => a.isDefault) ||
    savedAddresses[0];

  const [selectedAddressId, setSelectedAddressId] = useState(initialAddr?.id || '');
  const [deliverySpeed, setDeliverySpeed] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Netbanking' | 'Wallet' | 'COD'>('COD');
  const checkoutRequestId = useRef(crypto.randomUUID());
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(!currentUser?.addresses.length);
  const [isGiftWrap, setIsGiftWrap] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // New Address Form state (Defaulted to Pune, Maharashtra, India)
  const [newFullName, setNewFullName] = useState(currentUser?.name || '');
  const [newPhone, setNewPhone] = useState(currentUser?.phone || '');
  const [newCity, setNewCity] = useState(selectedLocation.city || 'Pune');
  const [newState, setNewState] = useState(selectedLocation.state || 'Maharashtra');
  const [newStreet, setNewStreet] = useState(formatLocationLabel(selectedLocation));
  const [newPincode, setNewPincode] = useState('');
  const [newType, setNewType] = useState<'Home' | 'Work'>('Home');

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-neutral-800">
          Your shopping bag is empty
        </h2>
        <p className="text-xs text-neutral-500">
          Please select items before proceeding to checkout.
        </p>
        <button
          onClick={() => setActivePage('shop')}
          className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-md cursor-pointer"
        >
          Explore Collections
        </button>
      </div>
    );
  }

  const selectedAddress =
    savedAddresses.find((a) => a.id === selectedAddressId) ||
    savedAddresses[0] || {
      id: 'checkout-draft',
      fullName: '',
      phone: '',
      pincode: '',
      city: selectedLocation.city,
      state: selectedLocation.state,
      street: '',
      type: 'Home' as const,
      isDefault: true
    };

  const addrLoc =
    findLocationByCityOrState(`${selectedAddress.city}, ${selectedAddress.state}`) ||
    selectedLocation;

  const handleSelectAddressCard = (addr: Address) => {
    setSelectedAddressId(addr.id);
    const matched = findLocationByCityOrState(`${addr.city}, ${addr.state}`);
    if (matched) {
      setSelectedLocation(matched);
    }
  };

  const handleLocationPresetChange = (locId: string) => {
    const found = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === locId);
    if (!found) return;
    setSelectedLocation(found);
    setNewCity(found.city);
    setNewState(found.state);
    setNewStreet(formatLocationLabel(found));
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newCity.trim() || !newState.trim()) {
      addToast('Please provide recipient name, city, and state', 'warning');
      return;
    }

    const formattedLoc = formatLocationLabel({
      city: newCity.trim(),
      state: newState.trim(),
      country: 'India'
    });

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      fullName: newFullName.trim(),
      phone: newPhone.trim(),
      pincode: newPincode.trim(),
      city: newCity.trim(),
      state: newState.trim(),
      street: newStreet.trim() || formattedLoc,
      type: newType,
      isDefault: false
    };

    const updated = [...savedAddresses, newAddr];
    const saved = await updateUserAddresses(updated);
    if (!saved) return;
    setSelectedAddressId(newAddr.id);

    const matched = findLocationByCityOrState(`${newAddr.city}, ${newAddr.state}`);
    if (matched) setSelectedLocation(matched);

    setIsAddingNewAddress(false);
    addToast(`Delivery destination saved: ${formattedLoc}`);
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    let waitingForGateway = false;
    try {
      if (paymentMethod === 'COD') {
        await createOrder({
          address: selectedAddress,
          paymentMethod,
          deliverySpeed,
          idempotencyKey: checkoutRequestId.current,
          giftWrap: isGiftWrap
        });
        setActivePage('order_confirmation');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const gatewayOrder = await api.createPaymentOrder({
        address: selectedAddress,
        paymentMethod,
        deliverySpeed,
        couponCode: appliedCoupon?.code,
        giftWrap: isGiftWrap
      });
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable. Please try Cash on Delivery.');

      waitingForGateway = true;
      const gatewayMethods = [
        { id: 'UPI', method: 'upi', name: 'UPI · Apps, Intent & QR' },
        { id: 'Card', method: 'card', name: 'Credit / Debit Cards' },
        { id: 'Netbanking', method: 'netbanking', name: 'Net Banking' },
        { id: 'Wallet', method: 'wallet', name: 'Wallets' }
      ];
      const preferredGatewayMethod = gatewayMethods.find((method) => method.id === paymentMethod);
      if (!preferredGatewayMethod) throw new Error('Choose a supported Razorpay payment method.');
      const orderedGatewayMethods = [
        preferredGatewayMethod,
        ...gatewayMethods.filter((method) => method.id !== paymentMethod)
      ];
      let paymentResultHandled = false;
      const checkout = new window.Razorpay({
        key: gatewayOrder.keyId,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
        name: 'VYORA',
        description: `Secure ${paymentMethod} payment`,
        order_id: gatewayOrder.razorpayOrderId,
        prefill: {
          name: selectedAddress.fullName,
          email: currentUser?.email || '',
          contact: selectedAddress.phone
        },
        notes: { preferredPaymentMethod: paymentMethod },
        config: {
          display: {
            blocks: Object.fromEntries(orderedGatewayMethods.map((method) => [
              method.id.toLowerCase(),
              { name: method.name, instruments: [{ method: method.method }] }
            ])),
            sequence: orderedGatewayMethods.map((method) => `block.${method.id.toLowerCase()}`),
            preferences: { show_default_blocks: false }
          }
        },
        theme: { color: '#5B112B' },
        handler: async (payment) => {
          paymentResultHandled = true;
          try {
            await createOrder({
              address: selectedAddress,
              paymentMethod,
              deliverySpeed,
              idempotencyKey: checkoutRequestId.current,
              giftWrap: isGiftWrap,
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              razorpay_signature: payment.razorpay_signature
            });
            setActivePage('order_confirmation');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (error) {
            paymentResultHandled = true;
            addToast(`Payment could not be verified and no order was confirmed: ${(error as Error).message}`, 'warning');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            if (!paymentResultHandled) {
              addToast('Payment was cancelled. No order has been placed; you can retry or choose Cash on Delivery.', 'info');
            }
          }
        }
      });
      checkout.on('payment.failed', (response) => {
        paymentResultHandled = true;
        addToast(`Payment failed: ${response.error?.description || 'Please try again or choose Cash on Delivery.'}`, 'warning');
        setIsProcessing(false);
      });
      checkout.open();
    } catch (error) {
      addToast(`Could not place your order: ${(error as Error).message}`, 'warning');
    } finally {
      if (!waitingForGateway) setIsProcessing(false);
    }
  };

  const stdDays = addrLoc ? addrLoc.standardDays : 4;
  const expDays = addrLoc ? addrLoc.expressDays : 2;
  const stdDateLabel = formatEstimatedDate(stdDays);
  const expDateLabel = formatEstimatedDate(expDays);

  const deliveryFee = deliverySpeed === 'express' ? 149 : cartSubtotal > 999 ? 0 : 99;
  const giftWrapFee = isGiftWrap ? 99 : 0;
  const finalPayable = Math.max(
    0,
    cartSubtotal - couponDiscountAmount + deliveryFee + giftWrapFee
  );

  const activeAddressLabel = formatLocationLabel({
    city: selectedAddress.city,
    state: selectedAddress.state,
    country: 'India'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title & Trust Header */}
      <div className="mb-8 border-b border-[#EBE4DD] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#7A1438]">
            Vyora Secure Checkout
          </span>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 mt-0.5">
            Delivery & Payment Concierge
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-600 bg-white py-1.5 px-3 rounded-md border border-[#EBE4DD]">
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>Your order details are validated by the VYORA server</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left 7 Columns: Checkout Steps */}
        <div className="lg:col-span-7 space-y-8">
          {/* STEP 1: Delivery Location & Address */}
          <section className="bg-white p-6 rounded-xl border border-[#EBE4DD] shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#5B112B] text-white flex items-center justify-center text-xs font-bold font-mono">
                  1
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-neutral-900">
                    Delivery Location & Address
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Default & Active Location: <strong>{formatLocationLabel(selectedLocation)}</strong>
                  </p>
                </div>
              </div>
              {!isAddingNewAddress && (
                <button
                  onClick={() => setIsAddingNewAddress(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#5B112B] hover:text-[#4A0E17] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Location / Address</span>
                </button>
              )}
            </div>

            {/* Quick Location Switcher right inside Checkout */}
            <div className="p-3 bg-[#FAF7F5] rounded-lg border border-[#E5D9CE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#4A0E17] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7A1438]" />
                <span>Shopping & Delivery City:</span>
              </span>
              <select
                value={selectedLocation.id}
                onChange={(e) => {
                  const found = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === e.target.value);
                  if (found) {
                    setSelectedLocation(found);
                    const matchingSaved = savedAddresses.find(
                      (a) => a.city.toLowerCase() === found.city.toLowerCase()
                    );
                    if (matchingSaved) {
                      setSelectedAddressId(matchingSaved.id);
                    }
                    addToast(`Checkout delivery location set to ${formatLocationLabel(found)}`);
                  }
                }}
                aria-label="Select checkout delivery city"
                className="text-xs py-1.5 px-3 bg-white border border-[#EBE4DD] rounded-md font-medium text-neutral-900 focus:outline-none focus:border-[#7A1438] cursor-pointer"
              >
                {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {formatLocationLabel(loc)}
                    {loc.isPune ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Address Cards */}
            {!isAddingNewAddress ? (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const cardLocLabel = formatLocationLabel({
                      city: addr.city,
                      state: addr.state,
                      country: 'India'
                    });
                    const matchedCity =
                      findLocationByCityOrState(`${addr.city}, ${addr.state}`) ||
                      selectedLocation;
                    const estLabel = formatEstimatedDate(matchedCity.expressDays);

                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddressCard(addr)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-[#7A1438] bg-[#FAF2EB] shadow-xs'
                            : 'border-[#EBE4DD] bg-white hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-neutral-900">
                            {addr.fullName}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-[#7A1438] bg-white px-2 py-0.5 rounded border border-[#EBE4DD]">
                            {addr.type}
                          </span>
                        </div>
                        {addr.street && addr.street !== cardLocLabel && (
                          <p className="text-xs text-neutral-600 line-clamp-2">{addr.street}</p>
                        )}
                        <p className="text-xs text-neutral-800 font-semibold mt-0.5">
                          {cardLocLabel}
                          {addr.pincode ? ` · ${addr.pincode}` : ''}
                        </p>
                        {addr.phone && (
                          <p className="text-[11px] text-neutral-500 font-mono mt-1">
                            Contact: {addr.phone}
                          </p>
                        )}
                        <p className="text-[11px] text-emerald-800 font-medium mt-1.5 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Est. arrival by {estLabel}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Add New Address Form */
              <form onSubmit={handleSaveNewAddress} className="space-y-3 pt-2">
                <div className="p-3 bg-[#FAF7F5] rounded-lg border border-[#E5D9CE] space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#7A1438] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Choose City Location (Default: Pune, Maharashtra, India)</span>
                  </label>
                  <select
                    onChange={(e) => handleLocationPresetChange(e.target.value)}
                    defaultValue={selectedLocation.id}
                    className="w-full text-xs p-2 bg-white border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                  >
                    {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {formatLocationLabel(loc)} · {loc.expressLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="Enter recipient name"
                      className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Contact Number *
                    </label>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10,15}"
                      maxLength={15}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile number"
                      className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Pune"
                      className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      State *
                    </label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                    >
                      {[
                        'Maharashtra',
                        'Karnataka',
                        'Delhi',
                        'Tamil Nadu',
                        'West Bengal',
                        'Rajasthan',
                        'Telangana',
                        'Gujarat',
                        'Kerala'
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 block mb-1">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit PIN"
                      className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1">
                    Delivery Address Details *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="Pune, Maharashtra, India"
                    className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md focus:outline-none focus:border-[#7A1438]"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-semibold text-neutral-700">Type:</span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="addressType"
                      checked={newType === 'Home'}
                      onChange={() => setNewType('Home')}
                      className="accent-[#7A1438]"
                    />
                    <span>Home (All Day Delivery)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="addressType"
                      checked={newType === 'Work'}
                      onChange={() => setNewType('Work')}
                      className="accent-[#7A1438]"
                    />
                    <span>Work (10 AM - 6 PM)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                    className="py-2 px-4 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md cursor-pointer"
                  >
                    Save & Deliver Here
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* STEP 2: Location-Aware Delivery Speed Option */}
          <section className="bg-white p-6 rounded-xl border border-[#EBE4DD] shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#5B112B] text-white flex items-center justify-center text-xs font-bold font-mono">
                2
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900">
                  Choose Delivery Speed for {activeAddressLabel}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label
                onClick={() => setDeliverySpeed('standard')}
                className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                  deliverySpeed === 'standard'
                    ? 'border-[#7A1438] bg-[#FAF2EB]'
                    : 'border-[#EBE4DD] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="speed"
                  checked={deliverySpeed === 'standard'}
                  onChange={() => setDeliverySpeed('standard')}
                  className="mt-0.5 accent-[#7A1438]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">Standard Insured</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {cartSubtotal > 999 ? 'FREE' : '₹99'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Est. by <strong>{stdDateLabel}</strong> ({stdDays} business days)
                  </p>
                </div>
              </label>

              <label
                onClick={() => setDeliverySpeed('express')}
                className={`p-3.5 rounded-lg border cursor-pointer flex items-start gap-3 transition-all ${
                  deliverySpeed === 'express'
                    ? 'border-[#7A1438] bg-[#FAF2EB]'
                    : 'border-[#EBE4DD] bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="speed"
                  checked={deliverySpeed === 'express'}
                  onChange={() => setDeliverySpeed('express')}
                  className="mt-0.5 accent-[#7A1438]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900">
                      {addrLoc?.isPune ? 'Pune Priority Dispatch' : 'Priority Air VIP'}
                    </span>
                    <span className="text-[10px] font-bold text-[#7A1438] bg-rose-50 px-1.5 py-0.5 rounded font-mono">
                      ₹149
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Est. by <strong>{expDateLabel}</strong> ({expDays}{' '}
                    {expDays === 1 ? 'day' : 'days'})
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* STEP 3: Payment Method */}
          <section className="bg-white p-6 rounded-xl border border-[#EBE4DD] shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#5B112B] text-white flex items-center justify-center text-xs font-bold font-mono">
                3
              </div>
              <h3 className="font-serif text-base font-bold text-neutral-900">
                Select Payment Mode
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { id: 'UPI', label: 'UPI', icon: Smartphone },
                { id: 'Card', label: 'Credit / Debit Card', icon: CreditCard },
                { id: 'Netbanking', label: 'Net Banking', icon: Landmark },
                { id: 'Wallet', label: 'Wallets', icon: Smartphone },
                { id: 'COD', label: 'Cash on Delivery', icon: Banknote }
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as 'UPI' | 'Card' | 'Netbanking' | 'Wallet' | 'COD')}
                    className={`p-3 rounded-lg border text-left flex flex-col items-center sm:items-start gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#7A1438] bg-[#FAF2EB] text-[#4A0E17] font-semibold'
                        : 'border-[#EBE4DD] bg-white text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${isSelected ? 'text-[#7A1438]' : 'text-neutral-500'}`}
                    />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-[#FAF7F5] rounded-lg border border-[#EBE4DD] mt-3">
              {paymentMethod === 'COD' ? <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 font-semibold">
                  <Banknote className="w-4 h-4 text-amber-700" />
                  <span>Cash on Delivery</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Pay the delivery partner when your order arrives at {activeAddressLabel}.
                </p>
              </div> : <div className="space-y-2 text-xs text-neutral-700">
                <p className="font-semibold text-[#4A0E17]">Secure payment powered by Razorpay</p>
                <p className="leading-relaxed">
                  Complete your {paymentMethod} payment in Razorpay’s secure checkout. Supported UPI apps (such as Google Pay, PhonePe or Paytm), UPI intent or QR, cards, banks and wallets appear only when enabled for the merchant account and supported by your device. VYORA does not collect or store payment credentials.
                </p>
                <p className="text-[11px] text-neutral-500">
                  Test payments require RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server .env file.
                </p>
              </div>}
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Order Summary & Action */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-[#EBE4DD] shadow-2xs space-y-5">
            <h3 className="font-serif text-lg font-bold text-neutral-900 border-b border-[#EBE4DD] pb-3">
              Order Receipt ({cart.length} {cart.length === 1 ? 'creation' : 'creations'})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <ProductImage
                    src={getVariantProductImage(item.product, item.selectedColor)}
                    alt={item.product.name}
                    category={item.product.category}
                    compact
                    className="w-12 h-14 object-cover rounded-md bg-[#FAF7F5] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-neutral-900 truncate">{item.product.name}</h5>
                    <p className="text-[11px] text-neutral-500">
                      Qty: {item.quantity}
                      {item.selectedSize ? ` · Size: ${item.selectedSize}` : ''}
                      {item.selectedColor ? ` · ${item.selectedColor}` : ''}
                    </p>
                    <p className="font-mono tabular-nums font-bold text-[#4A0E17] mt-0.5">
                      ₹{(item.product.discountPrice * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#FAF7F5] rounded-lg border border-[#EBE4DD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#BE185D]" />
                <div>
                  <p className="text-xs font-semibold text-neutral-900">
                    Artisan Gift Wrapping (+₹99)
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Includes handmade paper & gold ribbon
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isGiftWrap}
                onChange={(e) => setIsGiftWrap(e.target.checked)}
                className="w-4 h-4 accent-[#7A1438] rounded"
              />
            </div>

            <div className="space-y-2 text-xs font-mono tabular-nums pt-3 border-t border-[#F3ECE7]">
              <div className="flex justify-between text-neutral-600">
                <span>Items Subtotal</span>
                <span>₹{cartSubtotal.toLocaleString('en-IN')}</span>
              </div>
              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Retail Savings</span>
                  <span>-₹{cartDiscount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-[#BE185D]">
                  <span>Voucher ({appliedCoupon?.code})</span>
                  <span>-₹{couponDiscountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Delivery ({activeAddressLabel})</span>
                <span>
                  {deliveryFee === 0 ? (
                    <strong className="text-emerald-700 font-sans">FREE</strong>
                  ) : (
                    `₹${deliveryFee}`
                  )}
                </span>
              </div>
              {isGiftWrap && (
                <div className="flex justify-between text-neutral-600">
                  <span>Gift Box & Card</span>
                  <span>₹99</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#4A0E17] pt-3 border-t border-[#EBE4DD] font-sans">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums">
                  ₹{finalPayable.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 text-xs font-bold text-white bg-[#5B112B] hover:bg-[#430C1F] disabled:bg-neutral-400 rounded-md transition-all flex items-center justify-center gap-2 shadow-md transform hover:-translate-y-0.5 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Placing your order...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {paymentMethod === 'COD' ? 'Place COD Order' : `Continue with ${paymentMethod}`} · ₹{finalPayable.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </button>

            <div className="space-y-1 text-center text-[11px] text-neutral-500">
              <p>100% Purchase Protection Guarantee</p>
              <p>Delivering to {activeAddressLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
