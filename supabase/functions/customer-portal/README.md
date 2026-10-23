# Nationwide customer portal deployment

The browser UI now uses Supabase Phone OTP and calls the `customer-portal` Edge Function. This function is intentionally server-side because owner ledgers are stored in private `dukaan_khata_state.state` JSON documents.

## Required Supabase setup

1. In Supabase Dashboard → Authentication → Sign In / Providers, enable **Phone** sign-in.
2. Configure a production SMS provider and its credentials, and set OTP/rate limits appropriate for India. SMS delivery and charges depend on the provider and applicable local requirements.
3. Deploy this function to the same Supabase project as Dukaan Khata:
   ```sh
   supabase functions deploy customer-portal
   ```
4. Ensure the Edge Function environment has `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Supabase supplies the project URL and public key in the hosted function environment; set the service-role key as a server secret if it is not already present:
   ```sh
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```
   Replace the placeholder locally. Never commit the service-role key or put it in browser code.
5. Confirm the existing `dukaan_khata_state` table contains each owner's cloud-synced state. Local-only owner data cannot appear in a nationwide portal until it is synced.
6. Test with two separate owner accounts that each have a customer record using the same test phone number. Verify OTP, confirm both shops appear, and confirm each shop shows only that customer's bills/payments and its own owner phone.

## Security behavior

- The Edge Function requires an authenticated Supabase session and checks that the user's phone is confirmed.
- The client receives only matching customer rows, transactions linked to those customer IDs, shop display/contact details, and reminders for those IDs; it never receives an entire owner's state document.
- Deleted customer IDs in `deletedCustomerIds` are excluded.
- The browser uses the public/publishable key only. The service-role key must remain in the Edge Function environment.
- The current data model stores ledgers as one JSON state row per owner, so the server must scan those rows. For large-scale production traffic, migrate to normalized, indexed customer/shop/transaction tables and add server-side rate limiting and monitoring.
- Customer view is read-only. Calling an owner opens the phone dialer; it does not place a call automatically.

## Important

This source change does not deploy the Edge Function or configure SMS by itself. The nationwide feature is not live until the function is deployed and Phone OTP/SMS is configured and tested in the Supabase project.
