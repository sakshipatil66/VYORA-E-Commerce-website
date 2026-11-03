import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(__dirname, process.env.DATABASE_PATH)
  : path.resolve(__dirname, 'data', 'vyora.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================================
// 1. RELATIONAL DATABASE SCHEMA (STRICT PER-USER DATA ISOLATION)
// ============================================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
    club_tier TEXT NOT NULL DEFAULT 'Silver' CHECK(club_tier IN ('Silver', 'Gold', 'Platinum')),
    club_points INTEGER NOT NULL DEFAULT 500,
    shopping_location_id TEXT NOT NULL DEFAULT 'loc-pune-default',
    notify_order_updates INTEGER NOT NULL DEFAULT 1,
    notify_promotions INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    pincode TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    street TEXT NOT NULL,
    landmark TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'Home',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

  CREATE TABLE IF NOT EXISTS wishlists (
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    user_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    selected_size TEXT NOT NULL DEFAULT '',
    selected_color TEXT NOT NULL DEFAULT '',
    saved_for_later INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, item_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL NOT NULL,
    coupon_applied TEXT NOT NULL DEFAULT '',
    coupon_discount REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    shipping_address_json TEXT NOT NULL,
    status TEXT NOT NULL,
    estimated_delivery_date TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    courier_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
`);

// ============================================================================
// 2. CRYPTOGRAPHIC PASSWORD & SESSION SECURITY HELPERS
// ============================================================================
const SESSION_COOKIE_NAME = 'vyora_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const expectedHex = parts[2];
    const actualBuf = crypto.scryptSync(password, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function computeTierFromPoints(points: number): 'Silver' | 'Gold' | 'Platinum' {
  if (points >= 5000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  return 'Silver';
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function isSecureRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.headers['x-forwarded-proto'];
  if (typeof proto === 'string' && proto.split(',')[0].trim() === 'https') {
    return true;
  }
  return false;
}

function setSessionCookie(req: Request, res: Response, rawToken: string): void {
  const secure = isSecureRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${SESSION_TTL_SECONDS}`
  ];
  if (secure) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0'
  ];
  if (secure) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function extractRawToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function createSessionForUser(userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(rawToken);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).run(tokenHash, userId, expiresAt, new Date(now).toISOString());
  return rawToken;
}

