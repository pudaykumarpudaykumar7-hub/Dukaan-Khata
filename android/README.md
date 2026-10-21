# Dukaan Khata — Android / Google Play release

The Android project wraps the live Dukaan Khata website in a Trusted Web Activity (TWA). The website remains the source of the interface and business features.

- App label: Dukaan Khata
- Package ID: `com.dukaankhata.app`
- Current release version: `1.1.0` (versionCode 2)
- Target SDK: 36

## Build a signed Android App Bundle

1. Open this repository's `android` folder in Android Studio.
2. Let Gradle sync and resolve dependencies.
3. Use **Build → Generate Signed App Bundle or APK → Android App Bundle**.
4. Create or select your private upload key. Keep the keystore and passwords private and backed up securely.
5. Build the release AAB and test it on a real Android device before uploading it to Play Console.

## Required before publishing

1. Create or finish the Google Play Console developer account and app listing.
2. Configure Play App Signing and get the **final app-signing certificate SHA-256 fingerprint**.
3. Publish a valid Digital Asset Links JSON file at:
   `https://pudaykumarpudaykumar7-hub.github.io/.well-known/assetlinks.json`
   The file must contain the exact package name `com.dukaankhata.app` and the real SHA-256 fingerprint. Do not use a placeholder fingerprint.
4. Verify the website is publicly reachable and the TWA opens without browser UI.
5. Complete the Play Console privacy policy, data safety, app access, content rating, target audience, screenshots, store description, and testing declarations accurately.
6. Upload the signed AAB to an internal testing track first. Fix any review or policy issues before requesting production release.

## Important functionality notes

- Smart Receive's direct UPI QR does not automatically prove that money was received. Automatic payment recognition requires a payment provider plus server-side verification.
- Do not put payment-provider secrets or service-role database keys in browser code.
- A successful build or upload does not mean Google Play has approved or published the app.
- Play Store developer registration may involve a fee; this repository does not bypass Google's account or review requirements.
