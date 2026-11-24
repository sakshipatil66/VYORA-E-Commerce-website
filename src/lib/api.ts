import {
  Address,
  AdminAnalyticsData,
  AdminCouponSummary,
  AdminCustomer,
  AdminCustomerDetail,
  AdminInventorySummary,
  AdminRefundSummary,
  AdminReturnSummary,
  AdminShipmentSummary,
  AdminNotificationSummary,
  AdminAuditLogResponse,
  AuditLogEntry,
  CmsPermission,
  StaffMember,
  AnalyticsGranularity,
  AnalyticsRange,
  CartItem,
  Coupon,
  InventoryAdjustmentReason,
  InventoryLog,
  Order,
  OrderShipmentInfo,
  OrderStatus,
  Product,
  RefundMethod,
  RefundRecord,
  RefundStatus,
  ReturnReason,
  ReturnRequest,
  ReturnStatus,
  StoreCategory,
  User
} from '../types';

export interface HomeBanner {
  id: string;
  kicker: string;
  edition: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt?: string;
  category: string;
  ctaText: string;
  secondaryCta: string;
  secondaryCategory: string;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
}

export interface BrandStoryMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
}

export interface BrandStoryContent {
  title: string;
  introduction: string;
  mission: string;
  vision: string;
  values: string[];
  milestones: BrandStoryMilestone[];
}

export interface AdminBrandStory {
  draft: BrandStoryContent;
  published: BrandStoryContent | null;
  updatedAt: string | null;
}

export interface StoreCmsContent {
  about: { eyebrow: string; title: string; description: string; promiseTitle: string; promiseDescription: string };
  contact: { eyebrow: string; title: string; description: string; email: string; hours: string; location: string; conciergeTitle: string; conciergeDescription: string };
  faq: { eyebrow: string; title: string; description: string; items: { category: string; question: string; answer: string }[] };
  policies: Record<'shipping' | 'returns' | 'privacy' | 'terms', { title: string; summary: string; body: string }>;
  footer: { description: string; email: string; newsletterTitle: string; newsletterDescription: string };
  seo: { title: string; description: string; keywords: string; ogTitle: string; ogDescription: string };
  storySections: StorefrontStorySection[];
}

export interface AdminStoreCmsContent {
  draft: StoreCmsContent;
  published: StoreCmsContent | null;
  updatedAt: string | null;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export type StorefrontStorySectionKind = 'featured-collections' | 'category-highlights' | 'editorial' | 'promotion' | 'featured-products' | 'testimonial';
export interface StorefrontStorySection {
  id: string;
  kind: StorefrontStorySectionKind;
  eyebrow: string;
  heading: string;
  description: string;
  image: string;
  imageAlt?: string;
  ctaLabel: string;
  category: string;
  active: boolean;
}

export interface AdminMediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  altText: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  usage: string[];
}

