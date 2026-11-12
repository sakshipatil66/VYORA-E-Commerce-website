import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, createHmac, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_PRODUCTS } from './src/data/products';
import { INITIAL_COUPONS } from './src/data/coupons';
import { findLocationByCityOrState } from './src/data/locations';
import { Address, CartItem, Order, OrderStatus, Product, User } from './src/types';

const scrypt = promisify(scryptCallback);
const app = express();
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverDirectory, '.env');
const envResult = dotenv.config({ path: envPath });
if (envResult.error && (envResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  throw envResult.error;
}
const envFileValues = envResult.parsed || {};
const environmentValue = (name: string) =>
  process.env[name]?.trim() || envFileValues[name]?.trim() || '';
const configuredKeyId = environmentValue('RAZORPAY_KEY_ID');
const configuredKeySecret = environmentValue('RAZORPAY_KEY_SECRET');
const razorpayCredentialDiagnostics = {
  envFileLoaded: !envResult.error,
  keyIdPresent: Boolean(configuredKeyId),
  keySecretPresent: Boolean(configuredKeySecret),
  keyIdSource: process.env.RAZORPAY_KEY_ID?.trim()
    ? 'process'
    : envFileValues.RAZORPAY_KEY_ID?.trim() ? 'project .env' : 'missing',
  keySecretSource: process.env.RAZORPAY_KEY_SECRET?.trim()
    ? 'process'
    : envFileValues.RAZORPAY_KEY_SECRET?.trim() ? 'project .env' : 'missing'
};
console.info('[startup] API environment diagnostics', {
  serverDirectory,
  workingDirectory: process.cwd(),
  envPath,
  envFileLoaded: !envResult.error,
  envLoadError: envResult.error?.code,
  keyIdInEnvFile: Boolean(envFileValues.RAZORPAY_KEY_ID?.trim()),
  keySecretInEnvFile: Boolean(envFileValues.RAZORPAY_KEY_SECRET?.trim()),
  keyIdPresent: razorpayCredentialDiagnostics.keyIdPresent,
  keySecretPresent: razorpayCredentialDiagnostics.keySecretPresent,
  keyIdOverriddenByProcess: Boolean(
    envFileValues.RAZORPAY_KEY_ID?.trim() &&
    process.env.RAZORPAY_KEY_ID?.trim() &&
    envFileValues.RAZORPAY_KEY_ID.trim() !== process.env.RAZORPAY_KEY_ID.trim()
  ),
  keySecretOverriddenByProcess: Boolean(
    envFileValues.RAZORPAY_KEY_SECRET?.trim() &&
    process.env.RAZORPAY_KEY_SECRET?.trim() &&
    envFileValues.RAZORPAY_KEY_SECRET.trim() !== process.env.RAZORPAY_KEY_SECRET.trim()
  )
});
const port = Number(process.env.PORT || process.env.API_PORT) || 3001;
const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const sessionCookie = 'vyora_session';
const databasePath = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'vyora.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    club_tier TEXT NOT NULL DEFAULT 'Silver',
    club_points INTEGER NOT NULL DEFAULT 0,
    addresses_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY COLLATE NOCASE,
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY COLLATE NOCASE,
    data_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS cart_items (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    selected_size TEXT,
    selected_color TEXT,
    PRIMARY KEY (user_id, item_id)
  );
  CREATE TABLE IF NOT EXISTS wishlists (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, product_id)
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,
    data_json TEXT NOT NULL,
    idempotency_key TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS payment_intents (
    razorpay_order_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_paise INTEGER NOT NULL,
    data_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    order_id TEXT,
    payment_id TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone <> '';
`);
const paymentIntentColumns = database.prepare('PRAGMA table_info(payment_intents)').all() as { name: string }[];
if (!paymentIntentColumns.some((column) => column.name === 'payment_id')) {
  database.exec('ALTER TABLE payment_intents ADD COLUMN payment_id TEXT');
}
const orderColumns = database.prepare('PRAGMA table_info(orders)').all() as { name: string }[];
if (!orderColumns.some((column) => column.name === 'idempotency_key')) {
  database.exec('ALTER TABLE orders ADD COLUMN idempotency_key TEXT');
}
database.exec('CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key_unique ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL');

const initialProductCount = database.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
if (initialProductCount.count === 0) {
  const insertProduct = database.prepare(
    'INSERT INTO products (id, category, name, price, stock, data_json) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const product of INITIAL_PRODUCTS) {
    insertProduct.run(
      product.id,
      product.category,
      product.name,
      product.discountPrice,
      product.stockQuantity,
      JSON.stringify(product)
    );
  }
}

const insertMissingMensProduct = database.prepare(
  'INSERT OR IGNORE INTO products (id, category, name, price, stock, data_json) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const product of INITIAL_PRODUCTS.filter(({ id }) => id.startsWith('vyo-men-'))) {
  insertMissingMensProduct.run(
    product.id,
    product.category,
    product.name,
    product.discountPrice,
    product.stockQuantity,
    JSON.stringify(product)
  );
}

const initialCouponCount = database.prepare('SELECT COUNT(*) AS count FROM coupons').get() as { count: number };
if (initialCouponCount.count === 0) {
  const insertCoupon = database.prepare('INSERT INTO coupons (code, data_json) VALUES (?, ?)');
  for (const coupon of INITIAL_COUPONS) insertCoupon.run(coupon.code, JSON.stringify(coupon));
}

const existingCategories = database.prepare('SELECT DISTINCT category FROM products').all() as { category: string }[];
const insertCategory = database.prepare(
  'INSERT OR IGNORE INTO categories (id, label, description, image) VALUES (?, ?, ?, ?)'
);
for (const { category } of existingCategories) {
  insertCategory.run(category, '', '', '');
}

const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (configuredAdminEmail) {
  database.prepare("UPDATE users SET role = 'admin' WHERE email = ? COLLATE NOCASE")
    .run(configuredAdminEmail);
}

app.use(express.json({ limit: '1mb' }));

type AuthenticatedRequest = Request & { user?: User };
type ApiError = Error & { status?: number; expose?: boolean };

const fail = (status: number, message: string, expose = false): never => {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.expose = expose;
  throw error;
};

const getRazorpayCredentials = () => {
  const keyId = configuredKeyId;
  const keySecret = configuredKeySecret;
  if (!keyId && !keySecret) {
    return { credentials: null, error: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the project .env file using Razorpay Test Mode credentials.' };
  }
  if (!keyId) {
    return { credentials: null, error: 'RAZORPAY_KEY_ID is missing from the project .env file.' };
  }
  if (!keySecret) {
    return { credentials: null, error: 'RAZORPAY_KEY_SECRET is missing from the project .env file.' };
  }
  if (!/^rzp_test_[A-Za-z0-9]+$/.test(keyId)) {
    return { credentials: null, error: 'RAZORPAY_KEY_ID must be a valid Razorpay Test Mode key beginning with rzp_test_.' };
  }
  return { credentials: { keyId, keySecret }, error: null };
};

const razorpayRequest = async (path: string, method: 'GET' | 'POST', body?: unknown) => {
  const { credentials, error } = getRazorpayCredentials();
  if (!credentials) return fail(503, error || 'Razorpay Test Mode credentials are not configured.');

  const redactCredentials = (value: string) => value
    .replaceAll(credentials.keyId, '[redacted]')
    .replaceAll(credentials.keySecret, '[redacted]');
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (requestError) {
    const detail = requestError instanceof Error ? requestError.message : String(requestError);
    const safeDetail = redactCredentials(detail);
    console.error('[razorpay] API request could not be completed', {
      method,
      path,
      keyIdPresent: true,
      keySecretPresent: true,
      error: safeDetail
    });
    return fail(502, `Could not connect to Razorpay: ${safeDetail}`, true);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await response.json() as Record<string, unknown>;
  } catch {
    if (!response.ok) {
      console.error('[razorpay] API returned a non-JSON error response', {
        status: response.status,
        method,
        path,
        keyIdPresent: true,
        keySecretPresent: true
      });
      return fail(502, `Razorpay returned HTTP ${response.status} with a non-JSON error response.`, true);
    }
    return fail(502, 'Razorpay returned an unreadable success response.', true);
  }

  if (!response.ok) {
    const gatewayError = payload.error && typeof payload.error === 'object'
      ? payload.error as Record<string, unknown>
      : {};
    const details = ['code', 'description', 'source', 'step', 'reason', 'field']
      .flatMap((key) => typeof gatewayError[key] === 'string' ? [`${key}: ${gatewayError[key]}`] : [])
      .join('; ');
    const safeDetails = redactCredentials(details || 'Razorpay did not provide an error description.');
    console.error('[razorpay] API request failed', {
      status: response.status,
      method,
      path,
      keyIdPresent: true,
      keySecretPresent: true,
      error: safeDetails
    });
    const credentialHint = response.status === 401 || response.status === 403
      ? ' Check that the Test Mode key ID and secret are a matching pair.'
      : '';
    fail(502, `Razorpay API error (HTTP ${response.status}): ${safeDetails}.${credentialHint}`, true);
  }
  return payload;
};

const calculateCheckoutAmountPaise = (userId: string, checkout: Record<string, unknown>) => {
  const rows = database.prepare(`
    SELECT c.quantity, p.data_json, p.stock
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(userId) as { quantity: number; data_json: string; stock: number }[];
  if (rows.length === 0) fail(400, 'Your cart is empty');
  if (rows.some((row) => row.quantity > row.stock)) fail(409, 'A cart item no longer has enough stock');
  const subtotal = rows.reduce((sum, row) =>
    sum + (JSON.parse(row.data_json) as Product).discountPrice * row.quantity, 0);
  const couponCode = typeof checkout.couponCode === 'string' ? checkout.couponCode.trim().toUpperCase() : '';
  const couponRow = couponCode
    ? database.prepare('SELECT data_json FROM coupons WHERE code = ?').get(couponCode) as { data_json: string } | undefined
    : undefined;
  const coupon = couponRow ? JSON.parse(couponRow.data_json) as (typeof INITIAL_COUPONS)[number] : undefined;
  if (couponCode && !coupon) fail(400, 'This coupon code is not valid');
  if (coupon && subtotal < coupon.minOrderValue) fail(400, `This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  const couponDiscount = coupon
    ? coupon.discountType === 'percentage'
      ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount ?? Number.POSITIVE_INFINITY)
      : Math.min(coupon.discountValue, subtotal)
    : 0;
  const deliveryFee = checkout.deliverySpeed === 'express' ? 149 : subtotal > 999 ? 0 : 99;
  const giftWrapFee = checkout.giftWrap === true ? 99 : 0;
  return Math.round(Math.max(0, subtotal - couponDiscount + deliveryFee + giftWrapFee) * 100);
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const passwordHash = async (password: string, salt = randomBytes(16).toString('hex')) => {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
};

const verifyPassword = async (password: string, stored: string) => {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const publicUser = (row: Record<string, unknown>): User => ({
  id: String(row.id),
  name: String(row.name),
  email: String(row.email).endsWith('@phone.vyora.invalid') ? '' : String(row.email),
  phone: String(row.phone || ''),
  role: row.role === 'admin' ? 'admin' : 'customer',
  clubTier: row.club_tier === 'Platinum' || row.club_tier === 'Gold' ? row.club_tier : 'Silver',
  clubPoints: Number(row.club_points || 0),
  addresses: JSON.parse(String(row.addresses_json || '[]')) as Address[]
});

const userById = (id: string) =>
  database.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;

const getSessionUser = (req: Request) => {
  const rawCookie = req.headers.cookie || '';
  const token = rawCookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1);
  if (!token) return null;
  const session = database
    .prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .get(hashToken(token), Date.now()) as { user_id: string } | undefined;
  if (!session) return null;
  const row = userById(session.user_id);
  return row ? publicUser(row) : null;
};

const requireAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const user = getSessionUser(req);
  if (!user) return next(Object.assign(new Error('Please sign in to continue'), { status: 401 }));
  req.user = user;
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required' });
  }
  next();
};

const authenticate = (handler: (req: AuthenticatedRequest, res: Response) => unknown) =>
  [requireAuth, (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(handler(req, res)).catch(next);
    } catch (error) {
      next(error);
    }
  }];

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const setSessionCookie = (res: Response, token: string) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}${secure}`
  );
};

const clearSessionCookie = (res: Response) => {
  res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
};

const issueSession = (userId: string, res: Response) => {
  const token = randomBytes(32).toString('hex');
  database
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, Date.now() + sessionLifetimeMs);
  setSessionCookie(res, token);
};

