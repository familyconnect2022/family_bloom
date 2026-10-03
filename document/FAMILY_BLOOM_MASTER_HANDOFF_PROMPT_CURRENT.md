# CHECKPOINT 2026-10-03 — PHASE 14V.2D CHESS HISTORY MODULAR API + SERVER BOT CAPABILITY — IMPLEMENTED / AWAITING DEVICE RETEST

- Fixed the Android History crash caused by the only remaining legacy namespaced RNFirebase Firestore call in Chess. `chessHistoryService` now uses the project's modular v26 API (`getFirestore`, `collection`, `query`, `where`, `orderBy`, `startAfter`, `limit`, `getDocs`) and remains bounded at 20 rows/page. The History screen now catches query/index/runtime failures and shows a retry card instead of producing an unhandled red-screen promise.
- Bloom Bot visibility no longer depends on `EXPO_PUBLIC_CHESS_TEST_BOT_ENABLED` being correctly inlined into the Expo bundle. Render is authoritative: both `chess:app:join` and `chess:lobby:join` ACKs now return `testBotEnabled`, and the mobile provider shows/enables the bot only after the live server confirms the capability.
- `/health` now returns `{ ok: true, chessTestBotEnabled: <bool> }`, and `[ChessDebug] prewake:response`, `server:capabilities`, and `lobby:capabilities` expose only this boolean for diagnosis. No token, private key, or credential is logged.
- Test-bot enablement is now a single server switch: Render `CHESS_TEST_BOT_ENABLED=true`, followed by redeploy. The mobile root `.env` only needs `EXPO_PUBLIC_CHESS_SOCKET_URL`. This avoids client/server flag drift. Disable the Render flag after the one-device test window.
- No schema/rules/index/native-dependency change. Existing Chess history composite index remains required. Render redeploy is required; mobile only needs a Metro restart/refresh for JS changes.
- Runtime certification remains pending until device retest verifies: `/health` reports `chessTestBotEnabled:true`, Metro logs server/lobby capability true, Bloom Bot card is visible, and History opens without a red screen.

---

# CHECKPOINT 2026-10-03 — PHASE 14V.2B CHESS COLD-START + FALSE-DISCONNECT HOTFIX — IMPLEMENTED / AWAITING DEVICE RETEST

- Device diagnostics proved the Render/Firebase/Socket path is working: the observed cold start reached `socket:connect` / `connect:ready`, `/health` returned HTTP 200 after ~22.9s, and `chess:lobby:join` returned `ok:true`. The visible “Không thể kết nối máy chủ cờ vua” banner was therefore a client-state false negative, not a failed Render connection.
- Root cause: global `chess:app:join` still used the generic 12s Socket ACK timeout while first cold-start membership/presence work could exceed it. `joinForeground` converted that timeout into a hard `error` state even if the Socket was already connected and a concurrent lobby join succeeded.
- Fix: `emitAck` now supports command-specific timeout windows; app join uses 30s, active-session restore 20s, and lobby join 30s while normal gameplay retains the 12s default. If app join times out with `CHESS_SERVER_RECOVERING` but Socket.IO is connected, the UI stays in connecting/retry rather than hard error. A successful lobby join explicitly repairs connection state to `ready`.
- Server fix: app/lobby join ACK no longer waits for presence fan-out. Room/membership state is committed first, then presence refresh runs asynchronously. Concurrent app/lobby joins dedupe the initial Firestore membership lookup through an in-flight promise map while keeping the existing 10s result cache.
- Presence semantics remain Phase 14V.1: navigating between Family Bloom screens while app remains foreground must keep the global Chess socket. Actual Android background/home/other-app state intentionally sends app leave + disconnect so the member is not falsely challengeable outside the app. `[ChessDebug] appState:change` now logs route + transition to distinguish those cases during retest.
- No schema/rules/index/native-dependency change. Render redeploy is required because `server/src/socket/socketServer.ts` changed; a Metro restart is enough for mobile JS.
- Validation: Phase 14V.2B 18/18 PASS; Phase 14V.2A 13/13; Phase 14V.2 40/40; Phase 14V.1 33/33; Phase 14V 26/26; Phase 14U 54/54; Phase 14T 44/44; Phase 14T.0A 21/21; 239 TS/TSX files transpile with 0 syntax diagnostics; server strict internal typecheck with dependency stubs PASS. Runtime certification remains pending. Use `reports/device/PHASE_14V2B_CHESS_CONNECTION_RETEST.txt`.

# CHECKPOINT 2026-10-03 — PHASE 14V.2A CHESS AUTH + CONNECTION DIAGNOSTICS HOTFIX — IMPLEMENTED / AWAITING RUNTIME RETEST

- Fixed a real Android runtime crash in `src/services/chess/chessSocketService.ts`: Chess incorrectly used the legacy callable `auth().currentUser` API while this RNFirebase v26 project uses the modular `getAuth().currentUser` API. Reconnect and token-refresh paths now use `getAuth()` too.
- Added temporary safe client diagnostics under the `[ChessDebug]` prefix for health prewake, Firebase user/token readiness (token value is never logged), Socket.IO connect/connect_error/disconnect/reconnect and typed ACK results. `joinForeground` no longer swallows the actual connection exception in dev logs.
- Added Render-side diagnostics for missing/failed Firebase token verification and successful app-family join. Tokens/private keys are never printed.
- `/health` prewake now checks HTTP status and explicitly fails on non-2xx rather than silently treating any response as healthy.
- No schema migration, no new native dependency, no change to server-authoritative chess rules/clock. Render must be redeployed because server logging changed; the app only needs Metro restart for this hotfix.
- Validation: Phase 14V.2A 13/13 PASS; Phase 14U 54/54; Phase 14V 26/26; Phase 14V.1 33/33; Phase 14V.2 40/40; Phase 14T.0A 21/21; 239 TS/TSX files have 0 syntax diagnostics. Runtime connection is NOT yet certified.

---

# CHECKPOINT 2026-10-03 — PHASE 14V.2 ONE-DEVICE CHESS TEST BOT — IMPLEMENTED / AWAITING DEVICE TEST

- **Purpose:** provide a temporary one-device opponent so Chess can be runtime-tested before a second physical phone is available. This is a test harness, not a product AI opponent and not Stockfish.
- **Opt-in only (superseded by Phase 14V.2D):** Render `CHESS_TEST_BOT_ENABLED=true` is now the sole authoritative test-bot switch. The server reports the capability to the app during app/lobby join; no mobile test-bot env flag is required.
- **Server-side bot identity:** every authenticated human gets a deterministic synthetic bot UID derived from a SHA-256 digest of the real UID. It is never inserted into family membership/Profile and never appears as a real member. The human must still pass normal Firebase Auth + family membership validation.
- **Authoritative path preserved:** bot games still use the same `ChessGameManager`, `chess.js`, Firestore durable game document, active-user locks, per-game mutation queue, request/revision flow, server clock and timeout scheduler. The bot chooses only moves from the server's current authoritative legal-move list.
- **Bot move policy:** lightweight test heuristic only — small random score, preference for captures, promotions and central squares. No engine evaluation, ranking, ELO or move-quality judgment. Bot responds after roughly 0.7–1.35 seconds to feel like a remote player without blocking UI.
- **Recovery:** persisted bot games carry `testBotUid` / `isTestGame`. On Render restart the synthetic bot is treated as an automated connected participant, so the fairness-first `active -> paused -> resume when human reconnects` recovery still works.
- **One-device global-overlay test:** Chess Lobby exposes a clearly labeled `Bloom Bot · Đối thủ thử nghiệm` card only when the connected Render server reports the test bot enabled. `Test thách đấu 5s` schedules an incoming bot challenge five seconds later and automatically exits the lobby, allowing the global centered challenge overlay to be tested on another app tab with one phone. Invite TTL remains 45 seconds after delivery.
- **Gameplay test helpers:** Accept creates a normal random-color game; bot moves automatically when it owns the turn; a human draw offer is automatically rejected after a short delay; resign/timeout/checkmate use the normal authoritative paths; `Chơi lại` against the bot creates a new test game immediately while still respecting 06:00–<22:00 quiet hours.
- **UI labeling:** global challenge overlay shows `Bloom Bot` with a chess-knight identity and states that it is a test opponent, not ranked AI. Game screen and history label the synthetic opponent/test game so it cannot be mistaken for a family account.
- **No new native dependency:** only TS/JS/server changes. After setting client env, Metro restart with `npx expo start --dev-client --clear` is sufficient; no new `expo run:android` is required solely for Phase 14V.2. The Render backend must be redeployed because `server/src` changed.
- **Validation:** Phase 14V.2 static 40/40 PASS; Phase 14U Chess 54/54 PASS; Phase 14V 26/26 PASS; Phase 14V.1 33/33 PASS; Phase 14T 44/44 PASS; Phase 14T.0A 21/21 PASS; Phase 13 11/11 PASS; Whisper R5A 30/30 PASS; Fund S1A 25/25 PASS; 239 TS/TSX files transpile with 0 syntax diagnostics; server strict internal typecheck with external declaration stubs PASS. Dependency-resolved server build must still be run on the user's machine/Render before runtime certification.

## PHASE 14V.2 TEST BOT ENABLEMENT

```text
Mobile root .env:
EXPO_PUBLIC_CHESS_SOCKET_URL=https://family-bloom-chess.onrender.com

Render Environment:
CHESS_TEST_BOT_ENABLED=true

After test:
set CHESS_TEST_BOT_ENABLED=false on Render and redeploy.
```

---

# CHECKPOINT 2026-10-03 — PHASE 14V.1 GLOBAL CHESS PRESENCE + CHALLENGE OVERLAY + BATTLE FX — IMPLEMENTED / AWAITING DEVICE RETEST

- **Current delivery convention — SUPERSEDES OLD PATCH-ONLY INSTRUCTIONS:** from this checkpoint forward, deliver a complete FULL CODE ZIP for code changes unless the user explicitly asks to return to patch delivery. Historical patch instructions lower in this handoff are archival and must not override this current rule.
- **Presence semantics changed intentionally:** a valid authenticated member is Chess-online while Family Bloom is foreground in the active family, even when they are on Home, Moments, Graph, Nhà Mình, etc. Opening/closing the Chess Lobby no longer owns the Socket.IO lifecycle. Background/terminated app is not presented as online; no fake background availability is claimed without real remote push.
- **Global Socket owner:** `ChessRealtimeProvider` lives inside the active-family session. It pre-wakes/connects Render on foreground, joins `chess:family:<familyId>`, restores an active Chess game when present, leaves/disconnects on background, and keeps one shared Socket.IO connection across app tabs.
- **Challengeable users:** server challenge validation now requires foreground `appReady` presence, not Chess-lobby-only presence. Lobby status can be `online_app`, `in_lobby`, `in_game`, `busy`, or offline. One-active-game UID lock remains authoritative and still spans families.
- **Global challenge overlay:** incoming challenge appears anywhere in the foreground app as a custom centered Bloom Chess card with challenger avatar/name, time-control, expiry countdown, and Accept/Reject buttons. Accept server-validates again then navigates directly to `/chess-game/[gameId]`. Reject sends a dedicated `chess:invite:rejected` event; the challenger sees gentle copy that the person is not convenient to play now.
- **In-game tab notifications:** when an active player leaves the board but stays in Family Bloom, authoritative game-state events remain subscribed. When the opponent moves and it becomes the user’s turn, a normal tappable Bloom toast shows `Đến lượt bạn • Nước N`; check uses the stronger `Vua của bạn đang bị chiếu • Nước N`. Tapping returns to the exact game. Draw-only/revision-only mutations do not generate false turn toasts.
- **Authoritative ply:** public server state now includes `ply = chess.history().length`, used only for UI move-number copy; server remains source-of-truth.
- **Bloom Chess Battle FX:** board feedback is derived only from newer authoritative server revisions. Capture, major-piece capture, capture+check, check, promotion, checkmate, timeout, resignation and draw have progressively stronger motion/haptic/copy. FX is `pointerEvents=none`, never blocks the board, and can be cycled `Đầy đủ / Nhẹ / Tắt` on the game screen. No Stockfish-style move-quality judgment is invented. Dedicated sound cues are intentionally not added in this pass to avoid a new audio dependency before device tuning.
- **Quiet-hours preserved:** challenge/accept/rematch remain server-blocked outside 06:00–<22:00 Viet Nam time. An existing timed game may finish naturally after 22:00.
- **Render deployment impact:** this phase changes `server/src`; push/redeploy `family-bloom-chess` after using this FULL source. Existing Render build command remains `npm install --include=dev --no-audit --no-fund && npm run build`.
- **Validation:** Phase 14V.1 static 33/33 PASS; Phase 14U Chess 54/54 PASS; Phase 14V family-game policy 26/26 PASS; Phase 14T 44/44 PASS; Phase 14T.0A 21/21 PASS; Phase 13 11/11 PASS; Whisper R5A 30/30 PASS; Fund S1A 25/25 PASS; 239 TS/TSX files transpile with 0 syntax diagnostics; server strict internal typecheck with external declaration stubs PASS. Dependency-resolved install in this packaging environment timed out, so device/Render runtime is not declared PASS here.

---

# CHECKPOINT 2026-10-03 — PHASE 14V FAMILY GAME POLICY + QUIET HOURS — IMPLEMENTED / AWAITING DEVICE RETEST

- **Whole game room quiet hours:** new game creation/challenges/rematches are allowed only from 06:00 up to but not including 22:00 in the Family Bloom V1 family timezone `Asia/Ho_Chi_Minh` (UTC+7, no DST). Existing realtime Chess games are allowed to finish naturally after 22:00; only new challenge/accept/rematch actions are blocked.
- **Six family games are family-wide by default:** create UI no longer has a participant or subject picker. The session freezes the current real family membership snapshot (max 50) so everyone in the family is eligible without waiting for every member to answer.
- **Time-based lifecycle:** a new asynchronous family-game round lasts at most 4 hours and is always capped by the 22:00 room close. Result visibility becomes time-based; new timed sessions do not rely on the creator pressing “Mở kết quả”. Legacy pre-14V sessions retain their manual-reveal compatibility path.
- **Capacity:** each game type has exactly four deterministic active slots per family. A fifth concurrent create attempt returns gentle “trò này đang rộn ràng” copy. Expired slots can be atomically reused in the next transaction; deleting a creator-owned session releases its slot early.
- **Fair Family Rotation:** `know_each_other`, `guess_person`, and `truth_lie` choose their subject from real membership using a per-family/per-game daily rotation. A fresh rotation prefers a non-creator when possible; the creator remains eligible in later turns and nobody is permanently excluded.
- **Firestore enforcement:** new `homeGameActiveSlots` and `homeGameRotations` are additive. Session create and response writes are constrained by server-side `request.time`; UTC hours `>=23 || <15` correspond to 06:00–<22:00 Viet Nam time. Hidden responses/secrets become readable after `endsAtMs`. No new Firestore index is required.
- **Chess quiet-hours enforcement:** Render server now returns typed `CHESS_QUIET_HOURS` for new invite, late invite accept, or rematch outside the play window. Mobile copy is gentle and rematch/challenge UI is disabled accordingly.
- **Chess presence semantics (superseded by Phase 14V.1):** foreground anywhere in Family Bloom is now Chess-online for the active family; Lobby only adds the richer `in_lobby` status. Background/terminated is offline for challengeability. An active game remains locked `in_game` and its timed server clock continues through player disconnect/background.
- **Validation:** Phase 14V static 26/26 PASS; Phase 14T regression 44/44 PASS; Phase 14U Chess 54/54 PASS; Phase 14T.0A single Android identity 21/21 PASS; 236 TS/TSX files transpile with 0 syntax errors; new server quiet-hours types/policy strict TypeScript check PASS. Full dependency-resolved server install/typecheck could not be rerun in the packaging environment because `npm install` timed out; the user's already deployed Phase 14U server build remains the runtime baseline and the current FULL source requires a Render redeploy.
- **Runtime/deploy impact:** deploy updated Firestore Rules (no index change), push/redeploy Render backend, restart Metro/app JS bundle, then test family game creation before/after 22:00, 4-slot capacity, auto-expiry/result reveal, Family Rotation, Chess background/lobby presence, challenge and rematch quiet-hours behavior.

---

# CHECKPOINT 2026-10-03 — PHASE 14U CHESS REALTIME MVP — IMPLEMENTED / AWAITING RUNTIME CERTIFICATION

- **Base authority:** Phase 14T.0A single Android identity cleanup (`com.familybloom.android`) remains the immutable base. The six asynchronous Nhà Mình games and Family Fund line are preserved.
- **Chess runtime implemented additively:** mobile Chess Lobby + realtime board + bounded History; independent Node/Express/Socket.IO backend under `server/`; no migration of Auth/Profile/Family Graph/Moments/Events/Calendar/Notifications.
- **Hosting contract remains confirmed:** Render Free Web Service / Singapore; Firebase project remains Spark; no Cloud Functions requirement for Chess realtime.
- **Authentication:** mobile sends current Firebase ID token in Socket.IO handshake; server verifies with Firebase Admin and rejects any client-supplied UID/role authority. Server hard-guards canonical Firebase project `family-connect-4184f`.
- **Family isolation:** every invite/game is scoped to one `familyId`; server validates `families/{familyId}/members/{uid}`. Membership cache is short (10 seconds). Game mutations also re-check membership rather than trusting lobby entry forever. Runtime Socket payloads validate document IDs, request IDs, revision, squares, promotion and the exact supported time-control set.
- **Presence:** Socket RAM only. No Firestore heartbeat/presence writes. Lobby overlays Socket presence onto the existing `FamilyRealtimeContext` member cache, so Chess adds no second family-member realtime listener. Game sockets remain visible as `in_game` to the same family even after leaving the lobby; an active game in another family is not exposed as that family's game.
- **One active realtime game per UID:** server-only `chessActiveUsers/{uid}` locks are created transactionally for both players and removed when the game finishes. This applies across all families.
- **Server-authoritative rules/state/clock:** `chess.js` is server-only; clients receive legal-move hints but cannot decide legality/result/timeout. Timed games use a monotonic in-process clock and one shared 300 ms timeout scheduler; no timer write per second.
- **Durability:** every accepted move persists the authoritative game document before the success ACK/broadcast path completes. `requestId` history + monotonic `revision` handle retries/stale commands. Per-game mutations are serialized. Runtime state rolls back if Firestore persistence fails. Timeout is re-checked after entering the per-game queue so a queued deadline cannot incorrectly flag the player after a valid move changed the turn.
- **Recovery:** if a process restores a persisted `active` game after infrastructure restart, it first persists `paused`; clocks do not charge unprovable server downtime. The game resumes only after both players reconnect. A normal single-player disconnect while the server is alive does **not** pause a timed clock.
- **Reconnect:** Socket.IO reconnect explicitly rejoins lobby/game rooms and resyncs authoritative state. App foreground also requests resync; the device clock is never authoritative.
- **Invite (updated by Phase 14V.1):** any foreground-app-ready member in the active family may be challenged, not only someone on the Chess Lobby. Invite TTL remains 45 seconds, colors remain server-random, and reject/cancel/expiry synchronize both sides. Important commands use acknowledgements.
- **Modes implemented:** 3+2, 5+0, 10+0, 10+5, No clock.
- **Gameplay implemented:** legal moves, castling/en-passant/promotion through `chess.js`, check/checkmate, stalemate, insufficient material, threefold repetition, fifty-move rule, draw offer/accept/reject, resign, timeout, rematch creates a new game.
- **Firestore additive schema:** `families/{familyId}/chessGames/{gameId}` for durable game/history; `chessActiveUsers/{uid}` server-only active lock. Client may read only a game where its UID is in `playerUids`; client Chess writes are denied. One composite index supports bounded history (`playerUids` array-contains + `status` + `endedAt desc`).
- **History:** one-shot query, 20/page, no persistent history listener. Firestore `list` Rules also require `request.query.limit <= 20`. Shows opponent/avatar/color/result/reason/time-control/date.
- **Cold start (updated by Phase 14V.1):** because challenges must arrive on any foreground tab, authenticated active-family foreground now pre-wakes/connects the Chess service. Background/terminated does not keep the service artificially alive.
- **Configuration:** mobile uses one `EXPO_PUBLIC_CHESS_SOCKET_URL`; backend secrets remain Render environment variables only. No Firebase Admin secret is committed.
- **Validation performed in this patch:** TS/TSX syntax/transpile 233 files / 0 errors; Phase 14U static 54/54 PASS; Phase 14T 44/44 PASS; Phase 14T.0A 21/21 PASS; Phase 13 11/11 PASS; Whisper R5A 30/30 PASS; Fund S 35/35, S1 51/51, S1A 25/25 PASS. Backend strict compiler gate with external declaration stubs PASS.
- **Validation limitation:** backend dependency install timed out in the current environment, so a dependency-resolved `npm install && npm run typecheck` is **not** certified here. Render deployment, Firebase Admin credentials, Rules/index deployment, cold start, process restart and two-real-device gameplay are **not runtime PASS yet**.
- **Version:** kept at Family Bloom 1.3.1 / Android `versionCode 143010` / iOS build `11`; this source patch adds the feature without forcing a release-version bump.
- **Next step:** deploy Firestore Rules + indexes, create/configure Render service, set `EXPO_PUBLIC_CHESS_SOCKET_URL`, install app dependencies, then run `reports/device/PHASE_14U_CHESS_RUNTIME_CHECKLIST.txt` with two accounts/two devices.

