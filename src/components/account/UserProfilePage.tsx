import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Award,
  ShoppingBag,
  Heart,
  LogOut,
  Plus,
  Trash2,
  Check,
  Truck,
  Settings,
  Package,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Address, DashboardTab, Order } from '../../types';
import { ProductCard } from '../common/ProductCard';
import { ProductImage, getVariantProductImage } from '../common/ProductImage';
import {
  SELECTABLE_INDIAN_LOCATIONS,
  formatLocationLabel,
  findLocationByCityOrState,
  formatEstimatedDate
} from '../../data/locations';

function getCustomerInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const UserProfilePage: React.FC = () => {
  const {
    currentUser,
    products,
    orders,
    wishlist,
    dashboardTab,
    setDashboardTab,
    logout,
    setActivePage,
    trackOrder,
    addToCart,
    updateProfileSettings,
    changePassword,
    updateUserAddresses,
    selectedLocation,
    setSelectedLocation,
    openAuthModal,
    addToast
  } = useStore();

  // Order history sub-filter
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered'>('all');

  // New Address Form State (strictly initialized from the authenticated customer)
  const [isAddingAddr, setIsAddingAddr] = useState(false);
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrCity, setAddrCity] = useState(selectedLocation.city || 'Pune');
  const [addrState, setAddrState] = useState(selectedLocation.state || 'Maharashtra');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrStreet, setAddrStreet] = useState(formatLocationLabel(selectedLocation));
  const [addrType, setAddrType] = useState<'Home' | 'Work'>('Home');

  // Account Settings Form State
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileLocationId, setProfileLocationId] = useState('loc-pune-default');
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(true);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Sync forms whenever authenticated customer changes
  useEffect(() => {
    if (!currentUser) return;
    setProfileName(currentUser.name);
    setProfilePhone(currentUser.phone || '');
    setProfileAvatarUrl(currentUser.avatarUrl || '');
    setProfileLocationId(currentUser.shoppingLocationId || selectedLocation.id || 'loc-pune-default');
    setNotifyOrders(currentUser.notifyOrderUpdates ?? true);
    setNotifyPromos(currentUser.notifyPromotions ?? true);
    setAvatarLoadError(false);

    setAddrFullName(currentUser.name);
    setAddrPhone(currentUser.phone || '');
    setAddrCity(selectedLocation.city || 'Pune');
    setAddrState(selectedLocation.state || 'Maharashtra');
    setAddrStreet(formatLocationLabel(selectedLocation));
  }, [currentUser, selectedLocation]);

  if (!currentUser) {
    return (
      <div className="vyora-container vyora-page max-w-md text-center space-y-5">
        <h2 className="typo-h2 text-neutral-900">
          Sign in to view your Customer Dashboard
        </h2>
        <p className="typo-body text-neutral-500">
          Access your personal profile, loyalty points, order history, wishlist, and saved addresses.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => openAuthModal('signin', 'profile')}
            className="w-full sm:w-auto min-h-11 py-2.5 px-6 typo-btn text-white bg-[#4A0E17] hover:bg-[#380811] rounded-full cursor-pointer transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('signup', 'profile')}
            className="w-full sm:w-auto min-h-11 py-2.5 px-6 typo-btn text-[#4A0E17] bg-white hover:bg-[#FAF7F5] border border-[#DFD2C5] rounded-full cursor-pointer transition-colors"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'active') return o.status !== 'delivered';
    if (orderFilter === 'delivered') return o.status === 'delivered';
    return true;
  });

  // Loyalty tier progression math
  const nextTierTarget =
    currentUser.clubTier === 'Silver' ? 1000 : currentUser.clubTier === 'Gold' ? 5000 : 5000;
  const nextTierName =
    currentUser.clubTier === 'Silver'
      ? 'Gold'
      : currentUser.clubTier === 'Gold'
      ? 'Platinum'
      : 'Platinum';
  const tierProgressPct =
    currentUser.clubTier === 'Platinum'
      ? 100
      : Math.min(100, Math.round((currentUser.clubPoints / nextTierTarget) * 100));

  const initials = getCustomerInitials(currentUser.name);
  const showAvatarImg = Boolean(currentUser.avatarUrl && !avatarLoadError);

  const handlePresetSelect = (locId: string) => {
    const loc = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === locId);
    if (!loc) return;
    setAddrCity(loc.city);
    setAddrState(loc.state);
    setAddrStreet(formatLocationLabel(loc));
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrFullName.trim() || !addrCity.trim() || !addrState.trim()) return;

    const cleanLabel = formatLocationLabel({
      city: addrCity.trim(),
      state: addrState.trim(),
      country: 'India'
    });

    const newAddr: Address = {
      id: `addr_${Date.now()}`,
      fullName: addrFullName.trim(),
      phone: addrPhone.trim(),
      pincode: addrPincode.trim(),
      city: addrCity.trim(),
      state: addrState.trim(),
      street: addrStreet.trim() || cleanLabel,
      type: addrType,
      isDefault: currentUser.addresses.length === 0
    };

    try {
      await updateUserAddresses([...currentUser.addresses, newAddr]);
      setIsAddingAddr(false);
      setAddrPincode('');
      addToast(`Saved ${cleanLabel} to your address book.`);
    } catch (err: any) {
      addToast(err?.message || 'Unable to save address.', 'warning');
    }
  };

  const handleSetDefaultAddress = async (addr: Address) => {
    const updated = currentUser.addresses.map((a) => ({
      ...a,
      isDefault: a.id === addr.id
    }));
    try {
      await updateUserAddresses(updated);
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
    } catch (err: any) {
      addToast(err?.message || 'Unable to update default address.', 'warning');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await updateUserAddresses(currentUser.addresses.filter((a) => a.id !== id));
      addToast('Address removed from your account.', 'info');
    } catch (err: any) {
      addToast(err?.message || 'Unable to remove address.', 'warning');
    }
  };

  const handleBuyAgain = (ord: Order) => {
    let addedCount = 0;
    for (const item of ord.items) {
      const matched = products.find((p) => p.id === item.productId);
      if (matched) {
        addToCart(matched, item.quantity, item.size, item.color);
        addedCount += 1;
      }
    }
    if (addedCount === 0) {
      addToast('Selected items are currently unavailable.', 'warning');
    }
  };

  const handleSaveProfileSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);
    try {
      await updateProfileSettings({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        avatarUrl: profileAvatarUrl.trim(),
        shoppingLocationId: profileLocationId,
        notifyOrderUpdates: notifyOrders,
        notifyPromotions: notifyPromos
      });
      setAvatarLoadError(false);
      setProfileMessage({
        type: 'success',
        text: 'Your personal profile and shopping preferences have been saved.'
      });
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err?.message || 'Unable to save profile settings.'
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (!currentPassword) {
      setPwdMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwdMessage({
        type: 'error',
        text: 'New password must be at least 8 characters and include a letter and a number.'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New Password and Confirm Password do not match.' });
      return;
    }

    setIsChangingPwd(true);
    try {
      const msg = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMessage({ type: 'success', text: msg });
    } catch (err: any) {
      setPwdMessage({
        type: 'error',
        text: err?.message || 'Unable to update password.'
      });
    } finally {
      setIsChangingPwd(false);
    }
  };

  const tabs: { id: DashboardTab; label: string; badge?: number; icon: React.ComponentType<any> }[] = [
    { id: 'overview', label: 'Dashboard Overview', icon: Sparkles },
    { id: 'orders', label: 'Order History', badge: orders.length, icon: Package },
    { id: 'wishlist', label: 'Wishlist', badge: wishlistedProducts.length, icon: Heart },
    { id: 'addresses', label: 'Saved Addresses', badge: currentUser.addresses.length, icon: MapPin },
    { id: 'settings', label: 'Account Settings', icon: Settings }
  ];

  return (
    <div className="vyora-container vyora-page max-w-6xl space-y-8">
      {/* ==================================================================== */}
      {/* CUSTOMER IDENTITY HERO CARD                                          */}
      {/* ==================================================================== */}
      <div className="rounded-2xl overflow-hidden border border-[#E5D9CE] bg-white shadow-sm">
        <div className="bg-gradient-to-r from-[#380811] via-[#4A0E17] to-[#6A1230] px-5 sm:px-8 py-6 sm:py-7 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            {/* Profile Photo or Monogram Initials */}
            {showAvatarImg ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                onError={() => setAvatarLoadError(true)}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#D4AF37] shadow-md shrink-0 bg-[#380811]"
              />
            ) : (
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#2A050C] border-2 border-[#D4AF37]/70 text-[#D4AF37] flex items-center justify-center font-serif text-2xl sm:text-3xl font-bold shadow-md shrink-0">
                {initials}
              </div>
            )}

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="typo-h1 text-white">
                  {currentUser.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full typo-badge bg-[#D4AF37]/20 text-[#F5D77F] border border-[#D4AF37]/45">
                  <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{currentUser.clubTier} Member</span>
                </span>
                {currentUser.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full typo-badge bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 typo-body-sm text-rose-100/85">
                <span className="inline-flex items-center gap-1.5 break-all">
                  <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span>{currentUser.email}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 typo-tabular">
                  <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span>{currentUser.phone || 'Add phone in Account Settings'}</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 typo-body-sm text-rose-100/90 pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span>
                    Shopping Location: <strong>{formatLocationLabel(selectedLocation)}</strong>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Loyalty Points Card & Sign Out Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3">
            <div className="bg-[#29050C]/80 border border-[#D4AF37]/35 rounded-xl px-4 py-3 text-left sm:text-right sm:min-w-[220px]">
              <p className="typo-label text-[#D4AF37]">
                VYORA Loyalty Balance
              </p>
              <p className="typo-h3 font-sans typo-tabular text-white mt-0.5">
                {currentUser.clubPoints.toLocaleString('en-IN')} pts{' '}
                <span className="typo-meta font-normal text-rose-200/80">
                  (₹{currentUser.clubPoints.toLocaleString('en-IN')})
                </span>
              </p>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[#D4AF37] h-full rounded-full transition-all duration-500"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
              <p className="typo-meta text-rose-200/75 mt-1">
                {currentUser.clubTier === 'Platinum'
                  ? 'Highest Platinum Circle Tier Unlocked'
                  : `${Math.max(0, nextTierTarget - currentUser.clubPoints).toLocaleString('en-IN')} pts to ${nextTierName} Tier`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setActivePage('admin')}
                  className="min-h-10 py-2 px-4 rounded-full bg-amber-300/95 hover:bg-amber-300 text-neutral-950 typo-btn-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Console</span>
                </button>
              )}
              <button
                type="button"
                onClick={logout}
                className="min-h-10 py-2 px-4 rounded-full bg-white/10 hover:bg-rose-900/80 border border-white/25 text-white typo-btn-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-8 bg-[#FAF7F5] border-t border-[#E5D9CE] flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = dashboardTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDashboardTab(tab.id)}
                className={`min-h-11 py-3 px-3 sm:px-4 typo-btn-sm border-b-2 whitespace-nowrap shrink-0 inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-[#7A1438] text-[#4A0E17]'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#7A1438]' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && (
                  <span
                    className={`typo-badge typo-tabular px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-[#4A0E17] text-[#D4AF37]' : 'bg-[#EBE4DD] text-neutral-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: DASHBOARD OVERVIEW                                            */}
      {/* ==================================================================== */}
      {dashboardTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Customer Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setDashboardTab('orders')}
              className="p-5 bg-white rounded-2xl border border-[#E5D9CE] hover:border-[#7A1438] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="typo-meta font-semibold text-neutral-500">Order History</span>
                <ShoppingBag className="w-4 h-4 text-[#7A1438]" />
              </div>
              <p className="typo-h2 font-sans typo-tabular text-neutral-900">
                {orders.length}
              </p>
              <p className="typo-meta text-[#7A1438] font-medium mt-1.5 group-hover:underline">
                View orders & track packages →
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('wishlist')}
              className="p-5 bg-white rounded-2xl border border-[#E5D9CE] hover:border-[#7A1438] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="typo-meta font-semibold text-neutral-500">Saved Wishlist</span>
                <Heart className="w-4 h-4 text-[#BE185D]" />
              </div>
              <p className="typo-h2 font-sans typo-tabular text-neutral-900">
                {wishlistedProducts.length}
              </p>
              <p className="typo-meta text-[#7A1438] font-medium mt-1.5 group-hover:underline">
                Open personal wishlist →
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('addresses')}
              className="p-5 bg-white rounded-2xl border border-[#E5D9CE] hover:border-[#7A1438] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="typo-meta font-semibold text-neutral-500">Saved Addresses</span>
                <MapPin className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <p className="typo-h2 font-sans typo-tabular text-neutral-900">
                {currentUser.addresses.length}
              </p>
              <p className="typo-meta text-[#7A1438] font-medium mt-1.5 truncate group-hover:underline">
                Active: {formatLocationLabel(selectedLocation)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('settings')}
              className="p-5 bg-white rounded-2xl border border-[#E5D9CE] hover:border-[#7A1438] text-left transition-all shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="typo-meta font-semibold text-neutral-500">Loyalty Tier</span>
                <Award className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <p className="typo-h2 text-[#4A0E17]">
                {currentUser.clubTier}
              </p>
              <p className="typo-meta text-neutral-500 typo-tabular mt-1.5">
                {currentUser.clubPoints.toLocaleString('en-IN')} points available
              </p>
            </button>
          </div>

          {/* Personal Account Summary + Shopping Location Quick Switcher */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5D9CE] p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#F1E8E0] pb-3">
                <h2 className="typo-h3 text-neutral-900">
                  Recent Order Activity
                </h2>
                <button
                  type="button"
                  onClick={() => setDashboardTab('orders')}
                  className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                >
                  View All ({orders.length})
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <Package className="w-8 h-8 text-[#7A1438] mx-auto opacity-80" />
                  <p className="typo-body-sm text-neutral-600">
                    You have not placed any orders on this account yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActivePage('shop')}
                    className="min-h-10 inline-flex items-center gap-1.5 py-2 px-5 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn-sm cursor-pointer transition-colors"
                  >
                    <span>Explore Marketplace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 2).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-[#FAF7F5] border border-[#E5D9CE] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 typo-meta">
                          <span className="typo-tabular font-bold text-[#4A0E17]">{ord.id}</span>
                          <span>·</span>
                          <span className="text-neutral-500">{ord.date}</span>
                          <span className="typo-badge px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="typo-card-title text-neutral-800 line-clamp-1">
                          {ord.items.map((i) => i.name).join(', ')}
                        </p>
                        <p className="typo-meta text-neutral-500 typo-tabular">
                          Total: ₹{ord.total.toLocaleString('en-IN')} · Est. {ord.estimatedDeliveryDate}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => trackOrder(ord.id)}
                        className="min-h-9 py-2 px-4 rounded-lg bg-white hover:bg-[#4A0E17] text-[#4A0E17] hover:text-white border border-[#DFD2C5] typo-btn-sm transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
                      >
                        Track Live
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5D9CE] p-5 sm:p-6 space-y-4 shadow-2xs">
              <h2 className="typo-h3 text-neutral-900 border-b border-[#F1E8E0] pb-3">
                Personal Account Details
              </h2>

              <dl className="space-y-3 typo-body-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 shrink-0">Customer Name</dt>
                  <dd className="font-semibold text-neutral-900 text-right">{currentUser.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 shrink-0">Email</dt>
                  <dd className="text-neutral-900 text-right break-all">
                    {currentUser.email}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 shrink-0">Phone</dt>
                  <dd className="typo-tabular text-neutral-900 text-right">
                    {currentUser.phone || 'Not set'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-neutral-500 shrink-0">Membership Tier</dt>
                  <dd className="font-semibold text-[#7A1438] text-right typo-tabular">
                    {currentUser.clubTier} ({currentUser.clubPoints.toLocaleString('en-IN')} pts)
                  </dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-[#F1E8E0] space-y-2">
                <label
                  htmlFor="dashboard-location-select"
                  className="typo-label text-neutral-800 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#7A1438]" />
                  <span>Active Shopping Location</span>
                </label>
                <select
                  id="dashboard-location-select"
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const loc = SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === e.target.value);
                    if (loc) {
                      setSelectedLocation(loc);
                      addToast(`Shopping location updated to ${formatLocationLabel(loc)}`);
                    }
                  }}
                  className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl font-medium text-neutral-900 focus:outline-none focus:border-[#7A1438] cursor-pointer"
                >
                  {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {formatLocationLabel(loc)}
                      {loc.isPune ? ' (Default Hub)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setDashboardTab('settings')}
                className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#FAF7F5] hover:bg-[#EFE6DD] border border-[#DFD2C5] typo-btn text-[#4A0E17] transition-colors cursor-pointer"
              >
                Edit Profile & Password Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: PERSONAL ORDER HISTORY                                        */}
      {/* ==================================================================== */}
      {dashboardTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="typo-h2 text-neutral-900">
                Your Order History ({orders.length})
              </h2>
              <p className="typo-body-sm text-neutral-500 mt-0.5">
                Showing consignments placed exclusively by {currentUser.name}
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#E5D9CE] self-start overflow-x-auto no-scrollbar max-w-full">
              {(
                [
                  { id: 'all', label: `All (${orders.length})` },
                  {
                    id: 'active',
                    label: `Active (${orders.filter((o) => o.status !== 'delivered').length})`
                  },
                  {
                    id: 'delivered',
                    label: `Delivered (${orders.filter((o) => o.status === 'delivered').length})`
                  }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setOrderFilter(f.id)}
                  className={`min-h-9 px-3.5 py-1.5 typo-btn-sm whitespace-nowrap rounded-lg transition-colors cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-[#4A0E17] text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white p-10 sm:p-12 rounded-2xl border border-[#E5D9CE] text-center space-y-3">
              <Package className="w-9 h-9 text-[#7A1438] mx-auto" />
              <h3 className="typo-h3 text-neutral-900">No orders to display</h3>
              <p className="typo-body-sm text-neutral-500">
                Orders you place with your account will appear here with live tracking.
              </p>
              <button
                type="button"
                onClick={() => setActivePage('shop')}
                className="min-h-11 py-2.5 px-6 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn cursor-pointer transition-colors"
              >
                Browse Collections
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-[#E5D9CE] overflow-hidden shadow-2xs"
                >
                  <div className="bg-[#FAF7F5] px-5 py-3.5 border-b border-[#E5D9CE] flex flex-wrap items-center justify-between gap-3 typo-body-sm typo-tabular">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <span className="typo-label text-neutral-400 block">
                          Order ID
                        </span>
                        <span className="font-bold text-[#4A0E17]">{ord.id}</span>
                      </div>
                      <div>
                        <span className="typo-label text-neutral-400 block">
                          Date
                        </span>
                        <span className="text-neutral-700">{ord.date}</span>
                      </div>
                      <div>
                        <span className="typo-label text-neutral-400 block">
                          Total
                        </span>
                        <span className="font-bold text-neutral-900">
                          ₹{ord.total.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="typo-badge text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                        {ord.status.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => trackOrder(ord.id)}
                        className="min-h-9 py-1.5 px-3.5 typo-btn-sm text-[#4A0E17] hover:text-white bg-white hover:bg-[#4A0E17] border border-[#DFD2C5] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Live</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 divide-y divide-[#F1E8E0] space-y-3">
                    {ord.items.map((it, idx) => {
                      const matchedProd = products.find((p) => p.id === it.productId);
                      const imgSrc = matchedProd
                        ? getVariantProductImage(matchedProd, it.color)
                        : it.image;
                      return (
                        <div
                          key={idx}
                          className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <ProductImage
                              src={imgSrc}
                              alt={it.name}
                              category={matchedProd?.category}
                              compact
                              className="w-14 h-18 object-cover rounded-lg bg-[#FAF7F5] shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="typo-card-title text-neutral-900">
                                {it.name}
                              </h4>
                              <p className="typo-meta text-neutral-500 mt-0.5">
                                Qty: {it.quantity}
                                {it.size ? ` · Size: ${it.size}` : ''}
                                {it.color ? ` · ${it.color}` : ''}
                              </p>
                              <p className="typo-meta text-emerald-800 font-medium mt-0.5">
                                Est. Delivery: {ord.estimatedDeliveryDate}
                              </p>
                            </div>
                          </div>
                          <span className="typo-price text-[#4A0E17] self-end sm:self-auto shrink-0">
                            ₹{(it.price * it.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#FAF7F5]/60 px-5 py-3 border-t border-[#F1E8E0] flex flex-wrap items-center justify-between gap-2 typo-meta text-neutral-500">
                    <span>
                      Delivering to {ord.shippingAddress.fullName} ({ord.shippingAddress.city},{' '}
                      {ord.shippingAddress.state}, India)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBuyAgain(ord)}
                      className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                    >
                      Buy Again
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PERSONAL WISHLIST                                             */}
      {/* ==================================================================== */}
      {dashboardTab === 'wishlist' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="typo-h2 text-neutral-900">
                Your Personal Wishlist ({wishlistedProducts.length})
              </h2>
              <p className="typo-body-sm text-neutral-500 mt-0.5">
                Saved creations linked exclusively to {currentUser.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActivePage('shop')}
              className="typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
            >
              Explore More Creations →
            </button>
          </div>

          {wishlistedProducts.length === 0 ? (
            <div className="bg-white p-10 sm:p-12 rounded-2xl border border-[#E5D9CE] text-center space-y-3">
              <Heart className="w-9 h-9 text-[#BE185D] mx-auto" />
              <h3 className="typo-h3 text-neutral-900">
                Your wishlist is empty
              </h3>
              <p className="typo-body-sm text-neutral-500 max-w-sm mx-auto">
                Tap the heart icon on any product card to save sarees, jewellery, beauty, or electronics to your private account.
              </p>
              <button
                type="button"
                onClick={() => setActivePage('shop')}
                className="min-h-11 py-2.5 px-6 rounded-full bg-[#4A0E17] hover:bg-[#380811] text-white typo-btn cursor-pointer transition-colors"
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {wishlistedProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SAVED ADDRESSES                                               */}
      {/* ==================================================================== */}
      {dashboardTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="typo-h2 text-neutral-900">
                Saved Delivery Addresses ({currentUser.addresses.length})
              </h2>
              <p className="typo-body-sm text-neutral-500 mt-0.5">
                Default marketplace dispatch hub: Pune, Maharashtra, India
              </p>
            </div>
            {!isAddingAddr && (
              <button
                type="button"
                onClick={() => setIsAddingAddr(true)}
                className="min-h-10 py-2.5 px-5 typo-btn-sm text-white bg-[#4A0E17] hover:bg-[#380811] rounded-full transition-colors inline-flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Address</span>
              </button>
            )}
          </div>

          {isAddingAddr && (
            <form
              onSubmit={handleAddAddress}
              className="p-5 sm:p-6 bg-white rounded-2xl border border-[#E5D9CE] space-y-4 shadow-2xs"
            >
              <h3 className="typo-h3 text-[#4A0E17]">
                Add Delivery Destination
              </h3>

              <div className="p-3.5 bg-[#FAF7F5] rounded-xl border border-[#E5D9CE] space-y-1.5">
                <label className="typo-label text-[#7A1438] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>Select Indian City (Default: Pune, Maharashtra, India)</span>
                </label>
                <select
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  defaultValue={selectedLocation.id}
                  className="typo-input bg-white border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                >
                  {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {formatLocationLabel(loc)} · {loc.expressLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrFullName}
                    onChange={(e) => setAddrFullName(e.target.value)}
                    placeholder="Full Name"
                    className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder="+91 mobile number"
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">City *</label>
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Pune"
                    className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    placeholder="Maharashtra"
                    className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
                <div>
                  <label className="typo-label text-neutral-700 block mb-1.5">
                    PIN Code (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={addrPincode}
                    onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Optional"
                    className="typo-input typo-tabular bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div>
                <label className="typo-label text-neutral-700 block mb-1.5">
                  Address Details
                </label>
                <textarea
                  rows={2}
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Pune, Maharashtra, India"
                  className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-lg focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 typo-body-sm">
                <span className="font-semibold text-neutral-700">Address Type:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addrType"
                    checked={addrType === 'Home'}
                    onChange={() => setAddrType('Home')}
                    className="accent-[#7A1438]"
                  />
                  <span>Home</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="addrType"
                    checked={addrType === 'Work'}
                    onChange={() => setAddrType('Work')}
                    className="accent-[#7A1438]"
                  />
                  <span>Work</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAddr(false)}
                  className="min-h-10 py-2 px-4 typo-btn-sm text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-10 py-2 px-5 typo-btn-sm text-white bg-[#4A0E17] hover:bg-[#380811] rounded-lg cursor-pointer transition-colors"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          {currentUser.addresses.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-[#E5D9CE] text-center space-y-2">
              <MapPin className="w-8 h-8 text-[#7A1438] mx-auto" />
              <p className="typo-h4 text-neutral-900">No saved addresses yet</p>
              <p className="typo-body-sm text-neutral-500">
                Add your preferred delivery location to speed up checkout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentUser.addresses.map((addr) => {
                const cardLabel = formatLocationLabel({
                  city: addr.city,
                  state: addr.state,
                  country: 'India'
                });
                const matched =
                  findLocationByCityOrState(`${addr.city}, ${addr.state}`) || selectedLocation;
                const estDate = formatEstimatedDate(matched.expressDays);

                return (
                  <div
                    key={addr.id}
                    className={`p-5 bg-white rounded-2xl border flex flex-col justify-between gap-3 ${
                      addr.isDefault ? 'border-[#7A1438] bg-[#FAF7F5]' : 'border-[#E5D9CE]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1 typo-body-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="typo-card-title font-bold text-neutral-900">
                            {addr.fullName}
                          </span>
                          <span className="typo-badge text-[#7A1438] bg-[#FAF2EB] px-2 py-0.5 rounded">
                            {addr.type}
                          </span>
                          {addr.isDefault && (
                            <span className="typo-badge text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {addr.street && addr.street !== cardLabel && (
                          <p className="text-neutral-600">{addr.street}</p>
                        )}
                        <p className="text-neutral-800 font-semibold typo-tabular">
                          {cardLabel}
                          {addr.pincode ? ` · ${addr.pincode}` : ''}
                        </p>
                        {addr.phone && (
                          <p className="typo-meta text-neutral-500 typo-tabular">Phone: {addr.phone}</p>
                        )}
                        <p className="typo-meta text-emerald-800 font-medium flex items-center gap-1 pt-1">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Est. arrival by {estDate}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        aria-label="Delete address"
                        className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {!addr.isDefault && (
                      <div className="pt-2 border-t border-[#F1E8E0]">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr)}
                          className="inline-flex items-center gap-1 typo-btn-sm text-[#7A1438] hover:underline cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Set as Default Delivery Location</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: ACCOUNT SETTINGS & SECURITY                                   */}
      {/* ==================================================================== */}
      {dashboardTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Edit Personal Information & Preferences */}
          <form
            onSubmit={handleSaveProfileSettings}
            className="lg:col-span-7 bg-white rounded-2xl border border-[#E5D9CE] p-5 sm:p-6 space-y-4 shadow-2xs"
          >
            <div className="border-b border-[#F1E8E0] pb-3">
              <h2 className="typo-h3 text-neutral-900">
                Profile & Shopping Preferences
              </h2>
              <p className="typo-body-sm text-neutral-500 mt-0.5">
                Update your personal details, avatar, and default shopping city.
              </p>
            </div>

            {profileMessage && (
              <div
                className={`p-3 rounded-xl typo-body-sm border ${
                  profileMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {profileMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="typo-input pl-9 pr-3 bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                  />
                </div>
              </div>

              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Email Address (Account ID)
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="typo-input bg-neutral-100 border border-[#E5D9CE] rounded-xl text-neutral-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="typo-input typo-tabular bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                />
              </div>

              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Preferred Shopping Location
                </label>
                <select
                  value={profileLocationId}
                  onChange={(e) => setProfileLocationId(e.target.value)}
                  className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                >
                  {SELECTABLE_INDIAN_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {formatLocationLabel(loc)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="typo-label text-neutral-800 block mb-1.5">
                Profile Photo URL (Optional — leave blank to display your monogram initials)
              </label>
              <input
                type="url"
                value={profileAvatarUrl}
                onChange={(e) => setProfileAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="typo-input bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#F1E8E0] typo-body-sm">
              <p className="typo-label text-neutral-800">Communication Preferences</p>
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF7F5] border border-[#EBE4DD] cursor-pointer">
                <span className="text-neutral-700">
                  Live consignment dispatch & delivery status updates
                </span>
                <input
                  type="checkbox"
                  checked={notifyOrders}
                  onChange={(e) => setNotifyOrders(e.target.checked)}
                  className="w-4 h-4 accent-[#7A1438] shrink-0"
                />
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FAF7F5] border border-[#EBE4DD] cursor-pointer">
                <span className="text-neutral-700">
                  Seasonal handloom drops, loyalty rewards & private offers
                </span>
                <input
                  type="checkbox"
                  checked={notifyPromos}
                  onChange={(e) => setNotifyPromos(e.target.checked)}
                  className="w-4 h-4 accent-[#7A1438] shrink-0"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="min-h-11 py-2.5 px-6 rounded-xl bg-[#4A0E17] hover:bg-[#380811] disabled:bg-neutral-400 text-white typo-btn transition-colors cursor-pointer"
              >
                {isSavingProfile ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </div>
          </form>

          {/* Change Password & Session Security */}
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleChangePasswordSubmit}
              className="bg-white rounded-2xl border border-[#E5D9CE] p-5 sm:p-6 space-y-4 shadow-2xs"
            >
              <div className="border-b border-[#F1E8E0] pb-3">
                <h2 className="typo-h3 text-neutral-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#7A1438]" />
                  <span>Change Account Password</span>
                </h2>
                <p className="typo-body-sm text-neutral-500 mt-0.5">
                  Passwords are hashed with cryptographic scrypt — never stored in plain text.
                </p>
              </div>

              {pwdMessage && (
                <div
                  className={`p-3 rounded-xl typo-body-sm border ${
                    pwdMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {pwdMessage.text}
                </div>
              )}

              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="typo-input pr-10 bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd((p) => !p)}
                    aria-label={showCurrentPwd ? 'Hide current password' : 'Show current password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 cursor-pointer"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars (letter + number)"
                    className="typo-input pr-10 bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd((p) => !p)}
                    aria-label={showNewPwd ? 'Hide new password' : 'Show new password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 cursor-pointer"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="typo-label text-neutral-800 block mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="typo-input pr-10 bg-[#FAF7F5] border border-[#DFD2C5] rounded-xl focus:outline-none focus:border-[#7A1438]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd((p) => !p)}
                    aria-label={showConfirmPwd ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 cursor-pointer"
                  >
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPwd}
                className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#5B112B] hover:bg-[#380811] disabled:bg-neutral-400 text-white typo-btn transition-colors cursor-pointer"
              >
                {isChangingPwd ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            {/* Sign Out Card */}
            <div className="bg-white rounded-2xl border border-[#E5D9CE] p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="typo-card-title font-bold text-neutral-900">Sign Out of Your Session</p>
                <p className="typo-meta text-neutral-500 mt-0.5">
                  Clears your authenticated server session on this browser.
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="min-h-10 py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 typo-btn-sm inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
