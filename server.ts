import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash, createHmac, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_PRODUCTS } from './src/data/products';
import { INITIAL_COUPONS } from './src/data/coupons';
import { findLocationByCityOrState } from './src/data/locations';
import {
  Address,
  AdminAnalyticsData,
  AdminCouponSummary,
  AdminCustomer,
  AdminCustomerDetail,
  AnalyticsGranularity,
  AnalyticsRange,
  CartItem,
  Coupon,
  CouponUsageRecord,
  InventoryAdjustmentReason,
  InventoryLog,
  Order,
  OrderShipmentInfo,
  OrderStatus,
  Product,
  RefundMethod,
  RefundRecord,
  RefundStatus,
  RefundableOrderSummary,
  ReturnItem,
  ReturnItemInspectionStatus,
  ReturnReason,
  ReturnRequest,
  ReturnStatus,
  ReturnStatusEvent,
  ShipmentHistoryEvent,
  ShipmentStatus,
  User
} from './src/types';

const scrypt = promisify(scryptCallback);
const app = express();
const serverDirectory = dirname(fileURLToPath(import.meta.url));
const envPath = join(serverDirectory, '.env');
const envFilePresent = existsSync(envPath);
const envResult = envFilePresent ? dotenv.config({ path: envPath }) : null;
if (envResult?.error && (envResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  throw envResult.error;
}
const envFileValues = envResult?.parsed || {};
const environmentValue = (name: string) =>
  process.env[name]?.trim() || envFileValues[name]?.trim() || '';
const configuredKeyId = environmentValue('RAZORPAY_KEY_ID');
const configuredKeySecret = environmentValue('RAZORPAY_KEY_SECRET');
const razorpayCredentialDiagnostics = {
  envFileLoaded: Boolean(envFilePresent && !envResult?.error),
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
  envFilePresent,
  envFileLoaded: razorpayCredentialDiagnostics.envFileLoaded,
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
const port = Number(process.env.PORT || process.env.API_PORT) || 3000;
app.set('trust proxy', 1);
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

// Phase 3: Idempotent product columns & inventory_logs schema migrations
database.exec(`
  CREATE TABLE IF NOT EXISTS inventory_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    product_name TEXT NOT NULL,
    previous_quantity INTEGER NOT NULL,
    adjusted_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    admin_id TEXT NOT NULL DEFAULT '',
    admin_name TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs(product_id);
`);

const productColumns = database.prepare('PRAGMA table_info(products)').all() as { name: string }[];
if (!productColumns.some((column) => column.name === 'sku')) {
  database.exec('ALTER TABLE products ADD COLUMN sku TEXT');
}
if (!productColumns.some((column) => column.name === 'is_active')) {
  database.exec('ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
}
if (!productColumns.some((column) => column.name === 'low_stock_threshold')) {
  database.exec('ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10');
}
if (!productColumns.some((column) => column.name === 'updated_at')) {
  database.exec("ALTER TABLE products ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
}

const initialProductCount = database.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
if (initialProductCount.count === 0) {
  const nowIso = new Date().toISOString();
  const insertProduct = database.prepare(
    'INSERT INTO products (id, category, name, price, stock, sku, is_active, low_stock_threshold, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const product of INITIAL_PRODUCTS) {
    const sku = `VY-${product.id.replace(/^vyo-/i, '').toUpperCase()}`;
    const enriched: Product = {
      ...product,
      sku,
      isActive: true,
      lowStockThreshold: 10,
      updatedAt: nowIso
    };
    insertProduct.run(
      product.id,
      product.category,
      product.name,
      product.discountPrice,
      product.stockQuantity,
      sku,
      1,
      10,
      nowIso,
      JSON.stringify(enriched)
    );
  }
}

const insertMissingMensProduct = database.prepare(
  'INSERT OR IGNORE INTO products (id, category, name, price, stock, sku, is_active, low_stock_threshold, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
for (const product of INITIAL_PRODUCTS.filter(({ id }) => id.startsWith('vyo-men-'))) {
  const nowIso = new Date().toISOString();
  const sku = `VY-${product.id.replace(/^vyo-/i, '').toUpperCase()}`;
  const enriched: Product = {
    ...product,
    sku,
    isActive: true,
    lowStockThreshold: 10,
    updatedAt: nowIso
  };
  insertMissingMensProduct.run(
    product.id,
    product.category,
    product.name,
    product.discountPrice,
    product.stockQuantity,
    sku,
    1,
    10,
    nowIso,
    JSON.stringify(enriched)
  );
}

// Backfill SKUs, visibility, thresholds & updated_at cleanly for existing products
(() => {
  const rows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products ORDER BY rowid ASC'
  ).all() as {
    id: string;
    stock: number;
    sku: string | null;
    is_active: number | null;
    low_stock_threshold: number | null;
    updated_at: string | null;
    data_json: string;
  }[];
  const usedSkus = new Set<string>(
    rows.map((r) => (r.sku || '').trim().toUpperCase()).filter(Boolean)
  );
  const needsMigration = rows.some(
    (r) => !r.sku || !r.sku.trim() || !r.updated_at || !r.updated_at.trim()
  );
  if (needsMigration) {
    const nowIso = new Date().toISOString();
    const updateStmt = database.prepare(
      'UPDATE products SET sku = ?, is_active = ?, low_stock_threshold = ?, updated_at = ?, data_json = ? WHERE id = ?'
    );
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const row of rows) {
        const parsed = JSON.parse(row.data_json) as Product;
        let sku = (row.sku || parsed.sku || '').trim().toUpperCase();
        if (!sku) {
          const base = `VY-${row.id.replace(/^vyo-/i, '').replace(/[^A-Za-z0-9_-]/g, '').toUpperCase() || 'ITEM'}`;
          sku = base.slice(0, 36);
          let suffix = 2;
          while (usedSkus.has(sku)) {
            sku = `${base.slice(0, 32)}-${suffix}`;
            suffix += 1;
          }
          usedSkus.add(sku);
        }
        const isActive = row.is_active === null || row.is_active === undefined ? true : row.is_active !== 0;
        const threshold =
          row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
            ? row.low_stock_threshold
            : 10;
        const updatedAt = row.updated_at && row.updated_at.trim()
          ? row.updated_at.trim()
          : parsed.updatedAt || nowIso;
        const nextProduct: Product = {
          ...parsed,
          sku,
          isActive,
          lowStockThreshold: threshold,
          stockQuantity: row.stock,
          inStock: row.stock > 0,
          updatedAt
        };
        updateStmt.run(sku, isActive ? 1 : 0, threshold, updatedAt, JSON.stringify(nextProduct), row.id);
      }
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }
})();

database.exec('CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku COLLATE NOCASE) WHERE sku IS NOT NULL AND sku <> \'\'');

// Phase 4: Idempotent users, coupons & coupon_usages migrations
database.exec(`
  CREATE TABLE IF NOT EXISTS coupon_usages (
    id TEXT PRIMARY KEY,
    coupon_code TEXT NOT NULL COLLATE NOCASE,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    discount_amount REAL NOT NULL DEFAULT 0,
    order_total REAL NOT NULL DEFAULT 0,
    used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_coupon_usages_code ON coupon_usages(coupon_code COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_coupon_usages_order_code ON coupon_usages(order_id, coupon_code COLLATE NOCASE);
`);

// Phase 5: Idempotent returns, return items, refund records & shipment history tables
database.exec(`
  CREATE TABLE IF NOT EXISTS return_requests (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    admin_notes TEXT NOT NULL DEFAULT '',
    return_window_days INTEGER NOT NULL DEFAULT 7,
    delivered_at TEXT,
    eligible_until TEXT,
    estimated_refund_amount REAL NOT NULL DEFAULT 0,
    refunded_amount REAL NOT NULL DEFAULT 0,
    timeline_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    rejected_at TEXT,
    received_at TEXT,
    inspected_at TEXT,
    refunded_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
  CREATE INDEX IF NOT EXISTS idx_return_requests_user ON return_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);

  CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES orders(id),
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    unit_price REAL NOT NULL DEFAULT 0,
    ordered_quantity INTEGER NOT NULL,
    requested_quantity INTEGER NOT NULL,
    received_quantity INTEGER NOT NULL DEFAULT 0,
    restockable_quantity INTEGER NOT NULL DEFAULT 0,
    damaged_quantity INTEGER NOT NULL DEFAULT 0,
    inspection_status TEXT NOT NULL DEFAULT 'pending_inspection',
    restocked INTEGER NOT NULL DEFAULT 0,
    restocked_at TEXT,
    inspected_by TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items(return_id);
  CREATE INDEX IF NOT EXISTS idx_return_items_order ON return_items(order_id);

  CREATE TABLE IF NOT EXISTS refund_records (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    return_id TEXT REFERENCES return_requests(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    payment_id TEXT NOT NULL DEFAULT '',
    gateway_refund_id TEXT NOT NULL DEFAULT '',
    gateway_status TEXT NOT NULL DEFAULT '',
    reference_id TEXT NOT NULL DEFAULT '',
    idempotency_key TEXT NOT NULL UNIQUE,
    notes TEXT NOT NULL DEFAULT '',
    processed_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_refund_records_order ON refund_records(order_id);
  CREATE INDEX IF NOT EXISTS idx_refund_records_return ON refund_records(return_id);
  CREATE INDEX IF NOT EXISTS idx_refund_records_status ON refund_records(status);

  CREATE TABLE IF NOT EXISTS shipment_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    shipment_status TEXT NOT NULL,
    courier_name TEXT NOT NULL DEFAULT '',
    tracking_number TEXT NOT NULL DEFAULT '',
    dispatch_date TEXT NOT NULL DEFAULT '',
    estimated_delivery_date TEXT NOT NULL DEFAULT '',
    actual_delivery_date TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_shipment_history_order ON shipment_history(order_id, created_at DESC);
`);

const userColumns = database.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userColumns.some((column) => column.name === 'is_active')) {
  database.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
}
if (!userColumns.some((column) => column.name === 'updated_at')) {
  database.exec("ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
}
database.prepare("UPDATE users SET updated_at = COALESCE(NULLIF(created_at, ''), ?) WHERE updated_at = ''")
  .run(new Date().toISOString());

const couponColumns = database.prepare('PRAGMA table_info(coupons)').all() as { name: string }[];
if (!couponColumns.some((column) => column.name === 'is_active')) {
  database.exec('ALTER TABLE coupons ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
}
if (!couponColumns.some((column) => column.name === 'starts_at')) {
  database.exec('ALTER TABLE coupons ADD COLUMN starts_at TEXT');
}
if (!couponColumns.some((column) => column.name === 'expires_at')) {
  database.exec('ALTER TABLE coupons ADD COLUMN expires_at TEXT');
}
if (!couponColumns.some((column) => column.name === 'usage_limit')) {
  database.exec('ALTER TABLE coupons ADD COLUMN usage_limit INTEGER');
}
if (!couponColumns.some((column) => column.name === 'per_user_limit')) {
  database.exec('ALTER TABLE coupons ADD COLUMN per_user_limit INTEGER');
}
if (!couponColumns.some((column) => column.name === 'used_count')) {
  database.exec('ALTER TABLE coupons ADD COLUMN used_count INTEGER NOT NULL DEFAULT 0');
}
if (!couponColumns.some((column) => column.name === 'created_at')) {
  database.exec("ALTER TABLE coupons ADD COLUMN created_at TEXT NOT NULL DEFAULT ''");
}
if (!couponColumns.some((column) => column.name === 'updated_at')) {
  database.exec("ALTER TABLE coupons ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''");
}

const initialCouponCount = database.prepare('SELECT COUNT(*) AS count FROM coupons').get() as { count: number };
if (initialCouponCount.count === 0) {
  const nowIso = new Date().toISOString();
  const insertCoupon = database.prepare(`
    INSERT INTO coupons (code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const coupon of INITIAL_COUPONS) {
    const enriched: Coupon = {
      ...coupon,
      isActive: true,
      startsAt: null,
      expiresAt: null,
      usageLimit: null,
      perUserLimit: null,
      applicableCategories: [],
      usedCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    insertCoupon.run(coupon.code, JSON.stringify(enriched), 1, null, null, null, null, 0, nowIso, nowIso);
  }
} else {
  // Backfill created_at / updated_at / used_count on existing coupons if empty
  const existingCouponRows = database.prepare(
    'SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at FROM coupons'
  ).all() as {
    code: string;
    data_json: string;
    is_active: number | null;
    starts_at: string | null;
    expires_at: string | null;
    usage_limit: number | null;
    per_user_limit: number | null;
    used_count: number | null;
    created_at: string | null;
    updated_at: string | null;
  }[];
  const needsCouponBackfill = existingCouponRows.some((r) => !r.created_at || !r.updated_at);
  if (needsCouponBackfill) {
    const nowIso = new Date().toISOString();
    const upd = database.prepare(
      'UPDATE coupons SET is_active = ?, created_at = ?, updated_at = ?, data_json = ? WHERE code = ?'
    );
    for (const r of existingCouponRows) {
      const parsed = JSON.parse(r.data_json) as Coupon;
      const isActive = r.is_active === null || r.is_active === undefined ? parsed.isActive !== false : r.is_active !== 0;
      const createdAt = r.created_at || parsed.createdAt || nowIso;
      const updatedAt = r.updated_at || parsed.updatedAt || nowIso;
      const nextPayload: Coupon = {
        ...parsed,
        code: r.code.toUpperCase(),
        isActive,
        startsAt: r.starts_at ?? parsed.startsAt ?? null,
        expiresAt: r.expires_at ?? parsed.expiresAt ?? null,
        usageLimit: r.usage_limit ?? parsed.usageLimit ?? null,
        perUserLimit: r.per_user_limit ?? parsed.perUserLimit ?? null,
        applicableCategories: Array.isArray(parsed.applicableCategories) ? parsed.applicableCategories : [],
        usedCount: Number(r.used_count ?? parsed.usedCount ?? 0),
        createdAt,
        updatedAt
      };
      upd.run(isActive ? 1 : 0, createdAt, updatedAt, JSON.stringify(nextPayload), r.code);
    }
  }
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

const sqliteTimestampToIso = (ts?: string | null): string | undefined => {
  if (!ts) return undefined;
  const trimmed = ts.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

type CouponDbRow = {
  code: string;
  data_json: string;
  is_active: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const hydrateCouponRow = (row: CouponDbRow): Coupon => {
  const parsed = JSON.parse(row.data_json) as Coupon;
  const isActive =
    row.is_active !== null && row.is_active !== undefined
      ? row.is_active !== 0
      : parsed.isActive !== false;
  return {
    ...parsed,
    code: row.code.toUpperCase(),
    isActive,
    startsAt: row.starts_at ?? parsed.startsAt ?? null,
    expiresAt: row.expires_at ?? parsed.expiresAt ?? null,
    usageLimit: row.usage_limit ?? parsed.usageLimit ?? null,
    perUserLimit: row.per_user_limit ?? parsed.perUserLimit ?? null,
    applicableCategories: Array.isArray(parsed.applicableCategories) ? parsed.applicableCategories : [],
    usedCount: Number(row.used_count ?? parsed.usedCount ?? 0),
    createdAt: sqliteTimestampToIso(row.created_at) || parsed.createdAt,
    updatedAt: sqliteTimestampToIso(row.updated_at) || parsed.updatedAt
  };
};

const isCouponCurrentlyOfferValid = (coupon: Coupon, nowMs = Date.now()): boolean => {
  if (coupon.isActive === false) return false;
  if (coupon.startsAt) {
    const startMs = Date.parse(coupon.startsAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) return false;
  }
  if (coupon.expiresAt) {
    const endMs = Date.parse(coupon.expiresAt);
    if (!Number.isNaN(endMs) && nowMs > endMs) return false;
  }
  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    (coupon.usedCount ?? 0) >= coupon.usageLimit
  ) {
    return false;
  }
  return true;
};

const evaluateCouponForCart = (
  rawCode: string,
  cartLines: { category: string; lineTotal: number }[],
  userId?: string,
  nowMs = Date.now()
): { coupon: Coupon; couponDiscount: number; eligibleSubtotal: number } => {
  const code = rawCode.trim().toUpperCase();
  const row = database.prepare(`
    SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
    FROM coupons WHERE code = ? COLLATE NOCASE
  `).get(code) as CouponDbRow | undefined;
  if (!row) return fail(400, 'This coupon code is not valid');

  const coupon = hydrateCouponRow(row);
  if (coupon.isActive === false) fail(400, 'This coupon is currently inactive');

  if (coupon.startsAt) {
    const startsMs = Date.parse(coupon.startsAt);
    if (!Number.isNaN(startsMs) && nowMs < startsMs) {
      fail(400, 'This coupon is not active yet');
    }
  }
  if (coupon.expiresAt) {
    const expiresMs = Date.parse(coupon.expiresAt);
    if (!Number.isNaN(expiresMs) && nowMs > expiresMs) {
      fail(400, 'This coupon has expired');
    }
  }
  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    (coupon.usedCount ?? 0) >= coupon.usageLimit
  ) {
    fail(409, 'This coupon has reached its maximum redemption limit');
  }

  if (userId && coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
    const usedByUser = database.prepare(
      'SELECT COUNT(*) AS count FROM coupon_usages WHERE coupon_code = ? COLLATE NOCASE AND user_id = ?'
    ).get(coupon.code, userId) as { count: number };
    if (Number(usedByUser.count) >= coupon.perUserLimit) {
      fail(409, `You have already reached the per-customer usage limit (${coupon.perUserLimit}) for this coupon`);
    }
  }

  const allowedCats = coupon.applicableCategories || [];
  const eligibleLines = allowedCats.length > 0
    ? cartLines.filter((line) => allowedCats.includes(line.category))
    : cartLines;

  if (allowedCats.length > 0 && eligibleLines.length === 0) {
    fail(400, `This coupon applies only to selected categories (${allowedCats.join(', ')})`);
  }

  const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (eligibleSubtotal < coupon.minOrderValue) {
    fail(400, `This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  }

  const rawDiscount = coupon.discountType === 'percentage'
    ? Math.min((eligibleSubtotal * coupon.discountValue) / 100, coupon.maxDiscount ?? Number.POSITIVE_INFINITY)
    : coupon.discountValue;
  const couponDiscount = Math.round(Math.min(rawDiscount, eligibleSubtotal) * 100) / 100;

  return { coupon, couponDiscount, eligibleSubtotal };
};

const calculateCheckoutAmountPaise = (userId: string, checkout: Record<string, unknown>) => {
  const rows = database.prepare(`
    SELECT c.quantity, p.data_json, p.stock, COALESCE(p.is_active, 1) AS is_active
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(userId) as { quantity: number; data_json: string; stock: number; is_active: number }[];
  if (rows.length === 0) fail(400, 'Your cart is empty');
  if (rows.some((row) => row.is_active === 0)) fail(409, 'An item in your bag is no longer available');
  if (rows.some((row) => row.quantity > row.stock)) fail(409, 'A cart item no longer has enough stock');

  const cartLines = rows.map((row) => {
    const prod = JSON.parse(row.data_json) as Product;
    return { category: prod.category, lineTotal: prod.discountPrice * row.quantity };
  });
  const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const couponCode = typeof checkout.couponCode === 'string' ? checkout.couponCode.trim().toUpperCase() : '';
  const couponDiscount = couponCode
    ? evaluateCouponForCart(couponCode, cartLines, userId).couponDiscount
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
  addresses: JSON.parse(String(row.addresses_json || '[]')) as Address[],
  isActive: row.is_active === null || row.is_active === undefined ? true : Number(row.is_active) !== 0,
  createdAt: sqliteTimestampToIso(String(row.created_at || '')),
  updatedAt: sqliteTimestampToIso(String(row.updated_at || ''))
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
  if (!row || Number(row.is_active ?? 1) === 0) {
    database.prepare('DELETE FROM sessions WHERE user_id = ?').run(session.user_id);
    return null;
  }
  return publicUser(row);
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

const isHttpsRequest = (req: Request) =>
  req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

const cookieAttributes = (req: Request) =>
  isHttpsRequest(req) ? 'SameSite=None; Secure' : 'SameSite=Lax';

const setSessionCookie = (req: Request, res: Response, token: string) => {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=${token}; HttpOnly; ${cookieAttributes(req)}; Path=/; Max-Age=${Math.floor(sessionLifetimeMs / 1000)}`
  );
};

const clearSessionCookie = (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; ${cookieAttributes(req)}; Path=/; Max-Age=0`);
};

const issueSession = (userId: string, req: Request, res: Response) => {
  const token = randomBytes(32).toString('hex');
  database
    .prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), userId, Date.now() + sessionLifetimeMs);
  setSessionCookie(req, res, token);
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

type ProductDbRow = {
  id: string;
  stock: number;
  sku: string | null;
  is_active: number | null;
  low_stock_threshold: number | null;
  updated_at: string | null;
  data_json: string;
};

const hydrateProductRow = (row: ProductDbRow): Product => {
  const parsed = JSON.parse(row.data_json) as Product;
  const threshold =
    row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
      ? Number(row.low_stock_threshold)
      : (parsed.lowStockThreshold ?? 10);
  const isActive =
    row.is_active !== null && row.is_active !== undefined
      ? row.is_active !== 0
      : parsed.isActive !== false;
  const updatedAt = row.updated_at || parsed.updatedAt || undefined;
  return {
    ...parsed,
    sku: row.sku || parsed.sku || '',
    isActive,
    lowStockThreshold: threshold,
    stockQuantity: Number(row.stock),
    inStock: Number(row.stock) > 0,
    updatedAt
  };
};

const generateUniqueSku = (category: string): string => {
  const prefix = category.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'ITEM';
  for (let i = 0; i < 20; i++) {
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    const candidate = `VY-${prefix}-${suffix}`;
    const exists = database.prepare('SELECT id FROM products WHERE sku = ? COLLATE NOCASE').get(candidate);
    if (!exists) return candidate;
  }
  return `VY-${prefix}-${Date.now().toString(36).toUpperCase()}`;
};

const recordInventoryLog = (entry: {
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
  createdAt?: string;
}): InventoryLog => {
  const id = `INV-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const createdAt = entry.createdAt || new Date().toISOString();
  database.prepare(`
    INSERT INTO inventory_logs (
      id, product_id, sku, product_name, previous_quantity, adjusted_quantity,
      new_quantity, reason, note, admin_id, admin_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.productId,
    entry.sku,
    entry.productName,
    entry.previousQuantity,
    entry.adjustedQuantity,
    entry.newQuantity,
    entry.reason,
    entry.note || '',
    entry.adminId || '',
    entry.adminName || '',
    createdAt
  );
  return {
    id,
    productId: entry.productId,
    sku: entry.sku,
    productName: entry.productName,
    previousQuantity: entry.previousQuantity,
    adjustedQuantity: entry.adjustedQuantity,
    newQuantity: entry.newQuantity,
    reason: entry.reason,
    note: entry.note || undefined,
    adminId: entry.adminId || undefined,
    adminName: entry.adminName || undefined,
    createdAt
  };
};

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/products', (_req, res) => {
  const rows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE COALESCE(is_active, 1) = 1'
  ).all() as ProductDbRow[];
  res.json(rows.map(hydrateProductRow));
});

app.get('/api/categories', (_req, res) => {
  const rows = database.prepare('SELECT id, label, description, image FROM categories ORDER BY rowid').all();
  res.json({ categories: rows });
});

app.get('/api/coupons', (_req, res) => {
  const rows = database.prepare(`
    SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
    FROM coupons ORDER BY created_at DESC, rowid ASC
  `).all() as CouponDbRow[];
  const nowMs = Date.now();
  const validOffers = rows
    .map(hydrateCouponRow)
    .filter((coupon) => isCouponCurrentlyOfferValid(coupon, nowMs));
  res.json({ coupons: validOffers });
});

app.post('/api/coupons/validate', (req, res) => {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) fail(400, 'Enter a coupon code');

    const rawItems = Array.isArray(req.body.items) ? req.body.items as { productId?: string; quantity?: number }[] : [];
    const cartLines: { category: string; lineTotal: number }[] = [];
    for (const item of rawItems) {
      if (!item || typeof item.productId !== 'string') continue;
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 99) continue;
      const prodRow = database.prepare(
        'SELECT data_json, COALESCE(is_active, 1) AS is_active FROM products WHERE id = ?'
      ).get(item.productId) as { data_json: string; is_active: number } | undefined;
      if (!prodRow || prodRow.is_active === 0) continue;
      const product = JSON.parse(prodRow.data_json) as Product;
      cartLines.push({
        category: product.category,
        lineTotal: product.discountPrice * qty
      });
    }

    const sessionUser = getSessionUser(req);
    const result = evaluateCouponForCart(code, cartLines, sessionUser?.id);
    res.json({
      valid: true,
      coupon: result.coupon,
      discountAmount: result.couponDiscount,
      eligibleSubtotal: result.eligibleSubtotal
    });
  } catch (error) {
    const err = error as ApiError;
    res.status(err.status || 400).json({ error: err.message || 'This coupon could not be applied' });
  }
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
  issueSession(id, req, res);
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
  if (Number(row.is_active ?? 1) === 0) {
    return fail(403, 'Your account has been deactivated. Please contact VYORA support for assistance.');
  }
  issueSession(String(row.id), req, res);
  res.json({ user: publicUser(row) });
}));

app.get('/api/auth/me', ...authenticate((req, res) => res.json({ user: req.user })));

app.post('/api/auth/logout', (req, res) => {
  const rawCookie = req.headers.cookie || '';
  const token = rawCookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  clearSessionCookie(req, res);
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
    SELECT c.item_id, c.product_id, c.quantity, c.selected_size, c.selected_color,
           p.id, p.stock, p.sku, p.is_active, p.low_stock_threshold, p.updated_at, p.data_json
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(req.user!.id) as (ProductDbRow & {
    item_id: string; product_id: string; quantity: number; selected_size: string | null;
    selected_color: string | null;
  })[];
  const items: CartItem[] = rows.map((row) => ({
    id: row.item_id,
    productId: row.product_id,
    product: hydrateProductRow(row),
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
  const row = database.prepare('SELECT stock, COALESCE(is_active, 1) AS is_active FROM products WHERE id = ?')
    .get(productId) as { stock: number; is_active: number } | undefined;
  if (row === undefined) return fail(404, 'Product not found');
  if (row.is_active === 0) fail(409, 'This product is currently unavailable');
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

// Timestamp helper sqliteTimestampToIso defined earlier in file

const hydrateOrder = (
  rawJson: string,
  dbCreatedAt?: string | null,
  customer?: { name?: string | null; email?: string | null; phone?: string | null }
): Order => {
  const order = JSON.parse(rawJson) as Order;
  const createdAt = order.createdAt || sqliteTimestampToIso(dbCreatedAt);
  const statusHistory = Array.isArray(order.statusHistory) && order.statusHistory.length > 0
    ? order.statusHistory
    : [{
        status: order.status,
        timestamp: createdAt || new Date().toISOString(),
        note: 'Order recorded'
      }];
  const cleanEmail = customer?.email && !customer.email.endsWith('@phone.vyora.invalid')
    ? customer.email
    : order.customerEmail;
  return {
    ...order,
    createdAt,
    customerName: order.customerName || customer?.name || order.shippingAddress?.fullName,
    customerEmail: cleanEmail,
    customerPhone: order.customerPhone || customer?.phone || order.shippingAddress?.phone,
    billingAddress: order.billingAddress || order.shippingAddress,
    statusHistory,
    shipment: order.shipment || {
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
      shipmentStatus: order.status === 'cancelled'
        ? 'cancelled'
        : order.status === 'delivered'
          ? 'delivered'
          : order.status === 'out_for_delivery'
            ? 'out_for_delivery'
            : order.status === 'shipped'
              ? 'dispatched'
              : order.status === 'packed'
                ? 'packed'
                : 'pending',
      estimatedDeliveryDate: order.estimatedDeliveryDate
    }
  };
};

const loadShipmentHistoryMap = (orderIds: string[]): Map<string, ShipmentHistoryEvent[]> => {
  const result = new Map<string, ShipmentHistoryEvent[]>();
  if (orderIds.length === 0) return result;
  const placeholders = orderIds.map(() => '?').join(', ');
  const rows = database.prepare(`
    SELECT id, order_id, shipment_status, courier_name, tracking_number, dispatch_date,
           estimated_delivery_date, actual_delivery_date, notes, updated_by, created_at
    FROM shipment_history
    WHERE order_id IN (${placeholders})
    ORDER BY created_at ASC, rowid ASC
  `).all(...orderIds) as {
    id: string;
    order_id: string;
    shipment_status: string;
    courier_name: string;
    tracking_number: string;
    dispatch_date: string;
    estimated_delivery_date: string;
    actual_delivery_date: string;
    notes: string;
    updated_by: string;
    created_at: string;
  }[];

  for (const row of rows) {
    const list = result.get(row.order_id) || [];
    list.push({
      id: row.id,
      orderId: row.order_id,
      shipmentStatus: row.shipment_status as ShipmentStatus,
      courierName: row.courier_name || undefined,
      trackingNumber: row.tracking_number || undefined,
      dispatchDate: row.dispatch_date || undefined,
      estimatedDeliveryDate: row.estimated_delivery_date || undefined,
      actualDeliveryDate: row.actual_delivery_date || undefined,
      notes: row.notes || undefined,
      updatedBy: row.updated_by || undefined,
      createdAt: sqliteTimestampToIso(row.created_at) || row.created_at
    });
    result.set(row.order_id, list);
  }
  return result;
};

const attachShipmentHistoryToOrders = (orders: Order[]): Order[] => {
  if (orders.length === 0) return orders;
  const historyMap = loadShipmentHistoryMap(orders.map((order) => order.id));
  return orders.map((order) => {
    const history = historyMap.get(order.id);
    if (!history || history.length === 0) return order;
    const latest = history[history.length - 1];
    return {
      ...order,
      shipment: {
        ...order.shipment,
        actualDeliveryDate: order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate || latest.actualDeliveryDate,
        shipmentHistory: history
      }
    };
  });
};

const recordShipmentHistory = (entry: {
  orderId: string;
  shipmentStatus: ShipmentStatus;
  courierName?: string;
  trackingNumber?: string;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  updatedBy?: string;
  createdAt?: string;
}) => {
  const id = `SH-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const createdAt = entry.createdAt || new Date().toISOString();
  database.prepare(`
    INSERT INTO shipment_history (
      id, order_id, shipment_status, courier_name, tracking_number, dispatch_date,
      estimated_delivery_date, actual_delivery_date, notes, updated_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.orderId,
    entry.shipmentStatus,
    entry.courierName || '',
    entry.trackingNumber || '',
    entry.dispatchDate || '',
    entry.estimatedDeliveryDate || '',
    entry.actualDeliveryDate || '',
    entry.notes || '',
    entry.updatedBy || '',
    createdAt
  );
};

app.get('/api/orders', ...authenticate((req, res) => {
  if (req.user!.role === 'admin') {
    const rows = database.prepare(`
      SELECT o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `).all() as {
      data_json: string; created_at: string;
      user_name: string | null; user_email: string | null; user_phone: string | null;
    }[];
    const orders = attachShipmentHistoryToOrders(
      rows.map((row) => hydrateOrder(row.data_json, row.created_at, {
        name: row.user_name,
        email: row.user_email,
        phone: row.user_phone
      }))
    );
    return res.json({ orders });
  }
  const rows = database.prepare('SELECT data_json, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.id) as { data_json: string; created_at: string }[];
  const orders = attachShipmentHistoryToOrders(
    rows.map((row) => hydrateOrder(row.data_json, row.created_at))
  );
  res.json({ orders });
}));

app.get('/api/orders/:orderId', ...authenticate((req, res) => {
  const row = database.prepare(`
    SELECT o.user_id, o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get(req.params.orderId) as {
    user_id: string; data_json: string; created_at: string;
    user_name: string | null; user_email: string | null; user_phone: string | null;
  } | undefined;
  if (!row || (req.user!.role !== 'admin' && row.user_id !== req.user!.id)) {
    return fail(404, 'Order not found');
  }
  const hydrated = hydrateOrder(row.data_json, row.created_at, req.user!.role === 'admin' ? {
    name: row.user_name,
    email: row.user_email,
    phone: row.user_phone
  } : undefined);
  const [order] = attachShipmentHistoryToOrders([hydrated]);
  res.json({ order });
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
    SELECT c.item_id, c.product_id, c.quantity, c.selected_size, c.selected_color, p.data_json, p.stock, COALESCE(p.is_active, 1) AS is_active
    FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ?
  `).all(req.user!.id) as {
    item_id: string; product_id: string; quantity: number; selected_size: string | null;
    selected_color: string | null; data_json: string; stock: number; is_active: number;
  }[];
  if (cartRows.length === 0) fail(400, 'Your cart is empty');
  if (cartRows.some((row) => row.is_active === 0)) fail(409, 'A product in your bag is no longer available');
  if (cartRows.some((row) => row.quantity > row.stock)) fail(409, 'A cart item no longer has enough stock');

  const products = cartRows.map((row) => JSON.parse(row.data_json) as Product);
  const cartLines = cartRows.map((row, index) => ({
    category: products[index].category,
    lineTotal: products[index].discountPrice * row.quantity
  }));
  const subtotal = cartLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = cartRows.reduce((sum, row, index) =>
    sum + (products[index].originalPrice - products[index].discountPrice) * row.quantity, 0);
  const couponCode = typeof req.body.couponCode === 'string' ? req.body.couponCode.trim().toUpperCase() : '';
  const couponEvaluation = couponCode
    ? evaluateCouponForCart(couponCode, cartLines, req.user!.id)
    : null;
  const coupon = couponEvaluation?.coupon;
  const couponDiscount = couponEvaluation?.couponDiscount ?? 0;
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
  const createdAt = now.toISOString();
  const estimatedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const order: Order = {
    id,
    date: now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    createdAt,
    customerName: req.user!.name || address.fullName,
    customerEmail: req.user!.email || undefined,
    customerPhone: req.user!.phone || address.phone,
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
    billingAddress: address,
    status: 'placed',
    statusHistory: [{
      status: 'placed',
      timestamp: createdAt,
      note: paymentIntent ? 'Order placed with verified Razorpay payment' : 'Order placed (Cash on Delivery)',
      updatedBy: req.user!.name || 'Customer'
    }],
    shipment: {
      shipmentStatus: 'pending',
      estimatedDeliveryDate
    },
    estimatedDeliveryDate,
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
    const activeUserRow = database.prepare('SELECT is_active FROM users WHERE id = ?')
      .get(req.user!.id) as { is_active: number | null } | undefined;
    if (!activeUserRow || Number(activeUserRow.is_active ?? 1) === 0) {
      fail(403, 'Your account has been deactivated and cannot place orders.');
    }
    const orderStamp = new Date().toISOString();
    if (coupon) {
      if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
        const currentUserUsage = database.prepare(
          'SELECT COUNT(*) AS count FROM coupon_usages WHERE coupon_code = ? COLLATE NOCASE AND user_id = ?'
        ).get(coupon.code, req.user!.id) as { count: number };
        if (Number(currentUserUsage.count) >= coupon.perUserLimit) {
          fail(409, `You have already reached the per-customer usage limit (${coupon.perUserLimit}) for this coupon`);
        }
      }
      const couponClaim = database.prepare(`
        UPDATE coupons
        SET used_count = used_count + 1, updated_at = ?
        WHERE code = ? COLLATE NOCASE
          AND COALESCE(is_active, 1) = 1
          AND (usage_limit IS NULL OR used_count < usage_limit)
      `).run(orderStamp, coupon.code);
      if (Number(couponClaim.changes) !== 1) {
        fail(409, 'This coupon is no longer available or has reached its usage limit');
      }
      const refreshedCouponRow = database.prepare(`
        SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
        FROM coupons WHERE code = ? COLLATE NOCASE
      `).get(coupon.code) as CouponDbRow;
      const updatedCouponJson = hydrateCouponRow(refreshedCouponRow);
      database.prepare('UPDATE coupons SET data_json = ? WHERE code = ? COLLATE NOCASE')
        .run(JSON.stringify(updatedCouponJson), coupon.code);

      const usageId = `CU-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      database.prepare(`
        INSERT INTO coupon_usages (id, coupon_code, order_id, user_id, customer_name, customer_email, discount_amount, order_total, used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        usageId,
        coupon.code,
        order.id,
        req.user!.id,
        req.user!.name || address.fullName,
        req.user!.email || '',
        couponDiscount,
        total,
        orderStamp
      );
    }

    const insertOrder = database.prepare(
      'INSERT INTO orders (id, user_id, status, data_json, idempotency_key) VALUES (?, ?, ?, ?, ?)'
    );
    const updateStock = database.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ? AND COALESCE(is_active, 1) = 1'
    );
    for (const row of cartRows) {
      const stockUpdate = updateStock.run(row.quantity, row.product_id, row.quantity);
      if (Number(stockUpdate.changes) !== 1) fail(409, 'A cart item no longer has enough stock');
      const current = database.prepare('SELECT stock, sku, data_json FROM products WHERE id = ?').get(row.product_id) as {
        stock: number; sku: string | null; data_json: string;
      };
      const currentProduct = JSON.parse(current.data_json) as Product;
      const newStock = Number(current.stock);
      const prevStock = newStock + row.quantity;
      currentProduct.stockQuantity = Math.max(0, newStock);
      currentProduct.inStock = currentProduct.stockQuantity > 0;
      currentProduct.updatedAt = orderStamp;
      database.prepare('UPDATE products SET data_json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(currentProduct), orderStamp, row.product_id);
      recordInventoryLog({
        productId: row.product_id,
        sku: current.sku || currentProduct.sku || '',
        productName: currentProduct.name,
        previousQuantity: prevStock,
        adjustedQuantity: -row.quantity,
        newQuantity: currentProduct.stockQuantity,
        reason: 'order_sale',
        note: `Order #${order.id}`,
        adminId: req.user!.id,
        adminName: req.user!.name || 'Customer',
        createdAt: orderStamp
      });
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

const orderStatuses: OrderStatus[] = [
  'placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'
];

const allowedOrderTransitions: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'processing', 'packed', 'cancelled'],
  confirmed: ['processing', 'packed', 'cancelled'],
  processing: ['packed', 'shipped', 'cancelled'],
  packed: ['shipped', 'out_for_delivery', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: []
};

const humanizeOrderStatus = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

app.patch('/api/orders/:orderId/status', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const nextStatus = req.body.status as OrderStatus;
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
  if (!orderStatuses.includes(nextStatus)) fail(400, 'Invalid order status');

  const nowIso = new Date().toISOString();
  let updatedOrder: Order | null = null;

  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare(`
      SELECT o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
    `).get(req.params.orderId) as {
      data_json: string; created_at: string;
      user_name: string | null; user_email: string | null; user_phone: string | null;
    } | undefined;
    if (row === undefined) return fail(404, 'Order not found');

    const order = hydrateOrder(row.data_json, row.created_at, {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone
    });

    if (order.status === nextStatus) {
      database.exec('COMMIT');
      return res.json({ order });
    }

    const allowed = allowedOrderTransitions[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      fail(400, `Cannot change order from ${humanizeOrderStatus(order.status)} to ${humanizeOrderStatus(nextStatus)}.`);
    }

    const previousStatus = order.status;
    if (nextStatus === 'cancelled') {
      if (!order.stockRestored) {
        const restoreStock = database.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        for (const item of order.items) {
          const prodRow = database.prepare('SELECT data_json, stock, sku FROM products WHERE id = ?')
            .get(item.productId) as { data_json: string; stock: number; sku: string | null } | undefined;
          if (prodRow) {
            const prevStock = Number(prodRow.stock);
            restoreStock.run(item.quantity, item.productId);
            const product = JSON.parse(prodRow.data_json) as Product;
            product.stockQuantity = Math.max(0, prevStock + item.quantity);
            product.inStock = product.stockQuantity > 0;
            product.updatedAt = nowIso;
            database.prepare('UPDATE products SET data_json = ?, stock = ?, updated_at = ? WHERE id = ?')
              .run(JSON.stringify(product), product.stockQuantity, nowIso, item.productId);
            recordInventoryLog({
              productId: item.productId,
              sku: prodRow.sku || product.sku || '',
              productName: product.name,
              previousQuantity: prevStock,
              adjustedQuantity: item.quantity,
              newQuantity: product.stockQuantity,
              reason: 'order_cancel_restock',
              note: `Order #${order.id} cancelled`,
              adminId: req.user!.id,
              adminName: req.user!.name || req.user!.email || 'Administrator',
              createdAt: nowIso
            });
          }
        }
        order.stockRestored = true;
      }
      order.cancelledAt = nowIso;
      order.cancellationReason = note || 'Cancelled by store administrator';
      order.shipment = {
        ...order.shipment,
        shipmentStatus: 'cancelled'
      };
    } else if (nextStatus === 'packed') {
      order.shipment = {
        ...order.shipment,
        shipmentStatus: 'packed'
      };
    } else if (nextStatus === 'shipped') {
      order.shipment = {
        ...order.shipment,
        shipmentStatus: 'dispatched',
        dispatchDate: order.shipment?.dispatchDate || nowIso.slice(0, 10)
      };
    } else if (nextStatus === 'out_for_delivery') {
      order.shipment = {
        ...order.shipment,
        shipmentStatus: 'out_for_delivery'
      };
    } else if (nextStatus === 'delivered') {
      const actualDate = order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate || nowIso.slice(0, 10);
      order.shipment = {
        ...order.shipment,
        shipmentStatus: 'delivered',
        deliveredDate: actualDate,
        actualDeliveryDate: actualDate
      };
    }

    order.status = nextStatus;
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: nextStatus,
        timestamp: nowIso,
        note: note || (nextStatus === 'cancelled'
          ? 'Order cancelled and eligible inventory restored'
          : `Status updated to ${humanizeOrderStatus(nextStatus)}`),
        updatedBy: req.user!.name || req.user!.email || 'Administrator'
      }
    ];

    const result = database.prepare('UPDATE orders SET status = ?, data_json = ? WHERE id = ? AND status = ?')
      .run(nextStatus, JSON.stringify(order), req.params.orderId, previousStatus);
    if (Number(result.changes) !== 1) {
      fail(409, 'Order status was updated concurrently. Please refresh and try again.');
    }
    if (['packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].includes(nextStatus) && order.shipment?.shipmentStatus) {
      recordShipmentHistory({
        orderId: order.id,
        shipmentStatus: order.shipment.shipmentStatus,
        courierName: order.shipment.courierName || order.courierName,
        trackingNumber: order.shipment.trackingNumber || order.trackingNumber,
        dispatchDate: order.shipment.dispatchDate,
        estimatedDeliveryDate: order.shipment.estimatedDeliveryDate || order.estimatedDeliveryDate,
        actualDeliveryDate: order.shipment.actualDeliveryDate || order.shipment.deliveredDate,
        notes: note || `Order status updated to ${humanizeOrderStatus(nextStatus)}`,
        updatedBy: req.user!.name || req.user!.email || 'Administrator',
        createdAt: nowIso
      });
    }
    const [enriched] = attachShipmentHistoryToOrders([order]);
    updatedOrder = enriched;
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  res.json({ order: updatedOrder });
}));

const allowedShipmentStatuses: ShipmentStatus[] = [
  'pending', 'packed', 'dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled'
];

const allowedShipmentTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  pending: ['packed', 'dispatched', 'shipped', 'in_transit', 'cancelled'],
  packed: ['dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'cancelled'],
  dispatched: ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'],
  shipped: ['in_transit', 'out_for_delivery', 'delivered', 'failed'],
  in_transit: ['out_for_delivery', 'delivered', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  failed: ['packed', 'dispatched', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

app.patch('/api/orders/:orderId/shipment', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const body = req.body as OrderShipmentInfo;
  const nowIso = new Date().toISOString();
  let updatedOrder: Order | null = null;

  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare(`
      SELECT o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
    `).get(req.params.orderId) as {
      data_json: string; created_at: string;
      user_name: string | null; user_email: string | null; user_phone: string | null;
    } | undefined;
    if (row === undefined) return fail(404, 'Order not found');

    const order = hydrateOrder(row.data_json, row.created_at, {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone
    });
    if (order.status === 'cancelled') {
      fail(400, 'Cannot update shipment details on a cancelled order');
    }

    const currentShipmentStatus: ShipmentStatus = order.shipment?.shipmentStatus || 'pending';
    let nextShipmentStatus = currentShipmentStatus;
    if (body.shipmentStatus !== undefined) {
      if (!allowedShipmentStatuses.includes(body.shipmentStatus)) {
        fail(400, 'Invalid shipment status');
      }
      if (body.shipmentStatus !== currentShipmentStatus) {
        const allowedNext = allowedShipmentTransitions[currentShipmentStatus] || [];
        if (!allowedNext.includes(body.shipmentStatus)) {
          fail(
            400,
            `Cannot change shipment from ${humanizeOrderStatus(currentShipmentStatus)} to ${humanizeOrderStatus(body.shipmentStatus)}.`
          );
        }
        nextShipmentStatus = body.shipmentStatus;
      }
    }

    const courierName = typeof body.courierName === 'string' ? body.courierName.trim().slice(0, 120) : order.shipment?.courierName;
    const trackingNumber = typeof body.trackingNumber === 'string' ? body.trackingNumber.trim().slice(0, 120) : order.shipment?.trackingNumber;
    const rawDispatchDate = typeof body.dispatchDate === 'string' ? body.dispatchDate.trim().slice(0, 40) : order.shipment?.dispatchDate;
    const dispatchDate = rawDispatchDate ||
      (['dispatched', 'shipped', 'in_transit'].includes(nextShipmentStatus) ? nowIso.slice(0, 10) : undefined);

    const rawActualDeliveryDate = typeof body.actualDeliveryDate === 'string'
      ? body.actualDeliveryDate.trim().slice(0, 40)
      : typeof body.deliveredDate === 'string'
        ? body.deliveredDate.trim().slice(0, 40)
        : (order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate);
    const actualDeliveryDate = nextShipmentStatus === 'delivered'
      ? (rawActualDeliveryDate || nowIso.slice(0, 10))
      : rawActualDeliveryDate;

    const estimatedDeliveryDate = typeof body.estimatedDeliveryDate === 'string' && body.estimatedDeliveryDate.trim()
      ? body.estimatedDeliveryDate.trim().slice(0, 60)
      : order.estimatedDeliveryDate;
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) : order.shipment?.notes;

    const adminActor = req.user!.name || req.user!.email || 'Administrator';
    order.courierName = courierName || undefined;
    order.trackingNumber = trackingNumber || undefined;
    order.estimatedDeliveryDate = estimatedDeliveryDate;
    order.shipment = {
      ...order.shipment,
      courierName: courierName || undefined,
      trackingNumber: trackingNumber || undefined,
      shipmentStatus: nextShipmentStatus,
      dispatchDate: dispatchDate || undefined,
      estimatedDeliveryDate,
      deliveredDate: actualDeliveryDate || undefined,
      actualDeliveryDate: actualDeliveryDate || undefined,
      notes: notes || undefined
    };

    // Safely synchronize Order status forward when shipment status advances
    let syncedOrderStatus: OrderStatus | null = null;
    if (nextShipmentStatus === 'packed' && ['placed', 'confirmed', 'processing'].includes(order.status)) {
      syncedOrderStatus = 'packed';
    } else if (
      ['dispatched', 'shipped', 'in_transit'].includes(nextShipmentStatus) &&
      ['placed', 'confirmed', 'processing', 'packed'].includes(order.status)
    ) {
      syncedOrderStatus = 'shipped';
    } else if (
      nextShipmentStatus === 'out_for_delivery' &&
      ['placed', 'confirmed', 'processing', 'packed', 'shipped'].includes(order.status)
    ) {
      syncedOrderStatus = 'out_for_delivery';
    } else if (
      nextShipmentStatus === 'delivered' &&
      order.status !== 'delivered' &&
      order.status !== 'cancelled'
    ) {
      syncedOrderStatus = 'delivered';
    }

    if (syncedOrderStatus && syncedOrderStatus !== order.status) {
      order.status = syncedOrderStatus;
      order.statusHistory = [
        ...(order.statusHistory || []),
        {
          status: syncedOrderStatus,
          timestamp: nowIso,
          note: notes || `Shipment updated to ${humanizeOrderStatus(nextShipmentStatus)}${courierName ? ` via ${courierName}` : ''}`,
          updatedBy: adminActor
        }
      ];
    }

    database.prepare('UPDATE orders SET status = ?, data_json = ? WHERE id = ?')
      .run(order.status, JSON.stringify(order), req.params.orderId);

    recordShipmentHistory({
      orderId: order.id,
      shipmentStatus: nextShipmentStatus,
      courierName: courierName || undefined,
      trackingNumber: trackingNumber || undefined,
      dispatchDate: dispatchDate || undefined,
      estimatedDeliveryDate,
      actualDeliveryDate: actualDeliveryDate || undefined,
      notes: notes || `Shipment ${humanizeOrderStatus(nextShipmentStatus)}${courierName ? ` · ${courierName}` : ''}${trackingNumber ? ` (${trackingNumber})` : ''}`,
      updatedBy: adminActor,
      createdAt: nowIso
    });

    const [enriched] = attachShipmentHistoryToOrders([order]);
    updatedOrder = enriched;
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  res.json({ order: updatedOrder });
}));

const parseOrderTimeMs = (order: Order): number => {
  if (order.createdAt) {
    const ms = Date.parse(order.createdAt);
    if (!Number.isNaN(ms)) return ms;
  }
  const fallback = Date.parse(order.date);
  return Number.isNaN(fallback) ? 0 : fallback;
};

const getIsoWeekKey = (date: Date) => {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return {
    key: `${copy.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`,
    label: `W${weekNo} ${copy.getUTCFullYear()}`
  };
};

app.get('/api/admin/summary', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const orderRows = database.prepare('SELECT data_json, created_at FROM orders ORDER BY created_at DESC')
    .all() as { data_json: string; created_at: string }[];
  const orders = orderRows.map((row) => hydrateOrder(row.data_json, row.created_at));
  const productRows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products'
  ).all() as ProductDbRow[];
  const products = productRows.map(hydrateProductRow);
  const customers = database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'")
    .get() as { count: number };
  const nonCancelled = orders.filter((order) => order.status !== 'cancelled');
  res.json({
    customers: customers.count,
    products: products.length,
    orders: orders.length,
    revenue: nonCancelled.reduce((total, order) => total + order.total, 0),
    recentOrders: orders.slice(0, 6),
    lowStock: products
      .filter((product) => product.stockQuantity <= (product.lowStockThreshold ?? 10))
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 8)
  });
}));