const authAttempts = new Map<string, { count: number; resetAt: number }>();
const authRateLimit = (req: Request, _res: Response, next: NextFunction) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = authAttempts.get(key);
  if (!current || current.resetAt < now) {
    authAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }
  current.count += 1;
  if (current.count > 20) return next(Object.assign(new Error('Too many sign-in attempts. Try again later.'), { status: 429 }));
  next();
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/products', (_req, res) => {
  const rows = database.prepare('SELECT data_json FROM products').all() as { data_json: string }[];
  res.json(rows.map((row) => JSON.parse(row.data_json) as Product));
});

app.get('/api/categories', (_req, res) => {
  const rows = database.prepare('SELECT id, label, description, image FROM categories ORDER BY rowid').all();
  res.json({ categories: rows });
});

app.get('/api/coupons', (_req, res) => {
  const rows = database.prepare('SELECT data_json FROM coupons').all() as { data_json: string }[];
  res.json({ coupons: rows.map((row) => JSON.parse(row.data_json)) });
});

app.get('/api/payments/config', (_req, res) => {
  const { credentials, error } = getRazorpayCredentials();
  res.json({
    configured: Boolean(credentials),
    keyId: credentials?.keyId || null,
    diagnostics: razorpayCredentialDiagnostics,
    ...(error ? { error } : {})
  });
});

