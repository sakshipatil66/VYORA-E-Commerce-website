# VYORA

## Local development

Use Node.js 22.5 or newer (the API uses Node's built-in SQLite module). First-time setup is `npm install`; start the full application with `npm run dev`. The `.env` file is optional for local startup.

For online checkout, create `.env` in the project root (next to `server.ts`) from `.env.example`, then set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` using **Test Mode** API credentials from the Razorpay Dashboard. In PowerShell, run `Copy-Item .env.example .env`, edit the two Razorpay values, then restart `npm run dev`. The server loads this file from its own project directory even when started from another working directory; existing process environment variables take precedence. The server only accepts test key IDs (`rzp_test_...`); the secret stays server-side and must never be added to frontend variables. With credentials absent or invalid, online payment initiation reports the specific setup problem and does not create an order. Razorpay-hosted checkout presents the instruments enabled for the merchant account and supported by the customer’s device, including eligible UPI apps (such as Google Pay, PhonePe, or Paytm), UPI intent/QR, cards, banks, and wallets. VYORA does not store payment credentials. COD does not require gateway credentials.

Set `ADMIN_EMAIL` in `.env` if an account registered with that email should receive administrator access.

The CMS is available at `/admin` (for example, `http://localhost:3000/admin`). Set `ADMIN_EMAIL` in the project `.env`, restart the API, then create an account using that exact email address or sign in to its existing account. On API startup, the configured account is promoted to the administrator role; all CMS API operations also verify the authenticated server-side session and role. Do not expose `ADMIN_EMAIL`-related credentials or session cookies in frontend configuration.

The admin workspace includes live sales, customer, order and stock metrics; product, inventory, order-status, category and coupon management; and responsive order detail views. Product and category edits use the same SQLite-backed catalog served to the storefront. Product image uploads are limited to 350 KB per file and stored with the product record in SQLite; for larger catalogs, use durable image hosting and enter its image URLs instead.

Start the API and frontend together from this project directory:

```text
npm run dev
```

This runs the Express API on `http://127.0.0.1:3001` and the frontend on `http://localhost:3000`. Vite proxies `/api` requests to the API. If either process exits, the other is stopped as well. The API creates `data/vyora.sqlite` on first startup and seeds missing catalog and coupon data. Keep the `data` directory backed up for persistent store data. No separate API command or `.env` copy is needed to start local COD checkout.

Run `npm run lint` and `npm run build` to validate the frontend and TypeScript sources.

Online payments create an order only after the server verifies the Razorpay signature and confirms the payment is captured. Failed or unverified payments are not marked as paid.

Order records, payment state, and fulfillment status are stored in SQLite. Customers can refresh their order list and individual order progress from the server. Admin accounts (configured through `ADMIN_EMAIL`) can view orders and update fulfillment status. Courier-location tracking and transactional email are not integrated; the order timeline shows only store-managed status, and no email is sent.

## Netlify deployment

Netlify serves the Vite frontend and forwards `/api/*` through the `netlify/functions/api.mjs` proxy. The production proxy defaults to `https://vyora-api-b2xc.onrender.com`; set the Netlify runtime environment variable `VYORA_API_URL` to another HTTPS API origin only if the Render service URL changes. Do not add `/api` to that origin. The proxy forwards API requests and session cookies, so frontend calls remain same-origin and do not require browser CORS access to Render. Do not put backend credentials in `VITE_*` variables.

The Express service listens on `0.0.0.0` and uses the hosting platform's `PORT` value, falling back to `API_PORT` or `3001` for local development. For Render, use Node.js 22.5 or newer because the API depends on the built-in `node:sqlite` module. Attach a persistent Render disk and set `DATABASE_PATH` to a file on that disk if database records must survive service restarts or redeployments; the default filesystem may be ephemeral.
