FAMILY BLOOM — PHASE 14R.5A
WHISPER APP-ENTRY CATCH-UP HOTFIX
Date: 2026-10-01
Base: Phase 14R.5 Whisper Notification & Stability Pass

ISSUE REPRODUCED
- A direct whisper could be written correctly, but when the recipient opened Bloom from a cold/inactive state the private inbox snapshot could arrive before React Native AppState became `active`.
- Phase 14R.5 claimed `deliveredAt` before knowing that any visible alert had actually been shown.
- If Android notification permission was unavailable, scheduling failed, or startup was still `inactive`, the claim could remain consumed and the user entered the app without a Bloom toast.

FIX
1. Cold-start `inactive` / `unknown` no longer consumes a whisper delivery claim.
2. The latest bounded private inbox snapshot is cached and retried when AppState becomes `active`.
3. Added recipient-private `inAppSeenAt` acknowledgement. It is transactional and shared by Release + DEV, so only one installed variant shows the in-app catch-up toast.
4. Foreground catch-up is independent from prior OS delivery. An unread recent whisper can still be surfaced once inside Bloom when the user enters the app.
5. Background local delivery only runs after the app has genuinely been active at least once in that process.
6. If Android does not actually accept the local notification, the `deliveredAt` claim is released so the whisper can still surface on app entry.
7. `readAt` now also seals `inAppSeenAt`.
8. Firestore client/cloud rules allow only the recipient to update read/delivery/in-app acknowledgement fields.
9. App update version advanced to 1.0.6 / Android 140510 / iOS build 6.

REQUIRED BEFORE DEVICE TEST
- Deploy Firestore rules again because the recipient acknowledgement schema now includes `inAppSeenAt`.
- Then rebuild DEV. Do not uninstall Release or DEV.

EXPECTED TEST
A. Keep recipient app fully closed (no force-stop required), send a NEW direct “Người thân” whisper, then open recipient app. A Bloom toast must appear once after the app becomes active.
B. With recipient app foreground, a NEW direct whisper must toast immediately.
C. With recipient app background after it has been opened once, a NEW direct whisper should use Android local notification; if permission is denied, returning to the app must still produce the in-app catch-up toast.
D. “Cả nhà” remains silent.

MIXED-VERSION COMPATIBILITY
- If Release is still an older pre-14R.5 build while DEV is newer, the old sender can create a direct whisper without homeInbox metadata.
- 14R.5A now scans only a small recent direct-to-me window and backfills the recipient-private inbox row transactionally.
- The recipient is allowed to create that repair row only when Firestore Rules prove the referenced source whisper is direct and addressed to that exact uid. The repair notification copy is generic and does not copy the secret message into the inbox.
