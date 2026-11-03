import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Product,
  CartItem,
  Order,
  OrderItem,
  User,
  Coupon,
  CategoryId,
  Address,
  OrderStatus,
  AuthModalMode,
  DashboardTab
} from '../types';
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
import {
  AuthenticatedAccountPayload,
  StoredCartRow,
  fetchCurrentSession,
  registerCustomer,
  loginCustomer,
  logoutCustomer,
  requestPasswordReset,
  confirmPasswordReset,
  updateCustomerProfile,
  changeCustomerPassword,
  saveCustomerAddresses,
  toggleCustomerWishlist,
  syncCustomerCart,
  createCustomerOrder,
  updateCustomerOrderStatus
} from '../services/authApi';

const INITIAL_PRODUCT_MAP = new Map<string, Product>(
  INITIAL_PRODUCTS.map((p) => [p.id, p])
);

const PRODUCTS_STORAGE_KEY = 'vyora_products_v8';
const LOCATION_STORAGE_KEY = 'vyora_location_v2';

// Protected routes that require an authenticated customer session
export const PROTECTED_PAGES = new Set<string>([
  'profile',
  'my_orders',
  'order_tracking',
  'order_confirmation',
  'wishlist',
  'checkout',
  'admin'
]);

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ProfileSettingsInput {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  shoppingLocationId?: string;
  notifyOrderUpdates?: boolean;
  notifyPromotions?: boolean;
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

  // Wishlist (Strictly tied to authenticated customer)
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

  // Checkout & Orders (Strictly per-customer)
  orders: Order[];
  adminOrders: Order[];
  currentOrder: Order | null;
  createOrder: (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'COD';
    deliverySpeed: 'standard' | 'express';
  }) => Promise<Order>;
  trackOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;

  // Dynamic Authentication & Customer Account
  currentUser: User | null;
  isAuthLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: AuthModalMode;
  setAuthModalMode: (mode: AuthModalMode) => void;
  openAuthModal: (mode?: AuthModalMode, redirectPage?: string | null) => void;
  dashboardTab: DashboardTab;
  setDashboardTab: (tab: DashboardTab) => void;
  openDashboardTab: (tab: DashboardTab) => void;
  registerUser: (input: RegisterInput) => Promise<User>;
  loginUser: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  sendPasswordResetCode: (email: string) => Promise<{
    email: string;
    expiresInMinutes: number;
    verificationCode: string;
    message: string;
  }>;
  resetPasswordWithCode: (payload: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<string>;
  updateProfileSettings: (input: ProfileSettingsInput) => Promise<User>;
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<string>;
  updateUserAddresses: (addresses: Address[]) => Promise<void>;

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

function serializeCartRows(items: CartItem[]): StoredCartRow[] {
  return items.map((item) => ({
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    selectedSize: item.selectedSize,
    selectedColor: item.selectedColor
  }));
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge any legacy hardcoded localStorage user/order/wishlist entries from older builds
  useEffect(() => {
    try {
      const legacyKeys = [
        'vyora_user',
        'vyora_user_v2',
        'vyora_user_v3',
        'vyora_orders',
        'vyora_orders_v2',
        'vyora_orders_v3',
        'vyora_wishlist',
        'vyora_cart',
        'vyora_saved_later'
      ];
      legacyKeys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }, []);

  // Load product catalog while keeping built-in products synced with INITIAL_PRODUCTS
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
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('overview');

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

  // Guest in-memory Cart & Authenticated DB-backed Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedForLater, setSavedForLater] = useState<CartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Authenticated Customer State (NEVER defaults to Priya Deshmukh!)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [pendingRedirectPage, setPendingRedirectPage] = useState<string | null>(null);

  // Per-Customer Data (Empty when logged out)
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Recently Viewed & Compare & Quick View
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([
    'vyo-fash-02',
    'vyo-jewel-01',
    'vyo-beauty-01'
  ]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Coupons
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const productsRef = useRef(products);
  productsRef.current = products;

  const hydrateCartItems = useCallback((rows: StoredCartRow[]): CartItem[] => {
    const prodMap = new Map(productsRef.current.map((p) => [p.id, p]));
    const hydrated: CartItem[] = [];
    for (const row of rows) {
      const prod = prodMap.get(row.productId) || INITIAL_PRODUCT_MAP.get(row.productId);
      if (!prod) continue;
      hydrated.push({
        id: row.id,
        productId: row.productId,
        product: prod,
        quantity: row.quantity,
        selectedSize: row.selectedSize,
        selectedColor: row.selectedColor
      });
    }
    return hydrated;
  }, []);

  const hydrateOrdersImages = useCallback((rawOrders: Order[]): Order[] => {
    const prodMap = new Map(productsRef.current.map((p) => [p.id, p]));
    return rawOrders.map((ord) => ({
      ...ord,
      items: ord.items.map((it) => {
        const fresh = prodMap.get(it.productId) || INITIAL_PRODUCT_MAP.get(it.productId);
        return fresh ? { ...it, image: getVariantProductImage(fresh, it.color) } : it;
      })
    }));
  }, []);

  const applyAccountPayload = useCallback(
    (payload: AuthenticatedAccountPayload) => {
      setCurrentUser(payload.user);
      setWishlist(payload.wishlist || []);
      setCart(hydrateCartItems(payload.cart || []));
      setSavedForLater(hydrateCartItems(payload.savedForLater || []));
      const hydratedOrders = hydrateOrdersImages(payload.orders || []);
      setOrders(hydratedOrders);
      setAdminOrders(
        payload.adminOrders ? hydrateOrdersImages(payload.adminOrders) : hydratedOrders
      );
      setCurrentOrder(hydratedOrders[0] || null);

      if (payload.user.shoppingLocationId) {
        const matchedLoc = SELECTABLE_INDIAN_LOCATIONS.find(
          (l) => l.id === payload.user.shoppingLocationId
        );
        if (matchedLoc) {
          setSelectedLocationState(matchedLoc);
        }
      }
    },
    [hydrateCartItems, hydrateOrdersImages]
  );

  // Bootstrap server session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchCurrentSession();
        if (cancelled) return;
        if (res.authenticated) {
          applyAccountPayload(res);
        } else {
          setCurrentUser(null);
          setWishlist([]);
          setOrders([]);
          setAdminOrders([]);
          setCurrentOrder(null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
          setWishlist([]);
          setOrders([]);
          setAdminOrders([]);
        }
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyAccountPayload]);

  // Persist non-sensitive storefront catalog & selected city preference
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
    } catch {
      /* ignore */
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
    } catch {
      /* ignore */
    }
  }, [selectedLocation]);

  // Toast Helpers
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
      const id = Date.now().toString() + Math.random().toString().slice(2, 5);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 3600);
    },
    [removeToast]
  );

  // Auth Modal Opener
  const openAuthModal = useCallback(
    (mode: AuthModalMode = 'signin', redirectPage: string | null = null) => {
      setAuthModalMode(mode);
      setPendingRedirectPage(redirectPage);
      setIsAuthModalOpen(true);
    },
    []
  );

  const openDashboardTab = useCallback((tab: DashboardTab) => {
    setDashboardTab(tab);
    setActivePage('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Location Helpers (Default: Pune, Maharashtra, India)
  const setSelectedLocation = (loc: DeliveryLocation) => {
    setSelectedLocationState(loc);
    if (currentUser) {
      updateCustomerProfile({ shoppingLocationId: loc.id })
        .then((res) => setCurrentUser(res.user))
        .catch(() => {});
    }
  };

  const checkLocationDelivery = (query: string): LocationLookupResult => {
    return resolveLocationDelivery(query);
  };

  const selectLocationByQuery = (query: string): LocationLookupResult => {
    const res = resolveLocationDelivery(query);
    if (res.serviceable && res.location) {
      setSelectedLocation(res.location);
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

  // Helper to sync cart to backend when authenticated
  const persistCartIfAuthenticated = useCallback(
    (nextCart: CartItem[], nextSaved: CartItem[]) => {
      if (!currentUser) return;
      syncCustomerCart(serializeCartRows(nextCart), serializeCartRows(nextSaved)).catch(() => {});
    },
    [currentUser]
  );

  // Cart operations
  const addToCart = (product: Product, quantity = 1, size?: string, color?: string) => {
    const selectedSize =
      size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    const selectedColor =
      color || (product.colors && product.colors.length > 0 ? product.colors[0].name : undefined);
    const itemKey = `${product.id}-${selectedSize || 'nosize'}-${selectedColor || 'nocolor'}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemKey);
      const nextCart = existing
        ? prev.map((item) =>
            item.id === itemKey ? { ...item, quantity: item.quantity + quantity } : item
          )
        : [
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
      persistCartIfAuthenticated(nextCart, savedForLater);
      return nextCart;
    });

    addToast(`Added "${product.name.slice(0, 26)}..." to bag`);
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) => {
      const nextCart = prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      persistCartIfAuthenticated(nextCart, savedForLater);
      return nextCart;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const nextCart = prev.filter((item) => item.id !== itemId);
      persistCartIfAuthenticated(nextCart, savedForLater);
      return nextCart;
    });
    addToast('Item removed from shopping bag', 'info');
  };

  const saveForLater = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;
    const nextCart = cart.filter((i) => i.id !== itemId);
    const nextSaved = [...savedForLater.filter((i) => i.id !== itemId), item];
    setCart(nextCart);
    setSavedForLater(nextSaved);
    persistCartIfAuthenticated(nextCart, nextSaved);
    addToast('Saved for later');
  };

  const moveToCartFromSaved = (itemId: string) => {
    const item = savedForLater.find((i) => i.id === itemId);
    if (!item) return;
    const nextSaved = savedForLater.filter((i) => i.id !== itemId);
    const nextCart = [...cart.filter((i) => i.id !== itemId), item];
    setSavedForLater(nextSaved);
    setCart(nextCart);
    persistCartIfAuthenticated(nextCart, nextSaved);
    addToast('Moved back to shopping bag');
  };

  const removeSavedForLater = (itemId: string) => {
    const nextSaved = savedForLater.filter((i) => i.id !== itemId);
    setSavedForLater(nextSaved);
    persistCartIfAuthenticated(cart, nextSaved);
    addToast('Item removed from saved list', 'info');
  };

  const clearCart = () => {
    setCart([]);
    persistCartIfAuthenticated([], savedForLater);
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

  // Wishlist operations (Requires authentication so each customer sees ONLY their own wishlist)
  const toggleWishlist = (productId: string) => {
    if (!currentUser) {
      addToast('Please sign in or create an account to save items to your wishlist.', 'info');
      openAuthModal('signin');
      return;
    }

    const wasSaved = wishlist.includes(productId);
    // Optimistic update backed by server SQLite row isolation
    setWishlist((prev) =>
      wasSaved ? prev.filter((id) => id !== productId) : [productId, ...prev]
    );

    toggleCustomerWishlist(productId)
      .then((res) => {
        setWishlist(res.wishlist);
        addToast(res.added ? 'Saved to your personal Wishlist' : 'Removed from Wishlist', 'info');
      })
      .catch((err) => {
        // Revert on error
        setWishlist((prev) =>
          wasSaved ? [productId, ...prev] : prev.filter((id) => id !== productId)
        );
        addToast(err.message || 'Unable to update wishlist', 'warning');
      });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Create Order (Persisted to authenticated customer's database account)
  const createOrder = async (orderData: {
    address: Address;
    paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'COD';
    deliverySpeed: 'standard' | 'express';
  }): Promise<Order> => {
    if (!currentUser) {
      openAuthModal('signin', 'checkout');
      throw new Error('Please sign in to place an order.');
    }

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

    const draftOrder: Order = {
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

    const res = await createCustomerOrder(draftOrder);
    const hydratedOrders = hydrateOrdersImages(res.orders);
    const confirmedOrder = hydratedOrders[0] || draftOrder;

    setOrders(hydratedOrders);
    if (currentUser.role === 'admin') {
      setAdminOrders((prev) => [confirmedOrder, ...prev]);
    }
    setCurrentOrder(confirmedOrder);
    setCurrentUser(res.user);
    setCart([]);
    setAppliedCoupon(null);

    addToast(`Order ${confirmedOrder.id} confirmed for ${destLabel}!`);
    return confirmedOrder;
  };

  const trackOrder = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId) || adminOrders.find((o) => o.id === orderId);
    if (order) {
      setCurrentOrder(order);
      setActivePage('order_tracking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const res = await updateCustomerOrderStatus(orderId, status);
    const nextOrders = hydrateOrdersImages(res.orders);
    setOrders(nextOrders);
    if (res.adminOrders) {
      setAdminOrders(hydrateOrdersImages(res.adminOrders));
    }
    if (currentOrder && currentOrder.id === orderId) {
      setCurrentOrder((prev) => (prev ? { ...prev, status } : null));
    }
    addToast(`Order #${orderId} marked as ${status.replace('_', ' ').toUpperCase()}`);
  };

  // ==========================================================================
  // DYNAMIC AUTHENTICATION ACTIONS
  // ==========================================================================
  const registerUser = async (input: RegisterInput): Promise<User> => {
    const payload = await registerCustomer({
      ...input,
      shoppingLocationId: selectedLocation.id,
      shoppingCity: selectedLocation.city,
      shoppingState: selectedLocation.state,
      guestCart: serializeCartRows(cart),
      guestSavedForLater: serializeCartRows(savedForLater)
    });

    applyAccountPayload(payload);
    setIsAuthModalOpen(false);
    const dest = pendingRedirectPage || 'profile';
    setPendingRedirectPage(null);
    setDashboardTab('overview');
    setActivePage(dest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast(`Welcome to VYORA, ${payload.user.name.split(' ')[0]}! Your account is ready.`);
    return payload.user;
  };

  const loginUser = async (email: string, password: string): Promise<User> => {
    const payload = await loginCustomer({
      email,
      password,
      guestCart: serializeCartRows(cart),
      guestSavedForLater: serializeCartRows(savedForLater)
    });

    applyAccountPayload(payload);
    setIsAuthModalOpen(false);
    const dest = pendingRedirectPage;
    setPendingRedirectPage(null);
    if (dest) {
      setActivePage(dest);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    addToast(`Welcome back, ${payload.user.name.split(' ')[0]}!`);
    return payload.user;
  };

  const logout = async (): Promise<void> => {
    await logoutCustomer();
    setCurrentUser(null);
    setWishlist([]);
    setOrders([]);
    setAdminOrders([]);
    setCurrentOrder(null);
    setCart([]);
    setSavedForLater([]);
    setAppliedCoupon(null);
    setDashboardTab('overview');

    if (PROTECTED_PAGES.has(activePage)) {
      setActivePage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    addToast('You have been securely signed out.', 'info');
  };

  const sendPasswordResetCode = async (email: string) => {
    return requestPasswordReset(email);
  };

  const resetPasswordWithCode = async (payload: {
    email: string;
    code: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<string> => {
    const res = await confirmPasswordReset(payload);
    addToast('Password reset successful. Please sign in with your new password.');
    return res.message;
  };

  const updateProfileSettings = async (input: ProfileSettingsInput): Promise<User> => {
    const res = await updateCustomerProfile(input);
    setCurrentUser(res.user);
    if (res.user.shoppingLocationId) {
      const matched = SELECTABLE_INDIAN_LOCATIONS.find(
        (l) => l.id === res.user.shoppingLocationId
      );
      if (matched) setSelectedLocationState(matched);
    }
    addToast('Account profile updated successfully.');
    return res.user;
  };

  const changePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<string> => {
    const res = await changeCustomerPassword(payload);
    addToast('Your account password has been updated.');
    return res.message;
  };

  const updateUserAddresses = async (addresses: Address[]): Promise<void> => {
    const res = await saveCustomerAddresses(addresses);
    setCurrentUser(res.user);
    const defaultAddr = res.user.addresses.find((a) => a.isDefault);
    if (defaultAddr) {
      const matched = findLocationByCityOrState(`${defaultAddr.city}, ${defaultAddr.state}`);
      if (matched) {
        setSelectedLocationState(matched);
        updateCustomerProfile({ shoppingLocationId: matched.id })
          .then((prof) => setCurrentUser(prof.user))
          .catch(() => {});
      }
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
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
        adminOrders,
        currentOrder,
        createOrder,
        trackOrder,
        updateOrderStatus,

        currentUser,
        isAuthLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        dashboardTab,
        setDashboardTab,
        openDashboardTab,
        registerUser,
        loginUser,
        logout,
        sendPasswordResetCode,
        resetPasswordWithCode,
        updateProfileSettings,
        changePassword,
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