app.post('/api/payments/razorpay/order', ...authenticate(async (req, res) => {
  const paymentMethod = req.body.paymentMethod;
  const deliverySpeed = req.body.deliverySpeed;
  const address = req.body.address as Address;
  if (!['UPI', 'Card', 'Netbanking', 'Wallet'].includes(paymentMethod)) fail(400, 'Choose an online payment method');
  if (!['standard', 'express'].includes(deliverySpeed)) fail(400, 'Choose a valid delivery speed');
  const addressFields = ['fullName', 'phone', 'pincode', 'city', 'state', 'street'] as const;
  if (!address || typeof address !== 'object' ||
      addressFields.some((field) => typeof address[field] !== 'string' || !address[field].trim()) ||
      !['Home', 'Work'].includes(address.type) ||
      !/^\d{10,15}$/.test(address.phone.replace(/\D/g, '')) || !/^\d{6}$/.test(address.pincode)) {
    fail(400, 'A complete delivery address with a valid phone number and 6-digit postal code is required');
  }

  const { credentials, error } = getRazorpayCredentials();
  if (!credentials) {
    return res.status(503).json({ error: `Online payments are unavailable. ${error} After updating .env, restart the API.` });
  }
  const checkout = {
    address,
    paymentMethod,
    deliverySpeed,
    couponCode: typeof req.body.couponCode === 'string' ? req.body.couponCode : undefined,
    giftWrap: req.body.giftWrap === true
  };
  const amountPaise = calculateCheckoutAmountPaise(req.user!.id, checkout);
  if (amountPaise < 100) fail(400, 'Online payment requires a minimum order total of ₹1');

  const gatewayOrder = await razorpayRequest('/orders', 'POST', {
    amount: amountPaise,
    currency: 'INR',
    receipt: `VYO-${randomUUID()}`,
    notes: { userId: req.user!.id, paymentMethod }
  });
  const razorpayOrderId = String(gatewayOrder.id || '');
  if (!razorpayOrderId) fail(502, 'Razorpay did not return a payment order. Please try again.');
  database.prepare(`
    INSERT INTO payment_intents (razorpay_order_id, user_id, amount_paise, data_json)
    VALUES (?, ?, ?, ?)
  `).run(razorpayOrderId, req.user!.id, amountPaise, JSON.stringify(checkout));
  res.status(201).json({
    razorpayOrderId,
    amount: amountPaise,
    currency: 'INR',
    keyId: credentials.keyId
  });
}));

