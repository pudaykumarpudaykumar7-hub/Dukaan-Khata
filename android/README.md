# UVMS DUKAAN KHATA — Android release

This Android project is a Trusted Web Activity (TWA) wrapper for the live web app. The website remains the source of the app interface and business features.

## Android application details

- Store display name: UVMS DUKAAN KHATA
- Application ID: `com.uvms.dukaankhata.app`
- Namespace: `com.uvms.dukaankhata.app`
- Version name: `1.1.0`
- Initial version code for this new application ID: `1`
- Minimum Android version: Android 6.0 (API 23)
- Target SDK: 36
- Start URL: `https://pudaykumarpudaykumar7-hub.github.io/Dukaan-Khata/`

## Build on Windows

1. Install Android Studio and the Android SDK (API 36).
2. Open the `android` directory in Android Studio.
3. Allow Gradle sync to finish. The project uses Android Gradle Plugin 8.10.1 and requires Gradle 8.11.1 or a compatible newer 8.x release.
4. Select **Build → Generate Signed Bundle / APK**.
5. Choose **Android App Bundle**, then select the `release` build variant.
6. Create or select an upload keystore in Android Studio. Keep the `.jks` file, alias, and passwords private and backed up. Never commit them to GitHub or share them in chat.
7. Finish the wizard. The signed bundle is normally saved under `app/build/outputs/bundle/release/`.

## Required before public release

1. Confirm that Play Console accepts the application ID above. The application ID cannot be changed after the first Play Console app is created.
2. Enrol in Play App Signing and obtain the app-signing certificate SHA-256 fingerprint from Play Console.
3. Publish Digital Asset Links at:
   `https://pudaykumarpudaykumar7-hub.github.io/.well-known/assetlinks.json`
   It must use the exact application ID above and the real Play app-signing SHA-256 fingerprint. Do not publish a placeholder fingerprint.
4. Test the release build on a real Android device and verify that the TWA opens the website correctly.
5. Complete Play Console privacy policy, Data safety, app access, content rating, target audience, store listing, screenshots, and testing declarations accurately.
6. Upload the signed AAB to an internal or closed testing track first.

## Important

- The repository does not contain an upload keystore. A signed AAB cannot be produced until the owner creates or supplies a private upload key securely.
- Do not commit keystore files, signing passwords, Firebase service-account files, or payment-provider secrets.
- A successful local build does not mean Google Play has approved or published the app.
- The TWA requires a valid Digital Asset Links file for verified full-screen operation. Its fingerprint must be finalized after Play App Signing is configured.
