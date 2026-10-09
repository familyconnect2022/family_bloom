# Family Bloom Phase 17.9W1 — Web Companion Preview

## Base
Phase 17.9A17 Native-Persistent UI-thread Tabbar FULL CODE.

## Goal
Provide an immediately testable browser companion for iPhone/iPad/desktop users without waiting for the native iOS build path, while keeping Android A17 and the existing Firebase/Render backend authoritative.

## Architecture
- Expo Router remains the application router.
- Browser routes use platform-specific `.web.tsx` layouts/screens.
- Android continues to resolve the existing native route files unchanged.
- Browser Firebase uses the modular Firebase JavaScript SDK.
- Web and Android use the same Firebase Auth project, Firestore data and active-family contract.
- Chess/Xiangqi use the same Render Socket.IO endpoint and Firebase ID-token handshake.
- No web-only Firestore copy, mirror collection or alternate backend was introduced.

## W1 surfaces
### Authentication
- Google popup with redirect fallback.
- Phone OTP with Firebase Web reCAPTCHA.
- Browser-local Firebase Auth persistence.

### Shared family state
- Realtime `users/{uid}` profile.
- Realtime `users/{uid}/memberships` reverse index.
- Canonical active-family switch updates `users/{uid}.activeFamilyId`.
- Realtime active-family members.

### Main browser tabs
1. **Nhà** — family summary, member avatars, latest Moments and calendar summary.
2. **Kỷ niệm** — latest Moments feed with image/video viewing.
3. **Lịch** — realtime event list.
4. **Phả hệ** — simplified responsive generation view from the same `persons` + `relationships` collections.
5. **Nhà Mình** — Whisper/Poll/Time Capsule summary plus realtime games.

### Realtime games
- Chess: app join, session recovery, Bloom Bot invite, accept, ready, authoritative move and resign.
- Xiangqi: app join, session recovery, Bloom Bot invite, accept, ready, authoritative move and resign.
- Browser obtains a Firebase Web ID token for the same Socket.IO auth handshake used by Android.
- Both boards use 10+0 for the W1 test surface.
- W1 intentionally does not yet expose full human lobby UI or browser premove.

## Mobile web / Add to Home Screen
- Responsive mobile-first shell.
- Apple touch icon.
- Web manifest.
- No service worker is installed in W1, avoiding stale offline-cache/update behavior during validation.

## Developer / run workflow
- Added `firebase ^12.19.0`.
- Added `npm run web:preview`.
- Added `npm run web:build` (`expo export --platform web`, output `dist/`).
- Added `Family_Bloom_WEB_PREVIEW.bat`.
- Added `Family_Bloom_WEB_EXPORT.bat`.
- `Family_Bloom_CLEAN_APPLY_FULL.bat` now installs Firebase Web SDK when needed and runs the W1 gate.

## Firebase deployment note
W1 can initialize Auth/Firestore from the existing public project configuration. For a long-lived public deployment, register a Web App in the existing Firebase project and set `EXPO_PUBLIC_FIREBASE_WEB_APP_ID`. The deployment hostname must be present in Firebase Authentication Authorized domains for Google/Phone Auth.

## Intentional W1 limits
- No create/join-family flow on web yet.
- Moments is read/view first; publishing/editing remains native for W1.
- Graph is read-only and uses a simplified browser layout rather than the full native canvas.
- No native push parity.
- No browser premove or full family-vs-family game lobby UI yet.
- No service worker/offline web cache yet.

## Verification
- W1 static architecture gate: **49/49 PASS**.
- Web TS/TSX syntax parser: **22/22 files clean**.
- A17 Native-Persistent Tabbar: **35/35 PASS** after W1 additions.
- Phase 17.1 Five-Tab Runtime Lifecycle: **56/56 PASS**.
- Current Chess/Xiangqi aggregate: **19/19 phase groups PASS**.
- Release Readiness: **11/11 PASS**.
- Hash comparison against A17 baseline: unchanged native Tabbar, Chess board/surface, Xiangqi screen/board, Chess server, Xiangqi server manager, Firestore Rules and indexes.
- Production web bundle was not executed inside this build container because npm registry access is unavailable here; CLEAN_APPLY/WEB_PREVIEW installs `firebase` on the developer machine before starting Expo web.