app.post('/api/auth/signup', authRateLimit, asyncRoute(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body.phone === 'string' ? req.body.phone.replace(/\D/g, '') : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 100) fail(400, 'Enter your full name');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address');
  if (phone && !/^\d{10,15}$/.test(phone)) fail(400, 'Enter a valid phone number');
  if (!email && !phone) fail(400, 'Enter an email address or phone number');
  if (password.length < 8 || password.length > 1024) fail(400, 'Password must be between 8 and 1024 characters');

  const identity = email || phone;
  const duplicate = database
    .prepare('SELECT id FROM users WHERE (? <> \'\' AND email = ?) OR (? <> \'\' AND phone = ?)')
    .get(email, email, phone, phone);
  if (duplicate) fail(409, 'An account with that email or phone number already exists');

  const id = randomUUID();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const role = email && adminEmail && email === adminEmail ? 'admin' : 'customer';
  const hash = await passwordHash(password);
  database.prepare(
    'INSERT INTO users (id, name, email, phone, password_hash, role, club_tier, addresses_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, email || `${identity}@phone.vyora.invalid`, phone, hash, role, 'Silver', '[]');
  issueSession(id, res);
  res.status(201).json({ user: publicUser(userById(id)!) });
}));

app.post('/api/auth/login', authRateLimit, asyncRoute(async (req, res) => {
  const identity = typeof req.body.identity === 'string' ? req.body.identity.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!identity || !password || password.length > 1024) fail(400, 'Enter your email/phone and password');
  const normalizedEmail = identity.toLowerCase();
  const normalizedPhone = identity.replace(/\D/g, '');
  const row = database.prepare(
    'SELECT * FROM users WHERE email = ? COLLATE NOCASE OR (? <> \'\' AND phone = ?)'
  ).get(normalizedEmail, normalizedPhone, normalizedPhone) as Record<string, unknown> | undefined;
  if (row === undefined) return fail(401, 'The email/phone or password is incorrect');
  if (!(await verifyPassword(password, String(row.password_hash)))) return fail(401, 'The email/phone or password is incorrect');
  issueSession(String(row.id), res);
  res.json({ user: publicUser(row) });
}));

app.get('/api/auth/me', ...authenticate((req, res) => res.json({ user: req.user })));

app.post('/api/auth/logout', (req, res) => {
  const rawCookie = req.headers.cookie || '';
  const token = rawCookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  clearSessionCookie(res);
  res.json({ success: true });
});

app.patch('/api/auth/profile', ...authenticate((req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : req.user!.name;
  const phone = typeof req.body.phone === 'string' ? req.body.phone.replace(/\D/g, '') : req.user!.phone;
  const addresses = req.body.addresses;
  if (name.length < 2 || name.length > 100) fail(400, 'Enter a valid name');
  if (phone && !/^\d{10,15}$/.test(phone)) fail(400, 'Enter a valid phone number');
  if (addresses !== undefined && (!Array.isArray(addresses) || addresses.some((address) =>
    !address || typeof address.id !== 'string' || typeof address.fullName !== 'string' ||
    typeof address.phone !== 'string' || typeof address.pincode !== 'string' ||
    typeof address.city !== 'string' || typeof address.state !== 'string' ||
    typeof address.street !== 'string' || !['Home', 'Work'].includes(address.type) ||
    typeof address.isDefault !== 'boolean'
  ))) fail(400, 'One or more delivery addresses are invalid');

  const currentRow = userById(req.user!.id)!;
  const savedAddresses = addresses === undefined
    ? String(currentRow.addresses_json)
    : JSON.stringify(addresses);
  database.prepare('UPDATE users SET name = ?, phone = ?, addresses_json = ? WHERE id = ?')
    .run(name, phone, savedAddresses, req.user!.id);
  res.json({ user: publicUser(userById(req.user!.id)!) });
}));

