# Shahin Android

Native Android WebView application for the existing Shahin HTTPS website. Android 7+; internet required. App contains no database or SMTP secrets. JavaScript/DOM storage support Supabase login, cart and merchant editing. System image picker uploads merchant photos without storage/camera permissions. External links open installed apps/browser. TLS errors remain blocked, cleartext and mixed content are disabled; no JavaScript bridge.

Build: JDK 17, Gradle 8.9, Android SDK 35, `gradle :app:assembleRelease` from android/. GitHub Actions builds, verifies APK signature and publishes release android-v1.0.0.

Signing: first directly installed APK uses Android's generated development signing identity, while the release application itself has debugging disabled. Before distributing subsequent APK updates or Google Play builds, configure a stable private production signing identity in repository secrets and migrate signingConfig. The first APK will require reinstalling if the signing identity changes. Never commit keystores or their passwords. The website itself updates without reinstalling the shell.

Physical-device installation, photo picker, customer confirmation links and keyboard layout require device QA; CI verifies compilation/signature only.