app.get('/api/admin/analytics', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');

  const rawRange = String(req.query.range || '30d');
  const range: AnalyticsRange = ['7d', '30d', '90d', '1y', 'all', 'custom'].includes(rawRange)
    ? (rawRange as AnalyticsRange)
    : '30d';
  const rawGranularity = String(req.query.granularity || 'daily');
  const granularity: AnalyticsGranularity = ['daily', 'weekly', 'monthly', 'yearly'].includes(rawGranularity)
    ? (rawGranularity as AnalyticsGranularity)
    : 'daily';

  const now = new Date();
  let startMs: number | null = null;
  let endMs: number = now.getTime();
  const queryStart = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
  const queryEnd = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';

  if (range === 'custom' && queryStart) {
    const parsedStart = Date.parse(`${queryStart}T00:00:00.000Z`);
    if (!Number.isNaN(parsedStart)) startMs = parsedStart;
    if (queryEnd) {
      const parsedEnd = Date.parse(`${queryEnd}T23:59:59.999Z`);
      if (!Number.isNaN(parsedEnd)) endMs = parsedEnd;
    }
  } else if (range === '7d') {
    startMs = now.getTime() - 7 * 86400000;
  } else if (range === '30d') {
    startMs = now.getTime() - 30 * 86400000;
  } else if (range === '90d') {
    startMs = now.getTime() - 90 * 86400000;
  } else if (range === '1y') {
    startMs = now.getTime() - 365 * 86400000;
  }

  const orderRows = database.prepare(`
    SELECT o.user_id, o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all() as {
    user_id: string; data_json: string; created_at: string;
    user_name: string | null; user_email: string | null; user_phone: string | null;
  }[];

  const allOrders = orderRows.map((row) => ({
    userId: row.user_id,
    order: hydrateOrder(row.data_json, row.created_at, {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone
    })
  }));

  const productRows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products'
  ).all() as ProductDbRow[];
  const products = productRows.map(hydrateProductRow);
  const productById = new Map(products.map((product) => [product.id, product]));

  const categoryRows = database.prepare('SELECT id, label FROM categories').all() as { id: string; label: string }[];
  const categoryLabelMap = new Map(categoryRows.map((row) => [row.id, row.label || row.id]));

  const customerRows = database.prepare(`
    SELECT id, name, email, phone, club_tier, created_at
    FROM users
    WHERE role = 'customer'
    ORDER BY created_at DESC
  `).all() as {
    id: string; name: string; email: string; phone: string;
    club_tier: string; created_at: string;
  }[];

  const inRange = (ms: number) => (startMs === null ? true : ms >= startMs && ms <= endMs);

  const periodOrders = allOrders.filter(({ order }) => inRange(parseOrderTimeMs(order)));
  const activeOrders = periodOrders.filter(({ order }) => order.status !== 'cancelled');
  const cancelledInPeriod = periodOrders.filter(({ order }) => order.status === 'cancelled');

  const totalRevenue = activeOrders.reduce((sum, { order }) => sum + order.total, 0);
  const grossRevenue = activeOrders.reduce((sum, { order }) => sum + order.subtotal, 0);
  const cancelledRevenue = cancelledInPeriod.reduce((sum, { order }) => sum + order.total, 0);
  const totalDiscounts = activeOrders.reduce((sum, { order }) => sum + order.discount + order.couponDiscount, 0);

  const pendingOrders = periodOrders.filter(({ order }) => ['placed', 'confirmed'].includes(order.status)).length;
  const processingOrders = periodOrders.filter(({ order }) => ['processing', 'packed'].includes(order.status)).length;
  const shippedOrders = periodOrders.filter(({ order }) => ['shipped', 'out_for_delivery'].includes(order.status)).length;
  const deliveredOrders = periodOrders.filter(({ order }) => order.status === 'delivered').length;
  const cancelledOrders = cancelledInPeriod.length;

  const lowStockList = products
    .filter((product) => product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold ?? 10))
    .sort((a, b) => a.stockQuantity - b.stockQuantity);
  const outOfStockCount = products.filter((product) => product.stockQuantity === 0).length;

  let previousRevenue = 0;
  let previousOrdersCount = 0;
  let previousCustomersCount = 0;
  let revenueChangePercent: number | null = null;
  let ordersChangePercent: number | null = null;
  let customersChangePercent: number | null = null;

  if (startMs !== null && endMs > startMs) {
    const duration = endMs - startMs;
    const prevStart = startMs - duration;
    const prevEnd = startMs - 1;
    const prevPeriodOrders = allOrders.filter(({ order }) => {
      const ms = parseOrderTimeMs(order);
      return ms >= prevStart && ms <= prevEnd;
    });
    const prevActive = prevPeriodOrders.filter(({ order }) => order.status !== 'cancelled');
    previousRevenue = prevActive.reduce((sum, { order }) => sum + order.total, 0);
    previousOrdersCount = prevPeriodOrders.length;
    previousCustomersCount = customerRows.filter((customer) => {
      const iso = sqliteTimestampToIso(customer.created_at);
      const ms = iso ? Date.parse(iso) : 0;
      return ms >= prevStart && ms <= prevEnd;
    }).length;
    const currentCustomersInRange = customerRows.filter((customer) => {
      const iso = sqliteTimestampToIso(customer.created_at);
      const ms = iso ? Date.parse(iso) : 0;
      return ms >= startMs! && ms <= endMs;
    }).length;

    revenueChangePercent = previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 1000) / 10
      : null;
    ordersChangePercent = previousOrdersCount > 0
      ? Math.round(((periodOrders.length - previousOrdersCount) / previousOrdersCount) * 1000) / 10
      : null;
    customersChangePercent = previousCustomersCount > 0
      ? Math.round(((currentCustomersInRange - previousCustomersCount) / previousCustomersCount) * 1000) / 10
      : null;
  }

  // Time-series buckets
  const buckets = new Map<string, { key: string; label: string; revenue: number; orders: number; cancelled: number }>();

  const makeBucketInfo = (date: Date) => {
    if (granularity === 'daily') {
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return { key, label };
    }
    if (granularity === 'weekly') {
      return getIsoWeekKey(date);
    }
    if (granularity === 'monthly') {
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      return { key, label };
    }
    const key = String(date.getUTCFullYear());
    return { key, label: key };
  };

  // Pre-seed zeroed buckets for recent daily/monthly windows so charts always render cleanly
  if (granularity === 'daily') {
    const days = range === '7d' ? 7 : range === '30d' ? 14 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endMs - i * 86400000);
      const info = makeBucketInfo(d);
      if (!buckets.has(info.key)) {
        buckets.set(info.key, { ...info, revenue: 0, orders: 0, cancelled: 0 });
      }
    }
  } else if (granularity === 'monthly') {
    const months = range === '1y' || range === 'all' ? 12 : 6;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const info = makeBucketInfo(d);
      if (!buckets.has(info.key)) {
        buckets.set(info.key, { ...info, revenue: 0, orders: 0, cancelled: 0 });
      }
    }
  }

  for (const { order } of periodOrders) {
    const ms = parseOrderTimeMs(order);
    if (!ms) continue;
    const info = makeBucketInfo(new Date(ms));
    const entry = buckets.get(info.key) || { ...info, revenue: 0, orders: 0, cancelled: 0 };
    entry.orders += 1;
    if (order.status === 'cancelled') {
      entry.cancelled += 1;
    } else {
      entry.revenue += order.total;
    }
    buckets.set(info.key, entry);
  }

  const revenueSeries = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));

  // Category-wise sales & best-sellers from non-cancelled orders in period
  const categoryStats = new Map<string, { categoryId: string; label: string; unitsSold: number; revenue: number; orderIds: Set<string> }>();
  const productStats = new Map<string, { productId: string; name: string; category: string; image: string; unitsSold: number; revenue: number; currentStock: number }>();

  for (const { order } of activeOrders) {
    for (const item of order.items) {
      const product = productById.get(item.productId);
      const categoryId = product?.category || 'other';
      const categoryLabel = categoryLabelMap.get(categoryId) || humanizeOrderStatus(categoryId);
      const lineRevenue = item.price * item.quantity;

      const catEntry = categoryStats.get(categoryId) || {
        categoryId,
        label: categoryLabel,
        unitsSold: 0,
        revenue: 0,
        orderIds: new Set<string>()
      };
      catEntry.unitsSold += item.quantity;
      catEntry.revenue += lineRevenue;
      catEntry.orderIds.add(order.id);
      categoryStats.set(categoryId, catEntry);

      const prodEntry = productStats.get(item.productId) || {
        productId: item.productId,
        name: item.name,
        category: categoryLabel,
        image: product?.primaryImage || item.image || '',
        unitsSold: 0,
        revenue: 0,
        currentStock: product?.stockQuantity ?? 0
      };
      prodEntry.unitsSold += item.quantity;
      prodEntry.revenue += lineRevenue;
      productStats.set(item.productId, prodEntry);
    }
  }

  const categorySales = Array.from(categoryStats.values())
    .map(({ orderIds, ...rest }) => ({ ...rest, ordersCount: orderIds.size }))
    .sort((a, b) => b.revenue - a.revenue);

  const bestSellers = Array.from(productStats.values())
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 8);

  const customerSpendMap = new Map<string, { count: number; spent: number }>();
  for (const { userId, order } of allOrders) {
    const prev = customerSpendMap.get(userId) || { count: 0, spent: 0 };
    prev.count += 1;
    if (order.status !== 'cancelled') prev.spent += order.total;
    customerSpendMap.set(userId, prev);
  }

  const recentCustomers = customerRows.slice(0, 8).map((customer) => {
    const spend = customerSpendMap.get(customer.id) || { count: 0, spent: 0 };
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email.endsWith('@phone.vyora.invalid') ? '' : customer.email,
      phone: customer.phone || '',
      clubTier: (customer.club_tier === 'Platinum' || customer.club_tier === 'Gold'
        ? customer.club_tier
        : 'Silver') as 'Silver' | 'Gold' | 'Platinum',
      createdAt: sqliteTimestampToIso(customer.created_at) || customer.created_at,
      orderCount: spend.count,
      totalSpent: spend.spent
    };
  });

  const payload: AdminAnalyticsData = {
    range,
    granularity,
    startDate: queryStart || undefined,
    endDate: queryEnd || undefined,
    kpis: {
      totalRevenue,
      grossRevenue,
      cancelledRevenue,
      totalDiscounts,
      totalOrders: periodOrders.length,
      totalCustomers: customerRows.length,
      totalProducts: products.length,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      lowStockProducts: lowStockList.length,
      outOfStockProducts: outOfStockCount,
      avgOrderValue: activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : 0
    },
    comparison: {
      revenueChangePercent,
      ordersChangePercent,
      customersChangePercent,
      previousRevenue,
      previousOrders: previousOrdersCount,
      previousCustomers: previousCustomersCount
    },
    revenueSeries,
    categorySales,
    bestSellers,
    recentOrders: periodOrders.slice(0, 6).map(({ order }) => order),
    recentCustomers,
    lowStock: products
      .filter((product) => product.stockQuantity <= (product.lowStockThreshold ?? 10))
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 10)
  };

  res.json(payload);
}));

const normalizeAndValidateSku = (rawSku: unknown, category: string, excludeProductId?: string): string => {
  const cleaned = typeof rawSku === 'string' ? rawSku.trim().toUpperCase() : '';
  const sku = cleaned || generateUniqueSku(category);
  if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(sku)) {
    fail(400, 'SKU must be 2–40 characters using letters, numbers, hyphens, or underscores.');
  }
  const conflict = excludeProductId
    ? database.prepare('SELECT id FROM products WHERE sku = ? COLLATE NOCASE AND id <> ?').get(sku, excludeProductId)
    : database.prepare('SELECT id FROM products WHERE sku = ? COLLATE NOCASE').get(sku);
  if (conflict) {
    fail(409, `SKU "${sku}" is already assigned to another product.`);
  }
  return sku;
};

const saveProduct = (product: Product, isNew: boolean) => {
  const isActiveInt = product.isActive === false ? 0 : 1;
  const threshold = Number.isInteger(product.lowStockThreshold) ? Number(product.lowStockThreshold) : 10;
  const updatedAt = product.updatedAt || new Date().toISOString();
  const payload: Product = {
    ...product,
    isActive: isActiveInt === 1,
    lowStockThreshold: threshold,
    updatedAt
  };
  const statement = isNew
    ? database.prepare(`
        INSERT INTO products (id, category, name, price, stock, sku, is_active, low_stock_threshold, updated_at, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    : database.prepare(`
        UPDATE products
        SET category = ?, name = ?, price = ?, stock = ?, sku = ?, is_active = ?, low_stock_threshold = ?, updated_at = ?, data_json = ?
        WHERE id = ?
      `);
  if (isNew) {
    statement.run(
      payload.id,
      payload.category,
      payload.name,
      payload.discountPrice,
      payload.stockQuantity,
      payload.sku || '',
      isActiveInt,
      threshold,
      updatedAt,
      JSON.stringify(payload)
    );
  } else {
    statement.run(
      payload.category,
      payload.name,
      payload.discountPrice,
      payload.stockQuantity,
      payload.sku || '',
      isActiveInt,
      threshold,
      updatedAt,
      JSON.stringify(payload),
      payload.id
    );
  }
};

app.get('/api/admin/products', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const rows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products ORDER BY updated_at DESC, rowid ASC'
  ).all() as ProductDbRow[];
  res.json({ products: rows.map(hydrateProductRow) });
}));

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
  const threshold = product.lowStockThreshold === undefined ? 10 : Number(product.lowStockThreshold);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10_000) {
    fail(400, 'Low stock threshold must be a whole number between 0 and 10,000');
  }

  const nowIso = new Date().toISOString();
  const sku = normalizeAndValidateSku(product.sku, product.category);
  const saved: Product = {
    ...product,
    id: `vyo-${randomUUID()}`,
    sku,
    isActive: product.isActive !== false,
    lowStockThreshold: threshold,
    inStock: product.stockQuantity > 0,
    updatedAt: nowIso
  };

  database.exec('BEGIN IMMEDIATE');
  try {
    saveProduct(saved, true);
    if (saved.stockQuantity > 0) {
      recordInventoryLog({
        productId: saved.id,
        sku,
        productName: saved.name,
        previousQuantity: 0,
        adjustedQuantity: saved.stockQuantity,
        newQuantity: saved.stockQuantity,
        reason: 'restock',
        note: 'Initial product creation stock',
        adminId: req.user!.id,
        adminName: req.user!.name || req.user!.email || 'Administrator',
        createdAt: nowIso
      });
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  res.status(201).json({ product: saved });
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
      product.discountPrice > product.originalPrice ||
      !Number.isInteger(product.stockQuantity) || product.stockQuantity < 0 ||
      !Array.isArray(product.images) || product.images.some((image) =>
        typeof image !== 'string' || image.length > 500_000
      )) {
    fail(400, 'Product update is invalid');
  }
  const existingRow = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold FROM products WHERE id = ?'
  ).get(product.id) as {
    id: string; stock: number; sku: string | null; is_active: number; low_stock_threshold: number;
  } | undefined;
  if (!existingRow) return fail(404, 'Product not found');

  const threshold = product.lowStockThreshold === undefined
    ? Number(existingRow.low_stock_threshold ?? 10)
    : Number(product.lowStockThreshold);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10_000) {
    fail(400, 'Low stock threshold must be a whole number between 0 and 10,000');
  }

  const nowIso = new Date().toISOString();
  const sku = normalizeAndValidateSku(product.sku ?? existingRow.sku, product.category, product.id);
  const updated: Product = {
    ...product,
    sku,
    isActive: product.isActive === undefined ? existingRow.is_active !== 0 : product.isActive !== false,
    lowStockThreshold: threshold,
    inStock: product.stockQuantity > 0,
    updatedAt: nowIso
  };

  database.exec('BEGIN IMMEDIATE');
  try {
    saveProduct(updated, false);
    const delta = updated.stockQuantity - Number(existingRow.stock);
    if (delta !== 0) {
      recordInventoryLog({
        productId: updated.id,
        sku,
        productName: updated.name,
        previousQuantity: Number(existingRow.stock),
        adjustedQuantity: delta,
        newQuantity: updated.stockQuantity,
        reason: 'manual',
        note: 'Updated via product catalog editor',
        adminId: req.user!.id,
        adminName: req.user!.name || req.user!.email || 'Administrator',
        createdAt: nowIso
      });
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  res.json({ product: updated });
}));