app.get('/api/cart', ...authenticate((req, res) => {
  const rows = database.prepare(`
    SELECT c.item_id, c.product_id, c.quantity, c.selected_size, c.selected_color, p.data_json
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(req.user!.id) as {
    item_id: string; product_id: string; quantity: number; selected_size: string | null;
    selected_color: string | null; data_json: string;
  }[];
  const items: CartItem[] = rows.map((row) => ({
    id: row.item_id,
    productId: row.product_id,
    product: JSON.parse(row.data_json) as Product,
    quantity: row.quantity,
    selectedSize: row.selected_size || undefined,
    selectedColor: row.selected_color || undefined
  }));
  res.json({ items });
}));

app.post('/api/cart/items', ...authenticate((req, res) => {
  const productId = String(req.body.productId || '');
  const quantity = Number(req.body.quantity);
  const size = typeof req.body.size === 'string' ? req.body.size : undefined;
  const color = typeof req.body.color === 'string' ? req.body.color : undefined;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail(400, 'Quantity must be between 1 and 99');
  const row = database.prepare('SELECT stock FROM products WHERE id = ?').get(productId) as { stock: number } | undefined;
  if (row === undefined) return fail(404, 'Product not found');
  const itemId = `${productId}-${size || 'nosize'}-${color || 'nocolor'}`;
  const existing = database.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND item_id = ?')
    .get(req.user!.id, itemId) as { quantity: number } | undefined;
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > row.stock) fail(409, 'The requested quantity is not available');
  database.prepare(`
    INSERT INTO cart_items (user_id, item_id, product_id, quantity, selected_size, selected_color)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, item_id) DO UPDATE SET quantity = excluded.quantity
  `).run(req.user!.id, itemId, productId, nextQuantity, size || null, color || null);
  res.status(201).json({ success: true });
}));

app.patch('/api/cart/items/:itemId', ...authenticate((req, res) => {
  const quantity = Number(req.body.quantity);
  const itemId = req.params.itemId;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) fail(400, 'Quantity must be between 1 and 99');
  const row = database.prepare(`
    SELECT c.product_id, p.stock FROM cart_items c JOIN products p ON p.id = c.product_id
    WHERE c.user_id = ? AND c.item_id = ?
  `).get(req.user!.id, itemId) as { product_id: string; stock: number } | undefined;
  if (row === undefined) return fail(404, 'Cart item not found');
  if (quantity > row.stock) fail(409, 'The requested quantity is not available');
  database.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND item_id = ?')
    .run(quantity, req.user!.id, itemId);
  res.json({ success: true });
}));

app.delete('/api/cart/items/:itemId', ...authenticate((req, res) => {
  database.prepare('DELETE FROM cart_items WHERE user_id = ? AND item_id = ?').run(req.user!.id, req.params.itemId);
  res.json({ success: true });
}));

app.get('/api/wishlist', ...authenticate((req, res) => {
  const rows = database.prepare('SELECT product_id FROM wishlists WHERE user_id = ?').all(req.user!.id) as { product_id: string }[];
  res.json({ productIds: rows.map((row) => row.product_id) });
}));

app.put('/api/wishlist', ...authenticate((req, res) => {
  const productIds: unknown = req.body.productIds;
  if (!Array.isArray(productIds) || productIds.some((id) => typeof id !== 'string')) fail(400, 'Wishlist is invalid');
  const insert = database.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)');
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('DELETE FROM wishlists WHERE user_id = ?').run(req.user!.id);
    for (const id of [...new Set(productIds as string[])]) {
      if (!database.prepare('SELECT id FROM products WHERE id = ?').get(id)) fail(400, 'Wishlist includes an unknown product');
      insert.run(req.user!.id, id);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  res.json({ productIds });
}));

app.get('/api/orders', ...authenticate((req, res) => {
  const statement = req.user!.role === 'admin'
    ? database.prepare('SELECT data_json FROM orders ORDER BY created_at DESC')
    : database.prepare('SELECT data_json FROM orders WHERE user_id = ? ORDER BY created_at DESC');
  const rows = (req.user!.role === 'admin' ? statement.all() : statement.all(req.user!.id)) as { data_json: string }[];
  res.json({ orders: rows.map((row) => JSON.parse(row.data_json) as Order) });
}));

app.get('/api/orders/:orderId', ...authenticate((req, res) => {
  const row = database.prepare('SELECT user_id, data_json FROM orders WHERE id = ?')
    .get(req.params.orderId) as { user_id: string; data_json: string } | undefined;
  if (!row || (req.user!.role !== 'admin' && row.user_id !== req.user!.id)) {
    return fail(404, 'Order not found');
  }
  res.json({ order: JSON.parse(row.data_json) as Order });
}));

app.post('/api/orders', ...authenticate(async (req, res) => {
  const idempotencyKey = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    fail(400, 'A valid checkout request key is required');
  }
  const previousOrder = database.prepare('SELECT data_json FROM orders WHERE user_id = ? AND idempotency_key = ?')
    .get(req.user!.id, idempotencyKey) as { data_json: string } | undefined;
  if (previousOrder) {
    return res.json({ order: JSON.parse(previousOrder.data_json) as Order });
  }
  let paymentIntent: { razorpay_order_id: string; amount_paise: number; data_json: string } | undefined;
  if (req.body.paymentMethod !== 'COD') {
    const razorpayOrderId = typeof req.body.razorpay_order_id === 'string' ? req.body.razorpay_order_id : '';
    const razorpayPaymentId = typeof req.body.razorpay_payment_id === 'string' ? req.body.razorpay_payment_id : '';
    const razorpaySignature = typeof req.body.razorpay_signature === 'string' ? req.body.razorpay_signature : '';
    const { credentials, error } = getRazorpayCredentials();
    if (!credentials) return fail(503, `Razorpay payment verification is unavailable. ${error} Restart the API after updating .env.`);
    const intent = database.prepare(`
      SELECT razorpay_order_id, amount_paise, data_json FROM payment_intents
      WHERE razorpay_order_id = ? AND user_id = ? AND status = 'pending'
    `).get(razorpayOrderId, req.user!.id) as {
      razorpay_order_id: string; amount_paise: number; data_json: string;
    } | undefined;
    if (!intent || !razorpayPaymentId || !razorpaySignature) {
      return fail(400, 'A valid pending Razorpay payment is required');
    }
    paymentIntent = intent;
    const expectedSignature = createHmac('sha256', credentials.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest();
    const receivedSignature = Buffer.from(razorpaySignature, 'hex');
    if (receivedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(receivedSignature, expectedSignature)) {
      fail(400, 'Razorpay payment signature verification failed');
    }
    req.body = { ...JSON.parse(intent.data_json), razorpay_payment_id: razorpayPaymentId };
  }

  const address = req.body.address as Address;
  let paymentMethod: Order['paymentMethod'] = req.body.paymentMethod;
  const deliverySpeed = req.body.deliverySpeed;
  const addressFields = ['fullName', 'phone', 'pincode', 'city', 'state', 'street'] as const;
  if (!address || typeof address !== 'object' ||
      addressFields.some((field) => typeof address[field] !== 'string' || !address[field].trim()) ||
      !['Home', 'Work'].includes(address.type)) {
    fail(400, 'A complete delivery address is required');
  }
  if (!/^\d{10,15}$/.test(address.phone.replace(/\D/g, '')) || !/^\d{6}$/.test(address.pincode)) {
    fail(400, 'Enter a valid phone number and 6-digit postal code');
  }
  if (!['UPI', 'Card', 'Netbanking', 'Wallet', 'COD'].includes(paymentMethod)) fail(400, 'Choose a valid payment method');
  if (!['standard', 'express'].includes(deliverySpeed)) fail(400, 'Choose a valid delivery speed');

  const cartRows = database.prepare(`
    SELECT c.item_id, c.product_id, c.quantity, c.selected_size, c.selected_color, p.data_json, p.stock
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(req.user!.id) as {
    item_id: string; product_id: string; quantity: number; selected_size: string | null;
    selected_color: string | null; data_json: string; stock: number;
  }[];
  if (cartRows.length === 0) fail(400, 'Your cart is empty');
  if (cartRows.some((row) => row.quantity > row.stock)) fail(409, 'A cart item no longer has enough stock');

  const products = cartRows.map((row) => JSON.parse(row.data_json) as Product);
  const subtotal = cartRows.reduce((sum, row, index) => sum + products[index].discountPrice * row.quantity, 0);
  const discount = cartRows.reduce((sum, row, index) =>
    sum + (products[index].originalPrice - products[index].discountPrice) * row.quantity, 0);
  const couponCode = typeof req.body.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';
  const couponRow = couponCode
    ? database.prepare('SELECT data_json FROM coupons WHERE code = ?').get(couponCode) as { data_json: string } | undefined
    : undefined;
  const coupon = couponRow ? JSON.parse(couponRow.data_json) as (typeof INITIAL_COUPONS)[number] : undefined;
  if (couponCode && !coupon) fail(400, 'This coupon code is not valid');
  if (coupon && subtotal < coupon.minOrderValue) fail(400, `This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  const couponDiscount = coupon
    ? coupon.discountType === 'percentage'
      ? Math.min((subtotal * coupon.discountValue) / 100, coupon.maxDiscount ?? Number.POSITIVE_INFINITY)
      : Math.min(coupon.discountValue, subtotal)
    : 0;
  const deliveryFee = deliverySpeed === 'express' ? 149 : subtotal > 999 ? 0 : 99;
  const giftWrap = req.body.giftWrap === true;
  const total = Math.max(0, subtotal - couponDiscount + deliveryFee + (giftWrap ? 99 : 0));
  if (paymentIntent) {
    const verifiedIntent = paymentIntent;
    if (verifiedIntent.amount_paise !== Math.round(total * 100)) {
      fail(409, 'Your cart changed after payment started. Please contact support before retrying.');
    }
    let payment = await razorpayRequest(`/payments/${encodeURIComponent(String(req.body.razorpay_payment_id))}`, 'GET') as {
      order_id?: string; amount?: number; status?: string; id?: string; method?: string;
    };
    if (payment.order_id !== verifiedIntent.razorpay_order_id ||
        payment.amount !== verifiedIntent.amount_paise) {
      fail(400, 'Razorpay payment details do not match this order');
    }
    if (payment.status === 'authorized') {
      payment = await razorpayRequest(`/payments/${encodeURIComponent(String(req.body.razorpay_payment_id))}/capture`, 'POST', {
        amount: verifiedIntent.amount_paise,
        currency: 'INR'
      }) as typeof payment;
    }
    if (payment.status !== 'captured') fail(402, 'Razorpay has not captured this payment. Your order was not placed.');
    let verifiedMethod: Exclude<Order['paymentMethod'], 'COD'>;
    switch (payment.method) {
      case 'upi':
        verifiedMethod = 'UPI';
        break;
      case 'card':
        verifiedMethod = 'Card';
        break;
      case 'netbanking':
        verifiedMethod = 'Netbanking';
        break;
      case 'wallet':
        verifiedMethod = 'Wallet';
        break;
      default:
        return fail(402, 'Razorpay returned an unsupported payment method. Your order was not confirmed.');
    }
    paymentMethod = verifiedMethod;
  }
  const now = new Date();
  const location = findLocationByCityOrState(`${address.city}, ${address.state}`);
  const deliveryDays = location
    ? deliverySpeed === 'express' ? location.expressDays : location.standardDays
    : deliverySpeed === 'express' ? 2 : 4;
  const deliveryDate = new Date(now.getTime() + deliveryDays * 86400000);
  const id = `VYO-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
  const order: Order = {
    id,
    date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    items: cartRows.map((row, index) => ({
      productId: row.product_id,
      name: products[index].name,
      price: products[index].discountPrice,
      quantity: row.quantity,
      size: row.selected_size || undefined,
      color: row.selected_color || undefined,
      image: products[index].primaryImage
    })),
    subtotal,
    discount,
    couponApplied: coupon?.code,
    couponDiscount,
    giftWrap,
    deliveryFee,
    total,
    paymentMethod,
    paymentStatus: paymentIntent ? 'Paid' : 'Pending COD',
    paymentId: paymentIntent ? String(req.body.razorpay_payment_id) : undefined,
    paymentOrderId: paymentIntent?.razorpay_order_id,
    shippingAddress: address,
    status: 'placed',
    estimatedDeliveryDate: deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  database.exec('BEGIN IMMEDIATE');
  let paymentClaimed = false;
  try {
    const duplicateOrder = database.prepare(
      'SELECT data_json FROM orders WHERE user_id = ? AND idempotency_key = ?'
    ).get(req.user!.id, idempotencyKey) as { data_json: string } | undefined;
    if (duplicateOrder) {
      database.exec('COMMIT');
      return res.json({ order: JSON.parse(duplicateOrder.data_json) as Order });
    }
    if (paymentIntent) {
      const claimedIntent = database.prepare(`
        UPDATE payment_intents SET status = 'processing'
        WHERE razorpay_order_id = ? AND user_id = ? AND status = 'pending'
      `).run(paymentIntent.razorpay_order_id, req.user!.id);
      if (Number(claimedIntent.changes) !== 1) fail(409, 'This payment has already been used for an order');
      paymentClaimed = true;
    }
    const insertOrder = database.prepare(
      'INSERT INTO orders (id, user_id, status, data_json, idempotency_key) VALUES (?, ?, ?, ?, ?)'
    );
    const updateStock = database.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?'
    );
    for (const row of cartRows) {
      const stockUpdate = updateStock.run(row.quantity, row.product_id, row.quantity);
      if (Number(stockUpdate.changes) !== 1) fail(409, 'A cart item no longer has enough stock');
      const current = database.prepare('SELECT data_json FROM products WHERE id = ?').get(row.product_id) as { data_json: string };
      const currentProduct = JSON.parse(current.data_json) as Product;
      currentProduct.stockQuantity = Math.max(0, currentProduct.stockQuantity - row.quantity);
      currentProduct.inStock = currentProduct.stockQuantity > 0;
      database.prepare('UPDATE products SET data_json = ?, stock = ? WHERE id = ?')
        .run(JSON.stringify(currentProduct), currentProduct.stockQuantity, row.product_id);
    }
    insertOrder.run(order.id, req.user!.id, order.status, JSON.stringify(order), idempotencyKey);
    if (paymentIntent) {
      const completedIntent = database.prepare(`
        UPDATE payment_intents SET status = 'completed', order_id = ?, payment_id = ?
        WHERE razorpay_order_id = ? AND status = 'processing'
      `).run(order.id, String(req.body.razorpay_payment_id), paymentIntent.razorpay_order_id);
      if (Number(completedIntent.changes) !== 1) fail(409, 'This payment has already been used for an order');
    }
    database.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.id);
    database.prepare('UPDATE users SET club_points = club_points + ? WHERE id = ?')
      .run(Math.round(total / 10), req.user!.id);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    if (paymentIntent && paymentClaimed) {
      try {
        await razorpayRequest(`/payments/${encodeURIComponent(String(req.body.razorpay_payment_id))}/refund`, 'POST', {
          amount: paymentIntent.amount_paise
        });
      } catch (refundError) {
        console.error('Could not automatically refund a captured payment after order creation failed:', refundError);
      }
    }
    throw error;
  }
  res.status(201).json({ order });
}));

