# VYORA

## Local development

Use Node.js 22.5 or newer (the API uses Node's built-in SQLite module). First-time setup is `npm install`; start the full application with `npm run dev`. The `.env` file is optional for local startup.

For online checkout, create `.env` in the project root (next to `server.ts`) from `.env.example`, then set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` using **Test Mode** API credentials from the Razorpay Dashboard. In PowerShell, run `Copy-Item .env.example .env`, edit the two Razorpay values, then restart `npm run dev`. The server loads this file from its own project directory even when started from another working directory; existing process environment variables take precedence. The server only accepts test key IDs (`rzp_test_...`); the secret stays server-side and must never be added to frontend variables. With credentials absent or invalid, online payment initiation reports the specific setup problem and does not create an order. Razorpay-hosted checkout presents the instruments enabled for the merchant account and supported by the customer’s device, including eligible UPI apps (such as Google Pay, PhonePe, or Paytm), UPI intent/QR, cards, banks, and wallets. VYORA does not store payment credentials. COD does not require gateway credentials.

Set `ADMIN_EMAIL` in `.env` if an account registered with that email should receive administrator access.

Start the API and frontend together from this project directory:

```text
npm run dev
```

This runs the Express API on `http://127.0.0.1:3001` and the frontend on `http://localhost:3000`. Vite proxies `/api` requests to the API. If either process exits, the other is stopped as well. The API creates `data/vyora.sqlite` on first startup and seeds missing catalog and coupon data. Keep the `data` directory backed up for persistent store data. No separate API command or `.env` copy is needed to start local COD checkout.

Run `npm run lint` and `npm run build` to validate the frontend and TypeScript sources.

Online payments create an order only after the server verifies the Razorpay signature and confirms the payment is captured. Failed or unverified payments are not marked as paid.

Order records, payment state, and fulfillment status are stored in SQLite. Customers can refresh their order list and individual order progress from the server. Admin accounts (configured through `ADMIN_EMAIL`) can view orders and update fulfillment status. Courier-location tracking and transactional email are not integrated; the order timeline shows only store-managed status, and no email is sent.
