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

export type ReviewModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export interface Review {
  id: string;
  productId?: string;
  productName?: string;
  userId?: string;
  userName: string;
  userCity: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  status?: ReviewModerationStatus;
  adminNote?: string;
  createdAt?: string;
  updatedAt?: string;
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
  sku?: string;
  isActive?: boolean;
  lowStockThreshold?: number;
  updatedAt?: string;
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
  isActive?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  applicableCategories?: CategoryId[];
  usedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export type ShipmentStatus =
  | 'pending'
  | 'packed'
  | 'dispatched'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface ShipmentHistoryEvent {
  id: string;
  orderId: string;
  shipmentStatus: ShipmentStatus;
  courierName?: string;
  trackingNumber?: string;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  updatedBy?: string;
  createdAt: string;
}

export interface OrderShipmentInfo {
  courierName?: string;
  trackingNumber?: string;
  shipmentStatus?: ShipmentStatus;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  deliveredDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  shipmentHistory?: ShipmentHistoryEvent[];
}

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
  createdAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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
  billingAddress?: Address;
  status: OrderStatus;
  statusHistory?: OrderStatusEvent[];
  shipment?: OrderShipmentInfo;
  estimatedDeliveryDate: string;
  trackingNumber?: string;
  courierName?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  stockRestored?: boolean;
}

export type StaffRole =
  | 'super_admin'
  | 'admin'
  | 'order_manager'
  | 'inventory_manager'
  | 'customer_support';

export type CmsPermission =
  | 'view_overview'
  | 'manage_products'
  | 'manage_inventory'
  | 'manage_categories'
  | 'manage_orders'
  | 'manage_shipping'
  | 'manage_returns'
  | 'manage_refunds'
  | 'manage_customers'
  | 'manage_coupons'
  | 'view_reports'
  | 'manage_notifications'
  | 'manage_staff'
  | 'view_audit_logs'
  | 'view_advanced_analytics'
  | 'manage_reviews'
  | 'manage_banners'
  | 'manage_seo'
  | 'manage_campaigns';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  staffRole?: StaffRole | null;
  permissions?: CmsPermission[];
  clubTier: 'Silver' | 'Gold' | 'Platinum';
  clubPoints: number;
  addresses: Address[];
  isActive?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AnalyticsRange = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
export type AnalyticsGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AdminAnalyticsData {
  range: AnalyticsRange;
  granularity: AnalyticsGranularity;
  startDate?: string;
  endDate?: string;
  kpis: {
    totalRevenue: number;
    grossRevenue: number;
    cancelledRevenue: number;
    totalDiscounts: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    avgOrderValue: number;
  };
  comparison: {
    revenueChangePercent: number | null;
    ordersChangePercent: number | null;
    customersChangePercent: number | null;
    previousRevenue: number;
    previousOrders: number;
    previousCustomers: number;
  };
  revenueSeries: {
    key: string;
    label: string;
    revenue: number;
    orders: number;
    cancelled: number;
  }[];
  categorySales: {
    categoryId: string;
    label: string;
    unitsSold: number;
    revenue: number;
    ordersCount: number;
  }[];
  bestSellers: {
    productId: string;
    name: string;
    category: string;
    image: string;
    unitsSold: number;
    revenue: number;
    currentStock: number;
  }[];
  recentOrders: Order[];
  recentCustomers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    clubTier: 'Silver' | 'Gold' | 'Platinum';
    createdAt: string;
    orderCount: number;
    totalSpent: number;
  }[];
  lowStock: Product[];
}

export type InventoryAdjustmentReason =
  | 'restock'
  | 'damaged'
  | 'returned'
  | 'return_restock'
  | 'correction'
  | 'manual'
  | 'order_sale'
  | 'order_cancel_restock';

export interface InventoryLog {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  previousQuantity: number;
  adjustedQuantity: number;
  newQuantity: number;
  reason: InventoryAdjustmentReason;
  note?: string;
  adminId?: string;
  adminName?: string;
  createdAt: string;
}