## PHASE 14U CHESS DEPLOYMENT CONTRACT

```text
Mobile config:
EXPO_PUBLIC_CHESS_SOCKET_URL=https://<your-render-service>.onrender.com

Render environment:
FIREBASE_PROJECT_ID=family-connect-4184f
FIREBASE_CLIENT_EMAIL=<service-account client email>
FIREBASE_PRIVATE_KEY=<service-account private key, secret>
NODE_ENV=production

Render build/start:
npm install --include=dev --no-audit --no-fund && npm run build
npm start

Firestore:
Family_Bloom_Deploy_Firestore_Rules.bat
Family_Bloom_Deploy_Firestore_Indexes.bat
```

---

# CHECKPOINT 2026-10-02 — PHASE 14T.0A SINGLE ANDROID IDENTITY + CHESS BASELINE CLEANUP

- **Base authority:** Phase 14T Trò chơi Nhà Mình V1 on top of Phase 14S.1A. All Fund and Home Games work remains in the source.
- **SINGLE ANDROID IDENTITY — CONFIRMED:** the previous Release + DEV side-by-side dual-app decision is retired. Family Bloom now has one Android identity only: `com.familybloom.android`, one app name `Family Bloom`, one scheme `familybloom`, and one root Firebase config `google-services.json`.
- Debug and Release are build modes of the same app, not separate app identities. Real-device testing should use two physical phones or the phone vendor's clone/profile mechanism when simultaneous accounts are needed. No code path may require `APP_VARIANT`, `.dev` applicationId suffixes, DEV branding, or `google-services.dev.json`.
- Legacy dual-app runtime assets/plugins/build scripts/checkers are removed from the active source. Historical Phase 14R dual-app documents remain archival only and must not be treated as current architecture.
- Project-root `.txt` files are no longer allowed. Patch notes live under `document/history/patches/`; device checklists live under `reports/device/`; implementation/validation reports live under `reports/validation/`.
- **Chess architecture decision — CONFIRMED:** Render Free Web Service (Singapore) + Socket.IO + `chess.js` + Firebase Admin token verification; Firebase stays on Spark; server is authoritative for chess rules/state/clock; Firestore is durable persistence only, never clock/presence transport.
- Chess refinement decisions also confirmed: persist every accepted move before success ACK; use request-id idempotency + monotonic per-game `revision`; use monotonic elapsed-time sources in-process; serialize mutations per game; support multiple sockets per UID; Phase 14V.1 supersedes the older socket-lifetime rule: keep one Chess socket while the authenticated app is foreground so challenges can arrive on any tab; distinguish player disconnect from infrastructure outage; restore from durable checkpoint; Phase 14V.1 invites target foreground-app-ready users in the active family; timeout/draw semantics must follow chess rules rather than blindly declaring the opponent winner.
- Before Chess server implementation, Firebase DEV/PROD multi-project ambiguity is removed by this single-app cleanup. The server will validate the canonical Firebase project actually present in the source during implementation review.
- **Version:** Family Bloom 1.3.1 / Android `versionCode 143010` / iOS build `11`.
- **Status:** cleanup baseline implemented; Chess realtime server/client is the next implementation phase and has not been runtime-certified yet.

## CHESS ARCHITECTURE DECISION — CONFIRMED

```text
Hosting: Render Free Web Service — Singapore
Firebase: remain on Spark
Realtime: Socket.IO
Rules engine: chess.js on the server
Authentication: Firebase Auth ID token -> Firebase Admin verifyIdToken
Game state and clock: server authoritative
Persistence: Firestore durable checkpoints/results/history only
Clock writes: never once per second
Concurrency: multiple Socket.IO rooms / multiple games
Cold start: Phase 14V.1+ pre-wakes Chess while authenticated app is foreground so global challenges can arrive
Unexpected server outage: fairness-first recovery from persisted state
Player-only disconnect: timed clock continues
Deployment portability: protocol must not depend on Render vendor APIs
Android app identity: one package only — com.familybloom.android
```

---

## CHECKPOINT 2026-10-01 — Phase 14R.3 DEV Firebase / generated-lock gate hotfix

- Base: Phase 14R.2 corrected FULL.
- Ships `config/firebase/google-services.dev.json` for Android package `com.familybloom.android.dev` in Firebase project `family-connect-4184f`.
- DEV build + Metro helpers validate the Firebase config before use.
- Fixes the Phase 14R.2 false failure after `npm install`: generated `package-lock.json` is now accepted when synchronized; a malformed/stale lock still fails.
- RELEASE remains `com.familybloom.android`; DEV remains `com.familybloom.android.dev`; no Firestore schema/Rules/Functions/data semantics changed.

# LATEST CHECKPOINT — PHASE 14R HỘP THỜI GIAN FUNCTIONAL V1 (2026-10-01)

## CHECKPOINT 2026-10-01 — Phase 14R.2 Expo Doctor / Dual Android Build Fix

- Base: Phase 14R.1 dual Android variants + Phase 14R Hộp thời gian functional V1.
- RELEASE remains `Family Bloom` / `com.familybloom.android` with the user-supplied family icon.
- DEV remains `Family Bloom Dev` / `com.familybloom.android.dev` with Expo-style dev icon and separate `config/firebase/google-services.dev.json`.
- `app.config.js` now uses Expo's `({ config })` dynamic-config input and preserves the static `app.json` values instead of requiring `app.json` directly. This removes the Expo Doctor common-config warning while keeping a single variant overlay.
- Expo SDK 57 package patch targets are aligned: @expo/ui 57.0.21, expo-glass-effect 57.0.4, expo-image-picker 57.0.20, expo-linking 57.0.11, expo-router 57.0.24, expo-video 57.0.5, expo-notifications 57.0.21, expo-application 57.0.3.
- The stale package-lock from older FULLs is intentionally not shipped. First `npm install` on a connected machine regenerates a lock that matches the current package manifest; Android BATs detect missing/stale installed Expo packages and repair with npm install before build.
- Android RELEASE/DEV build BATs run Expo Doctor before prebuild so config/version drift fails early.
- Root remains clean; setup helpers stay under `scripts/setup/`.
- No Firestore schema/Rules/Functions/data semantics changed by Phase 14R.2.


- **Base authority:** Phase 14Q V2.2 BUILD-READY CLEAN-ROOT. Phase 14Q reveal visual contract remains the regression baseline.
- **Status:** IMPLEMENTED / AWAITING FIRESTORE RULES DEPLOY + REAL ANDROID DEVICE TEST. Do not close Phase 14R before user device acceptance.
- **Approved data contract:** `families/{familyId}/homeTimeCapsules/{capsuleId}` metadata + separate `/content/main` + per-user `/opens/{uid}`. No migration/backfill of old data.
- **Audience:** actual family membership users only; `selected` or family snapshot, creator excluded; bounded to 500 recipients. Genealogy Persons are never recipients.
- **Preview:** `hidden` omits recipient card and direct pre-open UI details; `locked` exposes only locked metadata/open time. Title/message stay in separate content doc and Rules deny recipient read until server `request.time >= openAt`.
- **Themes locked:** `warm=Ấm áp`, `formal=Trang trọng` blue/silver, `festive=Rộn ràng` pale-yellow/pink. Sender-selected theme persists. Core reveal stays box-first then letter scale 0→1 / opacity 0→1 in front layer. Accessibility Reduce Motion shortens motion and removes decorative particles.
- **Open state:** recipient first open runs full ceremony; successful completion writes own `opens/{uid}`; later visits read quickly and can replay effect. Creator can edit/delete only before `openAt`; content/metadata immutable after opening time.
- **Notifications:** local-first exact `openAt` notification and deep-link to exact capsule. Capsule scheduling is not limited by the Event 30-day horizon. Recipient device must open/resume after capsule creation so metadata can be synced/scheduled; no new Cloud Function remote push in 14R.
- **Build fixes:** root stays clean; invalid `expo run:android --output` removed; Gradle release APK exports to `dist/android/Family_Bloom_Release_Test_LATEST.apk`; APK-only helper added; stale npm lock is auto-repaired by BAT via `npm install` when required.
- **Validation:** Phase13 11/11, Phase14C 44/44, Phase14J 18/18, Phase14N 13/13, Phase14Q 34/34, Phase14R 49/49 PASS; current TS/TSX static syntax count 210/210 via 14C/14J. Native runtime and deployed Rules are not certified here.
- See `document/PHASE_14R_TIME_CAPSULE_FUNCTIONAL_V1.md`, `reports/validation/PHASE_14R_VALIDATION_REPORT.txt`, and `reports/device/PHASE_14R_TIME_CAPSULE_DEVICE_CHECKLIST.txt`.

---

# LATEST CHECKPOINT — PHASE 14C NHÀ MÌNH FUNCTIONAL V1 (2026-09-29)

- **Base authority:** Phase 14B.1 `NHA_MINH_UI_SHELL` PASS; Phase 13 Android RC1 remains the immutable pre-Nhà-Mình checkpoint.
- **Status:** IMPLEMENTED / AWAITING REAL ANDROID DEVICE TEST. Do not close Phase 14C until user acceptance.
- **Core identity rule:** all Nhà Mình recipients/voters/preferences use actual `families/{familyId}/members/{uid}` users; genealogy Persons are separate and never recipients.
- **Lời thì thầm V2:** family/direct audience, explicit family confirmation, direct privacy sender+recipient, 10 emotion emojis, heart reaction, filters, independent Saved snapshots, 20/page bounded pagination, 60-day expiry + physical Spark-friendly cleanup. Family audience intentionally creates no push; direct audience creates recipient-only inbox and future Cloud Function source sends only to that recipient.
- **Cùng quyết định V2:** whole family or selected group >=3 users, free description, Today/Tomorrow/custom expiry, anonymous/named ballots, frozen eligible snapshot/denominator, Agree/Disagree + derived Not-yet-voted/No-vote, `Đã kết thúc`, physical cleanup 30 days after expiry. Anonymous ballot identities are protected in a per-UID subcollection.
- **Bếp Nhà Mình V1:** local Bloom-owned 100-dish Vietnamese catalog; per-user dietary preferences; deterministic daily breakfast/lunch/dinner rotation, swap/search/detail; no runtime recipe API and no medical-treatment claims.
- **Phòng nhạc:** Phase 14B.1 UI shell remains byte-identical because its data/UX contract has not yet been approved.
- **Firebase:** Direct `firestore.rules` changed and keeps legacy Phase14A whisper/poll compatibility; 7 composite indexes added; `firestore.cloud.rules` synchronized as future source. No new npm/native dependency. Core Spark tests do not require Functions. Remote direct-whisper OS push requires future Blaze/Functions deployment.
- **Validation:** Phase14C static 40/40 PASS; all src TS/TSX syntax 191/191 PASS; Phase14B.1 shell 27/27 PASS; Phase13 release readiness 11/11 PASS. Native Android, emulator Rules and real multi-account privacy/push are not certified here.
- See `document/PHASE_14C_NHA_MINH_FUNCTIONAL_V1.md` and `document/PHASE_14C_DEVICE_TEST_CHECKLIST.txt`.

---

# LATEST CHECKPOINT — PHASE 8.2C TAB REGRESSION CORRECTION (2026-09-25)

- **Authority:** current source = Phase 8.2 Graph optimization + Phase 8.3–8.5 reliability/multi-family + Phase 8.2C correction. Phase 8.2B scheduling behavior is superseded after real Android regression.
- Device evidence: 8.2B barely changed 300/500 first paint, worsened 300 full mount to ~4.99s and 500 full mount to ~7.73s, while many early tab switches were ~0.7–1.0s.
- Graph correction: restore the proven Phase 8.2 idle progressive scheduler and normal connector render path; retain safe partner adjacency indexing and scoped viewport routing optimization.
- Realtime correction: prefer a small stable bounded listener set for the **active family** over unsubscribe/resubscribe churn on each tab. Planner month/list + moderation, admin pending-review badges, and Moments moderation no longer reopen per tab press. Moments per-card comments/reactions remain focus + visibility bounded.
- Performance instrumentation from 8.2B remains (`screen_focus`, `focus_frame_yielded`, `focused_work_enabled`, `listener_open:*`) so the correction can be measured rather than guessed.
- Performance Lab + RAM-only 50/100/200/300/500 Person tests remain in source until official production preparation.
- All Phase 8.3–8.5 changes remain: offline/resumable Moment retry, optional multi-family Moment publish OFF by default, immediate family-switch transition work, spacing tokens, Person-directory in-flight dedupe, optional cross-family Graph bridge foundation OFF by default.
- No schema migration, Rules delta, Functions/Blaze requirement, or native/npm dependency. `USE_CLOUD_FUNCTIONS=false`.
- Static/regression handoff result: 144 TS/TSX transpile PASS; 525 relative imports / 0 missing; Phase 8.2C + Phase 8.3–8.5 + Phase 7/startup/tab-warmup/Phase 6.5/6.4/Query-Kinship/DG-11/dense Graph/benchmarks/Functions core PASS.
- Status: **IMPLEMENTED / AWAITING REAL-DEVICE RETEST**. Do not claim runtime PASS before the next Performance Test Report.
- See `document/PHASE_8_2C_TAB_REGRESSION_CORRECTION.md` and `document/BUILD_CHECK_REPORT_PHASE_8_2C.txt`.

---

# LATEST CHECKPOINT — PHASE 8.2B FIRST FRAME & JS YIELD (2026-09-25)

- Base authority is the **Phase 8.3–8.5 FULL build on top of the Phase 8.2 Graph optimization**. Do not regress to a pre-8.2 Graph architecture.
- Real Android evidence confirmed the 8.2 direction: 500 Person full progressive improved from ~18.6s to ~6.7s and first paint from ~9.3s to ~5.9s; 300 Person full progressive improved from ~7.9s to ~4.1s.
- Remaining issue: the same session recorded a ~6372ms maximum JS timer drift and intermittent 380–556ms tab transitions.
- Phase 8.2B now blocks automatic Full Tree expansion until first viewport paint, yields every automatic batch through a paint boundary, delays connector decoration until after node-first paint, reuses a stable partner adjacency index, and tightens connector metadata work to viewport route IDs.
- Planner/Moments focus-gated realtime work now yields one frame before enabling; Performance Lab traces `screen_focus`, `focus_frame_yielded`, `focused_work_enabled`, and `listener_open:*`.
- Phase 8.3–8.5 functionality remains: resumable Moment retry, optional multi-family Moment publish OFF by default, spacing/splash work, realtime hardening, cross-family bridge foundation OFF by default.
- Performance Lab and synthetic 50/100/200/300/500 Person RAM-only tests MUST remain until official production/release preparation.
- No schema migration, Rules delta, Cloud Functions/Blaze requirement, or native/npm dependency in this pass.
- Status: **IMPLEMENTED / AWAITING USER DEVICE RETEST**. Do not claim Phase 8.2B runtime PASS before a new Performance Test Report.
- See `document/PHASE_8_2B_FIRST_FRAME_JS_YIELD.md` and `document/BUILD_CHECK_REPORT_PHASE_8_2B.txt`.

---

# LATEST CHECKPOINT — PHASE 8.1 AUTOMATED PERFORMANCE TEST BUILD (2026-09-25)

- User confirmed all four core Phase 7 multi-family device cases PASS on real Android: A→B→C switching, per-family roles, Moment upload while switching, and join/create without auto-switch.
- Phase 7 core architecture is device-accepted; final close is deferred until polish/reliability TODO are resolved.
- Deferred TODO: offline pending Moment retry; spacing/gaps for some cards/buttons; family-switch splash perceived 1–2s late.
- User cannot reasonably perform deep manual profiling or manually create 100–500 Person datasets.
- Current test build adds `Góc chơi → Phòng đo hiệu năng`, automatic JS/app traces/listener diagnostics, a 30-second interaction probe, and RAM-only synthetic Family Graph datasets for 50/100/200/300/500 Person.
- Synthetic graph NEVER writes Firebase. No schema migration, Rules change, Cloud Functions/Blaze requirement, or new native dependency.
- This build measures JS/app-layer timing; it does not claim native FPS/GPU/RAM certification.
- See `document/PHASE_8_1_AUTOMATED_PERFORMANCE_TEST_BUILD.md`.

---

# FAMILY BLOOM — MASTER HANDOFF PROMPT TOÀN DỰ ÁN

## CHECKPOINT MỚI NHẤT 2026-09-25 — PHASE 7 MULTI-FAMILY EXPERIENCE & ISOLATION

**Authority hiện hành:** Phase 6.5 đã **CLOSED** sau khi user test Android thật và xác nhận mọi thứ hoạt động hoàn hảo. Phase 7.1 → 7.4 đã được implementation trong source hiện tại và đang **OPEN / AWAITING USER DEVICE TEST**.

Phase 7 ưu tiên hiệu năng và isolation:

```text
uid có nhiều memberships
→ activeFamilyId chỉ là workspace preference
→ switch xác minh reverse membership + authoritative member doc
→ Family Scope key = uid:activeFamilyId
→ remount read caches/tabs của target family
→ inactive families không có full realtime listeners
```

Cross-family realtime duy nhất là collection nhỏ `users/{uid}/memberships`, listener dừng khi app background. Active family vẫn dùng bounded shared listeners cho members/latest Moments/upcoming+yearly Events. Family Switcher không query domain data của inactive family.

UI mới: Home/Cây nhà mở `FamilySwitcherModal`; Profile có `Những ngôi nhà của tôi`; `/family-memberships` cho manage/join/create thêm family; `/family-select` dùng khi saved active invalid và còn >1 lựa chọn. Join/create thêm family không auto-switch current family. User chủ động switch thì route về Home target family.

`MomentPublishProvider` vẫn ở ngoài Family Scope. Pending upload capture immutable `familyId` lúc enqueue nên upload từ Nhà A không thể attach sang Nhà B sau khi switch.

Rules Phase 7 harden update `activeFamilyId`: phải có cả `users/{uid}/memberships/{familyId}` và `families/{familyId}/members/{uid}`. `firestore.rules` + `firestore.cloud.rules` đã đồng bộ; Direct Mode không cần deploy Functions. Không thêm npm/native dependency, không migration schema.

Validation trong môi trường bàn giao: 136 TS/TSX transpile PASS; 482 relative imports/0 missing; Phase 7 contract PASS; synthetic sort 10k memberships ~10–20ms; Phase 6.5/6.4/Query/Kinship/DG-11/dense layout/benchmarks/Functions core PASS. Chưa chứng nhận native Phase 7 device runtime/frame-memory profiling hoặc emulator Rules delta.

Xem `document/PHASE_7_MULTI_FAMILY_EXPERIENCE_ISOLATION.md` và `document/BUILD_CHECK_REPORT_PHASE_7.txt`. Không chốt Phase 7 trước user device acceptance.

---

# FULL HISTORICAL HANDOFF BELOW

## CHECKPOINT MỚI NHẤT 2026-09-25 — Tài khoản chưa liên kết Person

Yêu cầu user đã xác nhận: account không liên kết Person không được mặc định focus người đầu tiên. Mở phả hệ bình thường ở 3 thế hệ quanh vùng thế hệ giữa, không selected/focus/nhãn xưng hô theo một người tùy ý. Camera căn giữa bounds các Person đang hiển thị; nút recenter cũng căn overview khi không có focus. Chọn/tìm người hoặc mở từ liên kết Person cụ thể vẫn cho phép focus chủ động. Linked user giữ cơ chế focus Person của mình. Component tách state theo family/account.