app.patch('/api/admin/products/:productId/visibility', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  if (typeof req.body.isActive !== 'boolean') fail(400, 'Specify whether the product is active');
  const row = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE id = ?'
  ).get(req.params.productId) as ProductDbRow | undefined;
  if (!row) return fail(404, 'Product not found');

  const nowIso = new Date().toISOString();
  const product = hydrateProductRow(row);
  product.isActive = req.body.isActive;
  product.updatedAt = nowIso;
  database.prepare('UPDATE products SET is_active = ?, updated_at = ?, data_json = ? WHERE id = ?')
    .run(req.body.isActive ? 1 : 0, nowIso, JSON.stringify(product), req.params.productId);
  res.json({ product });
}));

app.patch('/api/admin/products/:productId/sku', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const rawSku = typeof req.body.sku === 'string' ? req.body.sku.trim().toUpperCase() : '';
  if (!rawSku) fail(400, 'Enter a valid SKU');
  const row = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE id = ?'
  ).get(req.params.productId) as ProductDbRow | undefined;
  if (!row) return fail(404, 'Product not found');

  const product = hydrateProductRow(row);
  const sku = normalizeAndValidateSku(rawSku, product.category, product.id);
  const nowIso = new Date().toISOString();
  product.sku = sku;
  product.updatedAt = nowIso;
  database.prepare('UPDATE products SET sku = ?, updated_at = ?, data_json = ? WHERE id = ?')
    .run(sku, nowIso, JSON.stringify(product), req.params.productId);
  res.json({ product });
}));

