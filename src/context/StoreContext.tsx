import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Order, OrderItem, User, Coupon, CategoryId, Address, OrderStatus } from '../types';
import { INITIAL_PRODUCTS } from '../data/products';
import { INITIAL_COUPONS } from '../data/coupons';
import { getVariantProductImage } from '../components/common/ProductImage';
import {
  DeliveryLocation,
  LocationLookupResult,
  DEFAULT_DELIVERY_LOCATION,
  SELECTABLE_INDIAN_LOCATIONS,
  formatLocationLabel,
  findLocationByCityOrState,
  resolveLocationDelivery
} from '../data/locations';

const INITIAL_PRODUCT_MAP = new Map<string, Product>(
  INITIAL_PRODUCTS.map((p) => [p.id, p])
);

const PRODUCTS_STORAGE_KEY = 'vyora_products_v8';
const USER_STORAGE_KEY = 'vyora_user_v3';
const LOCATION_STORAGE_KEY = 'vyora_location_v2';
const ORDERS_STORAGE_KEY = 'vyora_orders_v3';

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface StoreContextType {
  products: Product[];
  activePage: string;
  setActivePage: (page: string) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  openProductDetail: (id: string) => void;

  // Cart
  cart: CartItem[];
  savedForLater: CartItem[];
  addToCart: (product: Product, quantity?: number, size?: string, color?: string) => void;
  updateCartQuantity: (itemId: string, newQuantity: number) => void;
  removeFromCart: (itemId: string) => void;
  saveForLater: (itemId: string) => void;
  moveToCartFromSaved: (itemId: string) => void;
  removeSavedForLater: (itemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  cartDiscount: number;
  cartTotal: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;

  // Search & Category Navigation
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  submitSearch: (query: string) => void;
  selectedCategory: CategoryId;
  setSelectedCategory: (cat: CategoryId) => void;
  selectedSubCategory: string | null;
  setSelectedSubCategory: (sub: string | null) => void;
  openCategoryPage: (cat: CategoryId, subCategory?: string | null) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;

  // Shopping Experience: Recently Viewed, Quick View, Compare
  recentlyViewedIds: string[];
  addToRecentlyViewed: (id: string) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (prod: Product | null) => void;
  compareList: string[];
  toggleCompare: (productId: string) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;

  // Coupon
  appliedCoupon: Coupon | null;
  couponDiscountAmount: number;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;

  // Checkout & Orders
  orders: Order[];
  currentOrder: Order | null;
  createOrder: (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'COD';
    deliverySpeed: 'standard' | 'express';
  }) => Order;
  trackOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // User & Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginAsDemoUser: (role?: 'customer' | 'admin') => void;
  logout: () => void;
  updateUserAddresses: (addresses: Address[]) => void;

  // Pune, Maharashtra, India Default Delivery Location
  selectedLocation: DeliveryLocation;
  setSelectedLocation: (loc: DeliveryLocation) => void;
  selectLocationByQuery: (query: string) => LocationLookupResult;
  checkLocationDelivery: (query: string) => LocationLookupResult;
  locationPickerSignal: number;
  requestLocationPicker: () => void;

  // Admin Product CRUD
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;

  // Toast
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_USER: User = {
  id: 'usr-001',
  name: 'Priya Deshmukh',
  email: 'priya.deshmukh@example.com',
  phone: '',
  role: 'customer',
  clubTier: 'Gold',
  clubPoints: 1450,
  addresses: [
    {
      id: 'addr-pune-01',
      fullName: 'Priya Deshmukh',
      phone: '',
      pincode: '',
      city: 'Pune',
      state: 'Maharashtra',
      street: 'Pune, Maharashtra, India',
      type: 'Home',
      isDefault: true
    },
    {
      id: 'addr-mum-02',
      fullName: 'Priya Deshmukh',
      phone: '',
      pincode: '',
      city: 'Mumbai',
      state: 'Maharashtra',
      street: 'Mumbai, Maharashtra, India',
      type: 'Work',
      isDefault: false
    }
  ]
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load products from localStorage while keeping built-in catalog synced with INITIAL_PRODUCTS
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (!saved) return INITIAL_PRODUCTS;
      const parsed: Product[] = JSON.parse(saved);
      const customProducts = parsed.filter((p) => !INITIAL_PRODUCT_MAP.has(p.id));
      const refreshedBuiltIns = INITIAL_PRODUCTS.map((fresh) => {
        const prev = parsed.find((p) => p.id === fresh.id);
        return prev
          ? {
              ...prev,
              primaryImage: fresh.primaryImage,
              secondaryImage: fresh.secondaryImage,
              images: fresh.images,
              colorImages: fresh.colorImages,
              colorHoverImages: fresh.colorHoverImages,
              colorGalleries: fresh.colorGalleries,
              colors: fresh.colors
            }
          : fresh;
      });
      return [...customProducts, ...refreshedBuiltIns];
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [activePage, setActivePage] = useState<string>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);

  // Delivery Location (Default: Pune, Maharashtra, India)
  const [selectedLocation, setSelectedLocationState] = useState<DeliveryLocation>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!saved) return DEFAULT_DELIVERY_LOCATION;
      const parsed: DeliveryLocation = JSON.parse(saved);
      const matched =
        SELECTABLE_INDIAN_LOCATIONS.find((l) => l.id === parsed.id) ||
        findLocationByCityOrState(parsed.city || '');
      return matched || DEFAULT_DELIVERY_LOCATION;
    } catch {
      return DEFAULT_DELIVERY_LOCATION;
    }
  });

  const [locationPickerSignal, setLocationPickerSignal] = useState<number>(0);

  // Cart & Saved For Later
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vyora_cart');
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      return parsed.map((item) => {
        const fresh = INITIAL_PRODUCT_MAP.get(item.productId);
        return fresh ? { ...item, product: fresh } : item;
      });
    } catch {
      return [];
    }
  });

  const [savedForLater, setSavedForLater] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vyora_saved_later');
      if (!saved) return [];
      const parsed: CartItem[] = JSON.parse(saved);
      return parsed.map((item) => {
        const fresh = INITIAL_PRODUCT_MAP.get(item.productId);
        return fresh ? { ...item, product: fresh } : item;
      });
    } catch {
      return [];
    }
  });
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vyora_wishlist');
      return saved ? JSON.parse(saved) : ['vyo-fash-02', 'vyo-jewel-01'];
    } catch {
      return ['vyo-fash-02', 'vyo-jewel-01'];
    }
  });

  // Recently Viewed & Compare & Quick View
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vyora_recent');
      return saved ? JSON.parse(saved) : ['vyo-fash-02', 'vyo-jewel-01', 'vyo-beauty-01'];
    } catch {
      return ['vyo-fash-02', 'vyo-jewel-01', 'vyo-beauty-01'];
    }
  });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Coupons
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Orders (seeded with Pune, Maharashtra, India default delivery destination)
  const [orders, setOrders] = useState<Order[]>(() => {
    const defaultJewel = INITIAL_PRODUCT_MAP.get('vyo-jewel-03');
    const seedOrder: Order = {
      id: 'VYO-94281',
      date: '28 Oct 2026',
      items: [
        {
          productId: 'vyo-jewel-03',
          name: 'Nizam Jhumka Earrings with Baroque Pearl Drops',
          price: 3199,
          quantity: 1,
          size: 'One Size (7.5 cm drop)',
          color: 'Pearl & Champagne Gold',
          image: defaultJewel
            ? getVariantProductImage(defaultJewel, 'Pearl & Champagne Gold')
            : ''
        }
      ],
      subtotal: 3199,
      discount: 0,
      couponApplied: 'FIRST500',
      couponDiscount: 500,
      deliveryFee: 0,
      total: 2699,
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      shippingAddress: DEFAULT_USER.addresses[0],
      status: 'shipped',
      estimatedDeliveryDate: '04 Nov 2026',
      trackingNumber: 'BLUEDART-PNQ-8829104',
      courierName: 'VYORA Pune Priority Dispatch'
    };
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved) {
        const parsed: Order[] = JSON.parse(saved);
        return parsed.map((ord) => ({
          ...ord,
          items: ord.items.map((it) => {
            const fresh = INITIAL_PRODUCT_MAP.get(it.productId);
            return fresh
              ? { ...it, image: getVariantProductImage(fresh, it.color) }
              : it;
          })
        }));
      }
      return [seedOrder];
    } catch {
      return [seedOrder];
    }
  });
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch { /* ignore */ }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
    } catch { /* ignore */ }
  }, [selectedLocation]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_cart', JSON.stringify(cart));
    } catch { /* ignore */ }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_saved_later', JSON.stringify(savedForLater));
    } catch { /* ignore */ }
  }, [savedForLater]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_wishlist', JSON.stringify(wishlist));
    } catch { /* ignore */ }
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_recent', JSON.stringify(recentlyViewedIds));
    } catch { /* ignore */ }
  }, [recentlyViewedIds]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch { /* ignore */ }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
    } catch { /* ignore */ }
  }, [currentUser]);

  // Toast Helpers
  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Location Helpers (Default: Pune, Maharashtra, India)
  const setSelectedLocation = (loc: DeliveryLocation) => {
    setSelectedLocationState(loc);
  };

  const checkLocationDelivery = (query: string): LocationLookupResult => {
    return resolveLocationDelivery(query);
  };

  const selectLocationByQuery = (query: string): LocationLookupResult => {
    const res = resolveLocationDelivery(query);
    if (res.serviceable && res.location) {
      setSelectedLocationState(res.location);
    }
    return res;
  };

  const requestLocationPicker = () => {
    setIsCartDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLocationPickerSignal((prev) => prev + 1);
  };

  // Search & Category Navigation Helpers
  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    setSearchQuery(trimmed);
    setIsSearchModalOpen(false);
    setActivePage('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCategoryPage = (cat: CategoryId, subCategory: string | null = null) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(subCategory);
    setIsSearchModalOpen(false);
    setActivePage('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Recently Viewed
  const addToRecentlyViewed = (id: string) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((item) => item !== id);
      return [id, ...filtered].slice(0, 8);
    });
  };

  // Compare List
  const toggleCompare = (productId: string) => {
    setCompareList((prev) => {
      if (prev.includes(productId)) {
        addToast('Removed from comparison list', 'info');
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        addToast('You can compare at most 4 creations at a time', 'warning');
        return prev;
      }
      addToast('Added to product comparison');
      return [...prev, productId];
    });
  };

  const isInCompare = (productId: string) => compareList.includes(productId);
  const clearCompare = () => setCompareList([]);

  // PDP Opener
  const openProductDetail = (id: string) => {
    setSelectedProductId(id);
    addToRecentlyViewed(id);
    setIsSearchModalOpen(false);
    setActivePage('pdp');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1, size?: string, color?: string) => {
    const selectedSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    const selectedColor = color || (product.colors && product.colors.length > 0 ? product.colors[0].name : undefined);
    const itemKey = `${product.id}-${selectedSize || 'nosize'}-${selectedColor || 'nocolor'}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.id === itemKey ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [
        ...prev,
        {
          id: itemKey,
          productId: product.id,
          product,
          quantity,
          selectedSize,
          selectedColor
        }
      ];
    });

    addToast(`Added "${product.name.slice(0, 26)}..." to bag`);
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
    addToast('Item removed from shopping bag', 'info');
  };

  const saveForLater = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    setCart((prev) => prev.filter((i) => i.id !== itemId));
    setSavedForLater((prev) => [...prev, item]);
    addToast('Saved for later');
  };

  const moveToCartFromSaved = (itemId: string) => {
    const item = savedForLater.find((i) => i.id === itemId);
    if (!item) return;
    setSavedForLater((prev) => prev.filter((i) => i.id !== itemId));
    setCart((prev) => [...prev, item]);
    addToast('Moved back to shopping bag');
  };

  const removeSavedForLater = (itemId: string) => {
    setSavedForLater((prev) => prev.filter((i) => i.id !== itemId));
    addToast('Item removed from saved list', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (acc, item) => acc + item.product.discountPrice * item.quantity,
    0
  );
  const cartOriginalTotal = cart.reduce(
    (acc, item) => acc + item.product.originalPrice * item.quantity,
    0
  );
  const cartDiscount = cartOriginalTotal - cartSubtotal;

  // Coupon calculation
  let couponDiscountAmount = 0;
  if (appliedCoupon && cartSubtotal >= appliedCoupon.minOrderValue) {
    if (appliedCoupon.discountType === 'percentage') {
      const calculated = (cartSubtotal * appliedCoupon.discountValue) / 100;
      couponDiscountAmount = appliedCoupon.maxDiscount
        ? Math.min(calculated, appliedCoupon.maxDiscount)
        : calculated;
    } else {
      couponDiscountAmount = appliedCoupon.discountValue;
    }
  }

  const deliveryFee = cartSubtotal > 999 || cartSubtotal === 0 ? 0 : 99;
  const cartTotal = Math.max(0, cartSubtotal - couponDiscountAmount + deliveryFee);

  const applyCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    const found = INITIAL_COUPONS.find((c) => c.code === clean);
    if (!found) {
      return { success: false, message: 'Invalid coupon code. Try FIRST500 or FESTIVE25' };
    }
    if (cartSubtotal < found.minOrderValue) {
      return {
        success: false,
        message: `Add items worth ₹${found.minOrderValue - cartSubtotal} more to apply this coupon`
      };
    }
    setAppliedCoupon(found);
    addToast(`Coupon "${found.code}" applied successfully!`);
    return { success: true, message: 'Coupon applied!' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    addToast('Coupon removed', 'info');
  };

  // Wishlist operations
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        addToast('Removed from Wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        addToast('Saved to Wishlist');
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Create Order with location-based delivery estimate
  const createOrder = (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'COD';
    deliverySpeed: 'standard' | 'express';
  }): Order => {
    const newOrderId = `VYO-${Math.floor(10000 + Math.random() * 90000)}`;
    const items: OrderItem[] = cart.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      price: item.product.discountPrice,
      quantity: item.quantity,
      size: item.selectedSize,
      color: item.selectedColor,
      image: getVariantProductImage(item.product, item.selectedColor)
    }));

    const addrLoc =
      findLocationByCityOrState(`${orderData.address.city}, ${orderData.address.state}`) ||
      selectedLocation;
    if (addrLoc) {
      setSelectedLocationState(addrLoc);
    }

    const speedFee = orderData.deliverySpeed === 'express' ? 149 : deliveryFee;
    const finalTotal = Math.max(0, cartSubtotal - couponDiscountAmount + speedFee);

    const now = new Date();
    const deliveryDays = addrLoc
      ? orderData.deliverySpeed === 'express'
        ? addrLoc.expressDays
        : addrLoc.standardDays
      : orderData.deliverySpeed === 'express'
      ? 2
      : 4;

    const estDate = new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
    const estDateString = estDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const isPuneDest = orderData.address.city.toLowerCase().includes('pune');
    const destLabel = formatLocationLabel({
      city: orderData.address.city,
      state: orderData.address.state,
      country: 'India'
    });

    const newOrder: Order = {
      id: newOrderId,
      date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      items,
      subtotal: cartSubtotal,
      discount: cartDiscount,
      couponApplied: appliedCoupon?.code,
      couponDiscount: couponDiscountAmount,
      deliveryFee: speedFee,
      total: finalTotal,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'COD' ? 'Pending COD' : 'Paid',
      shippingAddress: orderData.address,
      status: 'confirmed',
      estimatedDeliveryDate: estDateString,
      trackingNumber: isPuneDest
        ? `PNQ-${Math.floor(1000000 + Math.random() * 9000000)}`
        : `BD-${Math.floor(1000000 + Math.random() * 9000000)}`,
      courierName: isPuneDest ? 'VYORA Pune Priority Dispatch' : 'Blue Dart Air Express'
    };

    setOrders((prev) => [newOrder, ...prev]);
    setCurrentOrder(newOrder);
    clearCart();
    setAppliedCoupon(null);

    if (currentUser) {
      const addedPoints = Math.round(finalTotal / 10);
      setCurrentUser({
        ...currentUser,
        clubPoints: currentUser.clubPoints + addedPoints
      });
    }

    addToast(`Order ${newOrderId} confirmed for ${destLabel}!`);
    return newOrder;
  };

  const trackOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setCurrentOrder(order);
      setActivePage('order_tracking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    if (currentOrder && currentOrder.id === orderId) {
      setCurrentOrder((prev) => (prev ? { ...prev, status } : null));
    }
    addToast(`Order #${orderId} marked as ${status.replace('_', ' ').toUpperCase()}`);
  };

  // User management
  const loginAsDemoUser = (role: 'customer' | 'admin' = 'customer') => {
    if (role === 'admin') {
      const adminUser: User = {
        id: 'usr-admin-01',
        name: 'Devraj Chauhan',
        email: 'admin@vyora.in',
        phone: '',
        role: 'admin',
        clubTier: 'Platinum',
        clubPoints: 8500,
        addresses: DEFAULT_USER.addresses
      };
      setCurrentUser(adminUser);
      setIsAuthModalOpen(false);
      addToast('Logged in as Store Administrator');
    } else {
      setCurrentUser(DEFAULT_USER);
      setIsAuthModalOpen(false);
      addToast('Welcome back, Priya!');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    addToast('Signed out successfully', 'info');
  };

  const updateUserAddresses = (addresses: Address[]) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, addresses });
      const defaultAddr = addresses.find((a) => a.isDefault);
      if (defaultAddr) {
        const matched = findLocationByCityOrState(`${defaultAddr.city}, ${defaultAddr.state}`);
        if (matched) setSelectedLocationState(matched);
      }
      addToast('Address book updated');
    }
  };

  // Admin Product CRUD
  const addProduct = (newProdData: Omit<Product, 'id'>) => {
    const newId = `vyo-cust-${Date.now()}`;
    const newProduct: Product = {
      ...newProdData,
      id: newId
    };
    setProducts((prev) => [newProduct, ...prev]);
    addToast(`Product "${newProduct.name}" added to catalog!`);
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    addToast(`Product "${updated.name}" updated!`);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('Product removed from catalog', 'warning');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        activePage,
        setActivePage,
        selectedProductId,
        setSelectedProductId,
        openProductDetail,

        cart,
        savedForLater,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        saveForLater,
        moveToCartFromSaved,
        removeSavedForLater,
        clearCart,
        cartCount,
        cartSubtotal,
        cartDiscount,
        cartTotal,
        isCartDrawerOpen,
        setIsCartDrawerOpen,

        wishlist,
        toggleWishlist,
        isInWishlist,

        searchQuery,
        setSearchQuery,
        submitSearch,
        selectedCategory,
        setSelectedCategory,
        selectedSubCategory,
        setSelectedSubCategory,
        openCategoryPage,
        isSearchModalOpen,
        setIsSearchModalOpen,

        recentlyViewedIds,
        addToRecentlyViewed,
        quickViewProduct,
        setQuickViewProduct,
        compareList,
        toggleCompare,
        isInCompare,
        clearCompare,

        appliedCoupon,
        couponDiscountAmount,
        applyCoupon,
        removeCoupon,

        orders,
        currentOrder,
        createOrder,
        trackOrder,
        updateOrderStatus,

        currentUser,
        setCurrentUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginAsDemoUser,
        logout,
        updateUserAddresses,

        selectedLocation,
        setSelectedLocation,
        selectLocationByQuery,
        checkLocationDelivery,
        locationPickerSignal,
        requestLocationPicker,

        addProduct,
        updateProduct,
        deleteProduct,

        toasts,
        addToast,
        removeToast
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
