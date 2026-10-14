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

## Nationwide readiness: shared shops, products, orders, and owner sync

The migration at `supabase/migrations/202610140001_nationwide_marketplace.sql` adds the shared shop/product/order tables, an order-creation RPC that recalculates prices on the server and checks stock, per-owner row-level security, account-isolated owner cloud sync, and audit-ledger tables for provider-confirmed payments and eligible commissions.

### Required one-time Supabase setup

1. Open the Supabase project used by Dukaan Khata: https://supabase.com/dashboard/project/nzsldzyjpxwyyrdwkphp
2. Open **SQL Editor → New query**.
3. Open `supabase/migrations/202610140001_nationwide_marketplace.sql` in this GitHub repository, copy the complete SQL, paste it into SQL Editor, and run it.
4. Confirm the query completes successfully. If it reports an error, stop and share the exact error text rather than repeatedly running partial SQL.
5. In Supabase **Authentication → Providers**, enable Google and configure the OAuth callback URLs for the Supabase project and the published Dukaan Khata site.
6. Open the live site in a fresh browser session, choose **More → Login Access → Owner Login**, sign in with Google, and verify that the owner's data syncs. Test with a second test account before inviting real shops.
7. Test shop registration in **Dukaan Universe**, then add a product in **Digital Shop & Ordering**, place a test order, and confirm it appears only in that shop owner's Order Management.

The migration does not create or approve a Cashfree marketplace account and does not itself move money. The database ledger is deliberately not writable from public browser clients. Only a trusted backend using server-only credentials should write verified payment events and commission rows.

## Real nationwide payment and commission limitations

- The current Cashfree payment-link endpoint uses one configured Cashfree merchant account. It is not yet a vendor-routed Easy Split integration; do not use it to claim each shop's sale settles directly to that shopkeeper.
- Cashfree Easy Split supports marketplace vendor onboarding and payment splitting, but Dukaan Khata must be approved for the exact business model and configured with the provider's vendor/split APIs. See https://www.cashfree.com/docs/api-reference/payments/latest/split/easy-split-overview and https://www.cashfree.com/easy-split/split-payment-gateway/.
- Your 80% / 10% / 10% split applies to an **eligible commission amount**, not automatically to the full sale amount. The app cannot create revenue from an ordinary UPI QR transaction by itself. Agree with the payment provider who funds the commission and how the merchant receives 100% of the sale amount before going live.
- Customer rewards need an approved payout/reward method, fraud checks, refunds/reversals, reconciliation, support procedures, and legal/tax review. The ledger schema is not a payout engine and does not claim that any money has been transferred.
- Do not put Cashfree Client Secrets, Supabase service-role keys, or bank credentials in GitHub, frontend JavaScript, or browser storage. Keep server-only keys in Vercel environment variables.
- Before nationwide marketing, test access controls with two separate owner accounts, verify that neither can read the other's private Khata/orders, add monitoring/rate limits/abuse prevention, and complete provider approval and live payment tests.