const orderStatuses: OrderStatus[] = ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
app.patch('/api/orders/:orderId/status', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const status = req.body.status as OrderStatus;
  if (!orderStatuses.includes(status)) fail(400, 'Invalid order status');
  const row = database.prepare('SELECT data_json FROM orders WHERE id = ?').get(req.params.orderId) as { data_json: string } | undefined;
  if (row === undefined) return fail(404, 'Order not found');
  const order = JSON.parse(row.data_json) as Order;
  order.status = status;
  database.prepare('UPDATE orders SET status = ?, data_json = ? WHERE id = ?')
    .run(status, JSON.stringify(order), req.params.orderId);
  res.json({ order });
}));

app.get('/api/admin/summary', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const orderRows = database.prepare('SELECT data_json FROM orders ORDER BY created_at DESC')
    .all() as { data_json: string }[];
  const orders = orderRows.map(({ data_json }) => JSON.parse(data_json) as Order);
  const productRows = database.prepare('SELECT data_json FROM products').all() as { data_json: string }[];
  const products = productRows.map(({ data_json }) => JSON.parse(data_json) as Product);
  const customers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'")
    .get() as { count: number };
  res.json({
    customers: customers.count,
    products: products.length,
    orders: orders.length,
    revenue: orders.reduce((total, order) => total + order.total, 0),
    recentOrders: orders.slice(0, 6),
    lowStock: products.filter((product) => product.stockQuantity <= 10)
      .sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 8)
  });
}));