// ============================================================================
// 3. SEED NORMAL CUSTOMER & ADMIN ACCOUNTS (NEVER AUTO-LOGGED IN)
// ============================================================================
function seedInitialAccounts(): void {
  const nowIso = new Date().toISOString();

  // Priya Deshmukh is seeded ONLY as a normal registered customer in the database,
  // never automatically logged in or treated as a global default profile.
  const existingPriya = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get('priya.deshmukh@example.com') as { id: string } | undefined;

  if (!existingPriya) {
    const priyaId = 'usr_priya_001';
    db.prepare(
      `INSERT INTO users (
        id, name, email, phone, password_hash, avatar_url, role,
        club_tier, club_points, shopping_location_id,
        notify_order_updates, notify_promotions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
    ).run(
      priyaId,
      'Priya Deshmukh',
      'priya.deshmukh@example.com',
      '',
      hashPassword('Priya@2026'),
      '',
      'customer',
      'Gold',
      1450,
      'loc-pune-default',
      nowIso,
      nowIso
    );

    const priyaAddress = {
      id: 'addr_priya_pune',
      fullName: 'Priya Deshmukh',
      phone: '',
      pincode: '',
      city: 'Pune',
      state: 'Maharashtra',
      street: 'Pune, Maharashtra, India',
      landmark: '',
      type: 'Home',
      isDefault: true
    };

    db.prepare(
      `INSERT INTO addresses (
        id, user_id, full_name, phone, pincode, city, state, street, landmark, type, is_default, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      priyaAddress.id,
      priyaId,
      priyaAddress.fullName,
      priyaAddress.phone,
      priyaAddress.pincode,
      priyaAddress.city,
      priyaAddress.state,
      priyaAddress.street,
      priyaAddress.landmark,
      priyaAddress.type,
      nowIso
    );

    db.prepare(
      `INSERT INTO wishlists (user_id, product_id, created_at) VALUES (?, ?, ?), (?, ?, ?)`
    ).run(priyaId, 'vyo-fash-02', nowIso, priyaId, 'vyo-jewel-01', nowIso);

    const sampleOrderItems = [
      {
        productId: 'vyo-jewel-03',
        name: 'Nizam Jhumka Earrings with Baroque Pearl Drops',
        price: 3199,
        quantity: 1,
        size: 'One Size (7.5 cm drop)',
        color: 'Pearl & Champagne Gold',
        image: ''
      }
    ];

    db.prepare(
      `INSERT INTO orders (
        id, user_id, date, items_json, subtotal, discount, coupon_applied,
        coupon_discount, delivery_fee, total, payment_method, payment_status,
        shipping_address_json, status, estimated_delivery_date, tracking_number,
        courier_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      'VYO-94281',
      priyaId,
      '28 Oct 2026',
      JSON.stringify(sampleOrderItems),
      3199,
      0,
      'FIRST500',
      500,
      0,
      2699,
      'UPI',
      'Paid',
      JSON.stringify(priyaAddress),
      'shipped',
      '04 Nov 2026',
      'PNQ-8829104',
      'VYORA Pune Priority Dispatch',
      Date.now() - 86400000
    );
  }

  // Store Administrator account
  const existingAdmin = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get('admin@vyora.in') as { id: string } | undefined;

  if (!existingAdmin) {
    const adminId = 'usr_admin_001';
    db.prepare(
      `INSERT INTO users (
        id, name, email, phone, password_hash, avatar_url, role,
        club_tier, club_points, shopping_location_id,
        notify_order_updates, notify_promotions, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`
    ).run(
      adminId,
      'Devraj Chauhan',
      'admin@vyora.in',
      '',
      hashPassword('VyoraAdmin@2026'),
      '',
      'admin',
      'Platinum',
      8500,
      'loc-pune-default',
      nowIso,
      nowIso
    );
  }
}

seedInitialAccounts();

// ============================================================================
// 4. DATA SERIALIZATION HELPERS (SCOPED STRICTLY TO USER_ID)
// ============================================================================
interface DbUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  avatar_url: string;
  role: 'customer' | 'admin';
  club_tier: 'Silver' | 'Gold' | 'Platinum';
  club_points: number;
  shopping_location_id: string;
  notify_order_updates: number;
  notify_promotions: number;
  created_at: string;
  updated_at: string;
}

function getAddressesForUser(userId: string) {
  const rows = db
    .prepare(
      `SELECT id, full_name, phone, pincode, city, state, street, landmark, type, is_default
       FROM addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at ASC`
    )
    .all(userId) as Array<{
      id: string;
      full_name: string;
      phone: string;
      pincode: string;
      city: string;
      state: string;
      street: string;
      landmark: string;
      type: 'Home' | 'Work';
      is_default: number;
    }>;

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    pincode: r.pincode,
    city: r.city,
    state: r.state,
    street: r.street,
    landmark: r.landmark || undefined,
    type: r.type === 'Work' ? 'Work' : 'Home',
    isDefault: Boolean(r.is_default)
  }));
}

function serializeUser(row: DbUserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url || '',
    role: row.role,
    clubTier: row.club_tier,
    clubPoints: row.club_points,
    shoppingLocationId: row.shopping_location_id || 'loc-pune-default',
    notifyOrderUpdates: Boolean(row.notify_order_updates),
    notifyPromotions: Boolean(row.notify_promotions),
    createdAt: row.created_at,
    addresses: getAddressesForUser(row.id)
  };
}

function getWishlistForUser(userId: string): string[] {
  const rows = db
    .prepare(`SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId) as Array<{ product_id: string }>;
  return rows.map((r) => r.product_id);
}

function getCartRowsForUser(userId: string) {
  const rows = db
    .prepare(
      `SELECT item_key, product_id, quantity, selected_size, selected_color, saved_for_later
       FROM cart_items
       WHERE user_id = ?`
    )
    .all(userId) as Array<{
      item_key: string;
      product_id: string;
      quantity: number;
      selected_size: string;
      selected_color: string;
      saved_for_later: number;
    }>;

  const cart = rows
    .filter((r) => !r.saved_for_later)
    .map((r) => ({
      id: r.item_key,
      productId: r.product_id,
      quantity: r.quantity,
      selectedSize: r.selected_size || undefined,
      selectedColor: r.selected_color || undefined
    }));

  const savedForLater = rows
    .filter((r) => Boolean(r.saved_for_later))
    .map((r) => ({
      id: r.item_key,
      productId: r.product_id,
      quantity: r.quantity,
      selectedSize: r.selected_size || undefined,
      selectedColor: r.selected_color || undefined
    }));

  return { cart, savedForLater };
}

function mapOrderRow(r: any) {
  return {
    id: r.id,
    date: r.date,
    items: JSON.parse(r.items_json),
    subtotal: r.subtotal,
    discount: r.discount,
    couponApplied: r.coupon_applied || undefined,
    couponDiscount: r.coupon_discount,
    deliveryFee: r.delivery_fee,
    total: r.total,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    shippingAddress: JSON.parse(r.shipping_address_json),
    status: r.status,
    estimatedDeliveryDate: r.estimated_delivery_date,
    trackingNumber: r.tracking_number,
    courierName: r.courier_name
  };
}

function getOrdersForUser(userId: string) {
  const rows = db
    .prepare(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`)
    .all(userId);
  return rows.map(mapOrderRow);
}

function getAllOrdersForAdmin() {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  return rows.map(mapOrderRow);
}

function mergeGuestCartItems(
  userId: string,
  guestCart?: Array<{ id: string; productId: string; quantity: number; selectedSize?: string; selectedColor?: string }>,
  guestSaved?: Array<{ id: string; productId: string; quantity: number; selectedSize?: string; selectedColor?: string }>
) {
  const upsert = db.prepare(
    `INSERT INTO cart_items (user_id, item_key, product_id, quantity, selected_size, selected_color, saved_for_later)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, item_key) DO UPDATE SET
       quantity = cart_items.quantity + excluded.quantity,
       saved_for_later = excluded.saved_for_later`
  );

  const tx = db.transaction(() => {
    if (Array.isArray(guestCart)) {
      for (const item of guestCart.slice(0, 50)) {
        if (!item?.id || !item?.productId || Number(item.quantity) <= 0) continue;
        upsert.run(
          userId,
          String(item.id).slice(0, 120),
          String(item.productId).slice(0, 64),
          Math.min(20, Math.max(1, Math.floor(Number(item.quantity)))),
          String(item.selectedSize || '').slice(0, 60),
          String(item.selectedColor || '').slice(0, 60),
          0
        );
      }
    }
    if (Array.isArray(guestSaved)) {
      for (const item of guestSaved.slice(0, 50)) {
        if (!item?.id || !item?.productId || Number(item.quantity) <= 0) continue;
        upsert.run(
          userId,
          String(item.id).slice(0, 120),
          String(item.productId).slice(0, 64),
          Math.min(20, Math.max(1, Math.floor(Number(item.quantity)))),
          String(item.selectedSize || '').slice(0, 60),
          String(item.selectedColor || '').slice(0, 60),
          1
        );
      }
    }
  });
  tx();
}

function buildAccountPayload(userRow: DbUserRow, sessionToken?: string) {
  const { cart, savedForLater } = getCartRowsForUser(userRow.id);
  const orders = getOrdersForUser(userRow.id);
  const adminOrders = userRow.role === 'admin' ? getAllOrdersForAdmin() : undefined;
  return {
    authenticated: true,
    user: serializeUser(userRow),
    wishlist: getWishlistForUser(userRow.id),
    cart,
    savedForLater,
    orders,
    adminOrders,
    ...(sessionToken ? { sessionToken } : {})
  };
}

// ============================================================================
// 5. AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ============================================================================
interface AuthenticatedRequest extends Request {
  authUser?: DbUserRow;
  rawSessionToken?: string;
}

function resolveSessionUser(req: AuthenticatedRequest): DbUserRow | null {
  const rawToken = extractRawToken(req);
  if (!rawToken) return null;
  const tokenHash = sha256Hex(rawToken);
  const session = db
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`)
    .get(tokenHash) as { user_id: string; expires_at: number } | undefined;

  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
    return null;
  }

  const user = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(session.user_id) as DbUserRow | undefined;

  if (!user) return null;
  req.authUser = user;
  req.rawSessionToken = rawToken;
  return user;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges are required for this action.' });
    return;
  }
  next();
}