export interface AdminInventorySummary {
  summary: {
    totalSkus: number;
    activeSkus: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  products: Product[];
  logs: InventoryLog[];
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  clubTier: 'Silver' | 'Gold' | 'Platinum';
  clubPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  lifetimeSpent: number;
  avgOrderValue: number;
  lastOrderDate?: string;
  addressCount: number;
}

export interface AdminCustomerDetail {
  customer: AdminCustomer & { addresses: Address[] };
  orders: Order[];
  insights: {
    topCategories: { categoryId: string; label: string; ordersCount: number; totalSpent: number }[];
    paymentMethods: { method: string; count: number }[];
    couponsUsed: string[];
    totalCouponSavings: number;
  };
}

export interface CouponUsageRecord {
  id: string;
  couponCode: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  discountAmount: number;
  orderTotal: number;
  usedAt: string;
}

export interface AdminCouponSummary {
  coupons: Coupon[];
  stats: {
    totalCoupons: number;
    activeCoupons: number;
    totalRedemptions: number;
    totalDiscountGiven: number;
  };
  usages: CouponUsageRecord[];
}

export type ReturnReason =
  | 'damaged'
  | 'defective'
  | 'wrong_item'
  | 'missing_item'
  | 'other';

export type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'received'
  | 'inspected'
  | 'refunded';

export type ReturnItemInspectionStatus =
  | 'pending_inspection'
  | 'partially_inspected'
  | 'inspected';

export interface ReturnItem {
  id: string;
  returnId: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  orderedQuantity: number;
  requestedQuantity: number;
  receivedQuantity: number;
  restockableQuantity: number;
  damagedQuantity: number;
  inspectionStatus: ReturnItemInspectionStatus;
  restocked: boolean;
  restockedAt?: string;
  inspectedBy?: string;
}

export interface ReturnStatusEvent {
  status: ReturnStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description: string;
  adminNotes: string;
  returnWindowDays: number;
  deliveredAt?: string;
  eligibleUntil?: string;
  estimatedRefundAmount: number;
  refundedAmount: number;
  orderPaymentMethod?: Order['paymentMethod'];
  orderPaymentStatus?: Order['paymentStatus'];
  orderTotal?: number;
  items: ReturnItem[];
  timeline: ReturnStatusEvent[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  receivedAt?: string;
  inspectedAt?: string;
  refundedAt?: string;
}

export interface AdminReturnSummary {
  returns: ReturnRequest[];
  stats: {
    totalReturns: number;
    pendingReturns: number;
    approvedReturns: number;
    receivedReturns: number;
    inspectedReturns: number;
    refundedReturns: number;
    rejectedReturns: number;
    pendingInspectionItems: number;
  };
}

export type RefundMethod = 'razorpay' | 'manual_cod' | 'manual_bank';

export type RefundStatus =
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'manually_completed';

export interface RefundRecord {
  id: string;
  orderId: string;
  returnId?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  method: RefundMethod;
  status: RefundStatus;
  amount: number;
  currency: string;
  paymentId?: string;
  gatewayRefundId?: string;
  gatewayStatus?: string;
  referenceId?: string;
  idempotencyKey: string;
  notes: string;
  processedBy?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RefundableOrderSummary {
  orderId: string;
  customerName: string;
  customerEmail: string;
  orderStatus: OrderStatus;
  paymentMethod: Order['paymentMethod'];
  paymentStatus: Order['paymentStatus'];
  paymentId?: string;
  orderTotal: number;
  alreadyRefunded: number;
  pendingOrProcessing: number;
  remainingRefundable: number;
  createdAt?: string;
}

export interface AdminRefundSummary {
  refunds: RefundRecord[];
  refundableOrders: RefundableOrderSummary[];
  razorpayConfigured: boolean;
  stats: {
    totalRefunds: number;
    totalRefundedAmount: number;
    pendingRefunds: number;
    processingRefunds: number;
    successfulRefunds: number;
    manualCompletedRefunds: number;
    failedRefunds: number;
  };
}

export interface AdminShipmentSummary {
  shipments: Order[];
  stats: {
    totalOrders: number;
    pendingDispatch: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
    failed: number;
  };
}

// Phase 6: Sales Reports & Persistent Notification Center
export type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AdminReportsData {
  filters: {
    startDate?: string;
    endDate?: string;
    category?: string;
    productId?: string;
    orderStatus?: string;
    paymentStatus?: string;
    granularity: ReportGranularity;
  };
  salesSummary: {
    grossRevenue: number;
    netRevenue: number;
    totalDiscounts: number;
    totalRefunds: number;
    cancelledOrderValue: number;
    totalOrders: number;
    activeOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    codOrders: number;
    codRevenue: number;
    onlineOrders: number;
    onlineRevenue: number;
  };
  salesTimeline: {
    key: string;
    label: string;
    grossRevenue: number;
    netRevenue: number;
    discounts: number;
    refunds: number;
    cancelledValue: number;
    orders: number;
    codOrders: number;
    onlineOrders: number;
  }[];
  productReports: {
    productId: string;
    sku: string;
    name: string;
    category: string;
    categoryLabel: string;
    unitsSold: number;
    revenue: number;
    ordersCount: number;
    currentStock: number;
    isActive: boolean;
  }[];
  categoryReports: {
    categoryId: string;
    label: string;
    unitsSold: number;
    revenue: number;
    ordersCount: number;
    contributionPercent: number;
  }[];
  customerReports: {
    summary: {
      totalCustomers: number;
      newCustomersInPeriod: number;
      returningCustomers: number;
      repeatPurchaseRate: number;
      avgCustomerLifetimeValue: number;
    };
    topCustomers: {
      customerId: string;
      name: string;
      email: string;
      phone: string;
      clubTier: string;
      ordersCount: number;
      lifetimeValue: number;
      avgOrderValue: number;
      purchaseFrequencyDays: number | null;
      lastOrderDate?: string;
      isReturning: boolean;
    }[];
  };
  couponReports: {
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    isActive: boolean;
    redemptions: number;
    uniqueCustomers: number;
    totalDiscountGiven: number;
    attributedRevenue: number;
    usageLimit?: number | null;
  }[];
  inventoryReport: {
    summary: {
      totalSkus: number;
      activeSkus: number;
      totalUnits: number;
      lowStockCount: number;
      outOfStockCount: number;
      totalRestockedUnits: number;
      totalDamagedUnits: number;
      returnedUnitsInspected: number;
    };
    lowStockProducts: {
      id: string;
      sku: string;
      name: string;
      categoryLabel: string;
      stock: number;
      lowStockThreshold: number;
    }[];
    outOfStockProducts: {
      id: string;
      sku: string;
      name: string;
      categoryLabel: string;
      stock: number;
      lowStockThreshold: number;
    }[];
    adjustments: InventoryLog[];
  };
}

export type NotificationType =
  | 'new_order'
  | 'new_customer'
  | 'low_stock'
  | 'out_of_stock'
  | 'payment_failed'
  | 'return_requested'
  | 'refund_status'
  | 'shipping_update'
  | 'order_cancelled'
  | 'inventory_alert';

export interface AdminNotification {
  id: string;
  eventKey: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  targetTab: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminNotificationSummary {
  notifications: AdminNotification[];
  unreadCount: number;
}

// Phase 7: Staff Management & Audit Logs
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  staffRole: StaffRole;
  permissions: CmsPermission[];
  isActive: boolean;
  lastLoginAt?: string;
  activityCount: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface AdminAuditLogResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  actors: { id: string; name: string }[];
  actions: string[];
  entities: string[];
}

// Phase 8: Advanced Analytics, Reviews, Homepage Banners, SEO & Campaigns
export interface AdminAdvancedAnalytics {
  wishlistAnalytics: {
    totalWishlistItems: number;
    uniqueCustomersWithWishlist: number;
    convertedWishlistItems: number;
    wishlistConversionRate: number;
    topWishlistedProducts: {
      productId: string;
      name: string;
      categoryLabel: string;
      image: string;
      price: number;
      wishlistCount: number;
      purchasedCount: number;
    }[];
  };
  abandonedCartAnalytics: {
    abandonedCartsCount: number;
    abandonedItemsCount: number;
    totalAbandonedValue: number;
    avgAbandonedCartValue: number;
    activeCarts: {
      userId: string;
      customerName: string;
      customerEmail: string;
      itemsCount: number;
      cartValue: number;
      products: string[];
    }[];
    topAbandonedProducts: {
      productId: string;
      name: string;
      timesInCart: number;
      totalQty: number;
      potentialValue: number;
    }[];
  };
  customerBehavior: {
    totalRegisteredCustomers: number;
    customersWithOrders: number;
    repeatCustomers: number;
    oneTimeCustomers: number;
    returningCustomerRate: number;
    avgOrdersPerCustomer: number;
    paymentMethodBreakdown: { method: string; orders: number; revenue: number }[];
  };
  popularProducts: {
    productId: string;
    name: string;
    categoryLabel: string;
    unitsSold: number;
    revenue: number;
    wishlistCount: number;
    avgRating: number;
    reviewCount: number;
  }[];
  categoryPerformance: {
    categoryId: string;
    label: string;
    unitsSold: number;
    revenue: number;
    wishlistCount: number;
    avgOrderSharePercent: number;
  }[];
  revenueTrends: {
    key: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
  couponPerformance: {
    code: string;
    redemptions: number;
    discountGiven: number;
    attributedRevenue: number;
    roiMultiplier: number;
  }[];
}

export interface AdminReviewSummary {
  reviews: Review[];
  stats: {
    totalReviews: number;
    pendingReviews: number;
    approvedReviews: number;
    rejectedReviews: number;
    hiddenReviews: number;
    averageRating: number;
  };
  productSummaries: {
    productId: string;
    productName: string;
    approvedCount: number;
    pendingCount: number;
    averageRating: number;
  }[];
}

export interface HomepageBanner {
  id: string;
  kicker: string;
  edition: string;
  title: string;
  subtitle: string;
  image: string;
  category: CategoryId;
  ctaText: string;
  secondaryCta: string;
  secondaryCategory: CategoryId;
  displayOrder: number;
  isActive: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeoEntry {
  id: string;
  targetType: 'page' | 'product';
  targetKey: string;
  label?: string;
  title: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  noIndex: boolean;
  updatedAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  linkedCoupons: string[];
  bannerId?: string | null;
  bannerTitle?: string;
  performance?: {
    redemptions: number;
    totalDiscountGiven: number;
    attributedRevenue: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCampaignSummary {
  campaigns: Campaign[];
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalAttributedRevenue: number;
    totalRedemptions: number;
  };
}

