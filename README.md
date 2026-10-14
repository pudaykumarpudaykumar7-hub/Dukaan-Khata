# Dukaan Khata
A mobile-first Khata and shop-management app for shopkeepers.

## Cashfree Payments setup

The Smart Receive QR uses Cashfree Payment Links and checks the payment status while the Smart Receive screen is open. On a confirmed payment, Dukaan Khata records the payment and displays the green success tick.

1. Create or sign in to a Cashfree Payments merchant account: https://merchant.cashfree.com/merchants/signup
2. Finish merchant onboarding and enable Payment Links in Cashfree.
3. In Cashfree's developer/merchant dashboard, copy the **Client ID** and **Client Secret** for the test environment.
4. In Vercel → Project → Settings → Environment Variables, add:
   - `CASHFREE_CLIENT_ID` — Cashfree test Client ID
   - `CASHFREE_CLIENT_SECRET` — Cashfree test Client Secret
   - `CASHFREE_ENV` — set to `SANDBOX` while testing
5. Redeploy the Vercel project.
6. Open Dukaan Khata → More → Payment Center and save the Vercel backend's base URL (for example, `https://your-project.vercel.app`; do not add `/api`).
7. Test a small payment in Cashfree Sandbox before enabling live payments.

For live processing, complete Cashfree approval, use the live Client ID and Client Secret, set `CASHFREE_ENV` to `PRODUCTION`, and redeploy. Never put the Client Secret in frontend code, GitHub, or browser storage.

## Important multi-shop limitation

The current Cashfree API connection uses the single Cashfree merchant account whose credentials are configured in Vercel. Payments settle to that merchant account. It does **not** yet onboard every Dukaan Khata shop owner as a separate merchant or settle each payment directly to that owner's bank account. For that nationwide multi-owner model, arrange Cashfree's approved platform/marketplace or sub-merchant setup and implement the corresponding owner onboarding and account mapping before launch.

## Run / publish

Open `index.html` in a browser for the static frontend. For a public link, upload the frontend to GitHub Pages and deploy the payment backend on Vercel.
