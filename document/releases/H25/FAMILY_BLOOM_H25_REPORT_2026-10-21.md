# Family Bloom H25 — Firebase Invitations + Server-Authoritative Chess/Xiangqi
**Release candidate for controlled testing — 21/10/2026.** Baseline: H23R3 FULL. H24 canceled; no code imported from H24.

## 1. Phạm vi đã sửa
1. Client uses Firestore `families/{familyId}/boardInvitations/{inviteId}`; both B (inviter) and A (invitee) subscribe by UID. `PENDING`, `CANCELLED`, `DECLINED`, `EXPIRED`, `ACCEPT_REQUESTED`, `ACCEPTED`, `FAILED`; server closes verified game invitation as `COMPLETED`. Countdown locally computed using immutable 60s deadline; no per-second Firebase writes.
2. A single Firestore transaction creates **both** per-UID `boardInviteSlots` and the invitation to prevent overlapping invitations across BOTH games. Firestore Security Rules enforce participant identity, server time, transition restrictions, and per-UID slots. Invitation recipients do not need to be online.
3. When A accepts, each client may independently wake/connect to Render via `chess:firebase:claim` or `xiangqi:firebase:claim`. 180s accept-to-connect bound. Render verifies Auth/family/invite status, checks durable live game locks, and creates one gameId. Same invitation is idempotent across simultaneous A/B requests and server restarts. A locked `gameId` is recovered rather than recreated.
4. For human players, Render sets/locks colors before preparation. Each player sends one final READY once native board and assets have loaded. READY persists in game snapshots. Both READY -> server starts clock. 180s prep timeout; dedicated Chess and Xiangqi managers/boards/sockets remain independent. Existing Bot path retained.
5. Root only mounts `FirebaseBoardInvitationGate`; opening Family Bloom or game lobby no longer intentionally boots game Socket.IO. Lobby instead shows family members that may be invited, not unverifiable Online. One stable Super Bloom invitation card dynamically changes copy/actions for A/B. Transparent RGBA king/general PNG crest top-center: 50% outside form and 50% inside; no background badge or Chinese text.
6. A matched player's `boardInviteSlot` remains occupied while game plays (not only 180s); independent Chess/Xiangqi persistence completes invitation as `COMPLETED` and releases the matching slots transactionally on game finish; an old game cannot release new invite's slot.
7. Natural-wake-only Firestore cleanup: scan older-than-today invitation docs by paginated `collectionGroup`, remove only terminal records; preserve active/unresolved sessions. Group query index declared in `firestore.indexes.json`.
8. Android identity H25: `com.familybloom.android`, version `1.3.29`, versionCode `143039`, native identity `P2.37R2C-H25-native-1`. Existing source remains compatible with copy-over BAT.

## 2. Giao diện theo vai trò
- PENDING: B sees sent invitation + cancel; A sees incoming challenge + accept/decline. Both see same immutable deadline.
- CANCELLED / DECLINED / EXPIRED: differentiated copy for B/A, one OK and no retry/reinvite button.
- ACCEPT_REQUESTED: B sees A agreed, server connecting; A sees accept request submitted. Does NOT claim game created.
- ACCEPTED: gameId created, colors frozen; client opens same Full Surface and native board through sync.
- WAITING/PREPARING: native board UI shows names/clocks and progress; native READY is sent only after real render and assets. No server clock until PLAYING.
- PLAYING / WIN / LOSS / DRAW: previously working native full-board/result UX preserved rather than reimplementing engines. New invitation form not replicated for every minor game phase.
- COMPLETED: Firestore invitation hidden; game result is primarily shown by native game presentation/recovery. Result-after-kill and interruption behavior must still be validated on devices.

## 3. Các kiểm tra thực hiện ở môi trường này
- `node scripts/tests/release/test-h25-firebase-invitation.cjs`: **38/38 PASS** (static contracts, assets, rules, release gates, distinct game ownership).
- `node scripts/tests/release/test-h25-runtime-claims.cjs`: **7/7 PASS** (fake Firestore/Admin, A/B concurrent claims, restart recovery, terminal rejection, unauthorized rejection, slot release).
- Static `node scripts/test-*` called directly by Build & Share, Release and EAS BAT: **35/35 command-level PASS**.
- `node scripts/setup/check-ts-syntax-transpile.js`: **305/305 source files** parse/transpile.
- `node scripts/setup/check-source-import-integrity.js`: **305 files / 1823 imports** resolve statically.
- `node scripts/setup/check-build-entrypoints.js`: **36/36 BATs present, CRLF, zero unmanaged**.
- `node scripts/setup/check-expo-route-uniqueness.cjs`: PASS.
- Asset PNGs checked RGBA alpha transparency and packaged.