const saveProduct = (product: Product, isNew: boolean) => {
  const statement = isNew
    ? database.prepare('INSERT INTO products (id, category, name, price, stock, data_json) VALUES (?, ?, ?, ?, ?, ?)')
    : database.prepare('UPDATE products SET category = ?, name = ?, price = ?, stock = ?, data_json = ? WHERE id = ?');
  if (isNew) {
    statement.run(product.id, product.category, product.name, product.discountPrice, product.stockQuantity, JSON.stringify(product));
  } else {
    statement.run(product.category, product.name, product.discountPrice, product.stockQuantity, JSON.stringify(product), product.id);
  }
};

app.post('/api/admin/products', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const product = req.body as Product;
  if (!product || typeof product.name !== 'string' || !product.name.trim() ||
      product.name.length > 200 || typeof product.category !== 'string' ||
      !database.prepare('SELECT id FROM categories WHERE id = ?').get(product.category) ||
      !Number.isFinite(product.originalPrice) || product.originalPrice < 0 ||
      !Number.isFinite(product.discountPrice) || product.discountPrice < 0 ||
      product.discountPrice > product.originalPrice ||
      !Number.isInteger(product.stockQuantity) || product.stockQuantity < 0 ||
      !Array.isArray(product.images) || product.images.some((image) =>
        typeof image !== 'string' || image.length > 500_000
      )) {
    fail(400, 'Product name, price, and stock are required');
  }
  product.id = `vyo-${randomUUID()}`;
  product.inStock = product.stockQuantity > 0;
  saveProduct(product, true);
  res.status(201).json({ product });
}));