Member thấy Gợi ý góp ý phả hệ, hướng dẫn gửi đề xuất và nguồn thông tin; admin/owner vẫn thấy Gợi ý xây cây. Giữ Góp ý dưới Duyệt thành viên và badge Chờ duyệt. Không đổi dữ liệu, schema, quyền, Rules hoặc dependencies cho riêng thay đổi này.

Full hiện tại: Family_Bloom_Phase_6_5_FULL_Unlinked_Overview.zip. Patch: Family_Bloom_Phase_6_5_PATCH_Unlinked_Overview.zip, áp dụng trên FULL_Review_Badges_Fixed; không phải bản tổng hợp từ main cũ. Prompt toàn app trong document/FAMILY_BLOOM_NEW_ACCOUNT_FULL_PROMPT.md.

Validation: 133 TS/TSX transpile, Phase 6.4 viewport/progressive, Query/Kinship/Focus và dense layout PASS. Chưa kiểm chứng native/device visual. Cần test: unlinked mở 3 thế hệ không focus, nút căn giữa; linked focus đúng người; tìm/chọn Person; đổi family/account; 3/5/all và pan/pinch; member thấy góp ý, admin thấy xây cây. Phase 6.5 vẫn OPEN, không push/deploy.

## Hotfix mới nhất 2026-09-25 — lỗi bundling badge

Đã sửa import useIsFocused từ @react-navigation/native không có trong project. Hook usePendingFamilyReviews dùng useFocusEffect từ expo-router (giống các màn hiện có) với state focus; không thêm dependency, không cần deploy Rules/native rebuild cho riêng hotfix này. Sau khi thay source, khởi động lại Metro bằng npx expo start --dev-client --clear.

Source full hiện tại: Family_Bloom_Phase_6_5_FULL_Review_Badges_Fixed.zip. Dùng bản này thay bản Review_Badges cũ. Static transpile 133 TS/TSX PASS; không còn import @react-navigation/native trong src. Chưa chạy native bundling hoặc kiểm chứng trên điện thoại tại môi trường bàn giao, không tuyên bố runtime PASS. Phase 6.5 vẫn OPEN.

## CHECKPOINT MỚI NHẤT — Báo chờ duyệt trên thẻ (2026-09-24)

- Duyệt thành viên và Góp ý phả hệ có chuông + nhãn Chờ duyệt màu Bloom khi tồn tại pending. Chỉ admin/owner thấy dấu báo. Không phải push notification và không hiển thị tổng số.
- Thẻ Góp ý nằm ngay dưới Duyệt thành viên. Chỉ member tạo đề xuất; admin/owner không tạo, không tự duyệt.
- Mỗi service theo dõi query status=pending, limit(1). Hook chỉ subscribe khi tab Cây nhà được focus và app active; cleanup khi đổi account/family, quyền, tab hoặc background. Lỗi theo dõi hiện thông báo chưa tải trạng thái, không giả làm không có pending.
- Không thay schema/Rules/dependency trong riêng thay đổi badge này. Nếu chưa áp dụng bản quyền member-only trước, vẫn phải Publish firestore.rules kèm full/patch tổng hợp.
- Build badge: 133 TS/TSX transpile PASS, diff check PASS. Các kiểm thử 34 Direct + 8 Cloud là kết quả của bản quyền ngay trước; chưa chạy lại emulator cho badge, chưa kiểm chứng React Native trên thiết bị.
- Cần test tạo yêu cầu từ thiết bị khác → chuông xuất hiện; duyệt/từ chối hết → biến mất; kiểm tra cả join/proposal, member không thấy badge admin, đổi nhà/account không lẫn dấu báo, background/resume tải lại.
- Phase 6.5 vẫn OPEN chờ người dùng test. Chưa push GitHub hoặc deploy Firebase.

## CHECKPOINT HIỆN HÀNH — Member đề xuất, admin duyệt (2026-09-24)

**Authority mới nhất theo yêu cầu trực tiếp của user. Phase 6.5 vẫn OPEN / AWAITING DEVICE TEST.**

- Chỉ role `member` được tạo đề xuất Person/Relationship. Admin/owner không có nút tạo và bị Rules chặn tạo. Các role khác không được tự suy rộng quyền này.
- Admin/owner duyệt đề xuất của người khác; tuyệt đối không tự duyệt đề xuất mình tạo trước đây, kể cả member được nâng quyền sau khi gửi. UI, Direct service, Direct Rules và backend Cloud đều chặn tự duyệt.
- Đề xuất cũ được giữ nguyên, không migration/xóa lịch sử. Creator vẫn rút pending của mình; admin khác có thể duyệt; admin có thể từ chối với lý do.
- Thẻ Góp ý phả hệ ngay dưới Duyệt thành viên trong khu vực Quản lý nhà; member vẫn thấy thẻ trong khu vực Cùng xây phả hệ; dùng BloomCard trắng, icon nền hồng, mô tả theo vai trò và khoảng cách riêng. Không còn thẻ hồng dính vào Nhà đang xem.
- Quyết định này THAY THẾ mọi câu lịch sử cho phép admin tạo hoặc tự duyệt đề xuất. Các cập nhật quyền này đã được user yêu cầu, không cần xin duyệt lại.
- Cần Publish lại `firestore.rules` của build này; giữ USE_CLOUD_FUNCTIONS=false, không cần deploy Functions. Chưa deploy production, chưa push GitHub.
- Kiểm thử build này: 34 Direct emulator/service + 8 Cloud emulator/backend PASS; 132 TS/TSX transpile PASS. Chưa xác nhận native build/full typecheck hay giao diện thực tế trên điện thoại.
- Giữ toàn bộ chức năng app và các hotfix trước. ZIP FULL là toàn bộ source hiện tại, không chứa node_modules/.git/log emulator.

### Việc làm ngay
1. Áp dụng full source và Rules mới, cài dependency theo package lock.
2. Test member thấy Tạo đề xuất; admin/owner không thấy; tài khoản nâng quyền không tự duyệt được đề xuất đã tạo.
3. Test thẻ nằm ngay dưới Duyệt thành viên, khoảng cách và màu Bloom trên thiết bị.
4. Test checklist đầy đủ về join ID/code, proposal, Timeline/Moments/Events/Album, login/splash/tab và cây.
5. Chỉ đóng Phase 6.5 khi user xác nhận. Hướng sau đó là củng cố backend mutations và kiểm thử hiệu năng trước phát hành; chưa tự mở phase/deploy.

## Latest checkpoint — Proposal approval + dual family invitation (2026-09-24)

**OPEN / AWAITING USER DEVICE TEST. This extends the prior Phase 6.5 test build; not CLOSED.** User explicitly requested implementing Person/Relationship proposals now and fixing Family ID joins. This checkpoint supersedes prior statements that proposals are future work or that no Rules deployment is needed.

New entry: Cây nhà → Góp ý phả hệ. Members may propose create/update/delete for Persons and Relationships. Admin/owner reviews before/after and approves/rejects; creators may withdraw pending proposals. Superseded: only member role may submit; admins cannot approve their own proposals. Rejection requires a note. Terminal proposals are immutable audit records. Editing endpoints/type requires delete/new relationship; metadata changes preserve canonical ids. Person edits do not change linkedUid; deletion is non-cascading and blocked while account, relationships, Timeline, Album, Moments or Events remain linked.

New collections: families/{familyId}/graphProposals and graphProposalState/current. Pending proposal stores before/after, reason, creator, timestamps; review stores actor, time, note and applied document. Approval checks exact original snapshot and atomically writes target + audit. Revision transaction serializes proposal approvals and rechecks graph on retry, including competing parent edges. Existing direct admin graph mutations do not acquire this revision, so full graph-wide integrity still belongs in trusted backend before production. No silent migrations or renames.

Joining: resolve public family_codes alias by code or exact-case familyId. Never read private family or member data as an applicant. Own membership + request transaction prevents duplicate pending submissions. Rejected applicants may reapply. Admin approval uses submitted applicant projection, creates membership and marks approval; applicant activates family using their own profile permission. Gateway provides a retry button for activation. Rules now use existsAfter for approval and disallow outsider self-creation of a family member. Profile shows Family ID and house code with separate Copy buttons. Legacy families lacking code get an explicit owner-only Create code action; no automatic rotation.

**Deployment for device test: publish updated firestore.rules (Direct Mode).** Prior deployed Phase 6.5 Rules do not include proposals. USE_CLOUD_FUNCTIONS remains false. Cloud rules and functions/proposalApproval.js are synchronized for future Cloud Mode; do not switch/deploy those just for this test. Existing splash, pink tab bar, Moments spacing and performance hotfixes are included in the cumulative ZIP.

Validation: 30 Direct Mode emulator/service cases and 6 Cloud Mode emulator/backend cases PASS; source transpile and graph regression checks PASS. Full typecheck/native build not certified: dependency download failed with network errors, leaving missing declarations; device UI/performance still requires user test. See document/PHASE_6_5_PROPOSALS_JOIN_TEST.md. Source not pushed to GitHub.



## Latest checkpoint — Phase 6.5 final device-test candidate (2026-09-24)

**Status: IMPLEMENTED / OPEN / AWAITING USER DEVICE TEST. Not CLOSED.**
Base source: GitHub familyconnect2022/family_bloom main commit 646457dbb0883fd849211695b082f43cf4631787. User confirms Phase 6.5 Firestore Rules deployed. This cumulative hotfix requires no new Rules/Functions deployment or dependency changes.

Latest implementation supersedes the previous idle-tab warmup hotfix: all five main tabs mount behind the existing in-app splash. Startup waits for their committed readiness, shared members/latest Moments/upcoming and yearly Events, Moments' Person directory and the current Planner month. It releases on completion or an 8-second fallback from first tab readiness registration. Authentication/profile resolution still uses the existing root gate and is not bypassed by that timeout. Login failure stays in auth; missing profile and missing/invalid family follow their existing screens.

Read caches, tab state and startup latch are recreated on account/active-family change. MomentPublishProvider stays outside the family boundary to preserve ongoing uploads. Normal snapshot refreshes do not re-block the user. Only bounded initial feeds/calendar data are prepared, not full history, original images or videos. Person directory retains its existing full-directory request. Native image decoding and device rendering are not guaranteed complete by JS readiness.

UI: rose/pink tab bar with selected-icon pill, no gray press ripple or elevation shadow; Person links in MomentCard get 16-point horizontal inset. Earlier calendar query reuse and memoized media-grid fixes remain.

Validation: startup lifecycle simulation PASS; 128 TS/TSX static transpile PASS; Phase 6.5 contract, Phase 6.4 viewport/progressive, Query/Kinship, DG-11, dense layout, Functions core and Functions syntax PASS. Full typecheck, native build and device visual/performance tests not run. See document/PHASE_6_5_FINAL_DEVICE_TEST.md for the single acceptance checklist and proposed next phase. No runtime PASS claim and no Phase 6.5 CLOSED checkpoint until user acceptance.

The full-project snapshot below remains applicable except where this latest checkpoint explicitly supersedes it.

## Phase 6.5 IMPLEMENTED · AWAITING DEVICE TEST · BASECODE = Phase 6.4 CLOSED

> Đây là tài liệu bàn giao **FULL APP** hiện hành. **Phase 6.4 đã CLOSED** và là basecode đầu vào của Phase 6.5.  
> Phase 6.5 Person Experience & Family Integration đã được implementation theo Decision Gate user xác nhận và đang **AWAITING DEVICE TEST**.  
> Không được coi Phase 6.5 là CLOSED trước khi user test runtime các quyền Timeline, Person ↔ Moments/Event và Profile invite flow.

---

## 0. Quy tắc sử dụng tài liệu này

Tài liệu này không phải changelog riêng của Phase 6.2. Nó là **Master Handoff Prompt FULL DỰ ÁN**, dùng để:

- tiếp tục phát triển Family Bloom trong chat/dev session mới;
- tránh mất kiến trúc, quyền, data contracts và quyết định đã chốt;
- xác định BASECODE hiện hành;
- xác định phần đã hoàn thành và phần chưa làm;
- giữ roadmap liên tục giữa các phase;
- làm authority trước mỗi lần build code tiếp theo.

Từ Phase 6.3 trở đi, mỗi gói build/patch lớn phải kèm:

```text
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
```

Nội dung phải là **full project snapshot**, không chỉ mô tả file vừa sửa.

Khi user nói **chốt phase**, phải tạo thêm:

```text
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_PHASE_<X>_CLOSED.md
```

và cập nhật `CURRENT` thành cùng checkpoint mới.

Mọi Markdown mới của project phải nằm trong `document/`, không tạo `.md` ở project root.

## 0.1. Governance rule — user confirmed for Phase 6.3+

Từ Phase 6.3 trở đi, mọi thay đổi phải tuân thủ **Data Safety / Decision Gate** sau:

1. **Không được làm thay đổi, rewrite, migrate hoặc phá dữ liệu chính/source-of-truth hiện có** chỉ để triển khai feature mới.
2. Mọi thay đổi liên quan đến schema, collection/path, persisted field, identity, relationship semantics, permission, mutation behavior, migration hoặc compatibility phải được **trình bày trước cho user xác nhận**.
3. Chỉ sau khi user xác nhận, quyết định đó mới trở thành contract được phép code.
4. Mọi quyết định đã xác nhận phải được ghi vào `document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md` và được mang sang các build/phase sau.
5. Không tự ý rename/remove field, đổi collection, rewrite persisted records, backfill/migrate dữ liệu, hay thay đổi meaning của dữ liệu hiện có nếu chưa có user approval rõ ràng.
6. Ưu tiên implementation additive/read-only/pure-domain trước; nếu feature có thể làm mà không đổi Firestore source-of-truth thì **không được đổi schema**.
7. Nếu phát hiện implementation buộc phải thay đổi dữ liệu chính, dừng coding ở decision gate và trình impact + migration + rollback plan cho user duyệt trước.

Rule này là authority cao hơn các proposal kỹ thuật cũ nếu có xung đột.

---

# 1. Sản phẩm

**Family Bloom** là ứng dụng gia đình mobile-first bằng Expo/React Native.

Các domain chính hiện có:

```text
Authentication
User Profile
Multi-family membership
Family Gateway / family state machine
Family member approval
Home Dashboard
Moments / Kỷ niệm
Comments / Reactions
Planner / Events / Calendar
Cloudinary + media_assets
Family Graph / Family Tree
Family Person Timeline
Family Person Album
```

Phong cách UI:

```text
Bloom pastel
ấm áp
nhẹ nhàng
mobile-first
cute nhưng không trẻ con hóa
ưu tiên UX rõ ràng hơn mật độ thông tin
```

---

# 2. Kiến trúc nền không được phá tùy tiện

Giữ nguyên nếu chưa có architecture review rõ ràng:

```text
Expo Router
Root Navigator / Auth / Profile / Family gating state machine
activeFamilyId
Firebase Auth
Firestore
users/{uid}
users/{uid}/memberships/{familyId}
families/{familyId}/members/{uid}
service / repository / hooks ownership
FamilyRealtimeProvider bounded realtime
centralized errorService
Cloudinary + media_assets lifecycle
keyboard/focus foundation
Bloom shared UI baseline
```

Screen không được tự mở kiến trúc Firestore song song nếu domain đã có service/repository sở hữu data flow.

Không tạo “service version 2” hoặc error system thứ hai chỉ để giải quyết local feature.

---

# 3. Phase 2 foundation — trạng thái đã khóa

Phase 2 đã ổn định và là nền navigation/auth/family của app.

Root state machine không render `(tabs)` tạm thời trước khi đủ:

```text
auth hợp lệ
profile hợp lệ
family membership hợp lệ
activeFamilyId hợp lệ
```

Các yêu cầu UI/UX đã được giữ xuyên suốt:

- keyboard không được che nội dung quan trọng;
- BloomButton không giả định luôn có icon;
- BloomDatePicker dùng phiên bản đã refactor hiện tại, không quay lại bản cũ;
- BloomToast thiếu `type` thì mặc định `info`;
- Google sign-in cancel phải được xử lý riêng, không báo nhầm lỗi server.

Không refactor lại Root Navigator/Auth/Family state machine chỉ vì Family Graph.

---

# 4. Multi-family identity

Ba identity tách biệt:

```text
User Account
Family Member
Family Person
```

Cụ thể:

```text
User Account  = users/{uid}
Family Member = families/{familyId}/members/{uid}
Family Person = một con người trong phả hệ
```

Invariant:

- `FamilyPerson.id` độc lập với Firebase UID;
- một Person có thể không có account;
- một user có thể map sang Person khác nhau ở các family khác nhau;
- trong một family, một UID chỉ link tối đa một Person;
- `activeFamilyId` chỉ chọn family đang active, không làm thay đổi identity của family khác.

Focus Person của current user được resolve qua:

```text
families/{familyId}/personLinks/{uid}
→ personId
→ persons/{personId}
```

Không scan toàn collection Persons để tìm linked user.

---

# 5. Media architecture

Source of truth lifecycle:

```text
media_assets/{mediaAssetId}
→ Cloudinary provider file
→ domain document chỉ giữ reference / resolved URL cần thiết
```

Không tạo media pipeline thứ hai cho Family Graph.

Person media namespace:

```text
family_bloom/families/{familyId}/persons/{personId}/{purpose}
```

Tách rõ:

```text
purpose=avatar
purpose=album
```

Avatar Person là optional.

---

# 6. Moments / Kỷ niệm

Tất cả family member hợp lệ được tạo Moment.

Ownership contract đã chốt:

```text
creator       → sửa caption bài của mình
creator       → xóa bài của mình
other member  → không sửa/xóa
admin/owner   → không sửa/xóa bài người khác
admin/owner   → chỉ moderation visible/hidden
```

Moderation fields:

```ts
moderationStatus: "visible" | "hidden"
moderatedByUid: string | null
moderatedAt: string | null
```

Legacy Moment thiếu moderation fields được normalize là `visible`.

Hidden Moment:

- không render trong feed chính;
- không render trong Home surfaces tương ứng;
- Admin/Owner có luồng kiểm duyệt để hide/unhide.

Comment ownership:

- comment author sở hữu comment của mình;
- admin không được xóa comment người khác chỉ vì là admin.

Realtime/performance:

- Moment feed dùng bounded realtime head + paging;
- comments listener lazy theo card đang visible/expanded;
- upload progress không được làm re-render toàn feed;
- progress state đã được coalesce/throttle và defer qua InteractionManager để giảm giật scroll khi upload media.

---

# 7. Planner / Events / Calendar

Tất cả family member hợp lệ được tạo Event.

Ownership semantic phải giống Moments:

```text
creator CRUD nội dung Event của chính mình
admin/owner khác creator không edit/delete
admin/owner chỉ hide/unhide bằng moderation metadata
```

Event canonical moderation fields:

```ts
moderationStatus: "visible" | "hidden"
moderatedByUid: string | null
moderatedAt: string | null
```

Legacy Event thiếu moderation fields được normalize `visible`.

Hidden Event:

- không render Calendar/list/upcoming/yearly feed;
- Admin/Owner có luồng kiểm duyệt để cho hiện lại.

Màn detail:

```text
creator → Sửa / Xóa
admin/owner không phải creator → Ẩn / Cho hiện
```

Birthday/Anniversary:

- `recurrence=yearly` có thể dùng ngày gốc trong quá khứ;
- one-off event quá khứ vẫn bị validation chặn.

Events phải tiếp tục bounded theo month/upcoming/yearly; không realtime toàn lịch sử.

---

# 8. Family Graph — domain authority

Firestore canonical paths:

```text
families/{familyId}/persons/{personId}
families/{familyId}/relationships/{relationshipId}
families/{familyId}/personLinks/{uid}
```

Structural relationship persist duy nhất:

```text
parent_child
partner
```

Không persist riêng các nhãn suy luận như:

```text
ông
bà
anh
chị
em
bác
chú
cô
cậu
dì
cháu
anh/chị/em họ
```

Các quan hệ đó thuộc **Graph Query Engine + Kinship Resolver**.

Family Graph là graph domain; UI chỉ render graph thành family tree.

---

# 9. FamilyPerson contract

Family Person hiện hỗ trợ các nhóm dữ liệu:

```text
id
familyId
linkedUid
displayName
gender
nickname
birthDate
birthYear
birthPlace
deathDate
deathYear
lifeStatus
birthOrder
avatarUrl
description
createdByUid
createdAt
updatedAt
```

Nguyên tắc:

- optional Firestore fields normalize về null, không ghi undefined;
- full date nếu có là nguồn để suy ra year;
- nếu chỉ biết năm thì date có thể null nhưng year vẫn có giá trị;
- death data chỉ hợp lệ theo lifeStatus;
- linkedUid phải là member hợp lệ cùng family;
- one UID ↔ one Person trong một family;
- Person có thể tồn tại lâu dài dù unlink account.

