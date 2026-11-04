import { Address, Order, OrderStatus, User } from '../types';

export interface StoredCartRow {
  id: string;
  productId: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface AuthenticatedAccountPayload {
  authenticated: true;
  user: User;
  wishlist: string[];
  cart: StoredCartRow[];
  savedForLater: StoredCartRow[];
  orders: Order[];
  adminOrders?: Order[];
  sessionToken?: string;
}

export interface UnauthenticatedSessionPayload {
  authenticated: false;
  user: null;
}

export type SessionCheckResponse =
  | AuthenticatedAccountPayload
  | UnauthenticatedSessionPayload;

// Kept strictly in volatile JavaScript runtime memory (NEVER written to localStorage or sessionStorage).
// Primary session persistence uses HttpOnly cookies set by /server.ts; this in-memory token acts
// only as an immediate runtime header fallback for cross-origin preview iframes with strict 3P cookie rules.
let volatileMemorySessionToken: string | null = null;

export function clearVolatileSessionToken(): void {
  volatileMemorySessionToken = null;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  };

  if (volatileMemorySessionToken) {
    headers.Authorization = `Bearer ${volatileMemorySessionToken}`;
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.error === 'string' && data.error.trim().length > 0
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function fetchCurrentSession(): Promise<SessionCheckResponse> {
  return apiRequest<SessionCheckResponse>('/api/auth/me', { method: 'GET' });
}

export async function registerCustomer(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  shoppingLocationId?: string;
  shoppingCity?: string;
  shoppingState?: string;
  guestCart?: StoredCartRow[];
  guestSavedForLater?: StoredCartRow[];
}): Promise<AuthenticatedAccountPayload> {
  const res = await apiRequest<AuthenticatedAccountPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (res.sessionToken) {
    volatileMemorySessionToken = res.sessionToken;
  }
  return res;
}

export async function loginCustomer(payload: {
  email: string;
  password: string;
  guestCart?: StoredCartRow[];
  guestSavedForLater?: StoredCartRow[];
}): Promise<AuthenticatedAccountPayload> {
  const res = await apiRequest<AuthenticatedAccountPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (res.sessionToken) {
    volatileMemorySessionToken = res.sessionToken;
  }
  return res;
}

export async function logoutCustomer(): Promise<void> {
  try {
    await apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  } finally {
    volatileMemorySessionToken = null;
  }
}

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  email: string;
  expiresInMinutes: number;
  verificationCode: string;
  message: string;
}> {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  });
}

export async function confirmPasswordReset(payload: {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  volatileMemorySessionToken = null;
  return res;
}

export async function updateCustomerProfile(payload: {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  shoppingLocationId?: string;
  notifyOrderUpdates?: boolean;
  notifyPromotions?: boolean;
}): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function changeCustomerPassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/api/account/change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function saveCustomerAddresses(addresses: Address[]): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/api/account/addresses', {
    method: 'PUT',
    body: JSON.stringify({ addresses })
  });
}

export async function toggleCustomerWishlist(productId: string): Promise<{
  wishlist: string[];
  added: boolean;
}> {
  return apiRequest<{ wishlist: string[]; added: boolean }>('/api/account/wishlist/toggle', {
    method: 'POST',
    body: JSON.stringify({ productId })
  });
}

export async function syncCustomerCart(
  cart: StoredCartRow[],
  savedForLater: StoredCartRow[]
): Promise<{ cart: StoredCartRow[]; savedForLater: StoredCartRow[] }> {
  return apiRequest<{ cart: StoredCartRow[]; savedForLater: StoredCartRow[] }>(
    '/api/account/cart',
    {
      method: 'PUT',
      body: JSON.stringify({ cart, savedForLater })
    }
  );
}

export async function createCustomerOrder(order: Order): Promise<{
  order: Order;
  orders: Order[];
  user: User;
}> {
  return apiRequest<{ order: Order; orders: Order[]; user: User }>('/api/account/orders', {
    method: 'POST',
    body: JSON.stringify({ order })
  });
}

export async function updateCustomerOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ orders: Order[]; adminOrders?: Order[] }> {
  return apiRequest<{ orders: Order[]; adminOrders?: Order[] }>(
    `/api/account/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }
  );
}

export async function fetchAdminOrders(): Promise<{ orders: Order[] }> {
  return apiRequest<{ orders: Order[] }>('/api/admin/orders', { method: 'GET' });
}