app.put('/api/admin/products/:productId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const product = req.body as Product;
  if (!product || product.id !== req.params.productId || typeof product.name !== 'string' ||
      !product.name.trim() || product.name.length > 200 ||
      typeof product.category !== 'string' ||
      !database.prepare('SELECT id FROM categories WHERE id = ?').get(product.category) ||
      !Number.isFinite(product.originalPrice) || product.originalPrice < 0 ||
      !Number.isFinite(product.discountPrice) || product.discountPrice < 0 ||
      !Number.isFinite(product.discountPrice) || product.discountPrice > product.originalPrice ||
      !Number.isInteger(product.stockQuantity) || product.stockQuantity < 0 ||
      !Array.isArray(product.images) || product.images.some((image) =>
        typeof image !== 'string' || image.length > 500_000
      )) {
    fail(400, 'Product update is invalid');
  }
  if (!database.prepare('SELECT id FROM products WHERE id = ?').get(product.id)) fail(404, 'Product not found');
  product.inStock = product.stockQuantity > 0;
  saveProduct(product, false);
  res.json({ product });
}));

app.delete('/api/admin/products/:productId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  database.prepare('DELETE FROM cart_items WHERE product_id = ?').run(req.params.productId);
  database.prepare('DELETE FROM wishlists WHERE product_id = ?').run(req.params.productId);
  const result = database.prepare('DELETE FROM products WHERE id = ?').run(req.params.productId);
  if (Number(result.changes) === 0) fail(404, 'Product not found');
  res.json({ success: true });
}));

app.post('/api/admin/categories', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const id = typeof req.body.id === 'string' ? req.body.id.trim().toLowerCase() : '';
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const image = typeof req.body.image === 'string' ? req.body.image.trim() : '';
  if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(id) || id === 'all' ||
      label.length < 2 || label.length > 100 || description.length > 1000 || image.length > 2000) {
    fail(400, 'Category name, identifier, or description is invalid');
  }
  try {
    database.prepare('INSERT INTO categories (id, label, description, image) VALUES (?, ?, ?, ?)')
      .run(id, label, description, image);
  } catch (error) {
    if ((error as Error).message.includes('UNIQUE')) fail(409, 'A category with that identifier already exists');
    throw error;
  }
  res.status(201).json({ category: { id, label, description, image } });
}));

app.put('/api/admin/categories/:categoryId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const image = typeof req.body.image === 'string' ? req.body.image.trim() : '';
  if (label.length < 2 || label.length > 100 || description.length > 1000 || image.length > 2000) {
    fail(400, 'Category name, description, or image is invalid');
  }
  const result = database.prepare(
    'UPDATE categories SET label = ?, description = ?, image = ? WHERE id = ?'
  ).run(label, description, image, req.params.categoryId);
  if (Number(result.changes) === 0) fail(404, 'Category not found');
  res.json({ category: { id: req.params.categoryId, label, description, image } });
}));

app.delete('/api/admin/categories/:categoryId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const productCount = database.prepare('SELECT COUNT(*) AS count FROM products WHERE category = ?')
    .get(req.params.categoryId) as { count: number };
  if (productCount.count > 0) fail(409, 'Move or delete this category’s products before removing it');
  const result = database.prepare('DELETE FROM categories WHERE id = ?').run(req.params.categoryId);
  if (Number(result.changes) === 0) fail(404, 'Category not found');
  res.json({ success: true });
}));

app.post('/api/admin/coupons', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const discountType = req.body.discountType;
  const discountValue = Number(req.body.discountValue);
  const minOrderValue = Number(req.body.minOrderValue);
  const maxDiscount = req.body.maxDiscount === undefined ? undefined : Number(req.body.maxDiscount);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !description ||
      !['fixed', 'percentage'].includes(discountType) || !Number.isFinite(discountValue) ||
      discountValue <= 0 || !Number.isFinite(minOrderValue) || minOrderValue < 0 ||
      (discountType === 'percentage' && discountValue > 100) ||
      (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount <= 0))) {
    fail(400, 'Coupon details are invalid');
  }
  const coupon = { code, description, discountType, discountValue, minOrderValue, maxDiscount };
  try {
    database.prepare('INSERT INTO coupons (code, data_json) VALUES (?, ?)').run(code, JSON.stringify(coupon));
  } catch (error) {
    if ((error as Error).message.includes('UNIQUE')) fail(409, 'A coupon with that code already exists');
    throw error;
  }
  res.status(201).json({ coupon });
}));

app.use((error: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 && !error.expose ? 'A server error occurred' : error.message
  });
});

database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
app.listen(port, '0.0.0.0', () => {
  console.log(`VYORA API listening on 0.0.0.0:${port}`);
});
