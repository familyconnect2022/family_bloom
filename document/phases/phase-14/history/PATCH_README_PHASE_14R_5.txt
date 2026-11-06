FAMILY BLOOM — PHASE 14R.5
WHISPER NOTIFICATION & STABILITY PASS
Date: 2026-10-01
Base: Phase 14R.4G Release Gradle Suffix Hotfix

WHAT CHANGED
1. Direct “Người thân” whispers now create one recipient-private homeInbox event and are actively listened to by BloomPushBridge.
2. Recipient notification delivery now has a single Firestore acknowledgement (`deliveredAt`) shared by Release, DEV and optional Cloud Functions.
3. Foreground: Bloom shows an in-app notification toast immediately.
4. Android background (while JS is still alive): Bloom schedules a local OS notification through the existing Bloom notification channel.
5. Killed-app remote delivery: optional Cloud Function `pushDirectWhisperCreated` now triggers from users/{uid}/homeInbox/{eventId}; it atomically competes for the same `deliveredAt` claim to avoid duplicate local + remote alerts.
6. “Cả nhà” whispers remain intentionally silent: they do not create homeInbox events and do not notify the whole family.
7. Tapping a whisper notification opens Lời thì thầm and records `readAt`.
8. One bounded user-private listener (20 events) covers all families; there is no listener-per-family explosion.
9. Old inbox events older than 72 hours are acknowledged without producing an upgrade-time toast storm.
10. App version advanced to 1.0.5 / Android versionCode 140500 so the next Release APK installs as an update over the existing Release app.

DEPLOYMENT
- Firestore rules: REQUIRED before testing the new client delivery acknowledgement.
  Run: Family_Bloom_Deploy_Firestore_Rules.bat
- Cloud Functions: OPTIONAL for foreground/background local-first testing, REQUIRED if you want a whisper to reach a recipient whose app process is fully killed.
  Run: Family_Bloom_Deploy_Functions.bat
  (Cloud Functions deployment may require a billing-enabled Firebase project.)

BUILD / TEST ORDER
1. Apply this patch over Phase 14R.4G, or use the FULL archive.
2. Deploy Firestore rules.
3. Build DEV with scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat.
4. Test direct whisper foreground + background with two accounts/devices or two app identities.
5. Confirm “Cả nhà” sends no notification.
6. If Cloud Functions are deployed, kill the recipient app and test remote delivery.
7. After DEV passes, build RELEASE with scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat and install with update (-r); do not uninstall the existing release app.

KNOWN PLATFORM LIMIT
Without the Cloud Function deployed, Android cannot guarantee a brand-new Firestore event wakes a fully killed JS process. The local-first fallback covers an active app, many background cases, and missed recent events when the app next starts.
