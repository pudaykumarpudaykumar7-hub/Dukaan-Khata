# Dukaan Khata Firebase Push Setup

This integration uses the **existing Supabase Google login** to authenticate push requests. Firebase Cloud Messaging delivers notifications; Firestore stores only device push tokens. It does not sync bills, customers, balances, owner profiles, or any other app data.

## Current behavior

- The client obtains an FCM token after the user grants notification permission.
- The client sends the token to the Firebase `registerPushToken` HTTPS function using the current Supabase access token.
- The function validates the bearer token by calling Supabase Auth's `/auth/v1/user` endpoint. It does not trust a client-supplied user ID or merely decode a JWT.
- The token is stored under the verified Supabase user ID in Firestore.
- Bill/payment/reminder events may call `sendSelfNotification`. The function sends only to devices registered to that same verified Supabase user, and it cannot accept a target user ID or arbitrary message.
- The current device token is excluded from remote delivery so the app can show its normal local notification without creating a duplicate on that device. Other registered devices can receive the push, without syncing any shop records.

## Deploy

1. Install the Firebase CLI and sign in with an account that has access to Firebase project `dukaan-khata-a517c`.
2. From the repository root, run `firebase use dukaan-khata-a517c` (or initialize/select that project if prompted).
3. Confirm Cloud Firestore is enabled in this Firebase project.
4. Run `cd functions && npm install && npm run lint`.
5. From the repository root, run `firebase deploy --only firestore:rules,functions`.
6. If Firebase requests a billing-plan upgrade for Cloud Functions, review Firebase pricing and enable billing only if you approve it.

## Authentication and origin

- The HTTPS functions validate sessions against the existing Supabase project `nzsldzyjpxwyyrdwkphp`.
- The configured browser origins are the repository's GitHub Pages origin, one Vercel origin, and local Capacitor/localhost origins. If the app is hosted on a different origin, add that exact trusted origin to `ALLOWED_ORIGINS` in `functions/index.js` before deploying.
- The app must be opened over HTTPS (except local development) and the user must be signed in with Google before token registration succeeds.
- The Supabase publishable key in the function is a public client key, not a service-role secret. Never place a Supabase service-role key or Firebase service-account private key in client code or GitHub.

## Test before calling it live

1. Deploy functions and rules successfully.
2. Open the production app over HTTPS and sign in with the existing Google owner login.
3. Enable notifications and verify a token is registered with no 401/403 errors in the browser console.
4. Verify bill/payment events still show local notifications on the current device.
5. With a second device signed in to the same owner account and push enabled, verify a bill/payment event can reach that device; do not expect its bills/customer data to sync.
6. Test signed-out/expired sessions, denied notification permission, invalid tokens, background delivery, and the actual production hosting origin.

## Honest status

Committing these files does not deploy them. Remote notifications are **not live** until the Firebase functions and rules are deployed and real-device tests pass. The app's shop data remains device-local; this backend stores notification tokens only.
