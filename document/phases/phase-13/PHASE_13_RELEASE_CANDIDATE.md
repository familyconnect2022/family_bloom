# Family Bloom — Phase 13 Production Readiness / RC1

## Source scope completed
- Bloom Supper final polish: full-bleed hero + rounded lower silhouette on primary tabs.
- Performance/E2E tooling is development-only via `__DEV__`; no hard-coded developer email token.
- Native push-token registry is ready using `expo-notifications`; logout disables the current device token.
- Active `firestore.rules` protects push tokens and privacy-safe diagnostics.
- Media lifecycle records cannot be retargeted across family/entity boundaries after creation.
- Direct client family deletion is blocked until a trusted recursive delete backend exists.
- Runtime diagnostics store only code/context/platform/app version/timestamp — never raw stack, names, captions, family IDs, media URLs or form text.
- Android `versionCode` + iOS `buildNumber` are explicit; native splash uses Bloom Supper styling.

## Deferred without blocking Android RC1
- `PENDING_BLAZE`: live deploy/test of Cloud Functions and cross-account remote FCM. Client token registration and server sender code are prepared, but remote delivery is not claimed as verified.
- `PENDING_IOS_DEVICE`: source/config readiness only until real iPhone testing is possible.

## Release discipline
RC1 is feature-frozen. Fix only blockers/regressions, rerun Phase 11 Final Performance Gate and the Phase 13 checklist.
