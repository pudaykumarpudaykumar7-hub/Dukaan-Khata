# Dukaan Khata
A mobile-first Khata and shop-management app for shopkeepers.

## Payment setup status

Cashfree payment-link integration and its backend configuration have been removed from this version. Smart Receive still supports direct UPI QR generation using the UPI ID saved in Shop Profile, plus manual payment recording. Direct UPI QR payments cannot be automatically verified by this app; check the payment in your UPI app before recording it. Existing shop profiles, customers, Khata entries, and transaction records are preserved.

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

## Payment limitations

Direct UPI QR payments go to the UPI ID saved in the current shop profile. This app does not automatically verify these payments or route payments to every registered shop owner. A future marketplace payment gateway must be configured through an approved provider and a secure backend before claiming automatic confirmation or split settlement.

