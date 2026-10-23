# Customer Google OAuth with owner-approved links

This branch adds a separate Google customer access path. It does not change the existing SMS OTP endpoint and does not deploy anything to the live Supabase project.

## Security model
- Customer signs in through Supabase Google OAuth; the server requires a confirmed email.
- Customer submits the Indian mobile number saved on their shop customer record. This is a discovery hint, not proof of phone ownership.
- The backend returns a generic response and does not disclose which shops matched.
- Each matching shop receives a separate pending request. No customer ledger data is returned while pending.
- The owner, authenticated as the owner of a Dukaan Khata state row, may approve or revoke only that owner's request.
- Approval rechecks that the customer record exists, is not in deletedCustomerIds, and still has the same normalized phone.
- Only approved links return the matching customer's own transactions/reminders.
- The link table has RLS enabled and no direct anon/authenticated table grants; only the Edge Function uses the service role.
- Existing verified-phone OTP continues to use customer-portal and the dk_customer_auth storage key.

## Production setup
1. Review and apply the companion SQL migration.
2. Deploy customer-google-portal with JWT verification enabled.
3. Ensure SUPABASE_SERVICE_ROLE_KEY is configured as a Supabase Edge Function secret. Never put it in browser code or commit it.
4. Supabase Auth URL Configuration must allow the exact app URL as redirectTo, including https://pudaykumarpudaykumar7-hub.github.io/Dukaan-Khata/.
5. Google callback URI remains https://nzsldzyjpxwyyrdwkphp.supabase.co/auth/v1/callback; Google Authorized JavaScript origin should be https://pudaykumarpudaykumar7-hub.github.io.
6. Keep Google Client Secret only in Supabase Auth provider settings.

## Required tests before merge/deploy
- Existing owner Google login still works and never shares customer auth storage.
- Existing SMS OTP flow still invokes customer-portal.
- Google customer request reveals no shop names or ledger before approval.
- Two owners with the same customer phone each independently approve their own link.
- A customer cannot enumerate/approve links; owner A cannot approve owner B's link even if an ID is guessed.
- Customer sees only approved linked shops; revocation takes effect on the next portal fetch.
- Changed phone or tombstoned/deleted customer is not returned.
- Invalid token, unconfirmed email, malformed phone, wrong HTTP method, and missing server secret fail closed.
- Run Supabase security advisors and test against staging before applying the migration/deploying function in production.

## Limitations
This branch requires end-to-end staging verification. A matching phone is not verified by Google sign-in; owner approval is the authorization step.
