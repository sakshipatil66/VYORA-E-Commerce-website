export type CategoryId = string;

export interface StoreCategory {
  id: CategoryId;
  label: string;
  description: string;
  image: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  colorName?: string;
  colorCode?: string;
  size?: string;
  inStock: boolean;
  stockCount: number;
}

export interface Review {
  id: string;
  userName: string;
  userCity: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

export interface ProductQA {
  id: string;
  question: string;
  answer: string;
  askedBy: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: CategoryId;
  subCategory: string;
  tagline: string;
  description: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  images: string[];
  primaryImage: string;
  secondaryImage?: string; // Revealed on hover on cards
  colorImages?: Record<string, string>; // Color-specific image mapping
  colorHoverImages?: Record<string, string>; // Color-specific hover angle mapping
  colorGalleries?: Record<string, string[]>; // Color-specific multi-angle gallery mapping
  badge?: string; // e.g. "Handloom", "Pure Silver", "Bestseller", "New", "Budget Buy", "Trending"
  sizes?: string[];
  colors?: { name: string; hex: string; image?: string }[];
  inStock: boolean;
  stockQuantity: number;
  artisanOrigin?: string;
  fabricDetails?: string;
  dimensions?: string;
  weight?: string;
  careInstructions?: string[];
  highlights: string[];
  warranty?: string;
  returnPolicy?: string;
  qaList?: ProductQA[];
  frequentlyBoughtTogetherIds?: string[];
  reviews?: Review[];
  featured?: boolean;
  isBestseller?: boolean;
  isFlashSale?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBudgetFriendly?: boolean;
}

export interface CartItem {
  id: string; // unique item instance id: `${productId}-${selectedSize}-${selectedColor}`
  productId: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  street: string;
  landmark?: string;
  type: 'Home' | 'Work';
  isDefault: boolean;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image: string;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponApplied?: string;
  couponDiscount: number;
  giftWrap?: boolean;
  deliveryFee: number;
  total: number;
  paymentMethod: 'UPI' | 'Card' | 'Netbanking' | 'Wallet' | 'COD';
  paymentStatus: 'Paid' | 'Pending COD' | 'Pending';
  paymentId?: string;
  paymentOrderId?: string;
  shippingAddress: Address;
  status: OrderStatus;
  estimatedDeliveryDate: string;
  trackingNumber?: string;
  courierName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  clubTier: 'Silver' | 'Gold' | 'Platinum';
  clubPoints: number;
  addresses: Address[];
}
