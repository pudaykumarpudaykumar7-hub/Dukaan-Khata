# Dukaan Khata — Compulsory Feature Implementation Audit

Scope: compulsory roadmap items **1, 2, 3, 9, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23, 24**.

## Safety rules

- Work on `feature/compulsory-16-features`; do not overwrite `main` directly.
- Preserve existing localStorage keys and existing customer, transaction, expense, return, reminder, shop-profile, and Digital Shop Pass records.
- Keep the current Digital Shop Pass layout and QR position/contents unless a verified defect requires a minimal fix.
- Never report a UPI QR payment as verified unless a trusted payment provider confirms it server-side.
- Do not add duplicate screens or parallel data stores when an existing feature can be extended.
- Mark every item implemented only after code review and a repeatable test; external provider setup and production deployment remain separate release gates.

## Initial source signals (not completion claims)

The repository currently includes a static web app, Capacitor configuration, browser-local app state, an owner cloud-sync script, Indian-language translations, customer reminder logic, backup/restore functions, and Digital Shop Pass/rewards code. The README explicitly says direct UPI QR payments are not automatically verified. Payment-related API files exist alongside documentation that says public direct-QR payments are user-verified; these paths need a security and consistency audit before any gateway is enabled.

## Feature acceptance checklist

| No. | Feature | Initial evidence / work required | Acceptance evidence required |
|---:|---|---|---|
| 1 | Advanced Customer Management | Customer records exist in app state. Audit duplicate detection, search/filter, contacts, history and balance accuracy before extending. | Add/edit/archive/search customers; balances and historical entries remain correct. |
| 2 | Complete Digital Khata | Customer and transaction arrays exist. Audit ledger calculations and transaction edit/delete/partial-payment paths. | Independent balance checks pass for credit, payment, partial payment, edit, and return cases. |
| 3 | Payment Reminders | Reminder state and customer-contact routing are present. Audit scheduling, due dates and delivery affordances. | Reminders show correct customer/amount/due date; no false claim that a message was delivered. |
| 9 | Smart Receive Upgrade | UPI QR / receive flows exist. Audit profile UPI ID, QR payload and manual receipt workflow. | QR scans to the correct payee; manual receipts remain explicitly unverified until reconciled. |
| 12 | Verified Online Payments | README states direct QR is not auto-verified; provider API files exist and are inconsistent with public behavior. | Provider-side status/signature verification, amount/order/payee matching, idempotency and failure/pending states tested. |
| 13 | Shop Profile and Digital Shop Pass | Shop profile and pass/reward code exist. | Save/reload works; existing dimensions/layout retained; QR scans correctly; shop name remains bright white and bold. |
| 15 | Customer Loyalty | Pass points/stamps/rewards logic exists. Audit separation between shopkeeper rewards and customer loyalty. | Earn/redeem rules persist, prevent negative/double redemption, and are clearly attributed to the right customer. |
| 16 | Reliable Cloud Sync and Backup | Supabase sync and local backup/restore code exist. Audit merge/conflict behavior and import validation. | Cross-device sync, conflict handling, backup/restore and migration tests pass without lost or duplicated records. |
| 17 | Security and Staff Permissions | Owner auth exists; staff/role enforcement is not yet confirmed. | RLS and server checks prevent cross-account access; staff roles are enforced for every protected action. |
| 18 | Offline-First Operation | App uses localStorage and a service worker. Audit offline create/edit and eventual sync. | Offline operations persist through reload/restart and reconcile after reconnect without duplicates. |
| 19 | Complete Indian-Language Experience | Translation dictionary and language routing exist. | Every supported language renders key workflows without missing labels/overflows; navigation remains usable. |
| 21 | Business Reports and Exports | Reports and backup export entry points exist. Audit report totals, CSV exports and date filters. | Report figures match ledger data; exported files open correctly and respect date/shop filters. |
| 22 | Multiple Shops and Staff | Shop state is present; multi-shop/staff data model is not yet confirmed. | Shop-scoped records and role permissions isolate data; switching shop never mixes balances. |
| 23 | Easy Data Migration | Backup restore exists. Audit legacy-version import and CSV mapping. | Valid legacy/CSV imports preserve IDs/amounts/dates; invalid files are rejected without modifying existing data. |
| 24 | Smart Business Assistant | A local Daily Coach / insights surface exists. | Advice is derived only from saved data, labels estimates clearly, and never fabricates payment, tax, or financial facts. |
| 25 | Help and Support Centre | Support references/routes exist. Audit for a complete searchable help and issue-reporting flow. | Help opens reliably, includes recovery/payment guidance and lets users report issues without exposing secrets. |

## Implementation sequence

1. Baseline review of entry points, storage keys, existing routes, SQL/RLS, payment endpoints and Android packaging.
2. Add focused tests and data-safety checks before touching high-risk flows.
3. Complete customer/ledger/reminder/receive and Digital Shop Pass/rewards behavior.
4. Harden cloud sync, backup/migration, offline queue, security and shop/staff isolation.
5. Finish language coverage, reporting/export, and assistant workflows.
6. Validate provider-backed payment verification and deployment separately; never simulate a provider success.

## Verification log

- Branch created from `main`: `feature/compulsory-16-features`.
- Initial repository source inspection performed.
- Backup code verification: JavaScript syntax parse passed; confirmed new versioned backup format includes Digital Shop Pass profile, legacy state-only backups remain importable, and restore rollback is present in the error path.
- Automated behavior tests: not run yet.
- UI/device tests: not run yet.
- Production provider credentials/approvals: not verified.
- Deployment: not performed.
\n\n## Product decision update\n\n- Help & Support Centre removed from the app UI and its local help code/styles removed at the user's request. Existing customer, transaction, shop-profile, Digital Shop Pass, backup/restore, and reporting data paths are untouched.\n