app.patch('/api/admin/products/:productId/threshold', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const threshold = Number(req.body.lowStockThreshold);
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 10_000) {
    fail(400, 'Low stock threshold must be a whole number between 0 and 10,000');
  }
  const row = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE id = ?'
  ).get(req.params.productId) as ProductDbRow | undefined;
  if (!row) return fail(404, 'Product not found');

  const nowIso = new Date().toISOString();
  const product = hydrateProductRow(row);
  product.lowStockThreshold = threshold;
  product.updatedAt = nowIso;
  database.prepare('UPDATE products SET low_stock_threshold = ?, updated_at = ?, data_json = ? WHERE id = ?')
    .run(threshold, nowIso, JSON.stringify(product), req.params.productId);
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

const mapInventoryLogRow = (row: {
  id: string;
  product_id: string;
  sku: string;
  product_name: string;
  previous_quantity: number;
  adjusted_quantity: number;
  new_quantity: number;
  reason: string;
  note: string;
  admin_id: string;
  admin_name: string;
  created_at: string;
}): InventoryLog => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku,
  productName: row.product_name,
  previousQuantity: Number(row.previous_quantity),
  adjustedQuantity: Number(row.adjusted_quantity),
  newQuantity: Number(row.new_quantity),
  reason: row.reason as InventoryAdjustmentReason,
  note: row.note || undefined,
  adminId: row.admin_id || undefined,
  adminName: row.admin_name || undefined,
  createdAt: sqliteTimestampToIso(row.created_at) || row.created_at
});