---

# 10. FamilyRelationship contract

Hai dạng edge canonical:

## parent_child

Ý nghĩa direction:

```text
personAId = parentId
personBId = childId
```

Relationship ID deterministic:

```text
pc_<parentId>_<childId>
```

Subtype:

```text
biological
adoptive
step
unknown
```

## partner

Partner pair được canonicalize theo ID order để tránh duplicate hai chiều.

Status hỗ trợ:

```text
partner
married
separated
divorced
widowed
```

Có thể có `startDate/endDate` nếu biết.

---

# 11. Family Graph permissions

Hiện tại:

```text
Owner/Admin → xây/chỉnh Family Graph
Member      → đọc graph mặc định
```

Member không mặc định được sửa tổ tiên/người khác.

Proposal system có thể làm sau, chưa thuộc Phase 6.3 core.

Graph validation hiện có:

- same-family references;
- no self relationship;
- deterministic relationship IDs;
- duplicate relationship prevention;
- duplicate account-link prevention;
- Person ↔ personLinks atomic consistency;
- client parent-cycle detection trong Direct/Spark mode;
- backend transaction cycle detection trong future Cloud mode.

---

# 12. Family Graph mutation architecture

Stable facade:

```text
UI
→ familyGraphMutationService
→ adapter theo feature flag
```

Feature flag:

```ts
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
```

Hiện tại project Firebase Spark:

```text
UI
→ stable service facade
→ Direct Firestore transaction/batch
→ firestore.rules
```

Khi nâng Blaze sau này:

```text
UI
→ same stable service facade
→ familyGraphMutation Cloud Function
→ Admin SDK transaction
```

Không rewrite UI/domain khi chuyển mode.

Mọi thay đổi integrity Family Graph phải cập nhật song song:

```text
Direct Firestore adapter
Security Rules source
functions/ future backend path
```

---

# 13. Firestore Rules / Backend deploy policy

Hai Rules source:

```text
firestore.rules       = Direct/Spark development mode
firestore.cloud.rules = hardened Cloud Function mode
```

Từ checkpoint này:

**Không yêu cầu user deploy Rules/Functions từng phase.**

Quy trình mới:

```text
mỗi phase → cập nhật source rules + functions đầy đủ
không deploy giữa chừng nếu không thật sự cần
cuối dự án → tạo một deployment package + checklist duy nhất
```

Vì vậy Firebase deployed state thực tế có thể tạm thời chậm hơn source local.

Khi cần test write mà deployed Rules chưa hỗ trợ feature mới, phải nói rõ đây là giới hạn environment/deployment, không kết luận sai rằng client code hỏng.

Không được tự yêu cầu nâng Blaze giữa phase chỉ để test Family Graph.

---

# 14. Family Graph UI baseline tại Phase 6.2 CLOSED

Family Tree hiện có:

- live Firestore graph adapter;
- pan;
- stable pinch zoom;
- focus / tắt focus;
- Branch Mode;
- compact centered layout cho graph nhỏ;
- Person node Bloom pastel;
- tên dài hiển thị nhiều dòng hợp lý;
- Person Detail sheet;
- Owner/Admin sửa Person;
- icon thêm Person;
- navigation Graph/Admin không nhân stack;
- birth/death hiển thị full date khi có, year-only khi chỉ biết năm;
- Person Timeline tab thật;
- Person Album tab thật.

Graph listener chỉ sống khi Graph UI cần; không đưa full graph vào FamilyRealtimeProvider toàn app.

---

# 15. Phase 6.2 correction UX đã chốt

Form `Nối quan hệ` phải đọc theo flow:

```text
Người được chọn
→ Loại quan hệ
→ subtype/status nếu cần
→ Người tham chiếu
```

Semantic preview phải mô tả chính xác direction trước khi lưu.

Ví dụ:

```text
Huỳnh Nguyễn Gia Minh là con ruột của Huỳnh Thanh Nhân
```

Map bắt buộc:

```text
parentId = Huỳnh Thanh Nhân
childId  = Huỳnh Nguyễn Gia Minh
```

Không map theo vị trí UI một cách mơ hồ.

Action mode:

```text
mode active   → full color
mode inactive → outline
```

Áp dụng cho:

```text
Thêm người
Nối quan hệ
```

---

# 16. Delete Person / Node semantics

Có thao tác xóa node/Person trong admin graph flow.

Nguyên tắc an toàn:

- nếu chỉ nối sai quan hệ, ưu tiên xóa relationship sai rồi tạo lại đúng;
- delete Person dùng khi Person thật sự tạo nhầm;
- Person đang `linkedUid` bị chặn xóa trực tiếp;
- Person có Timeline/Album bị chặn để tránh mất nội dung;
- delete Person hợp lệ có thể cleanup structural relationship edges liên quan atomically/có kiểm soát;
- không để orphan `personLinks` hoặc dangling relationship.

Error domain liên quan:

```text
PERSON_HAS_CONTENT
```

---

# 17. Person Timeline

Path:

```text
families/{familyId}/persons/{personId}/timeline/{entryId}
```

UI:

```text
Con đường ký ức
```

Behavior:

- realtime;
- thêm mốc đời sống;
- xóa mốc thủ công theo permission hiện tại;
- birth/death derive trực tiếp từ Person, không duplicate thành timeline record;
- chỉ additional life events mới persist vào timeline collection.

Hiện tại quyền thêm/chỉnh nội dung Person Graph vẫn theo Owner/Admin policy của graph.

---

# 18. Person Album

Reference path:

```text
families/{familyId}/persons/{personId}/album/{mediaAssetId}
```

Actual asset:

```text
media_assets/{mediaAssetId}
→ Cloudinary
```

Behavior:

- chọn ảnh/video từ device library;
- upload bằng mediaService/Cloudinary pipeline hiện có;
- Graph chỉ lưu album reference;
- realtime album;
- fullscreen viewer;
- không duplicate raw media metadata vào Person document.

---

# 19. Error architecture

Tiếp tục dùng:

```text
AppError
centralized errorService
```

Không tạo error stack riêng cho Family Graph.

Các category/domain hiện có bao gồm:

```text
AUTH
PROFILE
FAMILY
EVENT
MOMENT
MEDIA
GRAPH
PERSON
RELATIONSHIP
```

Các ownership/moderation error đã có hoặc phải tiếp tục giữ semantic:

```text
EVENT_NOT_OWNER
EVENT_MODERATION_DENIED
MOMENT_NOT_OWNER
MOMENT_MODERATION_DENIED
PERSON_HAS_CONTENT
```

---

# 20. Performance / realtime contract

Không load toàn bộ historical app data realtime.

## Moments

```text
bounded realtime head
paging historical
lazy comments listeners
upload progress isolated khỏi scroll-critical state
```

## Events

```text
month/upcoming/yearly bounded queries
hidden events filtered ở service boundary
```

## Family Graph

```text
listener chỉ sống khi graph cần
không global realtime 500+ persons
focus subgraph là hướng production
Full Tree cần progressive/lazy expansion
```

Scale target cần test dần:

```text
50
100
300
500+
```

---

# 21. Documentation/build convention từ Phase 6.3 trở đi

Mỗi **build/patch lớn** phải có tối thiểu:

```text
source files thay đổi
Rules source nếu domain integrity/permission có liên quan
functions/ source nếu future Cloud path có liên quan
document/BUILD_CHECK_REPORT_*.txt hoặc tương đương
document/DANH_SACH_FILE_CAP_NHAT_*.txt
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
```

`FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md` phải luôn chứa:

1. full architecture hiện tại;
2. source-of-truth data contracts;
3. permission semantics;
4. media/realtime/error architecture;
5. toàn bộ feature lớn đã hoàn thành;
6. phase hiện tại và trạng thái test;
7. known issues/deferred work;
8. deployment state;
9. regression gate;
10. kế hoạch phase tiếp theo.

Không được giao patch lớn chỉ có changelog rời rạc mà không cập nhật full Master Handoff.

Quy tắc đóng gói đã được user xác nhận thêm:

```text
Sau MỖI lần sửa source/code, luôn tạo một ZIP patch chỉ chứa các file đã thay đổi,
giữ đúng cấu trúc thư mục project để user copy/merge trực tiếp.
Không chỉ gửi mô tả code.
```

---

# 22. Regression gate bắt buộc

Sau mỗi milestone/build quan trọng, phải regression ít nhất:

```text
Auth/login/logout/Google cancel
Create/update Profile
Family Gateway
Create Family
Join Family
Approve/Reject Member
activeFamilyId + switch family
member projection/profile avatar
Cloudinary/media_assets
Moments create/reaction/comment/edit/delete/moderation
Moment media upload + scroll smoothness
Events create/update/delete by creator
Events moderation by Admin/Owner
Calendar
Home Dashboard
realtime lifecycle
navigation/back stack
keyboard UX
Family Graph read/edit/link/unlink
create/delete relationship
cycle/duplicate prevention
create/edit/delete Person safety
Person Timeline
Person Album
multi-family graph isolation
```

Không tuyên bố phase PASS chỉ dựa trên static compile nếu user chưa test luồng runtime quan trọng.

---

# 23. BASECODE declaration — Phase 6.2 CLOSED

User đã xác nhận **chốt Phase 6.2**.

Từ đây:

```text
CURRENT PROJECT CODE = BASECODE PHASE 6.2 CLOSED
```

Basecode nghĩa là project của user sau khi đã áp dụng các thay đổi Phase 6.2 mới nhất, bao gồm correction patch về:

```text
relationship direction UX
semantic relationship preview
active/inactive action button state
safe delete Person/node
Moment upload scroll smoothness
Event ownership/moderation parity
Rules source sync
future Cloud Function source sync
```

Không lấy một zip cũ hơn làm full source authority nếu thiếu các thay đổi trên.

Nếu cần reconstruct trong môi trường mới, phải bắt đầu bằng:

1. Master Handoff này;
2. source project/basecode user hiện tại;
3. patch Phase 6.2 mới nhất nếu basecode chưa merge patch;
4. đối chiếu các file source thực tế trước khi sửa.

---

# 24. Phase 6.2 — CLOSED

Phase 6.2 đã hoàn tất checkpoint về:

```text
Graph Foundation integration
Interactive Family Tree baseline
Admin graph editing
Person form polish
Person link/unlink
Relationship create/delete
safe Person delete
Timeline
Album
ownership/moderation alignment
navigation/layout refinements
Spark direct mutation path + future Cloud path sync
```

Các phần **không tiếp tục nhồi vào Phase 6.2**:

```text
Kinship Resolver hoàn chỉnh
Graph Query Engine production
bounded focus subgraph production
cousins/extended kinship inference
large graph progressive loading production
proposal system
advanced birth-order inference
```

Những phần này chuyển sang roadmap sau.

---

# 25. PHASE 6.3 — GRAPH QUERY ENGINE + VIETNAMESE KINSHIP

## 25.1. Mục tiêu Phase 6.3

Biến Family Graph từ “lưu và vẽ đúng structural graph” thành domain có khả năng:

```text
truy vấn họ hàng
suy luận quan hệ
mô tả quan hệ tiếng Việt
trích bounded subgraph quanh một Person
scale tốt khi graph lớn dần
```

Phase 6.3 không được phá schema canonical `parent_child/partner` chỉ để dễ render UI.

---

## 25.1A. Phase 6.3 Decision Gate — CONFIRMED

User đã xác nhận **DG-1 → DG-11**. Đây là contract bắt buộc của Phase 6.3 và các build tiếp theo cho đến khi user chủ động sửa quyết định:

### DG-1 — Zero schema/data migration
- Không thêm/đổi/xóa Firestore collection hoặc persisted field cho Query Engine/Kinship Resolver.
- Không backfill/migrate Person/Relationship hiện có.
- Không persist derived kinship labels/paths vào Firestore.

### DG-2 — Structural truth giữ nguyên
- `parent_child`: `personAId = parent`, `personBId = child`.
- `partner`: pair canonical theo ID như Phase 6.2.
- Extended kinship chỉ được suy luận từ structural graph; không tạo edge ông/bà/anh/chị/em/cô/chú/cậu/dì/cousin.

### DG-3 — Query Engine chỉ đọc snapshot/index
- Query core là pure-domain/in-memory trên snapshot đã load.
- Không write Firestore, không tạo listener theo từng node, không mutate Person/Relationship.
- UI không query Firestore trực tiếp để suy luận kinship.

### DG-4 — Direction của relationshipBetween
`getRelationshipBetween(A, B)` luôn có nghĩa: **A là gì của B**.
Ví dụ `getRelationshipBetween(Gia Minh, Thanh Nhân)` → `con` nếu Gia Minh là child của Thanh Nhân.

### DG-5 — Subtype semantics
Proposal mặc định:
- `biological`: tham gia blood-line inference.
- `adoptive`: là quan hệ gia đình hợp lệ nhưng phải giữ lineage=`adoptive`; không giả thành biological.
- `step`: là social/step-parent edge; không được dùng để suy ra huyết thống.
- `unknown`: cho phép structural traversal nhưng label phải unknown-safe, không tuyên bố biological.
Các API query phải trả subtype/evidence để UI không mất ngữ nghĩa.

### DG-6 — Vietnamese label phải conservative
- Có gender rõ: `cha/mẹ`, `con trai/con gái`, `ông/bà`, `vợ/chồng`.
- Gender `other/unknown`: dùng label trung tính, không đoán giới tính.
- Thiếu dữ liệu để phân biệt `anh/chị/em`, `bác/chú/cô/cậu/dì` thì trả fallback mô tả trung tính thay vì đoán.

### DG-7 — Thứ tự anh/chị/em
Proposal ưu tiên dữ liệu theo thứ tự:
1. `birthOrder` khi cùng sibling set và dữ liệu hợp lệ;
2. full `birthDate`;
3. `birthYear`;
4. nếu vẫn không đủ → label trung tính `anh/chị/em`/`anh chị em` thay vì đoán.

### DG-8 — Bác/chú/cô/cậu/dì
Proposal chuẩn an toàn:
- Chỉ dùng nhãn chi tiết khi xác định được **nhánh cha/mẹ + gender + older/younger** đủ chắc chắn.
- Nếu thiếu older/younger, trả dạng trung tính như `anh/chị/em của cha` hoặc `anh/chị/em của mẹ`.
- Không hard-code biến thể vùng miền trong core nếu chưa có user rule riêng.

### DG-9 — Default bounded focus subgraph
Default đã chốt:
- `ancestorDepth = 2`
- `descendantDepth = 2`
- `includePartners = true`
- `includeSiblings = true`
- `includeCousins = false` (expand khi user yêu cầu)
- `maxPeople = 80` như safety cap mặc định; **giá trị này phải lấy từ constants/config, không hard-code trong thuật toán**; Full Tree/progressive expansion xử lý ngoài default focus.

### DG-10 — Không đổi permission/deploy trong 6.3A
Query Engine/Kinship Resolver là read-only nên không cần đổi permission semantics. Không deploy Rules/Functions chỉ vì 6.3A. Nếu về sau 6.3 phát sinh write/schema/permission requirement thì quay lại decision gate trước.

### DG-11 — Batch Relationship Composer
- Không có automatic kinship inference/suggestion nào được biến thành sự thật phả hệ. Quan hệ structural chỉ tồn tại khi Admin xác nhận tạo edge thật.
- Form `Nối quan hệ` hỗ trợ multi-select cho `parent_child`: chọn N người ở một phía, M người tham chiếu ở phía còn lại và expand thành **N×M canonical `parent_child` documents**.
- Ví dụ đã chốt: `Thanh Nhân + Kim Duyên + Thanh Phước Hội` là `con ruột` của `Văn Long + Nguyễn Thị Bích` => tạo 6 edge explicit, không tạo document nhóm 5 người.
- `partner` vẫn pairwise 1↔1; không Cartesian multi-select partner.
- Anh/chị/em, ông/bà, cô/chú/bác/cậu/dì, cousin vẫn là derived query result, không persist.
- Batch validation là all-or-nothing cho self-reference, cycle, invalid/conflicting subtype; exact duplicate là idempotent và được báo `đã có`.
- UI bắt buộc preview câu tiếng Việt liền mạch và số `requested/new/existing` trước commit.
- DG-11 không yêu cầu đổi schema hoặc Firestore Rules vì mỗi write vẫn là canonical relationship document cũ. `functions/` phải giữ action tương ứng để Cloud mode tương lai không lệch contract, nhưng chưa deploy.

**Status:** `CONFIRMED BY USER`.

Bổ sung được user xác nhận cùng DG-1 → DG-11:

- `maxPeople`/`maxPerson` là **runtime-configurable default**, source hiện tại lấy từ constants/config; không rải magic number 80 trong engine.
- Tương lai Family Bloom sẽ có trang **Admin Configuration** để quản lý các cấu hình như limit, màu sắc, theme và các setting khác.
- Phase 6.3A **không tạo persisted config schema ngay**. Khi bắt đầu lưu Admin Configuration vào Firestore/remote config, phải quay lại Data Safety / Decision Gate để user duyệt path/schema/permission/default/fallback/migration trước.


### Visual correctness contract — Family Graph

Trong Family Bloom, **hiển thị phả hệ là functional correctness**, không phải cosmetic polish:

- một đường nối nhìn như quan hệ gia đình chỉ được xuất hiện khi structural edge tương ứng thật sự tồn tại;
- partner/spouse pair là atomic visual unit, không cho sibling/relative chen giữa;
- child phải anchor dưới đúng parent hoặc couple có explicit parent edges; không kéo child sang family unit lân cận chỉ vì cùng generation;
- sibling cùng parent cluster được giữ gần nhau hơn các family cluster khác;
- dense generation phải mở rộng/reflow canvas, không giảm spacing đến mức overlap;
- connector routing và spacing phải ưu tiên tránh tạo cảm giác sai rằng một Person là spouse/sibling/child của nhánh khác;
- performance optimization không được đổi visual truth để đổi lấy compactness.

Device regression case bắt buộc giữ:

```text
Nguyễn Hoàng Anh --child-of--> Huỳnh Kim Duyên
Huỳnh Nguyễn Gia Khôi --child-of--> Huỳnh Thanh Nhân + Nguyễn Thị Kim Hồng
Huỳnh Nguyễn Gia Minh --child-of--> Huỳnh Thanh Nhân + Nguyễn Thị Kim Hồng
```

Hoàng Anh phải nằm về nhánh Kim Duyên và không được nhìn như sibling của Gia Khôi/Gia Minh.

## 25.1B. Configuration defaults foundation

Phase 6.3A bắt đầu centralize các default có khả năng thay đổi trong tương lai tại:

```text
src/constants/appConfiguration.ts
```

Hiện tại có:

```text
APP_CONFIG_DEFAULTS.familyGraph.query.defaultTraversalDepth = 2
APP_CONFIG_DEFAULTS.familyGraph.query.maxPeople = 80
APP_CONFIG_DEFAULTS.familyGraph.focusSubgraph.*
APP_CONFIG_DEFAULTS.familyGraph.relationshipComposer.maxVisibleChoices = 48
```

Query Engine nhận optional runtime override nhưng bản thân engine không biết config đến từ đâu. Điều này cho phép sau này:

```text
constants default
→ resolved Admin config (future)
→ service/provider
→ Query Engine
```

mà không rewrite thuật toán.

**Chưa được làm trong 6.3A:** tự tạo Firestore collection/document cho theme/admin settings. Persisted configuration là data contract mới và phải được user xác nhận trước.

## 25.2. 6.3A — Graph Query Core

Tạo query engine thuần domain, ưu tiên pure functions trên snapshot/index đã load.

API mục tiêu:

```ts
getPerson(personId)
getParents(personId)
getChildren(personId)
getPartners(personId)
getSiblings(personId)
getGrandparents(personId)
getGrandchildren(personId)
getAuntsAndUncles(personId)
getCousins(personId)
getAncestors(personId, depth?)
getDescendants(personId, depth?)
```

Yêu cầu:

- không query Firestore trực tiếp từ UI;
- tránh O(N²) lặp lại bằng indexes/maps;
- deterministic result ordering khi có thể;
- không duplicate Person;
- xử lý half-sibling/step/adoptive rõ ràng theo subtype;
- partner không tự động đồng nghĩa biological parent.

### 25.2.1. Implementation checkpoint hiện tại

Phase 6.3A build đầu tiên đã triển khai additive/read-only:

```text
src/constants/appConfiguration.ts
src/types/familyGraphQuery.ts
src/services/familyGraph/familyGraphQueryEngine.ts
```

`familyGraphService.createQueryEngine(snapshot, overrides?)` là facade read-side để tạo engine từ snapshot đã load.

Query Core hiện có:

```text
getPerson
getParentLinks / getParents
getChildLinks / getChildren
getPartnerLinks / getPartners
getSiblingViews / getSiblings
getGrandparents
getGrandchildren
getAuntsAndUncles
getCousins (first cousin structural inference)
getAncestorViews / getAncestors
getDescendantViews / getDescendants
getDiagnostics
```

Semantic an toàn:

- direct `getParents/getChildren` vẫn trả relationship `step` vì đó là structural edge thật;
- derived ancestry/sibling/cousin traversal **không dùng step edge** làm blood/family-line evidence;
- adoptive được giữ evidence `adoptive`;
- unknown không bị nâng cấp thành biological;
- sibling view trả shared-parent evidence, **không tự gắn full/half** nếu dữ liệu parent còn thiếu;
- traversal có `depth` + `maxPeople` cap từ runtime config;
- dangling/cross-family relationship không được engine sử dụng và xuất hiện trong diagnostics;
- không Firestore write, không listener mới, không schema/rules/function change.

Test pure Query Engine đã cover direct parent/partner, sibling evidence, step exclusion, grandparent, aunt/uncle, cousin, traversal cap và diagnostics.


---

## 25.3. 6.3B — relationshipBetween() — IMPLEMENTED

API thật:

```ts
queryEngine.getRelationshipBetween(personAId, personBId)
```

Direction DG-4 được khóa cứng:

```text
getRelationshipBetween(A, B) = “A là gì của B”
```

Kết quả **không chỉ là string**. `FamilyGraphRelationshipBetweenResult` trả structured evidence:

```text
sourcePerson / targetPerson
kind
structural-or-derived evidence kind
lineage
signed generationDistance
pathPersonIds
pathRelationshipIds
direct subtype
partner status
sharedParentIds
viaPersonId
```

Kinds hiện hỗ trợ:

```text
self
partner
parent / child
sibling
grandparent / grandchild
ancestor / descendant
aunt_uncle / niece_nephew
cousin
unrelated
```

Nguyên tắc an toàn:

- direct `step` vẫn resolve parent/child trực tiếp;
- `step` không đi vào ancestry/sibling/cousin inference;
- adoptive/unknown giữ evidence thật, không đổi thành biological;
- path/evidence là derived object, không persist.

---

## 25.4. 6.3C — Vietnamese Kinship Resolver — IMPLEMENTED

File:

```text
src/services/familyGraph/familyKinshipResolver.ts
```

Resolver nhận structured evidence từ Query Engine và tạo:

```ts
FamilyGraphVietnameseRelationship {
  label
  sentence
  detail
  lineage
  relativeAge
  path...
}
```

Ví dụ UI/semantic:

```text
“Huỳnh Nguyễn Gia Minh là con trai ruột của Huỳnh Thanh Nhân.”
```

Rules DG-5 → DG-8 được áp dụng:

- biological / adoptive / step / unknown không bị trộn nghĩa;
- sibling ưu tiên `birthOrder → full birthDate → birthYear`;
- cousin không dùng `birthOrder` giữa hai sibling group khác nhau;
- `bác/chú/cô/cậu/dì` chỉ dùng khi đủ branch + gender + older/younger evidence;
- thiếu evidence trả dạng an toàn như `anh/chị/em của cha`, `anh/chị/em của mẹ`;
- grandparent dùng `nội/ngoại` chỉ khi intermediate parent gender xác định;
- dữ liệu thiếu không bị đoán thành nhãn cụ thể.

---

## 25.5. 6.3D — Bounded Focus Subgraph — IMPLEMENTED AT DERIVED/RENDER LAYER

API thật:

```ts
queryEngine.getFocusSubgraph(focusPersonId, options?)
```

Options:

```text
ancestorDepth
descendantDepth
includePartners
includeSiblings
includeCousins
maxPeople
```

Config centralized:

```text
src/constants/appConfiguration.ts
```

Default 5-generation focus view:

```text
ancestors = 2
 descendants = 2
partners = true
siblings = true
cousins = false
maxPeople = FAMILY_GRAPH_MAX_PEOPLE_DEFAULT = 80
```

3-generation view dùng `1 ancestor + 1 descendant`, cùng safety cap.

**Rất quan trọng:** do DG-1 cấm tự ý đổi schema/query transport, Phase 6.3 hiện **không tuyên bố Firestore bounded read**. `useFamilyGraph` vẫn subscribe full Graph khi màn Graph mở; Query Engine tạo bounded **derived/render snapshot in-memory**. Việc đổi sang Firestore progressive/bounded transport cần Decision Gate riêng nếu đòi index/schema/query architecture mới.

UI thật đã dùng bounded subgraph cho `3 thế hệ` và `5 thế hệ`; `Toàn phả hệ` vẫn cho xem source snapshot đầy đủ. Khi cap bị chạm, UI có notice và không mutate dữ liệu.

---

## 25.6. 6.3E — Performance + UI Integration — IMPLEMENTED FOR THIS CHECKPOINT

Integration thật:

- Family Graph screen tạo một Query Engine bằng `useMemo` trên live snapshot;
- relation badge quanh focus ưu tiên Kinship Resolver thật thay prototype heuristic;
- Person Detail → tab `Quan hệ` hiển thị câu **“A là gì của Focus”** + evidence path khi có;
- user có thể bấm **Mở nhánh** để đổi Focus rồi chạm Person khác để test pair relationship;
- `3 thế hệ` = bounded 1+1 view;
- `5 thế hệ` = bounded 2+2 default;
- relation badge trong Full Tree vẫn chỉ resolve trong bounded 5-generation scope để tránh O(full-tree × traversal) ở 300/500+ Person;
- existing Graph edit, Timeline, Album, Event/Moments architecture không bị thay source-of-truth.

Synthetic benchmark script:

```text
scripts/benchmark-familyGraphPhase63.js
```

Dataset đã chạy:

```text
50
100
300
500 persons
```

Gate kiểm tra:

```text
engine indexing
bounded focus extraction
relationshipBetween
Vietnamese resolver
live render adapter
maxPeople cap
```

Benchmark là development signal, không phải SLA thiết bị production. Device runtime test của user vẫn là release gate cuối.

---

## 25.7. Phase 6.3 implementation file map

### New / expanded domain

```text
src/constants/appConfiguration.ts
src/types/familyGraphQuery.ts
src/services/familyGraph/familyGraphQueryEngine.ts
src/services/familyGraph/familyKinshipResolver.ts
src/services/familyGraph/familyGraphService.ts
```

### UI integration

```text
src/app/family-graph.tsx
src/app/family-graph-admin.tsx
src/components/familyGraph/FamilyGraphPrototype.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
src/components/familyGraph/familyGraphLiveAdapter.ts
src/components/ui/BloomConfirmDialog.tsx
src/services/familyGraph/familyGraphMutationService.ts   # reuse latest safe delete contracts
```

### Tests

```text
scripts/test-familyGraphQueryEngine.js
scripts/test-familyGraphLayout.js
scripts/benchmark-familyGraphPhase63.js
```

### Explicitly unchanged data boundary

```text
firestore.rules
firestore.cloud.rules
functions/
FamilyPerson persisted schema
FamilyRelationship persisted schema
personLinks
Moments/Event/Timeline/Album persisted schemas
```

No Firebase deploy is required for this Phase 6.3 build.

---


## 25.8. Device Refinement Contracts — CONFIRMED BY USER

Sau device test Phase 6.3, user xác nhận thêm các contract bắt buộc sau. Đây là **quy tắc nền**, không phải detail UI tạm thời:

### DR-1 — Xóa đường quan hệ ≠ xóa Person

```text
Delete Relationship / Xóa đường nối
→ chỉ xóa FamilyRelationship
→ giữ nguyên cả hai FamilyPerson
→ dùng khi nối sai để có thể tạo lại đúng
```

```text
Delete Person / Xóa người khỏi phả hệ
→ chỉ chạy khi user bấm hành động Xóa người rõ ràng
→ có confirmation Bloom-style riêng
→ có thể gỡ các structural edge trực tiếp bằng deletePersonCascade
→ linked account + Timeline/Album vẫn dùng safety protection hiện có
```

UI không dùng wording **“Xóa node”** cho thao tác xóa Person nữa vì dễ nhầm với sửa đường quan hệ.

### DR-2 — Partner/Spouse là atomic visual unit

Trong một generation row, mọi component liên kết bằng `partner` phải được layout như **một visual unit liên tục**. Anh/chị/em hoặc Person cùng thế hệ khác **không được chen vào giữa hai partner**.

Ví dụ đã phát hiện trên device:

```text
Nguyễn Thị Bích ↔ Huỳnh Văn Long
Nguyễn Thị Liên = chị ruột của Nguyễn Thị Bích
```

Nguyễn Thị Liên có thể nằm trước hoặc sau couple unit, nhưng không được nằm giữa Bích và Long.

Quy tắc này chỉ là render/layout; **không thay persisted relationship semantics**.

### DR-3 — Dense generation phải mở rộng canvas, không ép chồng node

Khi cùng thế hệ có nhiều Person:

```text
không giảm node spacing xuống dưới safe minimum
không chồng card lên nhau để cố nhét vào canvas 1020px cố định
logical canvas width phải tăng theo row requirement
pan/pinch chịu trách nhiệm navigation trên mobile
```

Full Tree dùng progressive mount theo batch cấu hình tập trung để giảm blocking render; không được âm thầm bỏ Person.

### DR-4 — Confirmation UI phải theo Bloom visual language

Family Graph editing không dùng native Android `Alert.alert` cho các destructive/correction flow chính.

Dùng Bloom-styled confirmation dialog cho:

```text
unlink account
xóa Person
xóa relationship/đường nối
xóa Timeline entry
```

Permission notice có thể dùng Bloom Toast khi không cần lựa chọn destructive.

**Status DR-1 → DR-4:** `CONFIRMED BY USER`.

## 25.9. Device Refinement Implementation — IMPLEMENTED, AWAITING RETEST

Runtime refinement sau device feedback:

- `familyGraphLiveAdapter` group partner-connected Persons thành atomic row units;
- dense row tính width theo actual visual units và mở rộng `canvasWidth` thay vì co step;
- live visual adapter trả `canvasWidth/canvasHeight`; Graph canvas dùng kích thước động trong center/pinch/pan calculations;
- Full Tree progressive mount dùng centralized defaults:

```text
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeInitialBatch = 96
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeBatchSize = 64
```

Các giá trị này là default có thể được future Admin Configuration override sau Decision Gate, không hard-code rải trong renderer.

Render optimization thêm:

```text
PersonNode = React.memo
GraphConnectors = React.memo
pan/pinch vẫn chạy Reanimated UI thread
bounded 3/5-generation behavior giữ nguyên
Full Tree mount theo batch sau InteractionManager
```

Correction UX:

- Person Detail → tab `Quan hệ` có khu **Sửa đường nối** và trash riêng cho từng relationship;
- xóa relationship giữ nguyên Person;
- action destructive riêng đổi tên rõ thành **Xóa người khỏi phả hệ**;
- Admin Graph screen cũng phân biệt **Xóa người** và **Xóa đường nối**;
- native confirmation dialog trong các Graph correction flow được thay bằng `BloomConfirmDialog`.

Data safety của refinement:

```text
NO schema change
NO migration
NO persisted field rename
NO Firestore Rules change
NO new Functions contract
NO auto data rewrite
```

Existing `deleteRelationship` + `deletePersonCascade` mutation contracts được reuse; không tạo mutation architecture mới.

Validation hiện tại:

```text
Phase 2 static check: PASS — 116 TS/TSX
TS/TSX transpile: PASS — 116 files, 0 syntax errors
relative imports: PASS — 375 imports, 0 missing
Query/Kinship/Focus tests: PASS
dense layout test: PASS
- spouse pair adjacent
- sibling not inserted between couple
- dense generation no node overlap
- dynamic canvas expands beyond 1020 when needed
500 Person adapter synthetic check: PASS
```

Device runtime test của user vẫn là gate cuối.


## 25.10. Person Detail + Unassigned Person + Album refinement — IMPLEMENTED, AWAITING DEVICE TEST

User device test xác nhận thêm ba UX/data-presentation contract quan trọng:

### A. Unassigned Person không được xuất hiện trên cây

- `FamilyPerson` chưa có bất kỳ structural edge explicit nào vẫn tồn tại nguyên vẹn trong Firestore/admin list.
- Person đó **không render trên genealogy canvas** vì vị trí fallback có thể tạo cảm giác sai rằng họ là sibling/spouse/child của một family unit khác.
- Khi toàn bộ Persons đều chưa có relationship, viewer hiển thị empty state `Chưa có nhánh nào được nối` thay vì rải các node rời trên canvas.
- Admin screen đánh dấu Person chưa nối bằng background riêng + badge `Chưa vào cây` để biết cần nối quan hệ.
- Đây chỉ là render/filter contract; **không xóa, migrate hay sửa persisted Person data**.

### B. Person Detail chuyển sang full-screen

- `FamilyGraphPersonSheet` vẫn là modal UX cùng component/service hiện tại nhưng render **full-screen** thay vì bottom sheet 91%.
- Header cố định có nút `X` để đóng và quay lại cây.
- Full-screen dành thêm diện tích cho Thông tin / Quan hệ / Dòng thời gian / Album.
- Không tạo route/data architecture mới chỉ để mở Person Detail.

### C. Person Album reliability fix

- Upload xong phải hiện ảnh/video ngay bằng optimistic album item trong Person Detail.
- Listener vẫn là source-of-truth; optimistic item được dedupe khi Firestore realtime trả asset thật.
- Album resolver chấp nhận media lifecycle `uploaded | attached` khi album reference đã tồn tại và asset đúng family/person/purpose.
- Bounded retry xử lý race khi local album-ref snapshot đến trước `media_assets` lifecycle update; không mở listener riêng cho từng media asset.
- Timeline/Album listener errors được tách riêng để một stream lỗi không làm stream còn lại dừng loading sai.
- Nếu album vẫn không đọc được, UI hiện error state thay vì im lặng render vùng trắng.

### Data safety

```text
NO schema change
NO Firestore Rules change
NO Functions change
NO migration/backfill
NO automatic relationship inference
NO persisted Person mutation chỉ để ẩn unassigned Person
```

### Device test cần làm

1. Tạo 2–3 Person chưa nối → viewer không được hiển thị họ; Admin list phải có badge `Chưa vào cây`.
2. Nối một Person vào relationship → node xuất hiện realtime trên tree.
3. Tap Person → detail chiếm full màn hình; `X` quay lại đúng tree/focus trước đó.
4. Upload 1 ảnh Person Album → ảnh xuất hiện ngay; đóng/mở detail → ảnh vẫn còn sau realtime resolve.
5. Upload nhiều ảnh/video → grid hiển thị, tap mở MediaViewer.

Validation artifact của refinement:

```text
Phase 2 static check: PASS — 117 TS/TSX
relative imports: PASS — 373 checked, 0 missing
Query/Kinship/Focus tests: PASS
DG-11 tests: PASS
Family Graph layout tests: PASS
- unassigned Person hidden from visual tree
- spouse adjacency
- dense generation no overlap
- 500 connected Person adapter PASS
50/100/300/500 synthetic benchmark: PASS
```

# 26. Phase 6.3 — non-goals

Không tự mở rộng sang các hạng mục này nếu chưa xong query/kinship core:

```text
member proposal workflow hoàn chỉnh
auto-merge duplicate Persons
AI family history generation
public genealogy sharing
cross-family genealogy merge
full migration sang Cloud Functions
full graph virtualization engine riêng
```

---

# 27. Roadmap sau Phase 6.3

Không khóa cứng số phase nếu implementation thực tế cần chia nhỏ, nhưng hướng dự kiến:

## Phase 6.4 — Large Tree / Progressive Interaction

Có thể gồm:

```text
progressive branch expansion
Full Tree scaling
viewport-aware rendering
large graph layout refinement
better union/remarriage visualization
performance hardening 500+
```

## Phase 6.5 — Deeper Integration / Person Experience

Có thể gồm:

```text
profile bridge refinement
Person ↔ Moments/Event integration có chủ đích
member/person UX
relationship-aware Person Detail
proposal workflow review
```

Trước khi chốt tên/phạm vi cuối cùng phải đối chiếu code thực tế sau Phase 6.3, không giữ roadmap cũ một cách máy móc nếu architecture đã thay đổi.

---

# 28. Quy trình test Phase 6.3 hiện tại

Phase 6.3 đã được implementation trên **BASECODE Phase 6.2 CLOSED**. Device test đề nghị:

1. Mở Family Graph với current user đã link Person.
2. Kiểm tra `3 thế hệ / 5 thế hệ / Toàn phả hệ`.
3. Tap một Person → `Quan hệ` → đọc câu quan hệ với Focus.
4. Bấm `Mở nhánh` trên Person A → tap Person B → kiểm tra `A/B` theo direction hiển thị.
5. Test cha/mẹ-con, anh/chị/em, ông/bà, cô/chú/bác/cậu/dì và cousin nếu graph đủ dữ liệu.
6. Re-test xóa đường quan hệ (hai Person phải còn), Xóa người riêng, Timeline, Album, Moment scroll, Event permission.
7. Không Publish Rules/Functions chỉ vì 6.3.

Source cần ưu tiên đọc khi debug:

```text
src/types/familyGraph.ts
src/utils/familyGraph.ts
src/services/familyGraph/**
src/hooks/useFamilyGraph*
src/components/familyGraph/**
src/app/family-graph.tsx
src/app/family-graph-admin.tsx
functions/familyGraphCore.js
functions/index.js
firestore.rules
firestore.cloud.rules
```


---

# 29. Definition of Done sơ bộ cho Phase 6.3

Phase 6.3 chỉ nên được đề nghị chốt khi tối thiểu:

```text
parents/children/partners/siblings query PASS
grandparents/grandchildren PASS
aunts/uncles/cousins baseline PASS
ancestors/descendants depth-bounded PASS
relationshipBetween() PASS các case chính
Vietnamese kinship label không đoán sai khi thiếu dữ liệu
half/step/adoptive cases có test
bounded focus subgraph hoạt động
partner pair luôn adjacent, không bị sibling chen giữa
dense generation không overlap và canvas tự mở rộng
Full Tree progressive mount không bỏ dữ liệu
xóa relationship giữ cả hai Person; Xóa người là action riêng
Bloom confirmation thay native destructive Alert trong Graph flow
50/100/300/500+ synthetic graph tests có kết quả
UI focus dùng query engine thật ở ít nhất một integration path
DG-11 batch parent-child N×M tạo đúng canonical edges, duplicate idempotent, conflict/cycle bị chặn
composer không mount toàn bộ hàng trăm Person cùng lúc; có search + bounded visible choices
visual regression Hoàng Anh/Kim Duyên vs Thanh Nhân–Kim Hồng PASS
không regression graph edit/moments/events/timeline/album
```

User runtime test vẫn là gate cuối trước khi nói **chốt Phase 6.3**.

---

# 30. Trạng thái cuối tài liệu

```text
PHASE 6.2: CLOSED
BASECODE: LOCKED TO CURRENT USER PROJECT
CURRENT PHASE: 6.3 — DG-11 + VISUAL TRUTH + PERSON DIRECTORY / RELATION PICKER / ALBUM REALTIME REFINEMENT IMPLEMENTED, AWAITING USER RETEST
PRIMARY GOAL: RETEST DG-11 + VISUAL TRUTH + ALBUM REALTIME + A-Z PERSON DIRECTORY + RELATION PICKER PERFORMANCE
RULES/FUNCTIONS DEPLOY: DEFERRED UNTIL FINAL DEPLOY PACKAGE
MASTER HANDOFF POLICY: FULL PROJECT PROMPT REQUIRED ON EVERY MAJOR BUILD
```


---

# 31. Phase 6.3 — Person Directory + Relationship Picker + Album Realtime Refinement

Thiết bị thực tế xác nhận thêm các vấn đề UX/performance ở màn **Xây phả hệ / Nối quan hệ / Person Album**. Bản refinement hiện tại chốt các rule runtime sau mà **không đổi persisted schema**:

## 31.1 Person directory

