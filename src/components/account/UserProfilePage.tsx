import React, { useState } from 'react';
import {
  MapPin,
  Award,
  ShoppingBag,
  Heart,
  ShieldCheck,
  LogOut,
  Plus,
  Trash2,
  Check,
  Truck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Address } from '../../types';
import {
  SELECTABLE_INDIAN_LOCATIONS,
  formatLocationLabel,
  findLocationByCityOrState,
  formatEstimatedDate
} from '../../data/locations';

export const UserProfilePage: React.FC = () => {
  const {
    currentUser,
    loginAsDemoUser,
    logout,
    setActivePage,
    updateUserAddresses,
    selectedLocation,
    setSelectedLocation,
    addToast
  } = useStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'club'>('profile');
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.name || 'Priya Deshmukh');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(selectedLocation.city || 'Pune');
  const [state, setState] = useState(selectedLocation.state || 'Maharashtra');
  const [pincode, setPincode] = useState('');
  const [street, setStreet] = useState(formatLocationLabel(selectedLocation));
  const [type, setType] = useState<'Home' | 'Work'>('Home');

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold">Please sign in to view your profile</h2>
        <p className="text-xs text-neutral-500">
          Access your saved delivery locations (default: Pune, Maharashtra, India), loyalty points, and consignment records.
        </p>
        <button
          onClick={() => loginAsDemoUser('customer')}
          className="py-2.5 px-6 text-xs font-semibold text-white bg-[#5B112B] rounded-md shadow-xs cursor-pointer"
        >
          Sign In as Priya Deshmukh (Demo Patron)
        </button>
      </div>
    );
  }

  const handlePresetSelect = (locId: string) => {
    const loc = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === locId);
    if (!loc) return;
    setCity(loc.city);
    setState(loc.state);
    setStreet(formatLocationLabel(loc));
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !city.trim() || !state.trim()) return;

    const cleanLabel = formatLocationLabel({
      city: city.trim(),
      state: state.trim(),
      country: 'India'
    });

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim(),
      street: street.trim() || cleanLabel,
      type,
      isDefault: currentUser.addresses.length === 0
    };
    updateUserAddresses([...currentUser.addresses, newAddr]);
    setIsAddingAddr(false);
    addToast(`Saved ${cleanLabel} to your address book!`);
  };

  const handleSetDefaultAddress = (addr: Address) => {
    const updated = currentUser.addresses.map((a) => ({
      ...a,
      isDefault: a.id === addr.id
    }));
    updateUserAddresses(updated);
    const matched = findLocationByCityOrState(`${addr.city}, ${addr.state}`);
    if (matched) {
      setSelectedLocation(matched);
    }
    const label = formatLocationLabel({
      city: addr.city,
      state: addr.state,
      country: 'India'
    });
    addToast(`Default shopping location set to ${label}`);
  };

  const handleDeleteAddress = (id: string) => {
    updateUserAddresses(currentUser.addresses.filter((a) => a.id !== id));
    addToast('Address removed', 'info');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Profile Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] shadow-2xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#5B112B] text-white flex items-center justify-center font-serif text-2xl font-bold shadow-xs">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-neutral-900 leading-tight">
                {currentUser.name}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                {currentUser.clubTier} Member
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {currentUser.email}
              {currentUser.phone ? ` · ${currentUser.phone}` : ''}
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#7A1438]" />
              <span>Shopping Location: {formatLocationLabel(selectedLocation)}</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-[#7A1438] font-mono font-bold">
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <span>
                {currentUser.clubPoints} Vyora Loyalty Points (Value: ₹{currentUser.clubPoints})
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Role Switcher */}
        <div className="flex flex-wrap gap-2">
          {currentUser.role === 'customer' ? (
            <button
              onClick={() => loginAsDemoUser('admin')}
              className="py-1.5 px-3 text-xs font-semibold text-[#854D0E] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Switch to Store Admin</span>
            </button>
          ) : (
            <button
              onClick={() => loginAsDemoUser('customer')}
              className="py-1.5 px-3 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-md transition-colors cursor-pointer"
            >
              Switch to Patron Account
            </button>
          )}

          <button
            onClick={logout}
            className="py-1.5 px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EBE4DD] mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Account Overview
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'addresses'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          Saved Locations & Addresses ({currentUser.addresses.length})
        </button>
        <button
          onClick={() => setActiveTab('club')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'club'
              ? 'border-[#7A1438] text-[#7A1438]'
              : 'border-transparent text-neutral-500 hover:text-black'
          }`}
        >
          The Vyora Privilege Club
        </button>
      </div>

      {/* Tab 1: Profile Overview */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => setActivePage('my_orders')}
            className="p-5 bg-white rounded-xl border border-[#EBE4DD] hover:border-[#7A1438] cursor-pointer transition-all shadow-2xs group"
          >
            <ShoppingBag className="w-6 h-6 text-[#7A1438] mb-2" />
            <h4 className="text-sm font-bold text-neutral-900 group-hover:text-[#7A1438]">
              My Orders & Packages
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Track consignments, invoices, and reorder favourite items.
            </p>
          </div>

          <div
            onClick={() => setActivePage('wishlist')}
            className="p-5 bg-white rounded-xl border border-[#EBE4DD] hover:border-[#7A1438] cursor-pointer transition-all shadow-2xs group"
          >
            <Heart className="w-6 h-6 text-[#BE185D] mb-2" />
            <h4 className="text-sm font-bold text-neutral-900 group-hover:text-[#BE185D]">
              My Wishlist Vault
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Review saved festive apparel, fine jewellery, electronics, and decor.
            </p>
          </div>

          <div
            onClick={() => setActiveTab('addresses')}
            className="p-5 bg-white rounded-xl border border-[#EBE4DD] hover:border-[#7A1438] cursor-pointer transition-all shadow-2xs group"
          >
            <MapPin className="w-6 h-6 text-[#D4AF37] mb-2" />
            <h4 className="text-sm font-bold text-neutral-900 group-hover:text-[#7A1438]">
              Pune & Delivery Locations
            </h4>
            <p className="text-xs text-neutral-500 mt-1">
              Manage Pune, Maharashtra, India and other Indian delivery destinations.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Addresses & Location Management */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                Delivery Address Book ({currentUser.addresses.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Default shopping & delivery location: Pune, Maharashtra, India
              </p>
            </div>
            {!isAddingAddr && (
              <button
                onClick={() => setIsAddingAddr(true)}
                className="py-2 px-4 text-xs font-semibold text-white bg-[#5B112B] hover:bg-[#430C1F] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Location</span>
              </button>
            )}
          </div>

          {isAddingAddr && (
            <form
              onSubmit={handleAddAddress}
              className="p-6 bg-white rounded-xl border border-[#EBE4DD] space-y-3 shadow-2xs"
            >
              <h4 className="font-serif text-base font-bold text-[#4A0E17]">
                New Delivery Destination
              </h4>

              <div className="p-3 bg-[#FAF7F5] rounded-lg border border-[#E5D9CE] space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#7A1438] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Select Indian City (Default: Pune, Maharashtra, India)</span>
                </label>
                <select
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  defaultValue={SELECTABLE_INDIAN_LOCATIONS[0].id}
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
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Recipient Full Name"
                  className="text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact Number (Optional)"
                  className="text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Pune"
                  className="text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Maharashtra"
                  className="text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
                />
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Postal Code (Optional)"
                  className="text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md font-mono"
                />
              </div>

              <textarea
                rows={2}
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Pune, Maharashtra, India"
                className="w-full text-xs p-2.5 bg-[#FAF7F5] border border-[#EBE4DD] rounded-md"
              />

              <div className="flex items-center gap-4 text-xs">
                <span className="font-semibold text-neutral-700">Address Type:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addrType"
                    checked={type === 'Home'}
                    onChange={() => setType('Home')}
                    className="accent-[#7A1438]"
                  />
                  <span>Home</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addrType"
                    checked={type === 'Work'}
                    onChange={() => setType('Work')}
                    className="accent-[#7A1438]"
                  />
                  <span>Work</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAddr(false)}
                  className="py-2 px-4 text-xs text-neutral-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 text-xs font-semibold text-white bg-[#5B112B] rounded-md cursor-pointer"
                >
                  Save Location
                </button>
              </div>
            </form>
          )}

          {/* Saved Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentUser.addresses.map((addr) => {
              const cardLabel = formatLocationLabel({
                city: addr.city,
                state: addr.state,
                country: 'India'
              });
              const matched =
                findLocationByCityOrState(`${addr.city}, ${addr.state}`) ||
                selectedLocation;
              const estDate = formatEstimatedDate(matched.expressDays);

              return (
                <div
                  key={addr.id}
                  className={`p-5 bg-white rounded-xl border flex flex-col justify-between gap-3 ${
                    addr.isDefault ? 'border-[#7A1438] bg-[#FAF7F5]' : 'border-[#EBE4DD]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-neutral-900 text-sm">{addr.fullName}</span>
                        <span className="text-[10px] uppercase font-bold text-[#7A1438] bg-[#FAF2EB] px-2 py-0.5 rounded">
                          {addr.type}
                        </span>
                        {addr.isDefault && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                            Default Location
                          </span>
                        )}
                      </div>
                      {addr.street && addr.street !== cardLabel && (
                        <p className="text-neutral-600 leading-relaxed">{addr.street}</p>
                      )}
                      <p className="text-neutral-800 font-semibold">
                        {cardLabel}
                        {addr.pincode ? ` · ${addr.pincode}` : ''}
                      </p>
                      {addr.phone && (
                        <p className="text-neutral-500 font-mono">Contact: {addr.phone}</p>
                      )}
                      <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 pt-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Est. delivery by {estDate}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      aria-label="Delete address"
                      className="text-neutral-400 hover:text-rose-600 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!addr.isDefault && (
                    <div className="pt-2 border-t border-[#F1E8E0]">
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#7A1438] hover:underline cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Set as Active Delivery Location</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Club */}
      {activeTab === 'club' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EBE4DD] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF2EB] text-[#D4AF37] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-neutral-900">
                The Vyora Privilege Circle
              </h3>
              <p className="text-xs text-neutral-500">Tier: {currentUser.clubTier} Patron</p>
            </div>
          </div>

          <div className="p-4 bg-[#FAF7F5] rounded-xl border border-[#EBE4DD] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="text-neutral-500 font-sans block text-[10px]">
                Total Earned Points
              </span>
              <span className="font-bold text-neutral-900 text-lg">{currentUser.clubPoints}</span>
            </div>
            <div>
              <span className="text-neutral-500 font-sans block text-[10px]">
                Redeemable Rupee Value
              </span>
              <span className="font-bold text-[#7A1438] text-lg">₹{currentUser.clubPoints}</span>
            </div>
            <div>
              <span className="text-neutral-500 font-sans block text-[10px]">Points Expiry</span>
              <span className="font-semibold text-neutral-700">Never Expires</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Patron Privileges
            </h4>
            <ul className="space-y-2 text-xs text-neutral-600">
              <li className="flex items-center gap-2">
                <span className="text-emerald-700">✓</span>
                <span>
                  Complimentary Priority Dispatch in Pune, Maharashtra, India & Express Metro Air Shipping
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-700">✓</span>
                <span>Priority 24-hour advance access to Limited Edition Handloom Drops</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-700">✓</span>
                <span>Dedicated Patron Concierge styling consultations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-700">✓</span>
                <span>Complimentary artisanal brass gift-boxing on requests</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