app.get('/api/admin/inventory', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const rows = database.prepare(
    'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products ORDER BY stock ASC, name ASC'
  ).all() as ProductDbRow[];
  const products = rows.map(hydrateProductRow);
  const logRows = database.prepare(
    'SELECT * FROM inventory_logs ORDER BY created_at DESC, rowid DESC LIMIT 100'
  ).all() as Parameters<typeof mapInventoryLogRow>[0][];

  const totalUnits = products.reduce((sum, item) => sum + item.stockQuantity, 0);
  const activeSkus = products.filter((item) => item.isActive !== false).length;
  const lowStockCount = products.filter(
    (item) => item.stockQuantity > 0 && item.stockQuantity <= (item.lowStockThreshold ?? 10)
  ).length;
  const outOfStockCount = products.filter((item) => item.stockQuantity === 0).length;

  res.json({
    summary: {
      totalSkus: products.length,
      activeSkus,
      totalUnits,
      lowStockCount,
      outOfStockCount
    },
    products,
    logs: logRows.map(mapInventoryLogRow)
  });
}));

const adminAdjustmentReasons = new Set<InventoryAdjustmentReason>([
  'restock',
  'damaged',
  'returned',
  'correction',
  'manual'
]);

app.post('/api/admin/inventory/adjust', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const productId = typeof req.body.productId === 'string' ? req.body.productId.trim() : '';
  const adjustment = Number(req.body.adjustment);
  const reason = req.body.reason as InventoryAdjustmentReason;
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 300) : '';

  if (!productId) fail(400, 'Select a product to adjust');
  if (!Number.isInteger(adjustment) || adjustment === 0 || Math.abs(adjustment) > 100_000) {
    fail(400, 'Enter a valid non-zero whole number adjustment');
  }
  if (!adminAdjustmentReasons.has(reason)) {
    fail(400, 'Choose a valid inventory adjustment reason');
  }

  const nowIso = new Date().toISOString();
  let updatedProduct: Product | null = null;
  let logEntry: InventoryLog | null = null;

  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare(
      'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE id = ?'
    ).get(productId) as ProductDbRow | undefined;
    if (!row) return fail(404, 'Product not found');

    const previousQuantity = Number(row.stock);
    const newQuantity = previousQuantity + adjustment;
    if (newQuantity < 0) {
      fail(400, `Cannot reduce stock below 0. Available stock is ${previousQuantity}.`);
    }

    const product = hydrateProductRow(row);
    product.stockQuantity = newQuantity;
    product.inStock = newQuantity > 0;
    product.updatedAt = nowIso;

    database.prepare('UPDATE products SET stock = ?, updated_at = ?, data_json = ? WHERE id = ?')
      .run(newQuantity, nowIso, JSON.stringify(product), productId);

    logEntry = recordInventoryLog({
      productId,
      sku: product.sku || '',
      productName: product.name,
      previousQuantity,
      adjustedQuantity: adjustment,
      newQuantity,
      reason,
      note,
      adminId: req.user!.id,
      adminName: req.user!.name || req.user!.email || 'Administrator',
      createdAt: nowIso
    });
    updatedProduct = product;
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  res.json({ product: updatedProduct, log: logEntry });
}));

app.get('/api/admin/inventory/logs', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const productId = typeof req.query.productId === 'string' ? req.query.productId.trim() : '';
  const reason = typeof req.query.reason === 'string' ? req.query.reason.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const rawLimit = Number(req.query.limit || 200);
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 200;

  let rows = database.prepare(
    'SELECT * FROM inventory_logs ORDER BY created_at DESC, rowid DESC LIMIT ?'
  ).all(limit) as Parameters<typeof mapInventoryLogRow>[0][];

  if (productId) rows = rows.filter((r) => r.product_id === productId);
  if (reason && reason !== 'all') rows = rows.filter((r) => r.reason === reason);
  if (search) {
    rows = rows.filter((r) =>
      [r.product_name, r.sku, r.note, r.admin_name, r.reason].some((val) =>
        (val || '').toLowerCase().includes(search)
      )
    );
  }

  res.json({ logs: rows.map(mapInventoryLogRow) });
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

// ==========================================
// Phase 4: Admin Customer CRM APIs
// ==========================================
type UserDbSummaryRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  club_tier: string;
  club_points: number;
  addresses_json: string;
  is_active: number | null;
  created_at: string;
  updated_at: string | null;
};

const buildAdminCustomer = (row: UserDbSummaryRow, userOrders: Order[]): AdminCustomer => {
  const nonCancelled = userOrders.filter((o) => o.status !== 'cancelled');
  const cancelled = userOrders.filter((o) => o.status === 'cancelled');
  const lifetimeSpent = nonCancelled.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = nonCancelled.length > 0 ? Math.round(lifetimeSpent / nonCancelled.length) : 0;
  const sortedDates = userOrders
    .map((o) => o.createdAt || sqliteTimestampToIso(o.date) || '')
    .filter(Boolean)
    .sort((a, b) => Date.parse(b) - Date.parse(a));
  const addresses = JSON.parse(String(row.addresses_json || '[]')) as Address[];

  return {
    id: row.id,
    name: row.name,
    email: row.email.endsWith('@phone.vyora.invalid') ? '' : row.email,
    phone: row.phone || '',
    role: row.role === 'admin' ? 'admin' : 'customer',
    clubTier: row.club_tier === 'Platinum' || row.club_tier === 'Gold' ? row.club_tier : 'Silver',
    clubPoints: Number(row.club_points || 0),
    isActive: row.is_active === null || row.is_active === undefined ? true : Number(row.is_active) !== 0,
    createdAt: sqliteTimestampToIso(row.created_at) || row.created_at,
    updatedAt: sqliteTimestampToIso(row.updated_at) || undefined,
    totalOrders: userOrders.length,
    completedOrders: userOrders.filter((o) => o.status === 'delivered').length,
    cancelledOrders: cancelled.length,
    lifetimeSpent,
    avgOrderValue,
    lastOrderDate: sortedDates[0] || undefined,
    addressCount: addresses.length
  };
};

app.get('/api/admin/customers', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');

  const userRows = database.prepare(`
    SELECT id, name, email, phone, role, club_tier, club_points, addresses_json, is_active, created_at, updated_at
    FROM users
    WHERE role = 'customer'
    ORDER BY created_at DESC
  `).all() as UserDbSummaryRow[];

  const orderRows = database.prepare('SELECT user_id, data_json, created_at FROM orders ORDER BY created_at DESC').all() as {
    user_id: string;
    data_json: string;
    created_at: string;
  }[];

  const ordersByUser = new Map<string, Order[]>();
  for (const r of orderRows) {
    const list = ordersByUser.get(r.user_id) || [];
    list.push(hydrateOrder(r.data_json, r.created_at));
    ordersByUser.set(r.user_id, list);
  }

  const customers = userRows.map((u) => buildAdminCustomer(u, ordersByUser.get(u.id) || []));
  const stats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => c.isActive).length,
    inactiveCustomers: customers.filter((c) => !c.isActive).length,
    totalLifetimeValue: customers.reduce((sum, c) => sum + c.lifetimeSpent, 0)
  };

  res.json({ customers, stats });
}));

app.get('/api/admin/customers/:customerId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');

  const row = database.prepare(`
    SELECT id, name, email, phone, role, club_tier, club_points, addresses_json, is_active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(req.params.customerId) as UserDbSummaryRow | undefined;
  if (!row) return fail(404, 'Customer not found');

  const orderRows = database.prepare(
    'SELECT data_json, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC'
  ).all(row.id) as { data_json: string; created_at: string }[];
  const customerOrders = orderRows.map((o) => hydrateOrder(o.data_json, o.created_at, {
    name: row.name,
    email: row.email,
    phone: row.phone
  }));

  const categoryRows = database.prepare('SELECT id, label FROM categories').all() as { id: string; label: string }[];
  const categoryLabelMap = new Map(categoryRows.map((c) => [c.id, c.label || c.id]));
  const productRows = database.prepare('SELECT id, category FROM products').all() as { id: string; category: string }[];
  const productCategoryMap = new Map(productRows.map((p) => [p.id, p.category]));

  const catTotals = new Map<string, { categoryId: string; label: string; ordersCount: number; totalSpent: number }>();
  const paymentCounts = new Map<string, number>();
  const couponsSet = new Set<string>();
  let totalCouponSavings = 0;

  for (const ord of customerOrders) {
    paymentCounts.set(ord.paymentMethod, (paymentCounts.get(ord.paymentMethod) || 0) + 1);
    if (ord.couponApplied) couponsSet.add(ord.couponApplied);
    if (ord.status !== 'cancelled') {
      totalCouponSavings += Number(ord.couponDiscount || 0);
      const seenCatsInOrder = new Set<string>();
      for (const item of ord.items) {
        const catId = productCategoryMap.get(item.productId) || 'other';
        const existing = catTotals.get(catId) || {
          categoryId: catId,
          label: categoryLabelMap.get(catId) || humanizeOrderStatus(catId),
          ordersCount: 0,
          totalSpent: 0
        };
        if (!seenCatsInOrder.has(catId)) {
          existing.ordersCount += 1;
          seenCatsInOrder.add(catId);
        }
        existing.totalSpent += item.price * item.quantity;
        catTotals.set(catId, existing);
      }
    }
  }

  const baseCustomer = buildAdminCustomer(row, customerOrders);
  const detail: AdminCustomerDetail = {
    customer: {
      ...baseCustomer,
      addresses: JSON.parse(String(row.addresses_json || '[]')) as Address[]
    },
    orders: customerOrders,
    insights: {
      topCategories: Array.from(catTotals.values()).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5),
      paymentMethods: Array.from(paymentCounts.entries())
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count),
      couponsUsed: Array.from(couponsSet),
      totalCouponSavings
    }
  };

  res.json(detail);
}));

app.patch('/api/admin/customers/:customerId/status', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  if (typeof req.body.isActive !== 'boolean') fail(400, 'Specify whether the customer account is active');

  if (req.params.customerId === req.user!.id && !req.body.isActive) {
    fail(400, 'You cannot deactivate your own administrator account.');
  }

  const row = database.prepare(`
    SELECT id, name, email, phone, role, club_tier, club_points, addresses_json, is_active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(req.params.customerId) as UserDbSummaryRow | undefined;
  if (!row) return fail(404, 'Customer not found');
  if (row.role === 'admin') {
    fail(403, 'Administrator accounts cannot be modified from Customer Management.');
  }

  const nowIso = new Date().toISOString();
  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
      .run(req.body.isActive ? 1 : 0, nowIso, row.id);
    if (!req.body.isActive) {
      database.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.id);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  const refreshed = database.prepare(`
    SELECT id, name, email, phone, role, club_tier, club_points, addresses_json, is_active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(row.id) as UserDbSummaryRow;
  const orderRows = database.prepare('SELECT data_json, created_at FROM orders WHERE user_id = ?').all(row.id) as {
    data_json: string; created_at: string;
  }[];
  const customerOrders = orderRows.map((o) => hydrateOrder(o.data_json, o.created_at));
  res.json({ customer: buildAdminCustomer(refreshed, customerOrders) });
}));

// ==========================================
// Phase 4: Admin Advanced Coupon Management
// ==========================================
const parseAndValidateCouponBody = (body: Record<string, unknown>, existingCode?: string): Coupon => {
  const code = (existingCode || (typeof body.code === 'string' ? body.code : '')).trim().toUpperCase();
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const discountType = body.discountType === 'fixed' ? 'fixed' : body.discountType === 'percentage' ? 'percentage' : null;
  const discountValue = Number(body.discountValue);
  const minOrderValue = Number(body.minOrderValue ?? 0);
  const maxDiscount = body.maxDiscount === undefined || body.maxDiscount === null || body.maxDiscount === ''
    ? undefined
    : Number(body.maxDiscount);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  const parseOptionalDate = (val: unknown, label: string): string | null => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val !== 'string') return fail(400, `${label} is invalid`);
    const ms = Date.parse(val);
    if (Number.isNaN(ms)) return fail(400, `${label} is invalid`);
    return new Date(ms).toISOString();
  };
  const startsAt = parseOptionalDate(body.startsAt, 'Start date');
  const expiresAt = parseOptionalDate(body.expiresAt, 'Expiry date');
  if (startsAt && expiresAt && Date.parse(expiresAt) < Date.parse(startsAt)) {
    fail(400, 'Expiry date cannot be earlier than start date');
  }

  const parseOptionalLimit = (val: unknown, label: string): number | null => {
    if (val === undefined || val === null || val === '') return null;
    const num = Number(val);
    if (!Number.isInteger(num) || num < 1 || num > 1_000_000) {
      fail(400, `${label} must be a positive whole number`);
    }
    return num;
  };
  const usageLimit = parseOptionalLimit(body.usageLimit, 'Total usage limit');
  const perUserLimit = parseOptionalLimit(body.perUserLimit, 'Per-customer usage limit');

  const applicableCategories = Array.isArray(body.applicableCategories)
    ? [...new Set(body.applicableCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0))]
    : [];
  for (const catId of applicableCategories) {
    if (!database.prepare('SELECT id FROM categories WHERE id = ?').get(catId)) {
      fail(400, `Unknown category restriction: ${catId}`);
    }
  }

  if (
    !/^[A-Z0-9_-]{3,30}$/.test(code) ||
    !description ||
    description.length > 250 ||
    !discountType ||
    !Number.isFinite(discountValue) ||
    discountValue <= 0 ||
    !Number.isFinite(minOrderValue) ||
    minOrderValue < 0 ||
    (discountType === 'percentage' && discountValue > 100) ||
    (maxDiscount !== undefined && (!Number.isFinite(maxDiscount) || maxDiscount <= 0))
  ) {
    return fail(400, 'Coupon code, discount, and threshold details are invalid');
  }

  return {
    code,
    description,
    discountType,
    discountValue,
    minOrderValue,
    ...(maxDiscount !== undefined ? { maxDiscount } : {}),
    isActive,
    startsAt,
    expiresAt,
    usageLimit,
    perUserLimit,
    applicableCategories
  };
};

app.get('/api/admin/coupons', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');

  const couponRows = database.prepare(`
    SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
    FROM coupons ORDER BY created_at DESC, rowid ASC
  `).all() as CouponDbRow[];
  const coupons = couponRows.map(hydrateCouponRow);

  const usageRows = database.prepare(`
    SELECT id, coupon_code, order_id, user_id, customer_name, customer_email, discount_amount, order_total, used_at
    FROM coupon_usages
    ORDER BY used_at DESC, rowid DESC
    LIMIT 200
  `).all() as {
    id: string;
    coupon_code: string;
    order_id: string;
    user_id: string;
    customer_name: string;
    customer_email: string;
    discount_amount: number;
    order_total: number;
    used_at: string;
  }[];

  const usages: CouponUsageRecord[] = usageRows.map((u) => ({
    id: u.id,
    couponCode: u.coupon_code.toUpperCase(),
    orderId: u.order_id,
    userId: u.user_id,
    customerName: u.customer_name || 'Customer',
    customerEmail: u.customer_email || '',
    discountAmount: Number(u.discount_amount || 0),
    orderTotal: Number(u.order_total || 0),
    usedAt: sqliteTimestampToIso(u.used_at) || u.used_at
  }));

  const statsAgg = database.prepare(
    'SELECT COUNT(*) AS count, COALESCE(SUM(discount_amount), 0) AS total_discount FROM coupon_usages'
  ).get() as { count: number; total_discount: number };

  const nowMs = Date.now();
  const payload: AdminCouponSummary = {
    coupons,
    stats: {
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter((c) => isCouponCurrentlyOfferValid(c, nowMs)).length,
      totalRedemptions: Math.max(
        Number(statsAgg.count || 0),
        coupons.reduce((sum, c) => sum + (c.usedCount ?? 0), 0)
      ),
      totalDiscountGiven: Number(statsAgg.total_discount || 0)
    },
    usages
  };

  res.json(payload);
}));

app.post('/api/admin/coupons', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const validated = parseAndValidateCouponBody(req.body as Record<string, unknown>);
  const nowIso = new Date().toISOString();
  const coupon: Coupon = {
    ...validated,
    usedCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  try {
    database.prepare(`
      INSERT INTO coupons (code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      coupon.code,
      JSON.stringify(coupon),
      coupon.isActive === false ? 0 : 1,
      coupon.startsAt ?? null,
      coupon.expiresAt ?? null,
      coupon.usageLimit ?? null,
      coupon.perUserLimit ?? null,
      0,
      nowIso,
      nowIso
    );
  } catch (error) {
    if ((error as Error).message.includes('UNIQUE') || (error as Error).message.includes('PRIMARY KEY')) {
      fail(409, `Coupon code "${coupon.code}" already exists`);
    }
    throw error;
  }
  res.status(201).json({ coupon });
}));