- Avatar 1 ký tự trong Family Graph admin/detail dùng **ký tự đầu của tên gọi (given name / token cuối)**, không dùng ký tự đầu của họ.
- Danh sách Person sắp xếp theo **tên gọi**, group theo chữ cái A/B/C… với section header rõ ràng.
- Mỗi Person hiển thị số **nhánh trực tiếp** (incident structural relationships) cạnh tên để Admin nhìn nhanh mức độ đã kết nối.
- Person chưa có relationship vẫn được giữ trong danh sách Admin với trạng thái `Chưa vào cây`; không render trên Family Tree chính.

## 31.2 Relationship Composer performance/UX

- Top-level `Nối quan hệ` luôn mở với hai phía **trống**, không tự chọn Person đầu tiên hay Person đang highlight trước đó.
- Chỉ action mở từ một Person cụ thể mới preselect Person đó.
- Danh sách chọn Person chuyển sang **SectionList virtualized** riêng, có search, chữ cái, avatar tên gọi và số nhánh.
- Composer chính chỉ render những Person đã chọn + nút mở picker; không mount hàng chục chip tên cùng lúc.
- Batch-stat dùng relationship index map thay vì `.find()` lặp trong N×M preview.
- Partner vẫn pairwise; parent-child vẫn DG-11 N×M canonical edges.

## 31.3 Person Album realtime

- Album vẫn giữ source-of-truth: `persons/{personId}/album/{mediaAssetId}` + `media_assets/{mediaAssetId}`.
- Không đổi schema/rules trong refinement này.
- `watchAlbum()` không còn `getDoc()` tuần tự cho từng album ref. Khi Person Detail mở, chỉ có 2 bounded realtime listeners: album refs + media lifecycle records của đúng Person; UI lấy intersection giữa hai nguồn.
- Cách này loại race `album ref đã tới nhưng media_assets chưa phản ánh attached`, đồng thời tự cập nhật khi asset chuyển `uploaded -> attached`.
- Listener chỉ sống khi Person Detail đang mở và unsubscribe khi đóng.

## 31.4 InteractionManager warning

- `InteractionManager.runAfterInteractions()` trong Family Graph progressive full-tree mount đã được bỏ vì React Native cảnh báo deprecated.
- Runtime dùng `requestIdleCallback` khi có, fallback `setTimeout(16ms)` nếu môi trường chưa hỗ trợ.
- Đây là targeted refactor, **không phải lý do để nâng toàn bộ dependencies lên latest**.

## 31.5 Dependency policy

Không chạy `npm update` / nâng toàn bộ package tùy ý giữa Phase 6.3. React Native packages cần bám đúng compatibility của Expo SDK hiện hành.

Validation workflow khi cần:

```text
npx expo install --check
npx expo-doctor
```

Chỉ dùng `npx expo install --fix` sau khi review diff và có regression test/native rebuild khi package native thay đổi.

## 31.6 Files runtime thay đổi trong refinement này

```text
src/app/family-graph-admin.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
src/components/familyGraph/FamilyGraphPrototype.tsx
src/services/familyGraph/familyPersonContentService.ts
src/utils/personName.ts                       NEW
```

Không thay đổi:

```text
firestore.rules
firestore.cloud.rules
functions/**
Firestore schema
DG-11 semantics
Auth/Root gating
activeFamilyId
```

## 31.7 Current gate

Phase 6.3 vẫn **OPEN**. User device test cần xác nhận:

```text
Person Album upload -> ảnh hiện ngay -> đóng/mở Detail -> ảnh vẫn hiện
Person list avatar dùng tên gọi, alphabetical sections đúng
Nối quan hệ top-level không preselect Person
Relationship picker mượt ở 20+ Person, chọn/bỏ chọn không lag rõ rệt
Số nhánh hiển thị đúng direct relationship count
CMD không còn InteractionManager deprecation warning từ FamilyGraphPrototype
```


---

## Phase 6.3 — Relationship Composer performance + Person Album rendering hotfix

Checkpoint này giữ nguyên toàn bộ data contracts đã chốt. Không đổi schema, Rules, Functions hoặc DG-11 semantics.

### Relationship Composer performance

Thiết bị thật cho thấy mở `Nối quan hệ` và chọn Person còn giật dù danh sách chỉ khoảng 20 người. Nguyên nhân chính trong UI cũ là state của composer (`mode`, subtype, partner status, selected ids) nằm ở `FamilyGraphAdminScreen`. Mỗi lần chọn/bỏ chọn một Person làm rerender toàn màn Admin phía sau modal, bao gồm directory Person và relationship list.

Hotfix mới:

- state chọn Person được cô lập bên trong `RelationshipModal`;
- parent Admin chỉ rerender lúc mở/đóng composer, không rerender sau mỗi tap;
- Person picker row dùng `React.memo`;
- toggle callback dùng functional state update để giữ reference ổn định;
- danh sách Person được sort/index search một lần theo snapshot thay vì sort lại mỗi lần mở picker;
- Android dùng modal fade nhẹ hơn thay vì slide cho composer;
- `SectionList` vẫn bounded/virtualized.

### Person Album

Hai vạch hồng quan sát trên thiết bị là media tile bị co chiều cao trong layout % + aspectRatio, trong khi dữ liệu album thực tế đã tồn tại.

Hotfix mới:

- album media tile dùng kích thước pixel tính từ `useWindowDimensions`, không phụ thuộc `% + aspectRatio`;
- grid có width 100% + `space-between`;
- `expo-image` dùng `StyleSheet.absoluteFillObject` và `recyclingKey`;
- media_assets listener thêm điều kiện `familyId == active family` cùng `entityId == personId`; Firestore Rules không phải filter nên global query chỉ theo entityId có thể bị từ chối dù document hợp lệ;
- Timeline và Album có error state độc lập trong `useFamilyPersonContent`, lỗi một listener không kéo loading/error của listener còn lại.

### Upgrade policy

Không chạy `npm update` hoặc nâng đồng loạt dependency chỉ để xử lý warning/performance. Family Bloom phải giữ package versions tương thích Expo SDK hiện hành. Chỉ nâng theo một phase dependency riêng sau khi `expo install --check` / `expo-doctor` và regression plan được duyệt.

---

## Phase 6.3 refinement — Admin performance + adaptive connector anchors

Device feedback with ~26 Person / ~40 structural relationships showed remaining jank when opening the DG-11 composer and opening the Person picker. This refinement keeps all persisted data contracts unchanged and focuses on render cost.

Runtime decisions now in code:

- `family-graph-admin.tsx` uses a virtualized `SectionList` for the main Person directory instead of mounting every Person card inside one large `ScrollView`.
- Relationship history is bounded to 10 rows by default and expands only on demand. This reduces the number of mounted background views while editing.
- Opening DG-11 no longer causes the entire Person directory to be rebuilt; expensive header/footer blocks use stable memoized inputs and handlers.
- Android relationship modal uses hardware acceleration and the heavy Person picker list is mounted two animation frames after the picker shell, reducing transition hitching without `InteractionManager`.
- Picker remains virtualized and bounded by small render batches.
- These changes are render-only. No Firestore schema, Rules, Functions, relationship semantics, DG-11 contract, identity, or persisted data changed.

Connector visual refinement:

- Partner connectors continue to attach side-to-side.
- A single-parent parent→child connector may now leave from the left/right body edge when the child is significantly offset horizontally.
- Vertically aligned children still use the bottom anchor.
- Child endpoint remains at the top edge so parent→child direction is still visually clear.
- This is render geometry only and never changes relationship truth.

Performance note:

Synthetic core/query/layout benchmarks are not equivalent to on-device React Native render cost. Development builds also carry Metro/dev overhead. Phase 6.3 remains open until device testing confirms the interaction is acceptable; release-mode verification should be done before concluding the remaining cost is structural.

---

## Phase 6.3 refinement — Full-screen Graph editors + focus-bounded listeners + album delivery fallback

Device testing with ~26 Person / ~40 structural relationships confirmed that modal-based editing still leaves too much Graph UI mounted/composited behind the interaction. User approved a navigation/lifecycle refinement without any persisted-data change.

### Full-screen editor architecture

`Xây phả hệ` is now a dedicated overview/directory screen. The two expensive edit flows are separate native-stack screens:

```text
/family-graph-admin                 # overview / Person directory / relationship review
/family-graph-person-editor         # full-screen create/edit Person
/family-graph-relationship-editor   # full-screen DG-11 relationship composer
```

Rules:

- Person create/edit is no longer opened as a React Native modal from the admin directory.
- DG-11 relationship composition is no longer opened as a React Native modal from the admin directory.
- The relationship Person picker is not another modal. It replaces the composer body inside the same full-screen route and uses a virtualized `SectionList`.
- Opening relationship composer from the top-level admin button starts with **zero selected people**. A Person is preselected only when the route is opened from that Person's explicit `Cha/Mẹ`, `Con`, or `Vợ/Chồng` action.
- Existing DG-11 semantics remain unchanged: parent-child multi-select expands to canonical N×M edges; partner remains 1↔1; no derived kinship is persisted.
- `/family-graph-admin` itself now uses normal screen presentation instead of modal presentation.

### Performance lifecycle rule

`useFamilyGraph(familyId, uid, enabled)` now accepts a third `enabled` argument. Hidden Family Graph screens disable their realtime snapshot/default-focus work while another full-screen graph route has focus.

The tree screen and admin overview use `useFocusEffect` to release graph listeners while blurred. This prevents the tree + admin + relationship editor from all processing the same Firestore snapshot at the same time during navigation.

This is a runtime/listener lifecycle refinement only. Firestore schema, Rules, Functions, Person identity, relationship identity, permissions and mutation semantics are unchanged.

### Full-screen Bloom UX

Person editor:

- Bloom hero surface, warm guidance and full-screen keyboard-safe form;
- avatar, full name, nickname, gender, life status, year/full date, birthplace and description;
- optional account link on create;
- save returns to Graph overview and existing realtime snapshot refreshes the directory;
- editing preserves existing relationships and linked account semantics.

Relationship editor:

- full-screen Bloom hero and clear 3-step visual hierarchy;
- relation type + subtype/status;
- separate selected Person cards with branch counts;
- A–Z virtualized Person picker with search and given-name initial avatars;
- preview sentence + requested/new/existing/conflict counts before commit;
- picker selection state is local to this route, so the admin directory does not rerender on each selection.

### Person Album rendering hotfix

Device showed correctly-sized Album tiles but only pink backgrounds. The Album preview now uses a delivery fallback chain:

- image: original `secureUrl` first, then stored thumbnail, then optional Cloudinary transformed thumbnail;
- video: stored thumbnail first, then generated Cloudinary frame candidates;
- `expo-image` advances to the next candidate on `onError`;
- if every candidate fails, the tile shows an explicit image/video fallback instead of a blank pink box;
- fullscreen media viewer continues to use the original `secureUrl`.

The original secure URL is deliberately preferred for images because some Cloudinary delivery configurations can reject dynamic transformation URLs even though the uploaded original is valid.

### Data Safety / Deploy status

No schema migration. No field rename. No collection/path change. No permission change. No Firestore Rules deploy. No Functions deploy. No native dependency added. Phase 6.3 remains OPEN pending real-device validation of editor smoothness and Album previews.

---

## Phase 6.3 refinement — DG-11 three-tier composer + reliable Person Album thumbnails

Device feedback approved returning the full-screen relationship editor to the clearer DG-11 composition order while preserving the performance benefits of separate full-screen routes.

### Relationship editor UX

The full-screen `/family-graph-relationship-editor` now uses this fixed hierarchy:

```text
1. Người được chọn
2. Loại quan hệ
3. Người tham chiếu
4. Preview + commit
```

Rules:

- Parent/child relationships support multi-select on both Person sides and preserve N×M canonical edge creation.
- Person picker rows use a square Bloom checkbox with a visible checkmark instead of radio-style circles, so multi-select is visually explicit.
- Existing selected Person cards still show given-name avatar + direct branch count.
- Partner/spouse remains pairwise 1↔1 per DG-11; changing to partner mode trims each side to at most one Person and the UI explains the pairwise constraint.
- No automatic kinship inference becomes genealogy truth.
- No Firestore schema, relationship document shape, deterministic ID rule, permission rule, or Functions contract changes.

### Person Album thumbnail fix

Real-device testing showed that full media could open successfully while grid thumbnails remained blank pink tiles. The grid preview now uses React Native's native `Image` renderer with explicit width/height instead of relying on an absolutely-positioned `expo-image` thumbnail in this screen.

Delivery fallback remains:

```text
image: secureUrl -> stored thumbnailUrl -> derived Cloudinary image thumbnail
video: stored thumbnailUrl -> derived Cloudinary frame candidates
```

Additional behavior:

- the tile keeps a visible image/video placeholder until the remote image reports `onLoad`;
- `onError` advances to the next candidate;
- if all candidates fail, an explicit media fallback remains visible;
- fullscreen media viewer is unchanged and continues to use the original secure URL.

### Validation

At this checkpoint:

- Phase 2 static TS/TSX transpile check: PASS (119 files)
- DG-11 Batch Relationship Composer tests: PASS
- Query/Kinship/Focus Subgraph tests: PASS
- dense layout test: PASS (500 Person synthetic adapter)
- Phase 6.3 synthetic benchmark 50/100/300/500 Person: PASS

Phase 6.3 remains OPEN pending on-device confirmation of the relationship composer UX and Album thumbnail rendering.

---

# Phase 6.3 — Visual Truth Connector Routing Refinement

**Status:** IMPLEMENTED · chờ user test thực tế · Phase 6.3 CHƯA đóng.

## Vấn đề thực tế

Trong cây đông nhánh, hai `parent_child` thuộc hai family group khác nhau có thể tình cờ có cùng `turnY` và chồng một đoạn line ngang. Dù dữ liệu quan hệ hoàn toàn đúng, hình học đó có thể khiến người xem hiểu nhầm hai Person là anh/chị/em cùng cha mẹ.

Ví dụ đã được user phát hiện: một đường cha → con của Nguyễn Vũ Quang → Nguyễn Vũ Minh chồng/nhập thị giác với connector thuộc nhánh Đinh Xuân Trường, tạo cảm giác sai rằng hai Person ở hàng dưới thuộc cùng sibling group.

## Visual Truth rule mới

Connector không còn được quyết định chỉ từ tọa độ. Thứ tự render bắt buộc:

```text
explicit relationships
→ exact parent signature của từng child
→ family route groups
→ collision-aware connector lanes
→ side/bottom ports
→ SVG/View path geometry
```

Quy tắc:
- `parentSignature` của child = tập `parent_child.personAId` explicit, canonical sort.
- Chỉ child có cùng exact parent signature mới được phép dùng cùng family routing lane một cách có chủ đích.
- Family groups khác nhau trong cùng parent→child corridor được interval-coloring để tránh dùng chung lane khi horizontal spans overlap.
- Single-parent route lệch ngang lớn hoặc phải tách lane do collision được phép xuất phát từ cạnh trái/phải thân node thay vì luôn từ đáy.
- Couple/partner union vẫn giữ semantic connector riêng; lane offset của child được lấy từ exact parent signature để không nhập nhầm với family group khác.
- Đây hoàn toàn là render-only; không persist derived kinship, không đổi schema, Rules, Functions hay DG-11.

## Files chính

```text
src/components/familyGraph/familyGraphConnectorRouting.ts   NEW
src/components/familyGraph/FamilyGraphPrototype.tsx         MODIFY
scripts/test-familyGraphLayout.js                            MODIFY
```

## Regression gate

Bổ sung test synthetic đảm bảo:
- hai family route khác nhau có horizontal span overlap không nhận cùng connector lane;
- lateral single-parent route được đánh dấu side-anchor;
- dense layout vẫn pass tới 500 Person;
- Query/Kinship/Focus và DG-11 không regression.

Phase 6.3 chỉ đóng sau khi user test lại visual tree thật và xác nhận không còn connector gây quan hệ giả.

---

# PHASE 6.3 — FINAL CONNECTOR POLISH & CLOSED CHECKPOINT

**Trạng thái authoritative:** `PHASE 6.3 CLOSED`  
**Thời điểm chốt:** sau refinement connector cuối cùng theo feedback thiết bị thực tế của user.  
**Lưu ý:** trạng thái CLOSED ở mục này **ghi đè** mọi dòng "Phase 6.3 OPEN / chờ test" ở các phần lịch sử phía trên.

## Vấn đề cuối cùng được xử lý

Sau Visual Truth Connector Routing, thiết bị thật cho thấy hai điểm hình học vẫn chưa đạt chuẩn Bloom/Genealogy:

1. Connector dùng side port còn đi dọc theo thân node rồi mới rẽ ngang, tạo cảm giác gấp khúc và có thể bị đọc như một family trunk phụ.
2. Quan hệ cha → con gần thẳng phía dưới đôi khi vẫn bị route thành nhiều đoạn chỉ vì lane/collision logic, trong khi một đường dọc duy nhất rõ và đẹp hơn.

## Quy tắc connector cuối cùng đã chốt

### Direct vertical first

Với single-parent link, nếu child vẫn nằm trong vùng chiếu dọc hợp lý dưới thân parent thì ưu tiên:

```text
parent
  │
  │
child
```

- một connector dọc duy nhất;
- không tạo elbow chỉ để bám parent center;
- bottom anchor có thể theo `child.x` để child hơi lệch vẫn giữ một line sạch;
- direct vertical có precedence cao hơn side-routing/lane separation vì bản thân nó không tạo sibling trunk giả.

### Side port = horizontal-first

Nếu child lệch ngang đủ xa và cần side port:

```text
[parent] ─────────┐
                  │
                  │
                child
```

- line phải rời thân node theo phương ngang ngay lập tức;
- không đi dọc cạnh node rồi mới rẽ;
- chỉ một corner chính trước vertical drop;
- lane offset chỉ dịch vị trí side port theo trục Y trong giới hạn an toàn, không tạo đoạn gấp quanh node.

### Visual Truth invariant

Thứ tự vẫn giữ:

```text
explicit graph truth
→ exact parent signature
→ family group / collision lane
→ direct-bottom hoặc side port
→ final geometry
```

Không được để geometry tạo cảm giác quan hệ không tồn tại trong graph.

## Data / permission / deploy

Refinement cuối Phase 6.3 là render-only:

- không đổi Firestore schema;
- không migration;
- không đổi `FamilyPerson` / `FamilyRelationship` contract;
- không đổi DG-11 N×M semantics;
- không đổi deterministic relationship IDs;
- không đổi Rules;
- không đổi Functions;
- không cần deploy backend;
- không thêm native dependency.

## Regression gate tại checkpoint CLOSED

Đã chạy trên source merged hiện tại sau toàn bộ patch Phase 6.3:

```text
Family Graph dense layout + connector routing: PASS
DG-11 Batch Relationship Composer: PASS
Family Graph Query + Kinship + Focus Subgraph: PASS
Synthetic benchmark 50/100/300/500 Person: PASS
Phase 2 static TS/TSX transpile check: PASS (121 files)
```

Test connector bổ sung bảo đảm:

- overlapping unrelated family groups không dùng cùng lane;
- far lateral single-parent route có thể dùng side anchor;
- near-under single-parent child được ưu tiên direct vertical;
- direct vertical không đồng thời bị đánh dấu side anchor.

## BASECODE cho phase kế tiếp

Từ checkpoint này, BASECODE tiếp theo phải là:

```text
Phase 6.3 CLOSED
+ full-screen Person editor
+ full-screen DG-11 relationship editor
+ Person directory / unassigned handling
+ Person Detail full-screen
+ Person Timeline + Album integration
+ Query/Kinship/Focus Engine
+ Visual Truth dense layout
+ final connector routing: direct-bottom + horizontal-first side ports
```

Không quay lại connector routing cũ nếu không có regression được chứng minh rõ ràng.

**Phase 6.3 tạm REOPENED cho final visual acceptance của connector center-port. File CLOSED trước đó là checkpoint lịch sử và chưa phải authority cuối sau regression trên thiết bị này.**


---

# PHASE 6.3 — FINAL CENTER-PORT CONNECTOR INVARIANT (2026-09-24)

## Lý do reopen

Device test sau checkpoint CLOSED trước phát hiện một regression visual-truth:

- một parent-child edge có thể bị đánh dấu `direct` chỉ vì child còn nằm trong bề rộng thân parent;
- implementation direct cũ lấy `child center X` làm cả `startX`, nên đầu line có thể xuất hiện lệch khỏi trung tâm parent;
- routing plan còn dùng `NODE_CARD_WIDTH = 112` để tính center trong khi `person.x` là origin của node slot `FAMILY_GRAPH_CANVAS.nodeWidth = 128`, tạo sai lệch center 8px trong routing calculations.