const uploadMediaFile = (path: string, file: File, onProgress?: (progress: number) => void): Promise<{ asset: AdminMediaAsset }> => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open(path.endsWith('/replace') ? 'PUT' : 'POST', path);
  xhr.withCredentials = true;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const fallbackTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
  xhr.setRequestHeader('Content-Type', file.type || fallbackTypes[extension] || 'application/octet-stream');
  xhr.setRequestHeader('X-Upload-Filename', encodeURIComponent(file.name));
  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
  };
  xhr.onerror = () => reject(new Error('Image upload failed. Check your connection and try again.'));
  xhr.onload = () => {
    let payload: { asset?: AdminMediaAsset; error?: string } = {};
    try { payload = JSON.parse(xhr.responseText) as typeof payload; } catch { /* handled below */ }
    if (xhr.status < 200 || xhr.status >= 300 || !payload.asset) reject(new Error(payload.error || `Upload failed (${xhr.status})`));
    else resolve({ asset: payload.asset });
  };
  xhr.send(file);
});

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
};

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  products: () => request<Product[]>('/products'),
  adminMedia: () => request<{ assets: AdminMediaAsset[] }>('/admin/media'),
  uploadMedia: (file: File, onProgress?: (progress: number) => void) => uploadMediaFile('/api/admin/media', file, onProgress),
  replaceMedia: (id: string, file: File, onProgress?: (progress: number) => void) => uploadMediaFile(`/api/admin/media/${encodeURIComponent(id)}/replace`, file, onProgress),
  updateMediaAlt: (id: string, altText: string) => request<{ asset: AdminMediaAsset }>(`/admin/media/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ altText }) }),
  deleteMedia: (id: string) => request<{ success: boolean }>(`/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  homeBanners: () => request<{ banners: HomeBanner[] }>('/content/home-banners'),
  saveHomeBanners: (banners: HomeBanner[]) => request<{ banners: HomeBanner[] }>('/admin/content/home-banners', {
    method: 'PUT', body: JSON.stringify({ banners })
  }),
  publicBrandStory: () => request<{ story: BrandStoryContent | null }>('/content/brand-story'),
  adminBrandStory: () => request<AdminBrandStory>('/admin/content/brand-story'),
  saveBrandStory: (story: BrandStoryContent, publish = false) => request<AdminBrandStory>('/admin/content/brand-story', {
    method: 'PUT', body: JSON.stringify({ story, publish })
  }),
  submitContactInquiry: (data: { name: string; email: string; subject: string; message: string }) =>
    request<{ success: boolean; inquiryId: string }>('/contact/inquiries', json(data)),
  adminContactInquiries: () => request<{ inquiries: ContactInquiry[] }>('/admin/contact-inquiries'),
  cmsContent: () => request<{ content: StoreCmsContent }>('/content/settings'),
  adminCmsContent: () => request<AdminStoreCmsContent>('/admin/content/settings'),
  saveCmsContent: (content: StoreCmsContent, publish = false) => request<{ content: StoreCmsContent; draft: StoreCmsContent; published: StoreCmsContent | null; updatedAt: string | null }>('/admin/content/settings', {
    method: 'PUT', body: JSON.stringify({ content, publish })
  }),
  categories: () => request<{ categories: StoreCategory[] }>('/categories'),
  coupons: () => request<{ coupons: Coupon[] }>('/coupons'),
  validateCoupon: (code: string, items: { productId: string; quantity: number }[]) =>
    request<{ valid: boolean; coupon: Coupon; discountAmount: number; eligibleSubtotal: number }>(
      '/coupons/validate',
      json({ code, items })
    ),
  me: () => request<{ user: User }>('/auth/me'),
  login: (identity: string, password: string) =>
    request<{ user: User }>('/auth/login', json({ identity, password })),
  signup: (name: string, email: string, phone: string, password: string) =>
    request<{ user: User }>('/auth/signup', json({ name, email, phone, password })),
  logout: () => request<{ success: boolean }>('/auth/logout', json({})),
  updateProfile: (user: Pick<User, 'name' | 'phone' | 'addresses'>) =>
    request<{ user: User }>('/auth/profile', { method: 'PATCH', body: JSON.stringify(user) }),
  cart: () => request<{ items: CartItem[] }>('/cart'),
  addCartItem: (productId: string, quantity: number, size?: string, color?: string) =>
    request<{ success: boolean }>('/cart/items', json({ productId, quantity, size, color })),
  updateCartItem: (id: string, quantity: number) =>
    request<{ success: boolean }>(`/cart/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    }),
  removeCartItem: (id: string) =>
    request<{ success: boolean }>(`/cart/items/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  wishlist: () => request<{ productIds: string[] }>('/wishlist'),
  saveWishlist: (productIds: string[]) =>
    request<{ productIds: string[] }>('/wishlist', { method: 'PUT', body: JSON.stringify({ productIds }) }),
  orders: () => request<{ orders: Order[] }>('/orders'),
  order: (orderId: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}`),
  createPaymentOrder: (data: {
    address: Address;
    paymentMethod: Exclude<Order['paymentMethod'], 'COD'>;
    deliverySpeed: 'standard' | 'express';
    couponCode?: string;
    giftWrap?: boolean;
  }) => request<{ razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
    '/payments/razorpay/order',
    json(data)
  ),
  createOrder: (data: {
    address: Address;
    paymentMethod: Order['paymentMethod'];
    deliverySpeed: 'standard' | 'express';
    couponCode?: string;
    giftWrap?: boolean;
    idempotencyKey: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) => request<{ order: Order }>('/orders', json(data)),
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(note ? { note } : {}) })
    }),
  updateOrderShipment: (orderId: string, shipment: OrderShipmentInfo) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}/shipment`, {
      method: 'PATCH',
      body: JSON.stringify(shipment)
    }),
  returns: () => request<{ returns: ReturnRequest[] }>('/returns'),
  returnDetail: (returnId: string) =>
    request<{ returnRequest: ReturnRequest }>(`/returns/${encodeURIComponent(returnId)}`),
  createReturn: (data: {
    orderId: string;
    reason: ReturnReason;
    description?: string;
    items: { productId: string; quantity: number }[];
  }) => request<{ returnRequest: ReturnRequest }>('/returns', json(data)),
  adminProducts: () => request<{ products: Product[] }>('/admin/products'),
  addProduct: (product: Omit<Product, 'id'>) =>
    request<{ product: Product }>('/admin/products', json(product)),
  updateProduct: (product: Product) =>
    request<{ product: Product }>(`/admin/products/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    }),
  toggleProductVisibility: (productId: string, isActive: boolean) =>
    request<{ product: Product }>(`/admin/products/${encodeURIComponent(productId)}/visibility`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    }),
  updateProductSku: (productId: string, sku: string) =>
    request<{ product: Product }>(`/admin/products/${encodeURIComponent(productId)}/sku`, {
      method: 'PATCH',
      body: JSON.stringify({ sku })
    }),
  updateProductThreshold: (productId: string, lowStockThreshold: number) =>
    request<{ product: Product }>(`/admin/products/${encodeURIComponent(productId)}/threshold`, {
      method: 'PATCH',
      body: JSON.stringify({ lowStockThreshold })
    }),
  deleteProduct: (productId: string) =>
    request<{ success: boolean }>(`/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  adminInventory: () => request<AdminInventorySummary>('/admin/inventory'),
  adjustInventory: (data: {
    productId: string;
    adjustment: number;
    reason: Exclude<InventoryAdjustmentReason, 'order_sale' | 'order_cancel_restock' | 'return_restock'>;
    note?: string;
  }) => request<{ product: Product; log: InventoryLog }>('/admin/inventory/adjust', json(data)),
  inventoryLogs: (params?: { productId?: string; reason?: string; search?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', params.productId);
    if (params?.reason) query.set('reason', params.reason);
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{ logs: InventoryLog[] }>(`/admin/inventory/logs${qs ? `?${qs}` : ''}`);
  },
  adminCustomers: () =>
    request<{
      customers: AdminCustomer[];
      stats: {
        totalCustomers: number;
        activeCustomers: number;
        inactiveCustomers: number;
        totalLifetimeValue: number;
      };
    }>('/admin/customers'),
  adminCustomer: (customerId: string) =>
    request<AdminCustomerDetail>(`/admin/customers/${encodeURIComponent(customerId)}`),
  updateCustomerStatus: (customerId: string, isActive: boolean) =>
    request<{ customer: AdminCustomer }>(`/admin/customers/${encodeURIComponent(customerId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    }),
  adminCoupons: () => request<AdminCouponSummary>('/admin/coupons'),
  addCoupon: (coupon: Coupon) =>
    request<{ coupon: Coupon }>('/admin/coupons', json(coupon)),
  updateCoupon: (code: string, coupon: Coupon) =>
    request<{ coupon: Coupon }>(`/admin/coupons/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(coupon)
    }),
  toggleCouponStatus: (code: string, isActive: boolean) =>
    request<{ coupon: Coupon }>(`/admin/coupons/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    }),
  deleteCoupon: (code: string) =>
    request<{ success: boolean }>(`/admin/coupons/${encodeURIComponent(code)}`, { method: 'DELETE' }),
  adminReturns: () => request<AdminReturnSummary>('/admin/returns'),
  updateReturnStatus: (returnId: string, status: ReturnStatus, adminNotes?: string) =>
    request<{ returnRequest: ReturnRequest }>(`/admin/returns/${encodeURIComponent(returnId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(adminNotes ? { adminNotes } : {}) })
    }),
  inspectReturnItems: (
    returnId: string,
    items: {
      productId: string;
      receivedQuantity: number;
      restockableQuantity: number;
      damagedQuantity: number;
    }[],
    adminNotes?: string
  ) =>
    request<{ returnRequest: ReturnRequest }>(`/admin/returns/${encodeURIComponent(returnId)}/inspect`, {
      method: 'POST',
      body: JSON.stringify({ items, ...(adminNotes ? { adminNotes } : {}) })
    }),
  adminRefunds: () => request<AdminRefundSummary>('/admin/refunds'),
  processRefund: (data: {
    orderId: string;
    returnId?: string;
    mode: 'razorpay' | 'manual';
    method: RefundMethod;
    amount: number;
    idempotencyKey: string;
    referenceId?: string;
    notes?: string;
    markCompleted?: boolean;
  }) => request<{ refund: RefundRecord; idempotent?: boolean }>('/admin/refunds', json(data)),
  updateRefund: (
    refundId: string,
    data: {
      status: Extract<RefundStatus, 'manually_completed' | 'failed'>;
      referenceId?: string;
      notes?: string;
    }
  ) =>
    request<{ refund: RefundRecord }>(`/admin/refunds/${encodeURIComponent(refundId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  syncRazorpayRefund: (refundId: string) =>
    request<{ refund: RefundRecord }>(`/admin/refunds/${encodeURIComponent(refundId)}/sync`, json({})),
  adminShipments: () => request<AdminShipmentSummary>('/admin/shipments'),
  adminSummary: () => request<{
    customers: number;
    products: number;
    orders: number;
    revenue: number;
    recentOrders: Order[];
    lowStock: Product[];
  }>('/admin/summary'),
  adminAnalytics: (params: {
    range: AnalyticsRange;
    granularity: AnalyticsGranularity;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams({
      range: params.range,
      granularity: params.granularity,
      ...(params.startDate ? { startDate: params.startDate } : {}),
      ...(params.endDate ? { endDate: params.endDate } : {})
    });
    return request<AdminAnalyticsData>(`/admin/analytics?${query.toString()}`);
  },
  adminStaff: () => request<{ staff: StaffMember[]; roles: string[]; permissions: CmsPermission[] }>('/admin/staff'),
  createAdminStaff: (data: { name: string; email: string; phone?: string; password: string; staffRole: StaffMember['staffRole'] }) =>
    request<{ staff: StaffMember }>('/admin/staff', json(data)),
  updateAdminStaff: (id: string, data: Partial<Pick<StaffMember, 'name' | 'email' | 'phone' | 'staffRole' | 'permissions' | 'isActive'>>) =>
    request<{ staff: StaffMember }>(`/admin/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminNotifications: () => request<AdminNotificationSummary>('/admin/notifications'),
  markAdminNotificationRead: (id: string) => request<{ success: boolean }>(`/admin/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', body: JSON.stringify({}) }),
  markAllAdminNotificationsRead: () => request<{ success: boolean }>('/admin/notifications/read-all', json({})),
  adminAuditLogs: (page = 1, pageSize = 30) => request<AdminAuditLogResponse>(`/admin/audit-logs?page=${page}&pageSize=${pageSize}`),
  adminSearch: (query: string) => request<{ results: { type: string; id: string; label: string; detail?: string; targetTab: string }[] }>(`/admin/search?q=${encodeURIComponent(query)}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/password', json({ currentPassword, newPassword })),
  addCategory: (category: StoreCategory) =>
    request<{ category: StoreCategory }>('/admin/categories', json(category)),
  updateCategory: (category: StoreCategory) =>
    request<{ category: StoreCategory }>(`/admin/categories/${encodeURIComponent(category.id)}`, {
      method: 'PUT',
      body: JSON.stringify(category)
    }),
  deleteCategory: (categoryId: string) =>
    request<{ success: boolean }>(`/admin/categories/${encodeURIComponent(categoryId)}`, { method: 'DELETE' })
};