app.put('/api/admin/coupons/:code', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const existing = database.prepare(`
    SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
    FROM coupons WHERE code = ? COLLATE NOCASE
  `).get(req.params.code) as CouponDbRow | undefined;
  if (!existing) return fail(404, 'Coupon not found');

  const existingHydrated = hydrateCouponRow(existing);
  const validated = parseAndValidateCouponBody(req.body as Record<string, unknown>, existing.code);
  const nowIso = new Date().toISOString();
  const updated: Coupon = {
    ...validated,
    usedCount: existingHydrated.usedCount ?? 0,
    createdAt: existingHydrated.createdAt || nowIso,
    updatedAt: nowIso
  };

  database.prepare(`
    UPDATE coupons
    SET data_json = ?, is_active = ?, starts_at = ?, expires_at = ?, usage_limit = ?, per_user_limit = ?, updated_at = ?
    WHERE code = ? COLLATE NOCASE
  `).run(
    JSON.stringify(updated),
    updated.isActive === false ? 0 : 1,
    updated.startsAt ?? null,
    updated.expiresAt ?? null,
    updated.usageLimit ?? null,
    updated.perUserLimit ?? null,
    nowIso,
    existing.code
  );
  res.json({ coupon: updated });
}));

app.patch('/api/admin/coupons/:code/status', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  if (typeof req.body.isActive !== 'boolean') fail(400, 'Specify whether the coupon is active');
  const existing = database.prepare(`
    SELECT code, data_json, is_active, starts_at, expires_at, usage_limit, per_user_limit, used_count, created_at, updated_at
    FROM coupons WHERE code = ? COLLATE NOCASE
  `).get(req.params.code) as CouponDbRow | undefined;
  if (!existing) return fail(404, 'Coupon not found');

  const nowIso = new Date().toISOString();
  const hydrated = hydrateCouponRow(existing);
  const updated: Coupon = { ...hydrated, isActive: req.body.isActive, updatedAt: nowIso };
  database.prepare('UPDATE coupons SET is_active = ?, updated_at = ?, data_json = ? WHERE code = ? COLLATE NOCASE')
    .run(req.body.isActive ? 1 : 0, nowIso, JSON.stringify(updated), existing.code);
  res.json({ coupon: updated });
}));

app.delete('/api/admin/coupons/:code', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const result = database.prepare('DELETE FROM coupons WHERE code = ? COLLATE NOCASE').run(req.params.code);
  if (Number(result.changes) === 0) fail(404, 'Coupon not found');
  res.json({ success: true });
}));

// =========================================================================
// Phase 5: Returns, Refunds & Shipping Management APIs
// =========================================================================

const RETURN_WINDOW_DAYS = 7;
const validReturnReasons: ReturnReason[] = ['damaged', 'defective', 'wrong_item', 'missing_item', 'other'];
const validReturnStatuses: ReturnStatus[] = ['pending', 'approved', 'rejected', 'received', 'inspected', 'refunded'];
const allowedReturnTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['inspected'],
  inspected: [],
  rejected: [],
  refunded: []
};

type ReturnRequestDbRow = {
  id: string;
  order_id: string;
  user_id: string;
  status: string;
  reason: string;
  description: string;
  admin_notes: string;
  return_window_days: number;
  delivered_at: string | null;
  eligible_until: string | null;
  estimated_refund_amount: number;
  refunded_amount: number;
  timeline_json: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  received_at: string | null;
  inspected_at: string | null;
  refunded_at: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  order_data_json?: string | null;
};

type ReturnItemDbRow = {
  id: string;
  return_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  ordered_quantity: number;
  requested_quantity: number;
  received_quantity: number;
  restockable_quantity: number;
  damaged_quantity: number;
  inspection_status: string;
  restocked: number;
  restocked_at: string | null;
  inspected_by: string;
};

type RefundRecordDbRow = {
  id: string;
  order_id: string;
  return_id: string | null;
  user_id: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  payment_id: string;
  gateway_refund_id: string;
  gateway_status: string;
  reference_id: string;
  idempotency_key: string;
  notes: string;
  processed_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
};

const getOrderDeliveredTimestampIso = (order: Order): string | undefined => {
  const shipmentDelivered = order.shipment?.actualDeliveryDate || order.shipment?.deliveredDate;
  if (shipmentDelivered) {
    const parsed = Date.parse(shipmentDelivered.includes('T') ? shipmentDelivered : `${shipmentDelivered}T12:00:00.000Z`);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  const deliveredEvent = [...(order.statusHistory || [])].reverse().find((ev) => ev.status === 'delivered');
  if (deliveredEvent?.timestamp) {
    const parsed = Date.parse(deliveredEvent.timestamp);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  const historyRow = database.prepare(
    "SELECT created_at FROM shipment_history WHERE order_id = ? AND shipment_status = 'delivered' ORDER BY created_at DESC LIMIT 1"
  ).get(order.id) as { created_at: string } | undefined;
  if (historyRow?.created_at) {
    return sqliteTimestampToIso(historyRow.created_at) || order.createdAt;
  }
  return order.createdAt;
};

const mapReturnItemRow = (row: ReturnItemDbRow): ReturnItem => ({
  id: row.id,
  returnId: row.return_id,
  orderId: row.order_id,
  productId: row.product_id,
  productName: row.product_name,
  sku: row.sku,
  unitPrice: Number(row.unit_price),
  orderedQuantity: Number(row.ordered_quantity),
  requestedQuantity: Number(row.requested_quantity),
  receivedQuantity: Number(row.received_quantity),
  restockableQuantity: Number(row.restockable_quantity),
  damagedQuantity: Number(row.damaged_quantity),
  inspectionStatus: row.inspection_status as ReturnItemInspectionStatus,
  restocked: Number(row.restocked) !== 0,
  restockedAt: sqliteTimestampToIso(row.restocked_at),
  inspectedBy: row.inspected_by || undefined
});

const hydrateReturnRequests = (rows: ReturnRequestDbRow[]): ReturnRequest[] => {
  if (rows.length === 0) return [];
  const placeholders = rows.map(() => '?').join(', ');
  const itemRows = database.prepare(
    `SELECT * FROM return_items WHERE return_id IN (${placeholders}) ORDER BY rowid ASC`
  ).all(...rows.map((r) => r.id)) as ReturnItemDbRow[];

  const itemsByReturn = new Map<string, ReturnItem[]>();
  for (const itemRow of itemRows) {
    const list = itemsByReturn.get(itemRow.return_id) || [];
    list.push(mapReturnItemRow(itemRow));
    itemsByReturn.set(itemRow.return_id, list);
  }

  return rows.map((row) => {
    const parsedOrder = row.order_data_json ? (JSON.parse(row.order_data_json) as Order) : null;
    const cleanEmail =
      row.customer_email && !row.customer_email.endsWith('@phone.vyora.invalid')
        ? row.customer_email
        : parsedOrder?.customerEmail || '';
    let timeline: ReturnStatusEvent[] = [];
    try {
      timeline = JSON.parse(row.timeline_json || '[]') as ReturnStatusEvent[];
    } catch {
      timeline = [];
    }
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      customerName: row.customer_name || parsedOrder?.customerName || parsedOrder?.shippingAddress?.fullName || 'Customer',
      customerEmail: cleanEmail,
      customerPhone: row.customer_phone || parsedOrder?.customerPhone || parsedOrder?.shippingAddress?.phone || '',
      status: row.status as ReturnStatus,
      reason: row.reason as ReturnReason,
      description: row.description || '',
      adminNotes: row.admin_notes || '',
      returnWindowDays: Number(row.return_window_days || RETURN_WINDOW_DAYS),
      deliveredAt: sqliteTimestampToIso(row.delivered_at) || row.delivered_at || undefined,
      eligibleUntil: sqliteTimestampToIso(row.eligible_until) || row.eligible_until || undefined,
      estimatedRefundAmount: Number(row.estimated_refund_amount || 0),
      refundedAmount: Number(row.refunded_amount || 0),
      orderPaymentMethod: parsedOrder?.paymentMethod,
      orderPaymentStatus: parsedOrder?.paymentStatus,
      orderTotal: parsedOrder?.total,
      items: itemsByReturn.get(row.id) || [],
      timeline,
      createdAt: sqliteTimestampToIso(row.created_at) || row.created_at,
      updatedAt: sqliteTimestampToIso(row.updated_at) || row.updated_at,
      approvedAt: sqliteTimestampToIso(row.approved_at),
      rejectedAt: sqliteTimestampToIso(row.rejected_at),
      receivedAt: sqliteTimestampToIso(row.received_at),
      inspectedAt: sqliteTimestampToIso(row.inspected_at),
      refundedAt: sqliteTimestampToIso(row.refunded_at)
    };
  });
};

const loadSingleReturnRequest = (returnId: string): ReturnRequest | null => {
  const row = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone, o.data_json AS order_data_json
    FROM return_requests rr
    LEFT JOIN users u ON u.id = rr.user_id
    LEFT JOIN orders o ON o.id = rr.order_id
    WHERE rr.id = ?
  `).get(returnId) as ReturnRequestDbRow | undefined;
  if (!row) return null;
  return hydrateReturnRequests([row])[0] || null;
};

const mapRefundRecordRow = (row: RefundRecordDbRow): RefundRecord => ({
  id: row.id,
  orderId: row.order_id,
  returnId: row.return_id || undefined,
  userId: row.user_id,
  customerName: row.customer_name || 'Customer',
  customerEmail:
    row.customer_email && !row.customer_email.endsWith('@phone.vyora.invalid')
      ? row.customer_email
      : '',
  method: row.method as RefundMethod,
  status: row.status as RefundStatus,
  amount: Number(row.amount),
  currency: row.currency || 'INR',
  paymentId: row.payment_id || undefined,
  gatewayRefundId: row.gateway_refund_id || undefined,
  gatewayStatus: row.gateway_status || undefined,
  referenceId: row.reference_id || undefined,
  idempotencyKey: row.idempotency_key,
  notes: row.notes || '',
  processedBy: row.processed_by || undefined,
  createdAt: sqliteTimestampToIso(row.created_at) || row.created_at,
  updatedAt: sqliteTimestampToIso(row.updated_at) || row.updated_at,
  completedAt: sqliteTimestampToIso(row.completed_at)
});

const getCommittedOrderRefundTotals = (orderId: string) => {
  const rows = database.prepare(
    "SELECT status, amount FROM refund_records WHERE order_id = ? AND status IN ('successful', 'manually_completed', 'processing', 'pending')"
  ).all(orderId) as { status: string; amount: number }[];

  let settled = 0;
  let pendingOrProcessing = 0;
  for (const r of rows) {
    const amt = Number(r.amount || 0);
    if (r.status === 'successful' || r.status === 'manually_completed') {
      settled += amt;
    } else {
      pendingOrProcessing += amt;
    }
  }
  return {
    settled: Math.round(settled * 100) / 100,
    pendingOrProcessing: Math.round(pendingOrProcessing * 100) / 100,
    committed: Math.round((settled + pendingOrProcessing) * 100) / 100
  };
};

// Customer Return Endpoints
app.get('/api/returns', ...authenticate((req, res) => {
  const rows = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone, o.data_json AS order_data_json
    FROM return_requests rr
    LEFT JOIN users u ON u.id = rr.user_id
    LEFT JOIN orders o ON o.id = rr.order_id
    WHERE rr.user_id = ?
    ORDER BY rr.created_at DESC, rr.rowid DESC
  `).all(req.user!.id) as ReturnRequestDbRow[];
  res.json({ returns: hydrateReturnRequests(rows) });
}));

app.get('/api/returns/:returnId', ...authenticate((req, res) => {
  const rr = loadSingleReturnRequest(req.params.returnId);
  if (!rr || (req.user!.role !== 'admin' && rr.userId !== req.user!.id)) {
    return fail(404, 'Return request not found');
  }
  res.json({ returnRequest: rr });
}));