## Invariant mới — bắt buộc cho mọi connector

Mỗi node chỉ có 4 connector port hợp lệ:

```text
               TOP_CENTER
                   │
LEFT_CENTER ─── [ NODE ] ─── RIGHT_CENTER
                   │
              BOTTOM_CENTER
```

Quy tắc:

1. Anchor của line **không bao giờ** được dịch khỏi midpoint của cạnh node bởi lane offset, collision avoidance hay compact layout.
2. Parent-child gần thẳng trục dùng một line thẳng duy nhất từ `BOTTOM_CENTER(parent)` → `TOP_CENTER(child)`.
3. Parent-child lệch ngang dùng `LEFT_CENTER/RIGHT_CENTER(parent)` → corridor → `TOP_CENTER(child)`.
4. Side route phải rời node theo phương ngang ngay từ midpoint cạnh; không chạy dọc cạnh node trước khi rẽ.
5. Lane offset chỉ được tác động phần corridor ở không gian trống; không được thay đổi port.
6. Partner line dùng `RIGHT_CENTER(leftPartner)` ↔ `LEFT_CENTER(rightPartner)`; shared-child branch bắt đầu từ semantic union center.
7. Routing center phải tính theo **node slot width 128**, còn collision/tolerance theo **visible card width 112**. Không được trộn hai hệ tọa độ.

## Direct-vs-side classification

`direct` chỉ khi center-axis thật sự gần nhau, tolerance hiện tại:

```text
max(8px, NODE_CARD_WIDTH * 0.18)
```

Không còn dùng điều kiện “child vẫn nằm dưới phần thân parent” như trước, vì điều đó có thể tạo stem lệch center và gây hiểu nhầm.

## Data safety

Refinement này chỉ thay render geometry + regression tests:

- không đổi Firestore schema;
- không migration;
- không đổi FamilyPerson/FamilyRelationship;
- không đổi DG-11;
- không đổi Rules/Functions;
- không thêm native dependency.

## Status

```text
PHASE 6.3 = REOPENED FOR FINAL DEVICE VISUAL ACCEPTANCE
```

Khi user xác nhận connector trên thiết bị đã đúng theo center-port invariant, tạo lại `FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_PHASE_6_3_CLOSED.md` và chốt Phase 6.3 từ checkpoint này.

---

# PHASE 6.3 — SPATIAL GRID + SEMANTIC PORT OCCUPANCY + COLLISION-AWARE ROUTING (2026-09-24)

## Supersedes final center-port-only routing

Device test chứng minh center-port invariant là cần nhưng chưa đủ: case một parent có nhiều family-group khác nhau vẫn có thể bị nhập/chồng bottom trunk và gây hiểu nhầm genealogy.

Authority mới cho connector routing:

```text
explicit relationships
→ exact parentSignature/familyKey
→ fixed edge-center ports
→ semantic port occupancy
→ spatial-grid obstacle index
→ collision-aware candidate scoring
→ final polyline
```

### Quy tắc bắt buộc

- Anchor chỉ ở TOP/BOTTOM/LEFT/RIGHT center của visible node card.
- Bottom port của một parent không được share giữa hai family-group khác nhau.
- Same exact parent set mới được phép share trunk/segment có chủ đích.
- Nếu bottom đã thuộc family-group khác, thử left/right side-center.
- Side route phải rời node theo phương ngang trước khi đổi hướng.
- Trước khi chọn side, route phải kiểm tra spatial grid để tránh node và line đã tồn tại.
- Partner-facing side port được reserve cho partner connector.
- Renderer không còn tự quyết định route từ geometry; route được planner tính trước.

### Module mới

```text
src/components/familyGraph/familyGraphSpatialGrid.ts
```

Đây là spatial hash/index nền tảng cho connector routing. Nó không thay đổi node layout và không persist dữ liệu.

### Performance / lifecycle

Routing plan được memoize từ `people + connections + canvasWidth`; pan/zoom gesture không làm rebuild route nếu graph/layout không đổi.

Synthetic regression hiện bao gồm 440 Person / 418 parent-child route và spatial routing hoàn tất khoảng 52ms trong container test run.

### Data safety

Không đổi schema, migration, Rules, Functions, DG-11 hoặc native dependency.

### Status

```text
PHASE 6.3 = REOPENED · PENDING DEVICE VISUAL ACCEPTANCE
```

Chỉ tạo checkpoint CLOSED mới sau khi user test các case Quang/Minh + Anh/Trung + couple/shared-child và xác nhận visual truth đạt.

---

# CHECKPOINT — PHASE 6.3 CLOSED BY USER (2026-09-24)

User đã chốt Phase 6.3 và yêu cầu xem code hiện tại sau **Spatial Grid + semantic port occupancy + collision-aware routing** là BASECODE mới.

```text
PHASE 6.3: CLOSED
BASECODE: CURRENT USER PROJECT + PHASE 6.3 SPATIAL GRID SEMANTIC ROUTING
KNOWN DEFERRED: một số connector edge-case hình học còn có thể cần polish sau
DATA CONTRACT: unchanged
RULES/FUNCTIONS DEPLOY: deferred
```

Việc chốt Phase 6.3 không có nghĩa mọi connector edge-case đã hoàn hảo. Các lỗi visual còn lại được đưa vào backlog và chỉ được sửa theo nguyên tắc Graph Truth; không được thay đổi persisted relationship semantics để dễ vẽ.


---

# PHASE 6.4 — LARGE TREE / PROGRESSIVE INTERACTION — TEST BUILD (2026-09-24)

## Mục tiêu

Phase 6.4 gom các thay đổi có liên quan để user test trong một lần:

```text
viewport-aware rendering
progressive Full Tree mount theo khoảng cách graph từ focus
spatial-grid viewport query
connector render culling
large-tree performance hardening
generation spacing ~2x
connector spatial-grid cell recalculation
```

## 6.4A — Viewport-aware rendering

- Toàn bộ graph snapshot/layout vẫn là source of truth trong memory.
- React chỉ mount Person node nằm trong viewport + overscan.
- Một `FamilyGraphSpatialGrid` riêng cho viewport dùng cell 256px để query node gần camera.
- Camera chạy trên UI thread; JS chỉ nhận coarse update khi vượt cell camera 128px hoặc đổi zoom bucket đáng kể.
- Focus/selected/detail Person luôn được pin để không biến mất trong transition.
- Connector routing plan vẫn memoized từ mounted graph; renderer chỉ vẽ union/single-parent connector có geometry giao viewport + overscan.

## 6.4B — Progressive Full Tree

- Full Tree không còn phụ thuộc thứ tự Firestore/source array.
- `buildProgressiveFamilyGraphOrder()` BFS trên structural graph, ưu tiên Person gần focus trước.
- Initial/batch mount giữ config tập trung trong `APP_CONFIG_DEFAULTS.familyGraph.render`.
- Có action `Mở thêm` để user chủ động tăng batch; idle scheduling vẫn mở tiếp khi app rảnh.
- Search tới Person ngoài bounded 3/5 generation scope sẽ chuyển focus để Person thật sự xuất hiện thay vì center vào node đang bị ẩn.

## 6.4C — Generation spacing + grid recalculation

Old live generation pitch xấp xỉ 146px. Phase 6.4 dùng:

```text
generationTop = 24
generationStep = 216
nodeHeight = 124
canvasBottomPadding = 120
```

Như vậy khoảng cách tâm giữa hai thế hệ gần gấp 2 baseline cũ, tạo corridor đủ rộng cho connector routing.

Spatial grid:

```text
connectorGridCellSize = 128
viewportGridCellSize = 256
viewportCameraCellSize = 128
viewportOverscanScreens = 0.85
```

Đây chỉ là render/runtime config; không persist Firestore.

## 6.4D — Performance characteristics

Synthetic Phase 6.4 test với 500 Person:

- progressive order bắt đầu từ focus;
- 120 viewport queries dùng spatial hash;
- trung bình ~65 node nằm trong viewport+overscan, max ~110 ở fixture synthetic;
- query loop vài ms trong container test;
- existing Query/Kinship/DG-11/layout regression vẫn PASS.

Con số synthetic không thay cho device profiling. User runtime test vẫn là gate chính.

## 6.4E — Data safety

Không đổi:

```text
FamilyPerson schema
FamilyRelationship schema
parent_child / partner semantics
DG-11
Firestore paths
Rules
Functions
media_assets
Auth/Profile/Family root state machine
```

Không migration, không deploy Firebase, không thêm native dependency.

## Device test ưu tiên

1. 3 thế hệ / 5 thế hệ / Toàn phả hệ.
2. Pan ngang/dọc dài và pinch khi cây có 26+ Person / 40+ relationship.
3. Full Tree: quan sát `Mở thêm` và progressive branch order.
4. Search một Person xa focus.
5. Kiểm tra generation spacing mới có đủ thoáng nhưng không quá rời rạc.
6. Re-test connector Quang/Minh, Anh/Trung, couple/shared-child vì spacing/grid mới có thể thay geometry.
7. Test 100+ synthetic/device data trước khi CLOSED Phase 6.4.

## Status

```text
PHASE 6.3: CLOSED
BASECODE: PHASE 6.3 SPATIAL GRID SEMANTIC ROUTING
PHASE 6.4: IMPLEMENTED / AWAITING DEVICE TEST
RULES/FUNCTIONS: NO DEPLOY REQUIRED
```



---

# 36. PHASE 6.4 VISUAL-COMPAT HOTFIX — DEVICE FEEDBACK

**Status:** implemented, awaiting device retest.

Device test showed that the first Phase 6.4 spacing/culling pass regressed the Phase 6.3 visual language: generation corridors became too large, planned collision routes rendered as hard 90-degree joints, and viewport culling could leave a spouse connector/heart visible while its partner card was unmounted. This made partner semantics hard to read and created the impression of chaotic crossing lines.

This hotfix keeps the Phase 6.4 performance architecture (progressive ordering, viewport-aware mount, spatial query, coarse camera updates) but restores visual invariants:

```text
Generation pitch: 216px (wider than 6.3, smaller than the rejected 288px pass)
Connector routing grid: 128px
Collision-router waypoints remain authoritative
Rendered elbows are rounded using Bloom quarter-corners
Partner components are atomic for viewport mounting
Progressive Full Tree batch also expands partner components atomically
No partner line/heart is rendered unless both partner cards are mounted
Shared-child union branches are rendered only for mounted children
Single-parent connectors are rendered only when both endpoint cards are mounted
```

No Firestore schema, Rules, Functions, DG-11 semantics, kinship inference, or persisted graph data changes.

**Phase 6.4 remains OPEN / AWAITING DEVICE TEST.**

---

# 37. PHASE 6.4 FOCUS CONNECTOR + PERSON RELATION ORDER REFINEMENT

**Status:** implemented, awaiting device retest.

Device feedback in focus mode showed a connector could look alternately darker/lighter where an active route and a faded route shared the same geometric segment. The visual cause was render ordering: focused and faded connector components could paint over one another in different order. This refinement adds a two-pass connector presentation layer without changing routing truth:

```text
pass 1: paint all faded/inactive connector geometry
pass 2: paint all focused/active connector geometry on top
```

Union/shared-child connectors are split by active/inactive child path for rendering so a faded branch cannot cover a focused shared segment. The same rule is applied across union and single-parent connectors.

Focus emphasis is also increased by exactly 1 display unit for parent-child line thickness:

```text
normal active line: 1.7
focused active line: 2.7
faded line: 1.05
```

Partner dashed connectors follow the same focus emphasis principle while keeping the Bloom heart marker.

Person Detail > Quan hệ now uses the stable display order:

```text
1. Cha / Mẹ / Cha-Mẹ
2. Vợ / Chồng
3. Anh / Chị / Em
4. Con cái
5. Other relationship labels
```

The edit/delete direct-relationship list follows the same applicable order. This is presentation-only; no relationship is reclassified or persisted differently.

No Firestore schema, Rules, Functions, DG-11 semantics, Query/Kinship inference, viewport architecture, spatial grid, or persisted data changes.

**Phase 6.4 remains OPEN / AWAITING DEVICE TEST.**


---

# 38. CHECKPOINT AUTHORITY — PHASE 6.4 CLOSED BY USER (2026-09-24)

Phần này là **authority cuối cùng** cho trạng thái Phase 6.4 và supersede các dòng `OPEN / AWAITING DEVICE TEST` nằm trong lịch sử build ở các section trước.

User đã xác nhận chốt Phase 6.4 và lấy source hiện tại làm basecode mới.

```text
PHASE 6.4: CLOSED
BASECODE: CURRENT PROJECT AFTER PHASE 6.4 FOCUS CONNECTOR + RELATION ORDER PATCH
NEXT PHASE: 6.5 — PERSON EXPERIENCE & FAMILY INTEGRATION
```

## 38.1. Nội dung đã khóa trong basecode Phase 6.4

```text
Phase 6.3 Graph Query + Vietnamese Kinship + DG-11
Spatial Grid semantic/collision-aware connector routing
Viewport-aware node/connector rendering
Progressive Full Tree expansion
Partner pair viewport atomicity
Generation/grid visual-compat tuning
Bloom rounded connector rendering
Focus connector two-pass render
Focused connector +1 display-unit thickness
Person Detail relationship order: Cha/Mẹ → Vợ/Chồng → Anh/Chị/Em → Con
Full-screen Person/Relationship editors
Person Timeline + Person Album baseline
```

## 38.2. Known deferred polish

Các edge-case connector nhỏ còn sót được chuyển backlog. Không được đổi persisted relationship truth chỉ để sửa hình vẽ.

User đồng ý ở phase sau bỏ `+ / −` khỏi canvas vì pinch-to-zoom đã đủ, chỉ giữ nút recenter về Person focus.

## 38.3. Data/deploy state tại lúc CLOSED

Phase 6.4 không đổi Firestore schema, relationship semantics, Rules hoặc Functions. Không migration dữ liệu.

```text
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
Current runtime graph mutation = Direct Firestore + Rules
Functions source vẫn được giữ để có thể chuyển Cloud mode sau này
```

## 38.4. Roadmap kế tiếp đã thảo luận

Phase 6.5 chuyển trọng tâm từ tree mechanics sang Person Experience / cross-domain integration:

```text
Person ↔ Member/Profile bridge
Person ↔ Moments
Person ↔ Events
Person Detail integration
Timeline contribution ownership/moderation
Canvas control cleanup
Structural proposal workflow để phase sau nếu chưa qua Decision Gate
```

**END OF PHASE 6.4 CLOSED CHECKPOINT.**


---

# 39. PHASE 6.5 — PERSON EXPERIENCE & FAMILY INTEGRATION — IMPLEMENTED / AWAITING DEVICE TEST

## 39.1. Decision Gate 6.5 — CONFIRMED BY USER

User đã xác nhận toàn bộ contract sau trước khi code. Đây là authority cho Phase 6.5:

```text
DG-6.5-1  Mọi family member được tạo Timeline entry cho mọi Person trong cùng family.
DG-6.5-2  Creator được sửa/xóa entry mình tạo.
DG-6.5-3  Admin/Owner được xóa entry người khác khi xác minh sai, nhưng KHÔNG được sửa thay.
DG-6.5-4  Timeline entry hiện ngay, không cần admin approve trước.
DG-6.5-5  Timeline giữ schema hiện tại; createdByUid là ownership/contributor identity.
DG-6.5-6  Moment thêm personIds: string[].
DG-6.5-7  Event thêm personIds: string[].
DG-6.5-8  Moments/Events giữ nguyên creator ownership + moderation semantics hiện có.
DG-6.5-9  Person Detail tích hợp Relations + Timeline + related Events + related Moments + Album.
DG-6.5-10 Profile ↔ Person chỉ bridge/fallback; profile update KHÔNG auto-overwrite genealogy Person.
DG-6.5-11 Canvas bỏ +/−; giữ recenter/focus control.
DG-6.5-12 Structural Person/Relationship proposal workflow để phase sau.
DG-6.5-13 Profile của current user hiển thị Family ID + nút copy để gửi người thân xin vào family.
```

## 39.2. Timeline contribution permissions

Persisted path không đổi:

```text
families/{familyId}/persons/{personId}/timeline/{entryId}
```

Schema không đổi và tiếp tục có:

```text
id
familyId
personId
date
title
description
createdByUid
createdAt
updatedAt
```

Permission semantics mới:

| Action | Creator member | Other member | Admin/Owner |
|---|---:|---:|---:|
| Read | Có | Có | Có |
| Create new entry | Có | Có | Có |
| Edit own entry | Có | Không | Chỉ nếu chính admin là creator |
| Delete own entry | Có | Không | Có nếu chính admin là creator |
| Delete someone else's entry | Không | Không | Có — moderation delete khi xác minh sai |
| Approval before visible | Không | Không | Không |

Admin không được impersonate contributor bằng cách sửa nội dung của người khác.

Direct Firestore Rules đã được cập nhật theo contract này. Cloud Functions source cũng đã sync với `createTimelineEntry / updateTimelineEntry / deleteTimelineEntry`, nhưng Cloud mode vẫn chưa bật.

## 39.3. Person ↔ Moments contract

Moment document bổ sung persisted field:

```ts
personIds: string[]
```

- Một Moment có thể link nhiều Person.
- New writes luôn normalize/dedupe và validate Person thuộc cùng family.
- Max 24 Person references cho một Moment ở implementation hiện tại.
- Legacy Moment thiếu `personIds` được normalize thành `[]`; **không migration/backfill bắt buộc**.
- Person Detail > `Kỷ niệm` dùng bounded query `array-contains personId`.
- Từ Moment có chips Person; tap chip mở Family Graph với Person đó làm focus/detail.
- Từ Person Detail có action tạo Moment mới đã preselect Person.
- Moment ownership/moderation cũ không đổi: creator sửa/xóa own content; admin chỉ hide/unhide người khác.

## 39.4. Person ↔ Events contract

Event document bổ sung persisted field:

```ts
personIds: string[]
```

- Event có thể link nhiều Person.
- Sinh nhật/ngày giỗ thường link một Person; ngày cưới có thể link hai Person; family event có thể link nhiều người.
- New create/update validate Person thuộc cùng family.
- Max 24 Person references/event ở implementation hiện tại.
- Legacy Event thiếu `personIds` normalize thành `[]`; không migration bắt buộc.
- Event detail hiển thị Person chips; tap mở graph focus/detail.
- Person Detail Timeline merge linked Events vào timeline experience; Event vẫn là source-of-truth riêng, không copy thành Timeline entry.
- Person Detail có shortcut tạo Event đã preselect Person.
- Event creator ownership + Admin moderation semantics giữ nguyên.

## 39.5. Person Detail experience

Tabs hiện hành:

```text
Thông tin
Quan hệ
Dòng thời gian
Kỷ niệm
Album
```

### Thông tin

Nếu Person có `linkedUid`:
- Person avatar vẫn là source ưu tiên;
- member/profile avatar chỉ là fallback;
- hiển thị bridge card sang member profile;
- không auto ghi profile fields vào FamilyPerson.

### Dòng thời gian

Timeline UI tổng hợp read-only presentation từ nhiều source:

```text
FamilyPerson birth/death derived milestones
+ persisted manual Timeline entries
+ linked Events
```

Không merge/persist các source này thành một collection chung.

Manual Timeline entry hiển thị contributor. Creator có Edit/Delete. Admin/Owner chỉ có Delete cho entry của người khác.

### Kỷ niệm

Hiển thị bounded related Moments. Có shortcut tạo Moment với Person preselected. Tap Moment đưa người dùng về Kỷ niệm và cố scroll tới Moment trong bounded/paginated feed.

### Album

Giữ media_assets + Cloudinary architecture hiện tại; không đổi permission trong Phase 6.5.

## 39.6. Canvas control cleanup

Đã bỏ:

```text
+ zoom
− zoom
```

Giữ:

```text
◎ recenter về Person focus
```

Pinch-to-zoom + pan vẫn là primary gesture.

## 39.7. Profile Family ID / invite UX

Current user Profile có section Bloom-style:

```text
Tên family hiện tại
Family ID kỹ thuật
[Sao chép]
```

Copy dùng `expo-clipboard`. Family ID chỉ giúp người nhận tìm đúng family; join flow hiện tại vẫn yêu cầu gửi request và admin duyệt.

Không thay đổi familyId, joinRequest schema hoặc membership semantics.

## 39.8. New/updated runtime modules

Các addition chính:

