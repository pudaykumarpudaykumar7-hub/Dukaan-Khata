# Dukaan Khata Android / Play Store project

This Android project wraps the existing Dukaan Khata PWA in a Trusted Web Activity (TWA), so the current GitHub Pages app remains the source of the UI and business logic.

## Build
Open the **android** folder in Android Studio, let Gradle sync, then use **Build > Generate Signed App Bundle** to create the Play Store AAB.

Package: com.dukaankhata.app
Target SDK: 36 (required for new Google Play submissions from August 31, 2026).

## Important before Play Store release
A Digital Asset Links file must be published at:
https://pudaykumarpudaykumar7-hub.github.io/.well-known/assetlinks.json
using the final app signing certificate SHA-256 fingerprint. Google Play App Signing supplies the final certificate after the app is configured in Play Console.