app.post('/api/returns', ...authenticate((req, res) => {
  const orderId = typeof req.body.orderId === 'string' ? req.body.orderId.trim() : '';
  const reason = req.body.reason as ReturnReason;
  const description = typeof req.body.description === 'string' ? req.body.description.trim().slice(0, 600) : '';
  const submittedItems = Array.isArray(req.body.items) ? req.body.items as { productId?: unknown; quantity?: unknown }[] : [];

  if (!orderId) fail(400, 'Select an order for your return request');
  if (!validReturnReasons.includes(reason)) {
    fail(400, 'Select a valid return reason (damaged, defective, wrong item, missing item, or other)');
  }
  if (submittedItems.length === 0) {
    fail(400, 'Select at least one item and quantity to return');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const returnId = `RET-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

  database.exec('BEGIN IMMEDIATE');
  try {
    const orderRow = database.prepare(
      'SELECT id, user_id, status, data_json, created_at FROM orders WHERE id = ?'
    ).get(orderId) as { id: string; user_id: string; status: string; data_json: string; created_at: string } | undefined;
    if (!orderRow || orderRow.user_id !== req.user!.id) {
      return fail(404, 'Order not found');
    }

    const order = hydrateOrder(orderRow.data_json, orderRow.created_at);
    if (order.status !== 'delivered') {
      fail(400, 'Return requests can only be submitted for delivered orders.');
    }

    const deliveredIso = getOrderDeliveredTimestampIso(order) || nowIso;
    const deliveredMs = Date.parse(deliveredIso);
    const eligibleUntilMs = deliveredMs + RETURN_WINDOW_DAYS * 86400000;
    const eligibleUntilIso = new Date(eligibleUntilMs).toISOString();
    if (now.getTime() > eligibleUntilMs) {
      fail(400, `The ${RETURN_WINDOW_DAYS}-day return window for order #${order.id} has closed.`);
    }

    // Aggregate quantities already requested for this order across non-rejected returns
    const existingItemRows = database.prepare(`
      SELECT ri.product_id, ri.requested_quantity
      FROM return_items ri
      JOIN return_requests rr ON rr.id = ri.return_id
      WHERE rr.order_id = ? AND rr.status <> 'rejected'
    `).all(order.id) as { product_id: string; requested_quantity: number }[];
    const alreadyRequestedMap = new Map<string, number>();
    for (const r of existingItemRows) {
      alreadyRequestedMap.set(r.product_id, (alreadyRequestedMap.get(r.product_id) || 0) + Number(r.requested_quantity));
    }

    // Aggregate ordered quantities per productId on order
    const orderItemByProduct = new Map<string, { name: string; price: number; orderedQty: number }>();
    for (const item of order.items) {
      const existing = orderItemByProduct.get(item.productId);
      if (existing) {
        existing.orderedQty += item.quantity;
      } else {
        orderItemByProduct.set(item.productId, {
          name: item.name,
          price: item.price,
          orderedQty: item.quantity
        });
      }
    }

    const seenProducts = new Set<string>();
    const validatedLines: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      orderedQuantity: number;
      requestedQuantity: number;
    }[] = [];

    for (const line of submittedItems) {
      const productId = typeof line?.productId === 'string' ? line.productId.trim() : '';
      const quantity = Number(line?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        fail(400, 'Return quantities must be whole numbers of 1 or more');
      }
      if (seenProducts.has(productId)) {
        fail(400, 'Duplicate product lines are not allowed in a single return request');
      }
      seenProducts.add(productId);

      const orderedInfo = orderItemByProduct.get(productId);
      if (!orderedInfo) {
        return fail(400, `Product ${productId} is not part of order #${order.id}`);
      }
      const alreadyRequested = alreadyRequestedMap.get(productId) || 0;
      const remainingReturnable = Math.max(0, orderedInfo.orderedQty - alreadyRequested);
      if (remainingReturnable <= 0) {
        fail(409, `A return request has already been submitted for all quantities of "${orderedInfo.name}".`);
      }
      if (quantity > remainingReturnable) {
        fail(
          409,
          `Only ${remainingReturnable} unit${remainingReturnable === 1 ? '' : 's'} of "${orderedInfo.name}" remain eligible for return.`
        );
      }

      const prodRow = database.prepare('SELECT sku FROM products WHERE id = ?')
        .get(productId) as { sku: string | null } | undefined;

      validatedLines.push({
        productId,
        productName: orderedInfo.name,
        sku: prodRow?.sku || '',
        unitPrice: orderedInfo.price,
        orderedQuantity: orderedInfo.orderedQty,
        requestedQuantity: quantity
      });
    }

    // Prorated refund estimate accounting for order coupon discount, capped at remaining order total
    const orderItemsSubtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const netItemsRatio = orderItemsSubtotal > 0
      ? Math.max(0, orderItemsSubtotal - (order.couponDiscount || 0)) / orderItemsSubtotal
      : 1;
    const requestedGross = validatedLines.reduce((sum, line) => sum + line.unitPrice * line.requestedQuantity, 0);
    const { committed } = getCommittedOrderRefundTotals(order.id);
    const remainingOrderRefundCap = Math.max(0, Math.round((order.total - committed) * 100) / 100);
    const estimatedRefundAmount = Math.min(
      remainingOrderRefundCap,
      Math.round(requestedGross * netItemsRatio * 100) / 100
    );

    const timeline: ReturnStatusEvent[] = [{
      status: 'pending',
      timestamp: nowIso,
      note: `Return requested by customer (${reason.replace(/_/g, ' ')})`,
      updatedBy: req.user!.name || req.user!.email || 'Customer'
    }];

    database.prepare(`
      INSERT INTO return_requests (
        id, order_id, user_id, status, reason, description, admin_notes,
        return_window_days, delivered_at, eligible_until, estimated_refund_amount,
        refunded_amount, timeline_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', ?, ?, '', ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(
      returnId,
      order.id,
      req.user!.id,
      reason,
      description,
      RETURN_WINDOW_DAYS,
      deliveredIso,
      eligibleUntilIso,
      estimatedRefundAmount,
      JSON.stringify(timeline),
      nowIso,
      nowIso
    );

    const insertReturnItem = database.prepare(`
      INSERT INTO return_items (
        id, return_id, order_id, product_id, product_name, sku, unit_price,
        ordered_quantity, requested_quantity, received_quantity, restockable_quantity,
        damaged_quantity, inspection_status, restocked, inspected_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'pending_inspection', 0, '')
    `);
    for (const line of validatedLines) {
      const itemRowId = `RI-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      insertReturnItem.run(
        itemRowId,
        returnId,
        order.id,
        line.productId,
        line.productName,
        line.sku,
        line.unitPrice,
        line.orderedQuantity,
        line.requestedQuantity
      );
    }

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  const returnRequest = loadSingleReturnRequest(returnId);
  res.status(201).json({ returnRequest });
}));

// Admin Return Management & Inspection Endpoints
app.get('/api/admin/returns', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const rows = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone, o.data_json AS order_data_json
    FROM return_requests rr
    LEFT JOIN users u ON u.id = rr.user_id
    LEFT JOIN orders o ON o.id = rr.order_id
    ORDER BY rr.created_at DESC, rr.rowid DESC
  `).all() as ReturnRequestDbRow[];

  const returns = hydrateReturnRequests(rows);
  const stats = {
    totalReturns: returns.length,
    pendingReturns: returns.filter((r) => r.status === 'pending').length,
    approvedReturns: returns.filter((r) => r.status === 'approved').length,
    receivedReturns: returns.filter((r) => r.status === 'received').length,
    inspectedReturns: returns.filter((r) => r.status === 'inspected').length,
    refundedReturns: returns.filter((r) => r.status === 'refunded').length,
    rejectedReturns: returns.filter((r) => r.status === 'rejected').length,
    pendingInspectionItems: returns.reduce(
      (sum, r) =>
        ['approved', 'received'].includes(r.status)
          ? sum + r.items.filter((it) => it.inspectionStatus !== 'inspected').length
          : sum,
      0
    )
  };
  res.json({ returns, stats });
}));

app.patch('/api/admin/returns/:returnId/status', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const nextStatus = req.body.status as ReturnStatus;
  const adminNotes = typeof req.body.adminNotes === 'string' ? req.body.adminNotes.trim().slice(0, 500) : '';
  if (!validReturnStatuses.includes(nextStatus)) {
    fail(400, 'Invalid return status');
  }

  const nowIso = new Date().toISOString();
  const actor = req.user!.name || req.user!.email || 'Administrator';

  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare('SELECT * FROM return_requests WHERE id = ?')
      .get(req.params.returnId) as ReturnRequestDbRow | undefined;
    if (!row) return fail(404, 'Return request not found');

    const currentStatus = row.status as ReturnStatus;
    if (currentStatus === nextStatus) {
      fail(409, `Return request is already marked as ${humanizeOrderStatus(currentStatus)}.`);
    }
    const allowed = allowedReturnTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      fail(400, `Cannot change return request from ${humanizeOrderStatus(currentStatus)} to ${humanizeOrderStatus(nextStatus)}.`);
    }

    if (nextStatus === 'rejected' && !adminNotes) {
      fail(400, 'Provide an explanation note when rejecting a return request.');
    }

    let timeline: ReturnStatusEvent[] = [];
    try {
      timeline = JSON.parse(row.timeline_json || '[]') as ReturnStatusEvent[];
    } catch {
      timeline = [];
    }
    timeline.push({
      status: nextStatus,
      timestamp: nowIso,
      note: adminNotes || `Return ${humanizeOrderStatus(nextStatus)}`,
      updatedBy: actor
    });

    database.prepare(`
      UPDATE return_requests
      SET status = ?,
          admin_notes = COALESCE(NULLIF(?, ''), admin_notes),
          timeline_json = ?,
          updated_at = ?,
          approved_at = CASE WHEN ? = 'approved' THEN COALESCE(approved_at, ?) ELSE approved_at END,
          rejected_at = CASE WHEN ? = 'rejected' THEN COALESCE(rejected_at, ?) ELSE rejected_at END,
          received_at = CASE WHEN ? = 'received' THEN COALESCE(received_at, ?) ELSE received_at END,
          inspected_at = CASE WHEN ? = 'inspected' THEN COALESCE(inspected_at, ?) ELSE inspected_at END
      WHERE id = ? AND status = ?
    `).run(
      nextStatus,
      adminNotes,
      JSON.stringify(timeline),
      nowIso,
      nextStatus, nowIso,
      nextStatus, nowIso,
      nextStatus, nowIso,
      nextStatus, nowIso,
      req.params.returnId,
      currentStatus
    );
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  res.json({ returnRequest: loadSingleReturnRequest(req.params.returnId) });
}));

app.post('/api/admin/returns/:returnId/inspect', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const submittedItems = Array.isArray(req.body.items)
    ? req.body.items as {
        productId?: unknown;
        receivedQuantity?: unknown;
        restockableQuantity?: unknown;
        damagedQuantity?: unknown;
      }[]
    : [];
  const adminNotes = typeof req.body.adminNotes === 'string' ? req.body.adminNotes.trim().slice(0, 500) : '';
  if (submittedItems.length === 0) {
    fail(400, 'Provide inspection quantities for returned items');
  }

  const nowIso = new Date().toISOString();
  const actor = req.user!.name || req.user!.email || 'Administrator';

  database.exec('BEGIN IMMEDIATE');
  try {
    const rrRow = database.prepare('SELECT * FROM return_requests WHERE id = ?')
      .get(req.params.returnId) as ReturnRequestDbRow | undefined;
    if (!rrRow) return fail(404, 'Return request not found');

    if (!['approved', 'received', 'inspected'].includes(rrRow.status)) {
      fail(400, `Cannot inspect items while return request is in ${humanizeOrderStatus(rrRow.status)} state.`);
    }

    const dbItems = database.prepare('SELECT * FROM return_items WHERE return_id = ?')
      .all(req.params.returnId) as ReturnItemDbRow[];
    const itemByProduct = new Map<string, ReturnItemDbRow>(dbItems.map((it) => [it.product_id, it]));

    let totalRestockedThisPass = 0;
    let totalDamagedThisPass = 0;

    for (const input of submittedItems) {
      const productId = typeof input?.productId === 'string' ? input.productId.trim() : '';
      const receivedQty = Number(input?.receivedQuantity);
      const restockableQty = Number(input?.restockableQuantity);
      const damagedQty = Number(input?.damagedQuantity);

      const existingItem = itemByProduct.get(productId);
      if (!existingItem) return fail(400, `Product ${productId} does not belong to return #${rrRow.id}`);

      if (
        !Number.isInteger(receivedQty) || receivedQty < 0 ||
        !Number.isInteger(restockableQty) || restockableQty < 0 ||
        !Number.isInteger(damagedQty) || damagedQty < 0
      ) {
        fail(400, 'Inspection quantities must be non-negative whole numbers');
      }
      if (receivedQty > existingItem.requested_quantity) {
        fail(400, `Received quantity for "${existingItem.product_name}" cannot exceed requested return quantity (${existingItem.requested_quantity}).`);
      }
      if (restockableQty + damagedQty > receivedQty) {
        fail(400, `Restockable + damaged quantity for "${existingItem.product_name}" cannot exceed received quantity (${receivedQty}).`);
      }
      if (existingItem.restocked !== 0) {
        fail(409, `Inventory restoration was already completed for "${existingItem.product_name}". Duplicate stock restoration is blocked.`);
      }

      if (restockableQty > 0) {
        const prodRow = database.prepare(
          'SELECT id, stock, sku, is_active, low_stock_threshold, updated_at, data_json FROM products WHERE id = ?'
        ).get(productId) as ProductDbRow | undefined;
        if (!prodRow) return fail(404, `Catalog product "${existingItem.product_name}" no longer exists`);

        const prevStock = Number(prodRow.stock);
        const newStock = prevStock + restockableQty;
        const product = hydrateProductRow(prodRow);
        product.stockQuantity = newStock;
        product.inStock = newStock > 0;
        product.updatedAt = nowIso;

        database.prepare('UPDATE products SET stock = ?, updated_at = ?, data_json = ? WHERE id = ?')
          .run(newStock, nowIso, JSON.stringify(product), productId);

        recordInventoryLog({
          productId,
          sku: product.sku || existingItem.sku || '',
          productName: product.name,
          previousQuantity: prevStock,
          adjustedQuantity: restockableQty,
          newQuantity: newStock,
          reason: 'return_restock',
          note: `Return #${rrRow.id} inspection restock (Order #${rrRow.order_id})`,
          adminId: req.user!.id,
          adminName: actor,
          createdAt: nowIso
        });
      }

      database.prepare(`
        UPDATE return_items
        SET received_quantity = ?,
            restockable_quantity = ?,
            damaged_quantity = ?,
            inspection_status = 'inspected',
            restocked = CASE WHEN ? > 0 THEN 1 ELSE restocked END,
            restocked_at = CASE WHEN ? > 0 THEN ? ELSE restocked_at END,
            inspected_by = ?
        WHERE id = ?
      `).run(
        receivedQty,
        restockableQty,
        damagedQty,
        restockableQty,
        restockableQty,
        nowIso,
        actor,
        existingItem.id
      );

      totalRestockedThisPass += restockableQty;
      totalDamagedThisPass += damagedQty;
    }

    let timeline: ReturnStatusEvent[] = [];
    try {
      timeline = JSON.parse(rrRow.timeline_json || '[]') as ReturnStatusEvent[];
    } catch {
      timeline = [];
    }
    timeline.push({
      status: 'inspected',
      timestamp: nowIso,
      note: adminNotes || `Inspection complete · ${totalRestockedThisPass} restockable, ${totalDamagedThisPass} damaged`,
      updatedBy: actor
    });

    database.prepare(`
      UPDATE return_requests
      SET status = CASE WHEN status = 'refunded' THEN status ELSE 'inspected' END,
          admin_notes = COALESCE(NULLIF(?, ''), admin_notes),
          timeline_json = ?,
          received_at = COALESCE(received_at, ?),
          inspected_at = COALESCE(inspected_at, ?),
          updated_at = ?
      WHERE id = ?
    `).run(adminNotes, JSON.stringify(timeline), nowIso, nowIso, nowIso, req.params.returnId);

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  res.json({ returnRequest: loadSingleReturnRequest(req.params.returnId) });
}));

// Admin Refund Management Endpoints
app.get('/api/admin/refunds', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');

  const refundRows = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email
    FROM refund_records rr
    LEFT JOIN users u ON u.id = rr.user_id
    ORDER BY rr.created_at DESC, rr.rowid DESC
  `).all() as RefundRecordDbRow[];
  const refunds = refundRows.map(mapRefundRecordRow);

  const orderRows = database.prepare(`
    SELECT o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all() as {
    data_json: string; created_at: string;
    user_name: string | null; user_email: string | null; user_phone: string | null;
  }[];

  const refundedByOrder = new Map<string, { settled: number; pending: number }>();
  for (const r of refunds) {
    if (r.status === 'failed') continue;
    const entry = refundedByOrder.get(r.orderId) || { settled: 0, pending: 0 };
    if (r.status === 'successful' || r.status === 'manually_completed') {
      entry.settled += r.amount;
    } else {
      entry.pending += r.amount;
    }
    refundedByOrder.set(r.orderId, entry);
  }

  const refundableOrders: RefundableOrderSummary[] = orderRows
    .map((row) => hydrateOrder(row.data_json, row.created_at, {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone
    }))
    .filter((order) => order.paymentStatus === 'Paid' || order.status === 'delivered')
    .map((order) => {
      const counts = refundedByOrder.get(order.id) || { settled: 0, pending: 0 };
      const remaining = Math.max(0, Math.round((order.total - counts.settled - counts.pending) * 100) / 100);
      return {
        orderId: order.id,
        customerName: order.customerName || order.shippingAddress.fullName,
        customerEmail: order.customerEmail || '',
        orderStatus: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        orderTotal: order.total,
        alreadyRefunded: Math.round(counts.settled * 100) / 100,
        pendingOrProcessing: Math.round(counts.pending * 100) / 100,
        remainingRefundable: remaining,
        createdAt: order.createdAt
      };
    });

  const completedStatuses: RefundStatus[] = ['successful', 'manually_completed'];
  const stats = {
    totalRefunds: refunds.length,
    totalRefundedAmount: Math.round(
      refunds
        .filter((r) => completedStatuses.includes(r.status))
        .reduce((sum, r) => sum + r.amount, 0) * 100
    ) / 100,
    pendingRefunds: refunds.filter((r) => r.status === 'pending').length,
    processingRefunds: refunds.filter((r) => r.status === 'processing').length,
    successfulRefunds: refunds.filter((r) => r.status === 'successful').length,
    manualCompletedRefunds: refunds.filter((r) => r.status === 'manually_completed').length,
    failedRefunds: refunds.filter((r) => r.status === 'failed').length
  };

  res.json({
    refunds,
    refundableOrders,
    razorpayConfigured: Boolean(getRazorpayCredentials().credentials),
    stats
  });
}));