// ============================================================================
// 6. VALIDATION HELPERS
// ============================================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizePhone(rawPhone: string): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = String(rawPhone || '').trim();
  const digitsOnly = trimmed.replace(/\D/g, '');
  // Accept 10-digit Indian numbers or 11-12 digits starting with 91 / 0
  let normalized = digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    normalized = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    normalized = digitsOnly.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(normalized) && !(digitsOnly.length >= 10 && digitsOnly.length <= 14)) {
    return {
      valid: false,
      cleaned: '',
      error: 'Please enter a valid 10-digit mobile number.'
    };
  }
  return { valid: true, cleaned: normalized.length === 10 ? `+91 ${normalized}` : `+${digitsOnly}` };
}

function validatePasswordStrength(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password must not exceed 128 characters.';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

// ============================================================================
// 7. EXPRESS APP & API ROUTES
// ============================================================================
async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '512kb' }));

  // --- Health Check ---
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // --- Current Authenticated Session Check ---
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    const user = resolveSessionUser(req);
    if (!user) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json(buildAccountPayload(user));
  });

  // --- Customer Registration ---
  app.post('/api/auth/register', (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        confirmPassword,
        shoppingLocationId,
        shoppingCity,
        shoppingState,
        guestCart,
        guestSavedForLater
      } = req.body || {};

      const cleanName = String(name || '').trim();
      if (cleanName.length < 2 || cleanName.length > 80) {
        res.status(400).json({ error: 'Please enter your full name (2 to 80 characters).' });
        return;
      }

      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 120) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const phoneCheck = normalizePhone(phone);
      if (!phoneCheck.valid) {
        res.status(400).json({ error: phoneCheck.error });
        return;
      }

      const pwdError = validatePasswordStrength(password);
      if (pwdError) {
        res.status(400).json({ error: pwdError });
        return;
      }

      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Password and Confirm Password do not match.' });
        return;
      }

      // Prevent duplicate email registrations
      const existing = db
        .prepare(`SELECT id FROM users WHERE email = ?`)
        .get(cleanEmail) as { id: string } | undefined;

      if (existing) {
        res.status(409).json({
          error: 'An account with this email address is already registered. Please sign in instead.'
        });
        return;
      }

      const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const nowIso = new Date().toISOString();
      const locId = String(shoppingLocationId || 'loc-pune-default').slice(0, 60);
      const city = String(shoppingCity || 'Pune').trim() || 'Pune';
      const state = String(shoppingState || 'Maharashtra').trim() || 'Maharashtra';
      const defaultStreet = `${city}, ${state}, India`;

      const createAccountTx = db.transaction(() => {
        db.prepare(
          `INSERT INTO users (
            id, name, email, phone, password_hash, avatar_url, role,
            club_tier, club_points, shopping_location_id,
            notify_order_updates, notify_promotions, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, '', 'customer', 'Silver', 500, ?, 1, 1, ?, ?)`
        ).run(
          userId,
          cleanName,
          cleanEmail,
          phoneCheck.cleaned,
          hashPassword(password),
          locId,
          nowIso,
          nowIso
        );

        // Create customer's own initial delivery location card
        db.prepare(
          `INSERT INTO addresses (
            id, user_id, full_name, phone, pincode, city, state, street, landmark, type, is_default, created_at
          ) VALUES (?, ?, ?, ?, '', ?, ?, ?, '', 'Home', 1, ?)`
        ).run(
          `addr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
          userId,
          cleanName,
          phoneCheck.cleaned,
          city,
          state,
          defaultStreet,
          nowIso
        );
      });

      createAccountTx();
      mergeGuestCartItems(userId, guestCart, guestSavedForLater);

      const rawSessionToken = createSessionForUser(userId);
      setSessionCookie(req, res, rawSessionToken);

      const createdUser = db
        .prepare(`SELECT * FROM users WHERE id = ?`)
        .get(userId) as DbUserRow;

      res.status(201).json(buildAccountPayload(createdUser, rawSessionToken));
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Unable to complete registration right now. Please try again.' });
    }
  });

  // --- Customer Login ---
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password, guestCart, guestSavedForLater } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const rawPassword = String(password || '');

      if (!cleanEmail || !rawPassword) {
        res.status(400).json({ error: 'Please enter both your email address and password.' });
        return;
      }

      const userRow = db
        .prepare(`SELECT * FROM users WHERE email = ?`)
        .get(cleanEmail) as DbUserRow | undefined;

      if (!userRow || !verifyPassword(rawPassword, userRow.password_hash)) {
        res.status(401).json({
          error: 'Invalid email address or password. Please verify your credentials and try again.'
        });
        return;
      }

      mergeGuestCartItems(userRow.id, guestCart, guestSavedForLater);

      const rawSessionToken = createSessionForUser(userRow.id);
      setSessionCookie(req, res, rawSessionToken);

      res.json(buildAccountPayload(userRow, rawSessionToken));
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Unable to sign in right now. Please try again.' });
    }
  });

  // --- Sign Out ---
  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    const rawToken = extractRawToken(req);
    if (rawToken) {
      const tokenHash = sha256Hex(rawToken);
      db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash);
    }
    clearSessionCookie(req, res);
    res.json({ success: true });
  });

  // --- Forgot Password (Generates Time-Limited Verification Code) ---
  app.post('/api/auth/forgot-password', (req, res) => {
    try {
      const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
      if (!EMAIL_REGEX.test(cleanEmail)) {
        res.status(400).json({ error: 'Please enter a valid registered email address.' });
        return;
      }

      const userRow = db
        .prepare(`SELECT id, name, email FROM users WHERE email = ?`)
        .get(cleanEmail) as { id: string; name: string; email: string } | undefined;

      if (!userRow) {
        res.status(404).json({
          error: 'No VYORA customer account was found with this email address.'
        });
        return;
      }

      // Invalidate any prior unused reset codes for this user
      db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?`).run(userRow.id);

      const resetCode = String(crypto.randomInt(100000, 999999));
      const tokenHash = sha256Hex(`${cleanEmail}:${resetCode}`);
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      db.prepare(
        `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used, created_at)
         VALUES (?, ?, ?, 0, ?)`
      ).run(tokenHash, userRow.id, expiresAt, new Date().toISOString());

      res.json({
        success: true,
        email: cleanEmail,
        expiresInMinutes: 15,
        // Surfaced for direct in-app verification when external SMTP is not configured
        verificationCode: resetCode,
        message: 'A 6-digit password reset code has been generated for your account.'
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Unable to initiate password reset. Please try again.' });
    }
  });

  // --- Reset Password ---
  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const { email, code, newPassword, confirmPassword } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanCode = String(code || '').trim();

      if (!EMAIL_REGEX.test(cleanEmail) || !cleanCode) {
        res.status(400).json({ error: 'Please provide your email address and 6-digit reset code.' });
        return;
      }

      const pwdError = validatePasswordStrength(newPassword);
      if (pwdError) {
        res.status(400).json({ error: pwdError });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'New Password and Confirm Password do not match.' });
        return;
      }

      const userRow = db
        .prepare(`SELECT id FROM users WHERE email = ?`)
        .get(cleanEmail) as { id: string } | undefined;

      if (!userRow) {
        res.status(400).json({ error: 'Invalid or expired reset code.' });
        return;
      }

      const tokenHash = sha256Hex(`${cleanEmail}:${cleanCode}`);
      const resetRow = db
        .prepare(
          `SELECT token_hash, expires_at, used
           FROM password_reset_tokens
           WHERE token_hash = ? AND user_id = ?`
        )
        .get(tokenHash, userRow.id) as
        | { token_hash: string; expires_at: number; used: number }
        | undefined;

      if (!resetRow || resetRow.used === 1 || resetRow.expires_at <= Date.now()) {
        res.status(400).json({
          error: 'Invalid or expired reset code. Please request a fresh code.'
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const resetTx = db.transaction(() => {
        db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(
          hashPassword(newPassword),
          nowIso,
          userRow.id
        );
        db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?`).run(tokenHash);
        // Revoke all active sessions on password reset for security
        db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userRow.id);
      });
      resetTx();

      clearSessionCookie(req, res);
      res.json({
        success: true,
        message: 'Password updated successfully. You may now sign in with your new password.'
      });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Unable to reset password right now. Please try again.' });
    }
  });

  // ==========================================================================
  // PROTECTED CUSTOMER ACCOUNT ROUTES (STRICTLY SCOPED TO req.authUser.id)
  // ==========================================================================

  // --- Update Customer Profile & Settings ---
  app.put('/api/account/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const {
      name,
      phone,
      avatarUrl,
      shoppingLocationId,
      notifyOrderUpdates,
      notifyPromotions
    } = req.body || {};

    const nextName = name !== undefined ? String(name).trim() : user.name;
    if (nextName.length < 2 || nextName.length > 80) {
      res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
      return;
    }

    let nextPhone = user.phone;
    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (trimmedPhone === '') {
        nextPhone = '';
      } else {
        const phoneCheck = normalizePhone(trimmedPhone);
        if (!phoneCheck.valid) {
          res.status(400).json({ error: phoneCheck.error });
          return;
        }
        nextPhone = phoneCheck.cleaned;
      }
    }

    const nextAvatar =
      avatarUrl !== undefined ? String(avatarUrl).trim().slice(0, 500) : user.avatar_url;
    const nextLocId =
      shoppingLocationId !== undefined
        ? String(shoppingLocationId).trim().slice(0, 60)
        : user.shopping_location_id;
    const nextNotifyOrders =
      notifyOrderUpdates !== undefined
        ? notifyOrderUpdates
          ? 1
          : 0
        : user.notify_order_updates;
    const nextNotifyPromos =
      notifyPromotions !== undefined ? (notifyPromotions ? 1 : 0) : user.notify_promotions;

    db.prepare(
      `UPDATE users
       SET name = ?, phone = ?, avatar_url = ?, shopping_location_id = ?,
           notify_order_updates = ?, notify_promotions = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      nextName,
      nextPhone,
      nextAvatar,
      nextLocId,
      nextNotifyOrders,
      nextNotifyPromos,
      new Date().toISOString(),
      user.id
    );

    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as DbUserRow;
    res.json({ user: serializeUser(updated) });
  });

  // --- Authenticated Change Password ---
  app.post('/api/account/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !verifyPassword(String(currentPassword), user.password_hash)) {
      res.status(400).json({ error: 'Your current password is incorrect.' });
      return;
    }

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) {
      res.status(400).json({ error: pwdError });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'New Password and Confirm Password do not match.' });
      return;
    }

    const currentTokenHash = req.rawSessionToken ? sha256Hex(req.rawSessionToken) : '';
    const tx = db.transaction(() => {
      db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(
        hashPassword(newPassword),
        new Date().toISOString(),
        user.id
      );
      if (currentTokenHash) {
        db.prepare(`DELETE FROM sessions WHERE user_id = ? AND token_hash != ?`).run(
          user.id,
          currentTokenHash
        );
      }
    });
    tx();

    res.json({ success: true, message: 'Password updated successfully.' });
  });

  // --- Replace / Update Customer Saved Addresses ---
  app.put('/api/account/addresses', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const addresses = req.body?.addresses;
    if (!Array.isArray(addresses)) {
      res.status(400).json({ error: 'Invalid addresses payload.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const insertStmt = db.prepare(
      `INSERT INTO addresses (
        id, user_id, full_name, phone, pincode, city, state, street, landmark, type, is_default, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM addresses WHERE user_id = ?`).run(user.id);
      addresses.slice(0, 20).forEach((addr: any, idx: number) => {
        const id = String(addr.id || `addr_${crypto.randomUUID().slice(0, 10)}`).slice(0, 64);
        const fullName = String(addr.fullName || user.name).trim().slice(0, 80);
        const phone = String(addr.phone || '').trim().slice(0, 24);
        const pincode = String(addr.pincode || '').trim().slice(0, 10);
        const city = String(addr.city || 'Pune').trim().slice(0, 60);
        const state = String(addr.state || 'Maharashtra').trim().slice(0, 60);
        const street = String(addr.street || `${city}, ${state}, India`).trim().slice(0, 240);
        const landmark = String(addr.landmark || '').trim().slice(0, 120);
        const type = addr.type === 'Work' ? 'Work' : 'Home';
        const isDefault = addr.isDefault || (idx === 0 && !addresses.some((a: any) => a.isDefault)) ? 1 : 0;

        insertStmt.run(
          id,
          user.id,
          fullName,
          phone,
          pincode,
          city,
          state,
          street,
          landmark,
          type,
          isDefault,
          nowIso
        );
      });
    });

    tx();
    const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as DbUserRow;
    res.json({ user: serializeUser(updatedUser) });
  });

  // --- Toggle Customer Personal Wishlist ---
  app.post('/api/account/wishlist/toggle', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const productId = String(req.body?.productId || '').trim().slice(0, 64);
    if (!productId) {
      res.status(400).json({ error: 'Product ID is required.' });
      return;
    }

    const exists = db
      .prepare(`SELECT 1 FROM wishlists WHERE user_id = ? AND product_id = ?`)
      .get(user.id, productId);

    if (exists) {
      db.prepare(`DELETE FROM wishlists WHERE user_id = ? AND product_id = ?`).run(
        user.id,
        productId
      );
    } else {
      db.prepare(`INSERT INTO wishlists (user_id, product_id, created_at) VALUES (?, ?, ?)`).run(
        user.id,
        productId,
        new Date().toISOString()
      );
    }

    res.json({
      wishlist: getWishlistForUser(user.id),
      added: !exists
    });
  });

  // --- Sync Customer Cart & Saved-For-Later ---
  app.put('/api/account/cart', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const { cart, savedForLater } = req.body || {};

    const insertItem = db.prepare(
      `INSERT INTO cart_items (user_id, item_key, product_id, quantity, selected_size, selected_color, saved_for_later)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM cart_items WHERE user_id = ?`).run(user.id);
      if (Array.isArray(cart)) {
        for (const item of cart.slice(0, 50)) {
          if (!item?.id || !item?.productId || Number(item.quantity) <= 0) continue;
          insertItem.run(
            user.id,
            String(item.id).slice(0, 120),
            String(item.productId).slice(0, 64),
            Math.min(20, Math.max(1, Math.floor(Number(item.quantity)))),
            String(item.selectedSize || '').slice(0, 60),
            String(item.selectedColor || '').slice(0, 60),
            0
          );
        }
      }
      if (Array.isArray(savedForLater)) {
        for (const item of savedForLater.slice(0, 50)) {
          if (!item?.id || !item?.productId || Number(item.quantity) <= 0) continue;
          insertItem.run(
            user.id,
            String(item.id).slice(0, 120),
            String(item.productId).slice(0, 64),
            Math.min(20, Math.max(1, Math.floor(Number(item.quantity)))),
            String(item.selectedSize || '').slice(0, 60),
            String(item.selectedColor || '').slice(0, 60),
            1
          );
        }
      }
    });
    tx();

    res.json(getCartRowsForUser(user.id));
  });

  // --- Fetch Customer's Own Orders ---
  app.get('/api/account/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    res.json({ orders: getOrdersForUser(user.id) });
  });

  // --- Create Customer Order ---
  app.post('/api/account/orders', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const order = req.body?.order;
    if (!order || !Array.isArray(order.items) || order.items.length === 0 || !order.shippingAddress) {
      res.status(400).json({ error: 'Invalid order payload.' });
      return;
    }

    const orderId = String(order.id || `VYO-${Math.floor(10000 + Math.random() * 90000)}`).slice(0, 32);
    const total = Math.max(0, Number(order.total) || 0);
    const earnedPoints = Math.max(10, Math.round(total / 10));
    const nextPoints = user.club_points + earnedPoints;
    const nextTier = computeTierFromPoints(nextPoints);

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO orders (
          id, user_id, date, items_json, subtotal, discount, coupon_applied,
          coupon_discount, delivery_fee, total, payment_method, payment_status,
          shipping_address_json, status, estimated_delivery_date, tracking_number,
          courier_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        orderId,
        user.id,
        String(order.date || new Date().toLocaleDateString('en-IN')),
        JSON.stringify(order.items),
        Number(order.subtotal) || 0,
        Number(order.discount) || 0,
        String(order.couponApplied || ''),
        Number(order.couponDiscount) || 0,
        Number(order.deliveryFee) || 0,
        total,
        String(order.paymentMethod || 'UPI'),
        String(order.paymentStatus || 'Paid'),
        JSON.stringify(order.shippingAddress),
        String(order.status || 'confirmed'),
        String(order.estimatedDeliveryDate || ''),
        String(order.trackingNumber || ''),
        String(order.courierName || 'VYORA Pune Priority Dispatch'),
        Date.now()
      );

      // Clear active cart items for this customer while preserving saved-for-later
      db.prepare(`DELETE FROM cart_items WHERE user_id = ? AND saved_for_later = 0`).run(user.id);

      // Credit loyalty points & recalculate tier
      db.prepare(
        `UPDATE users SET club_points = ?, club_tier = ?, updated_at = ? WHERE id = ?`
      ).run(nextPoints, nextTier, new Date().toISOString(), user.id);
    });

    tx();

    const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as DbUserRow;
    const orders = getOrdersForUser(user.id);
    res.status(201).json({
      order: orders[0],
      orders,
      user: serializeUser(updatedUser)
    });
  });

  // --- Update Order Status (Owner for tracking simulation OR Admin) ---
  app.patch('/api/account/orders/:orderId/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = req.authUser!;
    const orderId = String(req.params.orderId || '').trim();
    const status = String(req.body?.status || '').trim();
    const allowedStatuses = [
      'placed',
      'confirmed',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered'
    ];

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }

    const existing = db
      .prepare(`SELECT id, user_id FROM orders WHERE id = ?`)
      .get(orderId) as { id: string; user_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (existing.user_id !== user.id && user.role !== 'admin') {
      res.status(403).json({ error: 'You are not authorized to modify this order.' });
      return;
    }

    db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, orderId);

    res.json({
      orders: getOrdersForUser(user.id),
      adminOrders: user.role === 'admin' ? getAllOrdersForAdmin() : undefined
    });
  });

  // --- Admin All-Orders Endpoint ---
  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json({ orders: getAllOrdersForAdmin() });
  });

  // --- Catch-all for unknown /api routes ---
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // ==========================================================================
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VYORA full-stack server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
