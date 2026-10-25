# Dukaan Khata Firebase Push Setup

This adds a secure Cloud Functions scaffold for push delivery. It stores **FCM device tokens only**; it does not sync bills, customers, owner profiles, or other app data.

## Important current limitation

The existing app's owner login must provide a Firebase Authentication ID token before the client can call `registerPushToken`. A locally stored Google login or a Supabase session is not automatically a Firebase ID token. Do not weaken the function to accept unauthenticated token registrations, and do not put service-account credentials in the browser.

The current client obtains an FCM token, but it does not yet call these functions. Remote push is therefore **not live just by adding these files**.

## Deploy

1. Install the Firebase CLI and sign in with an account that has access to project `dukaan-khata-a517c`.
2. From the repository root, run `firebase use dukaan-khata-a517c` (or initialize/select that project if prompted).
3. Confirm Cloud Firestore is enabled for this Firebase project.
4. Run `cd functions && npm install && npm run lint`.
5. From the repository root, run `firebase deploy --only firestore:rules,functions`.
6. If Firebase requests a billing-plan upgrade for Cloud Functions, review the Firebase pricing and enable billing only if you approve it.

## Secure activation still required

- Integrate Firebase Authentication with the app's existing approved sign-in flow before calling `registerPushToken`. Do not change the owner/customer login UI or introduce cross-device app-data sync as part of this step.
- Grant the trusted sender account the `pushAdmin: true` custom claim using a trusted Admin SDK environment. Never grant this claim from client-side code.
- Configure a real HTTPS app URL for the sender's webpush link before production use; do not use a placeholder URL.
- Add event calls for notifications only after the app's event flow and authentication are verified. Local-only bill/payment events cannot be sent by a server unless the app securely submits an event to it.
- Test foreground, background, permission denied, invalid token, and signed-out cases on a real HTTPS deployment.

## Security notes

- Admin SDK access bypasses Firestore rules; client access is explicitly denied by `firestore.rules`.
- Only notification tokens and minimal device metadata are stored here.
- Never commit service-account JSON, private keys, or other server secrets to GitHub.
- No live notification delivery is claimed until deployment and real-device testing succeed.