const syncReturnRefundCompletion = (
  returnId: string | null | undefined,
  refundAmount: number,
  refundId: string,
  actor: string,
  nowIso: string
) => {
  if (!returnId) return;
  const rrRow = database.prepare('SELECT * FROM return_requests WHERE id = ?')
    .get(returnId) as ReturnRequestDbRow | undefined;
  if (!rrRow) return;

  const newRefundedTotal = Math.round((Number(rrRow.refunded_amount || 0) + refundAmount) * 100) / 100;
  let timeline: ReturnStatusEvent[] = [];
  try {
    timeline = JSON.parse(rrRow.timeline_json || '[]') as ReturnStatusEvent[];
  } catch {
    timeline = [];
  }
  timeline.push({
    status: 'refunded',
    timestamp: nowIso,
    note: `Refund #${refundId} completed (₹${refundAmount.toLocaleString('en-IN')})`,
    updatedBy: actor
  });

  database.prepare(`
    UPDATE return_requests
    SET status = 'refunded',
        refunded_amount = ?,
        refunded_at = COALESCE(refunded_at, ?),
        timeline_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(newRefundedTotal, nowIso, JSON.stringify(timeline), nowIso, returnId);
};

app.post('/api/admin/refunds', ...authenticate(async (req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const orderId = typeof req.body.orderId === 'string' ? req.body.orderId.trim() : '';
  const returnId = typeof req.body.returnId === 'string' && req.body.returnId.trim() ? req.body.returnId.trim() : null;
  const mode = req.body.mode === 'razorpay' ? 'razorpay' : 'manual';
  const method = req.body.method as RefundMethod;
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  const idempotencyKey = typeof req.body.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : '';
  const referenceId = typeof req.body.referenceId === 'string' ? req.body.referenceId.trim().slice(0, 120) : '';
  const notes = typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 500) : '';
  const markCompleted = req.body.markCompleted === true;

  if (!orderId) fail(400, 'Select an order for the refund');
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    fail(400, 'A valid idempotency key is required to prevent duplicate refunds');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    fail(400, 'Enter a positive refund amount');
  }
  if (!['razorpay', 'manual_cod', 'manual_bank'].includes(method)) {
    fail(400, 'Choose a valid refund method');
  }
  if (mode === 'razorpay' && method !== 'razorpay') {
    fail(400, 'Razorpay gateway refunds must use method "razorpay"');
  }
  if (mode === 'manual' && markCompleted && !referenceId && !notes) {
    fail(400, 'Provide a payout reference ID or completion note when marking a manual refund completed');
  }

  const existingIdem = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email
    FROM refund_records rr
    LEFT JOIN users u ON u.id = rr.user_id
    WHERE rr.idempotency_key = ?
  `).get(idempotencyKey) as RefundRecordDbRow | undefined;
  if (existingIdem) {
    return res.json({ refund: mapRefundRecordRow(existingIdem), idempotent: true });
  }

  if (mode === 'razorpay' && !getRazorpayCredentials().credentials) {
    fail(
      503,
      'Razorpay Test Mode credentials are not configured on this server. Configure RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET or use Manual Refund Tracking.',
      true
    );
  }

  const nowIso = new Date().toISOString();
  const actor = req.user!.name || req.user!.email || 'Administrator';
  const refundId = `RFD-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

  let reservedOrderPaymentId = '';

  database.exec('BEGIN IMMEDIATE');
  try {
    // Re-check idempotency inside transaction
    const txExisting = database.prepare('SELECT id FROM refund_records WHERE idempotency_key = ?')
      .get(idempotencyKey) as { id: string } | undefined;
    if (txExisting) {
      database.exec('COMMIT');
      const fullExisting = database.prepare(`
        SELECT rr.*, u.name AS customer_name, u.email AS customer_email
        FROM refund_records rr LEFT JOIN users u ON u.id = rr.user_id WHERE rr.id = ?
      `).get(txExisting.id) as RefundRecordDbRow;
      return res.json({ refund: mapRefundRecordRow(fullExisting), idempotent: true });
    }

    const orderRow = database.prepare('SELECT id, user_id, status, data_json, created_at FROM orders WHERE id = ?')
      .get(orderId) as { id: string; user_id: string; status: string; data_json: string; created_at: string } | undefined;
    if (!orderRow) return fail(404, 'Order not found');
    const order = hydrateOrder(orderRow.data_json, orderRow.created_at);

    if (mode === 'razorpay') {
      if (order.paymentMethod === 'COD' || order.paymentStatus !== 'Paid' || !order.paymentId) {
        return fail(400, 'Automatic Razorpay refund is only eligible for orders paid online with a captured Razorpay payment ID.');
      }
      reservedOrderPaymentId = order.paymentId;
    } else {
      if (order.paymentStatus !== 'Paid' && order.status !== 'delivered') {
        fail(400, 'Unpaid COD orders that were never delivered are not eligible for a refund.');
      }
    }

    if (returnId) {
      const retRow = database.prepare('SELECT id, order_id, status, reason FROM return_requests WHERE id = ?')
        .get(returnId) as { id: string; order_id: string; status: string; reason: string } | undefined;
      if (!retRow || retRow.order_id !== order.id) {
        return fail(400, 'Selected return request does not match this order');
      }
      if (retRow.status === 'refunded') {
        fail(409, `Return #${returnId} has already been refunded.`);
      }
      if (retRow.status === 'pending' || retRow.status === 'rejected') {
        fail(400, `Cannot process refund while return #${returnId} is ${retRow.status}. Approve and inspect it first.`);
      }
      if (retRow.status === 'approved' && retRow.reason !== 'missing_item') {
        fail(400, `Return #${returnId} items must be received and inspected before issuing a refund.`);
      }
    }

    const { committed } = getCommittedOrderRefundTotals(order.id);
    const remainingCap = Math.max(0, Math.round((order.total - committed) * 100) / 100);
    if (remainingCap <= 0) {
      fail(409, `Order #${order.id} has already been fully refunded (₹${order.total.toLocaleString('en-IN')}).`);
    }
    if (amount > remainingCap) {
      fail(
        409,
        `Refund amount ₹${amount.toLocaleString('en-IN')} exceeds remaining refundable balance ₹${remainingCap.toLocaleString('en-IN')} on order #${order.id}.`
      );
    }

    const initialStatus: RefundStatus = mode === 'razorpay'
      ? 'processing'
      : markCompleted
        ? 'manually_completed'
        : 'pending';

    database.prepare(`
      INSERT INTO refund_records (
        id, order_id, return_id, user_id, method, status, amount, currency,
        payment_id, gateway_refund_id, gateway_status, reference_id,
        idempotency_key, notes, processed_by, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', ?, '', '', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      refundId,
      order.id,
      returnId,
      orderRow.user_id,
      method,
      initialStatus,
      amount,
      order.paymentId || '',
      mode === 'manual' ? referenceId : '',
      idempotencyKey,
      notes,
      actor,
      nowIso,
      nowIso,
      initialStatus === 'manually_completed' ? nowIso : null
    );

    if (initialStatus === 'manually_completed') {
      syncReturnRefundCompletion(returnId, amount, refundId, actor, nowIso);
    }

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  if (mode === 'razorpay') {
    try {
      const gw = await razorpayRequest(`/payments/${encodeURIComponent(reservedOrderPaymentId)}/refund`, 'POST', {
        amount: Math.round(amount * 100),
        notes: {
          orderId,
          ...(returnId ? { returnId } : {}),
          ...(notes ? { reason: notes.slice(0, 200) } : {})
        }
      }) as { id?: unknown; status?: unknown };

      const gwRefundId = typeof gw.id === 'string' ? gw.id : '';
      const gwStatusRaw = typeof gw.status === 'string' ? gw.status.toLowerCase() : '';
      // Strictly verify Razorpay status before ever marking 'successful'
      const mappedStatus: RefundStatus = gwStatusRaw === 'processed'
        ? 'successful'
        : gwStatusRaw === 'pending' || gwStatusRaw === 'created'
          ? 'processing'
          : 'failed';
      const finishIso = new Date().toISOString();

      database.exec('BEGIN IMMEDIATE');
      try {
        database.prepare(`
          UPDATE refund_records
          SET status = ?,
              gateway_refund_id = ?,
              gateway_status = ?,
              reference_id = COALESCE(NULLIF(reference_id, ''), ?),
              updated_at = ?,
              completed_at = ?
          WHERE id = ?
        `).run(
          mappedStatus,
          gwRefundId,
          gwStatusRaw || 'unknown',
          gwRefundId,
          finishIso,
          mappedStatus === 'successful' ? finishIso : null,
          refundId
        );
        if (mappedStatus === 'successful') {
          syncReturnRefundCompletion(returnId, amount, refundId, actor, finishIso);
        }
        database.exec('COMMIT');
      } catch (dbErr) {
        database.exec('ROLLBACK');
        throw dbErr;
      }
    } catch (gwError) {
      const failIso = new Date().toISOString();
      const errMessage = gwError instanceof Error ? gwError.message : String(gwError);
      database.prepare(`
        UPDATE refund_records
        SET status = 'failed',
            gateway_status = 'error',
            notes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        notes ? `${notes} · Gateway error: ${errMessage}`.slice(0, 500) : `Gateway error: ${errMessage}`.slice(0, 500),
        failIso,
        refundId
      );
      throw gwError;
    }
  }

  const savedRow = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email
    FROM refund_records rr LEFT JOIN users u ON u.id = rr.user_id WHERE rr.id = ?
  `).get(refundId) as RefundRecordDbRow;

  res.status(201).json({ refund: mapRefundRecordRow(savedRow), idempotent: false });
}));

app.patch('/api/admin/refunds/:refundId', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const nextStatus = req.body.status as Extract<RefundStatus, 'manually_completed' | 'failed'>;
  const referenceId = typeof req.body.referenceId === 'string' ? req.body.referenceId.trim().slice(0, 120) : '';
  const notes = typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 500) : '';
  if (!['manually_completed', 'failed'].includes(nextStatus)) {
    fail(400, 'Invalid refund completion update');
  }
  if (nextStatus === 'manually_completed' && !referenceId && !notes) {
    fail(400, 'Provide a refund payout reference ID or completion note');
  }

  const nowIso = new Date().toISOString();
  const actor = req.user!.name || req.user!.email || 'Administrator';

  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare('SELECT * FROM refund_records WHERE id = ?')
      .get(req.params.refundId) as RefundRecordDbRow | undefined;
    if (!row) return fail(404, 'Refund record not found');
    if (row.status === 'successful' || row.status === 'manually_completed') {
      fail(409, 'This refund has already been completed and cannot be modified');
    }

    database.prepare(`
      UPDATE refund_records
      SET status = ?,
          reference_id = COALESCE(NULLIF(?, ''), reference_id),
          notes = COALESCE(NULLIF(?, ''), notes),
          processed_by = ?,
          updated_at = ?,
          completed_at = ?
      WHERE id = ?
    `).run(
      nextStatus,
      referenceId,
      notes,
      actor,
      nowIso,
      nextStatus === 'manually_completed' ? nowIso : null,
      row.id
    );

    if (nextStatus === 'manually_completed') {
      syncReturnRefundCompletion(row.return_id, Number(row.amount), row.id, actor, nowIso);
    }

    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  const updatedRow = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email
    FROM refund_records rr LEFT JOIN users u ON u.id = rr.user_id WHERE rr.id = ?
  `).get(req.params.refundId) as RefundRecordDbRow;
  res.json({ refund: mapRefundRecordRow(updatedRow) });
}));

app.post('/api/admin/refunds/:refundId/sync', ...authenticate(async (req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const row = database.prepare('SELECT * FROM refund_records WHERE id = ?')
    .get(req.params.refundId) as RefundRecordDbRow | undefined;
  if (!row) return fail(404, 'Refund record not found');
  if (!row.gateway_refund_id) {
    fail(400, 'This refund does not have a Razorpay refund ID to verify.');
  }

  const gw = await razorpayRequest(`/refunds/${encodeURIComponent(row.gateway_refund_id)}`, 'GET') as {
    status?: unknown;
  };
  const gwStatusRaw = typeof gw.status === 'string' ? gw.status.toLowerCase() : '';
  const mappedStatus: RefundStatus = gwStatusRaw === 'processed'
    ? 'successful'
    : gwStatusRaw === 'failed'
      ? 'failed'
      : 'processing';
  const nowIso = new Date().toISOString();
  const actor = req.user!.name || req.user!.email || 'Administrator';

  database.exec('BEGIN IMMEDIATE');
  try {
    database.prepare(`
      UPDATE refund_records
      SET status = ?,
          gateway_status = ?,
          updated_at = ?,
          completed_at = CASE WHEN ? = 'successful' THEN COALESCE(completed_at, ?) ELSE completed_at END
      WHERE id = ?
    `).run(mappedStatus, gwStatusRaw || 'unknown', nowIso, mappedStatus, nowIso, row.id);

    if (mappedStatus === 'successful' && row.status !== 'successful') {
      syncReturnRefundCompletion(row.return_id, Number(row.amount), row.id, actor, nowIso);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  const updatedRow = database.prepare(`
    SELECT rr.*, u.name AS customer_name, u.email AS customer_email
    FROM refund_records rr LEFT JOIN users u ON u.id = rr.user_id WHERE rr.id = ?
  `).get(req.params.refundId) as RefundRecordDbRow;
  res.json({ refund: mapRefundRecordRow(updatedRow) });
}));

// Admin Shipping Management Endpoint
app.get('/api/admin/shipments', ...authenticate((req, res) => {
  if (req.user!.role !== 'admin') fail(403, 'Administrator access is required');
  const rows = database.prepare(`
    SELECT o.data_json, o.created_at, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all() as {
    data_json: string; created_at: string;
    user_name: string | null; user_email: string | null; user_phone: string | null;
  }[];

  const shipments = attachShipmentHistoryToOrders(
    rows.map((row) => hydrateOrder(row.data_json, row.created_at, {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone
    }))
  );

  const nonCancelled = shipments.filter((o) => o.status !== 'cancelled');
  const stats = {
    totalOrders: shipments.length,
    pendingDispatch: nonCancelled.filter((o) => {
      const s = o.shipment?.shipmentStatus || 'pending';
      return s === 'pending' || s === 'packed';
    }).length,
    inTransit: nonCancelled.filter((o) => {
      const s = o.shipment?.shipmentStatus || 'pending';
      return s === 'dispatched' || s === 'shipped' || s === 'in_transit';
    }).length,
    outForDelivery: nonCancelled.filter((o) => o.shipment?.shipmentStatus === 'out_for_delivery').length,
    delivered: nonCancelled.filter((o) => o.shipment?.shipmentStatus === 'delivered' || o.status === 'delivered').length,
    failed: nonCancelled.filter((o) => o.shipment?.shipmentStatus === 'failed').length
  };

  res.json({ shipments, stats });
}));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.use((error: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 && !error.expose ? 'A server error occurred' : error.message
  });
});

async function startServer() {
  const httpServer = createServer(app);
  let viteServer: { close: () => Promise<void> } | null = null;

  if (process.env.NODE_ENV !== 'production') {
    if (process.env.CONTROL_PLANE_PORT && !process.env.DISABLE_HMR) {
      process.env.DISABLE_HMR = 'true';
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer }
      },
      appType: 'spa'
    });
    viteServer = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = join(serverDirectory, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());

  const listenWithRetry = (attempt = 0): Promise<void> =>
    new Promise((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        httpServer.off('listening', onListening);
        if (err.code === 'EADDRINUSE' && attempt < 6) {
          setTimeout(() => {
            listenWithRetry(attempt + 1).then(resolve, reject);
          }, 350);
          return;
        }
        reject(err);
      };
      const onListening = () => {
        httpServer.off('error', onError);
        console.log(`VYORA listening on http://0.0.0.0:${port}`);
        resolve();
      };
      httpServer.once('error', onError);
      httpServer.once('listening', onListening);
      httpServer.listen(port, '0.0.0.0');
    });

  await listenWithRetry();

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    Promise.allSettled([
      new Promise<void>((resolve) => httpServer.close(() => resolve())),
      viteServer ? viteServer.close() : Promise.resolve()
    ]).finally(() => {
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((error) => {
  console.error('Failed to start VYORA server:', error);
  process.exit(1);
});
