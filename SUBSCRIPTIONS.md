# Dukaan Khata subscription plans

The public plan catalogue is in `subscription-plans.js`. It is a display/configuration source only; it is **not** a payment verifier or a security boundary.

## Plan catalogue

| Plan | Price | Customers | Bills per month |
|---|---:|---:|---:|
| Starter | Free | 50 | 500 |
| Pro | ₹50/month | 100 | 1,500 |
| Premium | ₹100/month | 200 | 2,500 |
| Ultra Premium | ₹149/month | Unlimited | Unlimited |

## Required behaviour

- When a customer cap is reached, block **creating a new customer**. Keep existing customers, bills, payment history, and read/view operations accessible.
- When the monthly bill cap is reached, block **creating a new bill**. Do not delete, hide, or modify existing bills.
- Customer counts are total active customer records for the owner's account unless product requirements explicitly change this. Bill counts reset on the billing month's boundary and must be calculated in a consistent timezone (Asia/Kolkata).
- The subscription screen should be shown automatically when an attempted create action is blocked, with plan choices and a payment action.
- After a payment provider confirms payment server-side, associate the subscription with the authenticated owner ID, refresh entitlements, and resume allowed actions without asking the owner to sign up again.
- Existing records must remain accessible while the owner is over limit or the subscription has expired.
- Enforce create limits on the server/data write path as well as in the UI. Client-only checks can be bypassed.
- Do not treat a payment return URL or a client-supplied status as proof of payment. Verify signed webhooks or query the provider from the server; use idempotency so repeated callbacks cannot double-activate or double-charge.

## Payment and release blockers

This catalogue alone does not activate subscriptions. The current repository has legacy Razorpay route files but `payments.js` disables the public Razorpay frontend. Before collecting real money, inspect and complete the provider integration, verify webhook signatures, configure the provider's settlement bank account, store API secrets only as deployment secrets, and test with provider test mode. Confirm that the chosen provider account is approved for the intended product and recurring/monthly billing setup. Do not deploy a UI that implies payment is live until those checks pass.

## Integration status

- [x] Plan IDs, names, prices, and caps defined (display names updated to Pro, Premium, and Ultra Premium).
- [x] Render the four plan cards in the existing subscription screen.
- [ ] Connect customer/bill creation paths to the authoritative entitlement check.
- [x] Add per-owner subscription storage schema and API (migration must still be applied in Supabase).
- [x] Add Razorpay subscription creation, server signature verification, and signed webhook endpoints (provider credentials and dashboard plan IDs still required).
- [x] Add owner entitlement refresh after verified payment (requires database migration and deployment secrets).
- [ ] Test cap edges, duplicate webhooks, failed/pending payments, month rollover, expired plans, and existing-data access.
- [ ] Deploy backend and frontend, then verify production behaviour.

No live payment, automatic renewal, or production enforcement should be claimed until the remaining checklist items are implemented and tested.
