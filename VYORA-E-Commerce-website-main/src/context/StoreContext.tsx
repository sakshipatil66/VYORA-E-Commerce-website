import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Order, OrderItem, User, Coupon, CategoryId, Address, OrderStatus } from '../types';
import { INITIAL_PRODUCTS } from '../data/products';
import { INITIAL_COUPONS } from '../data/coupons';
import { api } from '../lib/api';
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

const LOCATION_STORAGE_KEY = 'vyora_location_v2';

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
  coupons: Coupon[];
  couponDiscountAmount: number;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  addCoupon: (coupon: Coupon) => void;

  // Checkout & Orders
  orders: Order[];
  currentOrder: Order | null;
  refreshOrders: () => Promise<void>;
  refreshOrder: (orderId: string) => Promise<Order>;
  authReturnPage: string | null;
  setAuthReturnPage: (page: string | null) => void;
  createOrder: (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'Wallet' | 'COD';
    deliverySpeed: 'standard' | 'express';
    idempotencyKey: string;
    couponCode?: string;
    giftWrap?: boolean;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) => Promise<Order>;
  trackOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // User & Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authenticateUser: (mode: 'signin' | 'signup', values: {
    name?: string; identity: string; email?: string; phone?: string; password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAddresses: (addresses: Address[]) => Promise<boolean>;

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

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

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
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Recently Viewed & Compare & Quick View
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vyora_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Coupons
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);

  // User
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [authReturnPage, setAuthReturnPage] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Persist guest-only shopping state; signed-in data is loaded from the API.
  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
    } catch { /* ignore */ }
  }, [selectedLocation]);

  useEffect(() => {
    if (currentUser) {
      localStorage.removeItem('vyora_cart');
      return;
    }
    try {
      localStorage.setItem('vyora_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Unable to save the guest cart', error);
    }
  }, [cart, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_saved_later', JSON.stringify(savedForLater));
    } catch (error) {
      console.error('Unable to save items for later', error);
    }
  }, [savedForLater]);

  useEffect(() => {
    try {
      localStorage.setItem('vyora_recent', JSON.stringify(recentlyViewedIds));
    } catch (error) {
      console.error('Unable to save recently viewed products', error);
    }
  }, [recentlyViewedIds]);

  useEffect(() => {
    let active = true;
    api.products().then((serverProducts) => {
      if (active) setProducts(serverProducts);
    }).catch((error: Error) => {
      if (active) addToast(`Could not load the live catalog: ${error.message}`, 'warning');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.coupons().then(({ coupons: serverCoupons }) => {
      if (active) setCoupons(serverCoupons);
    }).catch((error: Error) => {
      if (active) addToast(`Could not load available coupons: ${error.message}`, 'warning');
    });
    return () => { active = false; };
  }, []);

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

  useEffect(() => {
    let active = true;
    api.me().then(({ user }) => {
      if (active) {
        setCurrentUser(user);
        setIsAuthModalOpen(false);
      }
    }).catch((error: Error) => {
      if (active && error.message !== 'Please sign in to continue') {
        addToast(`Could not restore your sign-in session: ${error.message}`, 'warning');
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setWishlist([]);
      return;
    }
    let active = true;
    Promise.all([api.cart(), api.wishlist(), api.orders()])
      .then(([serverCart, serverWishlist, serverOrders]) => {
        if (!active) return;
        setCart(serverCart.items);
        setWishlist(serverWishlist.productIds);
        setOrders(serverOrders.orders);
      })
      .catch((error: Error) => {
        if (!active) return;
        if (error.message.includes('sign in')) setCurrentUser(null);
        else addToast(`Could not load your account data: ${error.message}`, 'warning');
      });
    return () => { active = false; };
  }, [currentUser?.id]);

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

    if (currentUser) {
      api.addCartItem(product.id, quantity, selectedSize, selectedColor)
        .then(() => api.cart())
        .then(({ items }) => {
          setCart(items);
          addToast(`Added "${product.name.slice(0, 26)}..." to bag`);
        })
        .catch((error: Error) => addToast(`Could not add item to bag: ${error.message}`, 'warning'));
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemKey);
      if (existing) return prev.map((item) =>
        item.id === itemKey ? { ...item, quantity: item.quantity + quantity } : item
      );
      return [...prev, {
        id: itemKey,
        productId: product.id,
        product,
        quantity,
        selectedSize,
        selectedColor
      }];
    });
    addToast(`Added "${product.name.slice(0, 26)}..." to bag`);
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const update = () => setCart((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)));
    if (currentUser) {
      api.updateCartItem(itemId, newQuantity).then(update)
        .catch((error: Error) => addToast(`Could not update quantity: ${error.message}`, 'warning'));
    } else update();
  };

  const removeFromCart = (itemId: string) => {
    const remove = () => {
      setCart((prev) => prev.filter((item) => item.id !== itemId));
      addToast('Item removed from shopping bag', 'info');
    };
    if (currentUser) {
      api.removeCartItem(itemId).then(remove)
        .catch((error: Error) => addToast(`Could not remove item: ${error.message}`, 'warning'));
    } else remove();
  };

  const saveForLater = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    const save = () => {
      setCart((prev) => prev.filter((i) => i.id !== itemId));
      setSavedForLater((prev) => [...prev, item]);
      addToast('Saved for later');
    };
    if (currentUser) {
      api.removeCartItem(itemId).then(save)
        .catch((error: Error) => addToast(`Could not save this item: ${error.message}`, 'warning'));
    } else save();
  };

  const moveToCartFromSaved = (itemId: string) => {
    const item = savedForLater.find((i) => i.id === itemId);
    if (!item) return;
    const move = () => {
      setSavedForLater((prev) => prev.filter((i) => i.id !== itemId));
      if (!currentUser) setCart((prev) => [...prev, item]);
      else api.cart().then(({ items }) => setCart(items))
        .catch((error: Error) => addToast(`Could not refresh your bag: ${error.message}`, 'warning'));
      addToast('Moved back to shopping bag');
    };
    if (currentUser) {
      api.addCartItem(item.productId, item.quantity, item.selectedSize, item.selectedColor)
        .then(move).catch((error: Error) => addToast(`Could not move item to bag: ${error.message}`, 'warning'));
    } else move();
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
    const found = coupons.find((c) => c.code === clean);
    if (!found) {
      return { success: false, message: 'This coupon code is not valid' };
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

  const addCoupon = (coupon: Coupon) => {
    api.addCoupon(coupon).then(({ coupon: savedCoupon }) => {
      setCoupons((prev) => [...prev, savedCoupon]);
      addToast(`Coupon "${savedCoupon.code}" created successfully!`);
    }).catch((error: Error) => addToast(`Could not create coupon: ${error.message}`, 'warning'));
  };

  // Wishlist operations
  const toggleWishlist = (productId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      addToast('Sign in to save items to your wishlist', 'info');
      return;
    }
    const updated = wishlist.includes(productId)
      ? wishlist.filter((id) => id !== productId)
      : [...wishlist, productId];
    api.saveWishlist(updated).then(({ productIds }) => {
      setWishlist(productIds);
      addToast(updated.includes(productId) ? 'Saved to Wishlist' : 'Removed from Wishlist', updated.includes(productId) ? 'success' : 'info');
    }).catch((error: Error) => addToast(`Could not update wishlist: ${error.message}`, 'warning'));
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const createOrder = async (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'Wallet' | 'COD';
    deliverySpeed: 'standard' | 'express';
    idempotencyKey: string;
    giftWrap?: boolean;
    couponCode?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }): Promise<Order> => {
    const { order } = await api.createOrder({
      ...orderData,
      couponCode: orderData.couponCode ?? appliedCoupon?.code
    });
    const addrLoc = findLocationByCityOrState(`${orderData.address.city}, ${orderData.address.state}`);
    if (addrLoc) setSelectedLocationState(addrLoc);
    setOrders((prev) => [order, ...prev.filter((existing) => existing.id !== order.id)]);
    setCurrentOrder(order);
    setCart([]);
    setAppliedCoupon(null);
    addToast(`Order ${order.id} has been placed.`);
    api.products().then(setProducts)
      .catch((error: Error) => addToast(`Order placed, but inventory refresh failed: ${error.message}`, 'warning'));
    api.me().then(({ user }) => setCurrentUser(user))
      .catch((error: Error) => addToast(`Order placed, but account refresh failed: ${error.message}`, 'warning'));
    return order;
  };

  const refreshOrders = async () => {
    const result = await api.orders();
    setOrders(result.orders);
  };

  const refreshOrder = async (orderId: string) => {
    const { order } = await api.order(orderId);
    setOrders((prev) => [order, ...prev.filter((existing) => existing.id !== order.id)]);
    setCurrentOrder(order);
    return order;
  };

  const trackOrder = async (orderId: string) => {
    try {
      await refreshOrder(orderId);
      setActivePage('order_tracking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      addToast(`Could not load order details: ${(error as Error).message}`, 'warning');
    }
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    api.updateOrderStatus(orderId, status).then(({ order }) => {
      setOrders((prev) => prev.map((existing) => existing.id === orderId ? order : existing));
      setCurrentOrder((prev) => prev?.id === orderId ? order : prev);
      addToast(`Order #${orderId} marked as ${status.replace('_', ' ').toUpperCase()}`);
    }).catch((error: Error) => addToast(`Could not update order status: ${error.message}`, 'warning'));
  };

  const authenticateUser = async (
    mode: 'signin' | 'signup',
    values: { name?: string; identity: string; email?: string; phone?: string; password: string }
  ) => {
    const guestCart = currentUser ? [] : cart;
    const result = mode === 'signup'
      ? await api.signup(values.name || '', values.email || '', values.phone || '', values.password)
      : await api.login(values.identity, values.password);
    for (const item of guestCart) {
      try {
        await api.addCartItem(item.productId, item.quantity, item.selectedSize, item.selectedColor);
      } catch (error) {
        addToast(`Could not move "${item.product.name}" into your account bag: ${(error as Error).message}`, 'warning');
      }
    }
    setCurrentUser(result.user);
    setIsAuthModalOpen(false);
    setActivePage(authReturnPage || 'home');
    setAuthReturnPage(null);
    addToast(`Welcome${result.user.name ? `, ${result.user.name}` : ''}!`);
  };

  const logout = async () => {
    try {
      await api.logout();
      addToast('Signed out successfully', 'info');
    } catch (error) {
      addToast(`Signed out locally, but the server could not invalidate the session: ${(error as Error).message}`, 'warning');
    } finally {
      setCurrentUser(null);
      setOrders([]);
      setWishlist([]);
      setCart([]);
      setSavedForLater([]);
      setCurrentOrder(null);
      setActivePage('home');
      setAuthReturnPage(null);
      setIsAuthModalOpen(true);
    }
  };

  const updateUserAddresses = async (addresses: Address[]) => {
    if (!currentUser) return false;
    try {
      const { user } = await api.updateProfile({
        name: currentUser.name,
        phone: currentUser.phone,
        addresses
      });
      setCurrentUser(user);
      const defaultAddr = addresses.find((address) => address.isDefault);
      if (defaultAddr) {
        const matched = findLocationByCityOrState(`${defaultAddr.city}, ${defaultAddr.state}`);
        if (matched) setSelectedLocationState(matched);
      }
      addToast('Address book updated');
      return true;
    } catch (error) {
      addToast(`Could not update your addresses: ${(error as Error).message}`, 'warning');
      return false;
    }
  };

  // Admin Product CRUD
  const addProduct = (newProdData: Omit<Product, 'id'>) => {
    api.addProduct(newProdData).then(({ product }) => {
      setProducts((prev) => [product, ...prev]);
      addToast(`Product "${product.name}" added to catalog!`);
    }).catch((error: Error) => addToast(`Could not add product: ${error.message}`, 'warning'));
  };

  const updateProduct = (updated: Product) => {
    api.updateProduct(updated).then(({ product }) => {
      setProducts((prev) => prev.map((item) => item.id === product.id ? product : item));
      addToast(`Product "${product.name}" updated!`);
    }).catch((error: Error) => addToast(`Could not update product: ${error.message}`, 'warning'));
  };

  const deleteProduct = (id: string) => {
    api.deleteProduct(id).then(() => {
      setProducts((prev) => prev.filter((product) => product.id !== id));
      addToast('Product removed from catalog', 'warning');
    }).catch((error: Error) => addToast(`Could not remove product: ${error.message}`, 'warning'));
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
        coupons,
        couponDiscountAmount,
        applyCoupon,
        removeCoupon,
        addCoupon,

        orders,
        currentOrder,
        refreshOrders,
        refreshOrder,
        authReturnPage,
        setAuthReturnPage,
        createOrder,
        trackOrder,
        updateOrderStatus,

        currentUser,
        setCurrentUser,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authenticateUser,
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
