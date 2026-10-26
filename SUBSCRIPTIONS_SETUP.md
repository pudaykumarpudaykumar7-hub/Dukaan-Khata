# Dukaan Khata subscription deployment checklist

## Plans
- Starter: free, 50 customers and 500 bills per India calendar month.
- Pro: ₹50/month, 100 customers and 1,500 bills/month.
- Premium: ₹100/month, 200 customers and 2,500 bills/month.
- Ultra Premium: ₹149/month, unlimited customers and bills.

## Implemented in this branch
- Authenticated Razorpay subscription creation. Owner ID comes from Supabase-verified bearer token, never a client-supplied owner ID.
- Checkout signature verification and server-side Razorpay API checks for captured payment and matching plan.
- Per-owner subscription entitlement storage and lookup.
- Signed Razorpay webhook handling for activation, charge, cancellation and halt events.
- UI limit checks, upgrade prompts and existing-record preservation.

## Required setup before live payments
1. Apply supabase/subscriptions.sql in the Supabase SQL Editor.
2. In Razorpay, create monthly recurring plans for exactly ₹50, ₹100 and ₹149. Copy their plan IDs.
3. Configure these Vercel environment variables for the deployment: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET, RAZORPAY_PLAN_PRO_ID, RAZORPAY_PLAN_PREMIUM_ID, RAZORPAY_PLAN_ULTRA_PREMIUM_ID, SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY), and SUPABASE_SERVICE_ROLE_KEY. Never commit secrets or expose service-role keys in browser code.
4. Configure webhook URL https://YOUR-PRODUCTION-DOMAIN/api/subscriptions/webhook with the same webhook secret and events subscription.activated, subscription.charged, subscription.cancelled, and subscription.halted.
5. Confirm merchant KYC, settlement bank account, and recurring-payment approval. Test with Razorpay test-mode credentials before production.
6. Redeploy after environment variables are saved and run successful, failed, pending, duplicate-webhook, renewal, cancellation and expiry tests.

## Important local-ledger limitation
The existing app stores its owner ledger in browser-local storage and has local-only mode enabled. UI checks can block normal create actions but the server cannot authoritatively count local-only customer and bill records or prevent a modified client from bypassing local checks. Strong server-side usage enforcement requires routing create writes through a trusted backend or moving the ledger to server-authoritative storage. That architecture change must be designed to avoid losing existing records. Do not claim tamper-resistant server-side usage enforcement is complete until that is implemented and tested.

## Safety
A redirect is not proof of payment. Paid access is granted only after server verification or a valid webhook. Existing records are not deleted when a limit is reached or a plan expires. This code does not contain provider secrets.