```text
src/components/familyGraph/FamilyPersonMultiPicker.tsx
src/hooks/useFamilyPersonDirectory.ts
src/hooks/useFamilyPersonIntegrations.ts
```

Cross-domain changes nằm trong existing service ownership:

```text
momentsService
 eventService
 familyPersonContentService
 familyGraphService
```

Screen không mở Firestore architecture song song ngoài các hook/service đã định nghĩa.

## 39.9. Firestore / Functions / compatibility impact

### Approved persisted additive fields

```text
families/{familyId}/moments/{postId}.personIds
families/{familyId}/events/{eventId}.personIds
```

Không rename/xóa field cũ. Không migration bắt buộc.

### Direct Rules

`firestore.rules` đã thay đổi để:
- Timeline member create;
- Timeline creator-only update;
- Timeline creator OR graph admin delete;
- Moment/Event personIds optional validation + creator update allowance.

**Để device test member Timeline permissions thật, project Firebase phải deploy rules mới.** Nếu chưa deploy, app admin cũ có thể vẫn hoạt động nhưng member thường sẽ bị rules cũ từ chối.

### Cloud mode

`firestore.cloud.rules` giữ Family Graph writes deny client, đồng thời sync Moment/Event personIds contract. `functions/index.js` đã sync Timeline member ownership/moderation semantics.

```text
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
Functions deploy: NOT REQUIRED for current Direct-mode test
```

## 39.10. Dependency impact

Profile copy dùng:

```text
expo-clipboard
```

`package.json` đã thêm dependency. Khi merge patch vào local project, chạy `npx expo install expo-clipboard`. Với development build native hiện tại, rebuild Android dev client nếu runtime báo native module chưa có.

Không cần `prebuild --clean` chỉ vì Phase 6.5.

## 39.11. Regression/device test matrix Phase 6.5

Test ít nhất:

```text
A. Canvas
- +/− biến mất
- recenter focus còn hoạt động
- pinch/pan/focus/Full Tree không regression

B. Timeline ownership
- member A thêm entry vào Person bất kỳ → hiện ngay
- member A sửa own entry → PASS
- member B không thấy Edit/Delete entry của A
- admin không thấy Edit entry A nhưng thấy moderation Delete
- admin delete entry A → entry biến mất

C. Moments integration
- tạo Moment từ Person Detail → Person preselected
- tạo Moment từ Moments tab và chọn nhiều Person
- Person Detail > Kỷ niệm thấy Moment liên quan
- Moment chip Person mở đúng Person Graph/detail
- legacy Moment không personIds vẫn đọc bình thường

D. Events integration
- tạo Event từ Person Detail → Person preselected
- tạo Event từ Planner và chọn nhiều Person
- Event Detail thấy Person chips
- linked Event xuất hiện trong Person Timeline
- Event ownership/moderation cũ không regression

E. Profile bridge / invite
- linked Person có avatar/profile fallback đúng
- profile update không ghi đè Person genealogy
- Profile hiển thị active Family ID
- Copy Family ID vào clipboard thành công

F. Existing regression
- Auth/Profile/Family Gateway
- join/approve member
- Moments reactions/comments/moderation
- Calendar/Events
- media_assets/Cloudinary
- Family Graph edit/DG-11/Query/Kinship
- Timeline/Album
```

## 39.12. Static regression result at build time

```text
Phase 2 TS/TSX transpile: PASS
Graph Query / Kinship / Focus: PASS
DG-11 Batch Relationship Composer: PASS
Dense layout / Spatial routing: PASS
Phase 6.4 viewport/progressive: PASS
50/100/300/500 synthetic benchmark: PASS
functions familyGraphCore: PASS
Phase 6.5 source-contract test: PASS
```

Đây là static/synthetic verification, không thay user device test.

## 39.13. Current status

```text
PHASE 6.4: CLOSED
BASECODE: PHASE 6.4 CLOSED
PHASE 6.5: IMPLEMENTED · AWAITING DEVICE TEST
DIRECT FIRESTORE RULES: SOURCE UPDATED; DEPLOY NEEDED TO TEST NEW MEMBER TIMELINE RIGHTS
CLOUD FUNCTIONS: SOURCE SYNCED; NOT DEPLOYED; FLAG FALSE
MIGRATION: NONE REQUIRED
STRUCTURAL PROPOSAL WORKFLOW: DEFERRED TO A LATER DECISION GATE
```

**Do not mark Phase 6.5 CLOSED until user runtime test confirms the permission and cross-domain integration flows.**

---

# LATEST CHECKPOINT — PHASE 8.2 GRAPH PERFORMANCE OPTIMIZATION (2026-09-25)

This checkpoint supersedes older status lines below/above when they conflict.

```text
PHASE 6.5 = CLOSED BY USER AFTER REAL ANDROID TEST
PHASE 7 CORE MULTI-FAMILY = DEVICE PASS (4/4 critical cases)
PHASE 8.1 AUTOMATED PERFORMANCE HARNESS = KEPT IN PROJECT
PHASE 8.2 GRAPH PERFORMANCE OPTIMIZATION = IMPLEMENTED · AWAITING DEVICE RE-MEASUREMENT
USE_CLOUD_FUNCTIONS = false
BLAZE / CLOUD FUNCTIONS REVIEW = DEFERRED TO END OF PHASE 8
```

User device performance report on 12 GB Android showed normal tab switching and stable 5-listener baseline, but Graph scaling was the dominant bottleneck at 300/500 Person. Phase 8.2 therefore optimizes render-only/runtime behavior without changing persisted graph truth:

- index parent/partner relationships once in `familyGraphLiveAdapter`;
- remove per-row-unit full relationship scans;
- pre-layout bootstrap mount is bounded to 24 Person;
- Full Tree initial/batch budgets are 64/48;
- connector collision routing is viewport-working-set bounded while semantic family/port ownership still comes from full graph;
- progressive partner lookup uses Set membership;
- automated Graph benchmark fixes first-paint/full-mount ordering race.

Performance test files MUST remain available during optimization. User has limited time/resources and will validate by tapping normal UI and sending generated reports. Synthetic 50/100/200/300/500 Person data remains RAM-only and MUST NOT write Firebase.

Known TODO bundle — keep for one consolidated polish/reliability pass, do not forget:

```text
1. Offline/mất mạng: retry pending Moment vẫn lỗi.
2. Một số button/card thiếu spacing/gap.
3. Family switch: splash/transition phải xuất hiện ngay khi tap; hiện user thấy hitch trước splash.
```

Cloud Functions are not available on Blaze yet. Do not require Functions for current Phase 8 optimization; review backend integrity / Cloud mode only near the end of this phase as user requested.

Phase 8.2 acceptance: re-run automated Graph 100/300/500 tests on the same Android device and compare generated report before/after. Do not claim device performance PASS from container synthetic numbers.

---

# LATEST CHECKPOINT — PHASE 8.3 → 8.5 RELIABILITY / POLISH / REALTIME (2026-09-25)

This checkpoint supersedes older TODO/status lines when they conflict.

```text
PHASE 6.5 = CLOSED BY USER AFTER REAL ANDROID TEST
PHASE 7 CORE MULTI-FAMILY = DEVICE PASS (4/4 critical cases)
PHASE 8.1 PERFORMANCE LAB = KEPT IN PROJECT
PHASE 8.2 GRAPH OPTIMIZATION = IMPLEMENTED · STILL AWAITING USER DEVICE PERF RETEST
PHASE 8.3–8.5 = IMPLEMENTED · AWAITING USER DEVICE TEST
USE_CLOUD_FUNCTIONS = false
BLAZE REVIEW = DEFERRED TO END OF PHASE 8
```

## Basecode authority

Phase 8.3–8.5 is built **on the Phase 8.2 optimized source**. Preserve all 8.2 performance architecture and regression guards:

- relationship index in `familyGraphLiveAdapter`;
- bounded pre-layout bootstrap mount;
- Full Tree 64/48 progressive budgets;
- viewport-working-set connector collision routing with full-graph semantic ownership;
- Set-based progressive partner lookup;
- automated Performance Lab and RAM-only 50/100/200/300/500 Person fixtures.

Do not reconstruct 8.3–8.5 from an older Phase 7/8.1 source.

## Phase 8.3 — Moment retry + multi-family Moment publishing

Pending Moment now keeps durable in-memory upload checkpoints. Retry reuses the same target `familyId` and reserved post id, skips successful media, repairs Cloudinary-success/Firestore-metadata-failure without re-uploading the binary, and publishes only after all bounded workers have settled.

Moment composer supports **explicit opt-in** sharing to additional houses:

```text
current family = always included
additional families = none by default
max additional = 3
```

Each target house receives an independent Moment + independent media lifecycle. Multi-house tasks are queued sequentially so upload concurrency does not multiply with family count. Source-family `personIds` are not copied to B/C because FamilyPerson IDs are family-scoped.

## Phase 8.4 — consolidated TODO polish

The three user-reported TODOs are now implemented but still awaiting device acceptance:

1. offline Moment retry/resume;
2. Bloom button/card spacing in reported problem areas;
3. family-switch transition paints before network verification, with the native family switch modal closed immediately so it cannot cover the bootstrap.

Keep `document/PHASE_8_TODO_POLISH_RELIABILITY.md` as the acceptance record; do not erase the original observations.

## Phase 8.5 — realtime/read hardening

- Planner initial bounded warm-up remains compatible with startup splash, then local month/past/list listeners are released when Planner is blurred;
- Moments/Planner moderation listeners are focus-gated;
- Performance Lab tracks these local listeners;
- concurrent identical Family Graph Person-directory reads share one in-flight Firestore request only; no persistent stale graph cache is introduced.

## Cross-family graph idea — foundation only / default OFF

User wants a future optional combined-tree experience for two houses they belong to (example: own family + spouse's family), provided the optimized Graph performs well.

Current build adds a **read-only identity bridge foundation** only. Same `linkedUid` in two accessible family snapshots may be represented as an identity link. It NEVER creates or persists cross-family `parent_child`/`partner` edges and never merges collections.

```text
CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE = true
CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED = false
```

Do not expose/enable combined-tree UI until:

1. user accepts Phase 8.2 device performance;
2. privacy/permission + UX Decision Gate is explicitly approved;
3. combined view remains opt-in and reversible.

## Deploy impact

```text
schema migration = none
firestore.rules change = none for 8.3–8.5
Functions deploy = none
Blaze = not required
native dependency = none
USE_CLOUD_FUNCTIONS = false
```

## Current acceptance priorities

- real offline retry with partial upload + network recovery;
- opt-in A→A+B/C Moment publish and strict family isolation;
- family switch splash perceived immediately, before network wait;
- repeated tab/family switching keeps listener counts bounded;
- rerun Graph 100/300/500 Performance Lab to ensure 8.2 optimization was not regressed.

Static/synthetic checks PASS at packaging time; device runtime remains the final gate.

---

# LATEST CHECKPOINT — PHASE 8.5B RUNTIME SINGLETON + NAVIGATION STACK OPTIMIZATION (2026-09-25)

This checkpoint supersedes Phase 8.2C listener assumptions where they conflict.

User's real Android Phase 8.2C report showed tab latency substantially recovered (most successful switches around 210–320ms), but listener diagnostics exposed a deterministic x3 duplication for five screen-owned bounded queries while the four FamilyRealtimeProvider listeners and auth membership listener remained x1.

Source audit found a concrete navigation leak in the Performance Lab: starting the 30-second probe used `router.replace("/(tabs)")` even though the original Tabs navigator remained beneath the test screen in the root Stack. Repeated performance-test sessions could therefore retain multiple full Tabs navigator trees. The hidden Performance Lab also remained subscribed to every performance-service emit during Graph tests, adding measurement overhead.

Phase 8.5B implements:

```text
existing Tabs navigator reuse/unwind
+ shared identical-query realtime registry
+ focus-scoped Performance Lab subscription
+ throttled benchmark progress UI
+ tabs.navigator mount diagnostics
+ graph data-ready→paint / paint→full-mount timing split
```

`src/services/realtime/sharedRealtimeRegistry.ts` guarantees one underlying Firestore subscription per exact runtime query key and ref-counts mounted consumers. It is applied to:

```text
reviews.join_pending
reviews.proposal_pending
moments.moderation_hidden
planner.events.month
planner.moderation_hidden
planner.events.past
planner local upcoming/yearly fallback
```

Cross-domain returns to an existing tab use `router.navigate(...)` instead of explicitly pushing a new `(tabs)` navigator. Performance Lab unwinds its Stack instead of replacing itself with a new Tabs route. Graph benchmark returns with `back()` to the existing test screen.
Root family-transition handling also uses navigate/unwind when a detail or membership route is above an existing Tabs workspace; auth/profile/gateway gates still use replace intentionally.

Performance build now reports:

```text
Tracked runtime mounts active:
- tabs.navigator: N
```

Normal target is `tabs.navigator = 1`. Listener totals may vary by role/mode, but each singleton query name above should normally remain count 1 and must never accumulate with repeated tab/test navigation.

Phase 8.2 Graph optimization remains authoritative and unchanged in semantics: relationship index, bounded pre-layout mount, viewport working-set routing, partner adjacency index, and the 8.2 idle progressive scheduler remain. Phase 8.3–8.5 features are preserved.

Deploy impact remains:

```text
schema migration = none
Rules = unchanged
Functions = unchanged / not deployed
Blaze = not required
native dependency = none
USE_CLOUD_FUNCTIONS = false
```

Status:

```text
PHASE 8.5B = IMPLEMENTED · STATIC/SYNTHETIC PASS · AWAITING REAL ANDROID RETEST
```

Device retest must start from a fully restarted app/cleared Metro session so navigation state retained from the older test build cannot contaminate the listener/mount counts.


## CHECKPOINT 2026-10-01 — Phase 14Q V2.1 Letter Front Reveal Hotfix
- Device video 3937 confirmed the V2 letter was visually behind the gift box during reveal.
- Approved behavior: finish the box-opening beat first; then reveal the letter from scale 0 → 1 and opacity 0 → 1.
- Implementation: letter zIndex is above the complete box; letter is invisible/scale 0 until after lid opening; box stays anchored through opening and yields only after letter reveal starts.
- Visual/motion-only change. No Firestore/Rules/Functions/schema/data/permission/dependency change. Runtime Android confirmation remains required.

## CHECKPOINT 2026-10-01 — Phase 14Q V2.2 Three Reveal Themes
- User accepted V2.1 as basically correct and named the existing pink/gold style `Ấm áp`.
- Approved reveal theme set is exactly: `Ấm áp`, `Trang trọng`, `Rộn ràng`.
- `Trang trọng` uses blue as the dominant family with silver/white light; it must feel calm, important and deliberate rather than floral/romantic.
- `Rộn ràng` uses pale yellow/butter-gold mixed with pink; it must feel brighter, faster and celebratory.
- The three themes share the same Time Capsule data/permission/opening contract, but must visibly differ in palette, box geometry, glow, particle language, motion timing, haptic timing and supporting copy.
- `Ấm áp`: warm pink/gold, petals + soft sparks, soft motion, duration 2550ms.
- `Trang trọng`: blue/silver, restrained spark particles, squarer box/letter geometry, almost no bounce, duration 2850ms.
- `Rộn ràng`: pale yellow + pink, confetti/petals/sparks, rounder box, stronger pop/overshoot, duration 2350ms.
- Theme picker is prototype-only UI for direct on-device comparison. Theme switching is disabled while an opening animation is running and resets reveal progress when changed.
- V2.1 letter contract is preserved for all themes: lid opens first; then letter appears in front from scale 0 → 1 and opacity 0 → 1.
- Visual/motion-only prototype work. No Firestore/Rules/Functions/schema/data/permission/native dependency change. Real Android device visual smoothness remains the acceptance gate.


---

## CHECKPOINT — CLEAN PROJECT ROOT PACKAGING (2026-10-01)

- User approved a clean-root packaging rule for all future FULL builds.
- Root must keep only source/config files required by Expo/npm/Firebase/native tooling plus top-level source folders.
- Android BAT helpers live in `scripts/android/`; Firebase deploy helpers in `scripts/firebase/`; maintenance helpers in `scripts/maintenance/`.
- Device checklists live in `reports/device/`; validation reports in `reports/validation/`; historical `PATCH_INFO*` and apply notes live in `document/history/patches/`.
- BAT helpers must resolve project root themselves so double-click usage still works from nested folders.
- Release APK output is `dist/android/Family_Bloom_Release_Test_LATEST.apk`.
- Do not move tool-required config files out of root merely for appearance.

## CHECKPOINT 2026-10-01 — Phase 14R.1 Dual Android Variants
- User approved two Android installations from the same source tree: RELEASE `Family Bloom` (`com.familybloom.android`) and DEV/Metro `Family Bloom Dev` (`com.familybloom.android.dev`).
- RELEASE launcher/adaptive/themed/notification icon assets use the user-supplied family/house artwork. DEV uses a visually distinct Expo-style black/white icon.
- Variant is selected by `APP_VARIANT` in `app.config.js`; no value defaults safely to RELEASE. RELEASE scheme remains `familybloom`; DEV uses `familybloom-dev` to avoid native URI-handler collisions.
- RELEASE keeps root `google-services.json`. DEV requires a second Firebase Android app registration and `config/firebase/google-services.dev.json` for package `com.familybloom.android.dev`.
- Both Android apps may use the same Firebase backend while remaining isolated at Android local storage/cache/permissions/local-notification level.
- `scripts/android/Family_Bloom_Android_Print_DEV_SHA.bat` prints/creates the standard debug keystore and exposes SHA-1/SHA-256 for Firebase registration.
- DEV first/native build uses `Family_Bloom_Android_DEV_Build_And_Run.bat`; subsequent JS-only work can use `Family_Bloom_Android_DEV_Metro_Only.bat`.
- RELEASE build forces `APP_VARIANT=production`, clean-prebuilds native Android resources and exports `dist/android/Family_Bloom_Release_LATEST.apk`.
- Android build helpers no longer use unsupported Expo `--output` and do not depend on `npm ci` succeeding against an older lockfile; missing/incomplete node_modules triggers `npm install --no-audit --no-fund`.
- Clean-root packaging remains authoritative. No Firestore schema/Rules/Functions/Time Capsule data contract changes in this checkpoint.

---

## CHECKPOINT 2026-10-03 — Phase 14V.2C Chess Foreground Resume Watchdog

Device testing on Android confirmed a real OEM/resume edge case: backgrounding Family Bloom correctly emitted `AppState=background`, sent `chess:app:leave`, and disconnected Socket.IO, but on returning to the app some runs did not deliver a reliable `change -> active` callback to the Chess provider. The UI could therefore show stale/ambiguous connection state without a corresponding reconnect diagnostic.

Phase 14V.2C keeps the approved presence contract unchanged:

```text
foreground anywhere in Family Bloom = Chess online/presence eligible
Android background/other app = Chess offline (unless active game restore on return)
active timed game clock remains server-authoritative and continues while client is away
```

Resume is now guarded by three signals:

```text
1. React Native AppState `change`
2. Android AppState `focus`
3. 2.5s foreground watchdog that rereads AppState.currentState + socket.connected
```

The watchdog is a client-only safety net. It does not ping Firestore, does not keep the app alive in background, and does not write presence/timer ticks. When foreground JS resumes and sees `AppState.currentState === active` but the socket is disconnected or UI state is idle/error, it repairs the lifecycle through the normal authenticated `joinForeground()` path.

Temporary diagnostics remain enabled in DEV under `[ChessDebug]`, including `foreground:focus` and `foreground:watchdog repair`. No Firebase token/private key is logged.

Status: IMPLEMENTED + STATIC REGRESSION PASS; awaiting real-device background/foreground retest.

## Chess Phase 14V.3C — Smooth Motion checkpoint (2026-10-03)
- Runtime video showed perceived move lag because client waited for server validation + Firestore persistence + ACK before the piece visually changed, then teleported to the destination.
- Client now uses a presentation-only optimistic slide (145ms native-driver animation) for ordinary legal moves while server-authoritative FEN/revision/clock remain unchanged.
- Server acceptance reconciles the board to authoritative FEN; rejection rolls the piece back (110ms).
- Opponent authoritative moves animate on arrival rather than teleporting.
- Bloom Bot test delay reduced to 250–450ms; this is test-only pacing and does not change real-player networking.
- Minor Battle FX durations shortened to reduce visual interruption.
- Development log `[ChessPerf] move:roundtrip` records actual network/server ACK latency.
- Special moves (castling/en-passant/promotion) require runtime verification because they have extra-piece semantics.
