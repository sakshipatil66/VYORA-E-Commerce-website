import { Address, CartItem, Coupon, Order, OrderStatus, Product, User } from '../types';

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
  coupons: () => request<{ coupons: Coupon[] }>('/coupons'),
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
  updateOrderStatus: (orderId: string, status: OrderStatus) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  addProduct: (product: Omit<Product, 'id'>) =>
    request<{ product: Product }>('/admin/products', json(product)),
  updateProduct: (product: Product) =>
    request<{ product: Product }>(`/admin/products/${encodeURIComponent(product.id)}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    }),
  deleteProduct: (productId: string) =>
    request<{ success: boolean }>(`/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
  addCoupon: (coupon: Coupon) =>
    request<{ coupon: Coupon }>('/admin/coupons', json(coupon))
};