## 4. QUAN TRỌNG — Chưa được kiểm chứng (không được coi là PASS)
- No complete `npm run typecheck` for client or `npm run typecheck` for server: npm packages are **not installed in this execution environment** and fetching dependencies was unavailable.
- No actual `gradlew assembleRelease`, Android native AAPT2, or APK signing: Windows Android SDK/Gradle/toolchain unavailable here.
- **The source baseline ZIP does not contain `google-services.json`.** This is Firebase-project-specific and must be preserved/copied from your existing configured project before Android Build & Share; the BAT intentionally fails if missing. Do not invent or upload a substitute file.
- No real Firestore Security Rules Emulator, transaction-concurrency test against Firebase, or production index deploy.
- No actual Render deploy or real cold start / two-account smartphone tests.
- No real EAS cloud build.
- Therefore this is a **FULL SOURCE H25 release candidate**, not a verified installable APK or a production-green build. The Windows BATs will run further required gates and fail closed if any fail; an old APK must not be sent as H25.

## 5. Hướng dẫn triển khai trên máy của bạn (khi về máy)
1. Back up existing H23R3 source and server deployment settings; preserve Firebase Auth, Firestore data and credentials.
2. Extract H25 FULL ZIP; run `Family_Bloom_AUTO_UPDATE_FULL.bat` in extracted folder (per copy-over workflow). If using copy-overlay manually, run cleanup BAT first. Keep root .gitignore.
3. Run `node scripts/tests/release/test-h25-firebase-invitation.cjs` and `node scripts/tests/release/test-h25-runtime-claims.cjs`.
4. Confirm `google-services.json` already exists at the project root and matches your Firebase project (the H23R3 base ZIP excluded it). Back up existing Firestore rules and indexes, deploy **both** `firestore.rules` and `firestore.indexes.json` to the SAME Firebase project as Android: `firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID`. Do **NOT** deploy H25 rules to another project or skip the index. This requires authenticated Firebase CLI.
5. Deploy **H25 `server/`** to Render. Wait for `npm run typecheck` / `npm run build` there and healthy deployment. Check environment Firebase Admin secrets/config and service URL.
6. Run `Family_Bloom_BUILD_APK_TO_SHARE.bat` on Windows. Script compiles native Release APK from scratch, prevents stale APK reuse, verifies source/copy SHA-256, then writes `C:\FamilyBloomShare\apk\Family_Bloom_LATEST.apk` and `.sha256` only after SUCCESS.
7. Test H25 APK on one account first, then two Android app identities/accounts, Chess and Xiangqi. Do not distribute broadly until checklist passes.

## 6. Rollback
H24 remains discarded. Retain H23R3 source and the old Firebase Rules/Indexes + Render commit so they can be restored together. Do not run H25 client against H23 server expecting the new socket events. **Do not downgrade the Firestore schema while H25 sessions are in flight**; finish tests and clear/restore compatible invitations first.

## 7. Chưa hoàn tất / còn rủi ro cần kiểm chứng
- Firestore emulator assertions for Rules `getAfter`, server time and 2 concurrent invitations require real backend test.
- If both apps are background/killed, Firebase listener/FCM does not guarantee prompt notification; FCM deliberately postponed.
- Day-after cleanup keeps still-unresolved `PENDING` / `ACCEPT_REQUESTED` records rather than deleting dangerously; should add explicit administrative reconciliation for abandoned records in future release.
- Win/loss/draw native forms retained, not fully consolidated into a single JS shell across the entire match; visual integration needs device verification.
- The server match-creation and Firestore invitation-promotion are separate durable writes; lock-based recovery handles the normal restart window, but adversarial timing at 180-second boundary must be stress tested against real Firestore.
- OTA cannot replace changed native assets/identity reliably unless native binary baseline is already H25; prefer full APK Build & Share for this release.
