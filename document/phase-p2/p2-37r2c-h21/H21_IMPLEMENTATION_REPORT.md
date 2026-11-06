# Family Bloom – P2.37R2C H21 – Human invitations, two-stage ready, durable away rules

Date: 2026-10-19. Base: H20 FULL CODE. App `1.3.21`, Android `versionCode=143031`, Kotlin identity `P2.37R2C-H21-native-1`. Source-only FULL delivery.

## Scope of change

1. **Human Chess invitations**: authoritative expiration **60 seconds after creation**; inviter may cancel; invitee can accept/decline through the isolated, pink Super Bloom invitation modal at the authenticated app shell, including while on other tabs. Deadline stays authoritative at the server, even if local UI timer pauses. A per-invite transition guard serializes accept/cancel/decline/expire racing with asynchronous Firestore lock creation. Pending game locks are released on terminal invitation states.
2. **Two-stage match readiness**: `chess:game:boardReady` records actual native board/assets readiness. Before both confirmations, server does not publish `whiteUid/blackUid`. Both confirmed -> color-phase state, revision increment and persist. Both clients re-render with authoritative color, orientation, and geometry, then independently send `chess:game:ready` (playReady). Server starts the first clock/White's move only when both playReady messages are validated. Socket ACK retries must never duplicate match creation or activate a clock early. Bot simulations pre-confirm synthetic Bot board/play readiness; production human-human requires both human confirmations.
3. **Preparation timeout**: an accepted human match left in `waiting` for 120 seconds (e.g. second app killed during asset preparation) is cancelled with reason `abandoned`; durable locks of **both** players are cleared. A waiting invitation's 60-second window is distinct from this after-accept 120-second safety watchdog.
4. **Away policy**: for 10-minute time controls, remaining >120s -> at most 50% of remaining; remaining <=120s -> the full remaining. For 5-minute time controls, remaining >60s -> 50%; remaining <=60s -> full remaining. 3-minute and 1-minute controls use full remaining. In every case the absence deadline is in wall time tracked by the server, while the normal chess clock follows its existing authoritative turn semantics. The server picks the earliest reached terminal deadline.
5. **Repeated departures, no exploit**: for each player, the first absence creates a reserve. Every later departure uses `min(previous unused reserve, current rule's allowance)`; every return consumes actual wall time. Repeated absence packets do not move the current deadline. This is deliberately **not** a newly replenished reserve on each reentry. At most one authoritative Firestore save per actual start/end of an absence; no per-second Firestore writes.
6. **Durable restart checkpoint**: stored per-player `awayBudgetByUid` includes unused milliseconds and, during an absence, the server-authored departure/deadline epoch timestamps. After a Render process restart the manager restores the monotonic deadline from that epoch. An already expired departure ends the match even before rejoin can clear it. A paused/background reconnect cannot clear absence. This is intentionally an internal persisted field, never sent in `PublicGameState`.
7. **Winner liberation**: `away_timeout` uses `persistence.finish()` to store result, clear both participants' `chessActiveUsers` locks and create recovery notifications for both. Winner can start the next game immediately without the defeated player's ACK or reconnect.
8. **Presentation hygiene**: Chess invitation countdown is confined to root `ChessChallengeGate`, not board frames, Home or sibling Xiangqi runtime. The root app owns family Chess foreground presence; navigating Family Bloom tabs never counts as background. Existing Native board, Mini, premove, client-first animation, offline input and state resync are unchanged except readiness hooks.

## Build and deployment

- Android source/Native Kotlin identity updated: **new APK required**; OTA alone cannot distribute the new Kotlin identity.
- **Server code/protocol changes** in `server/src/chess`, `server/src/socket`: **deploy H21 server to Render**. Deploy matching client promptly; older H20 client cannot negotiate the new mandatory two-stage READY contract for newly created games.
- Firebase Spark configuration, Firestore Rules/indexes and Xiangqi protocol are unchanged. New optional game document field `awayBudgetByUid` is written by Firebase Admin SDK; it does not require a Firestore rules change.
- FULL copy-over: back up existing folder; run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`, copy all H21 source, run `Family_Bloom_CLEAN_APPLY_FULL.bat`, then `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Remote Android APK share path defaults to `C:\FamilyBloomShare\apk`.
- `scripts/android/` retains grouped BAT scripts. Docs are under `document/`; root `.gitignore` and root entrypoint BAT are preserved.

## Verification genuinely performed

- Executable H21 server manager policy harness with VM-transpiled actual manager: **32/32 PASS** (includes 2min/1min exact thresholds, two readiness gates, multi-leave budget, restart durability, expiration and terminal lock cleanup).
- Existing H11 checker updated to require boardReady plus playReady (replaces obsolete one-phase assumption): **28/28 PASS**.
- H6-H10, H10R2, H12-H20 source/executable regressions: PASS.
- Native binary identity gate **14/14 PASS**; FULL copy/import gate **31/31 PASS**.
- TS/TSX source syntax transpilation **312/312 files, 0 syntax errors**.
- **NOT verified**: Android Gradle/Kotlin APK compilation or installation, full project/server TypeScript typecheck requiring restored npm packages, actual Firebase/Socket.IO end-to-end on Render, multi-device clock synchronization and real-device frame rate. Do not call these device tests PASS until tested.

## Known operational considerations

- Human invitation delivery requires both authenticated clients to be foreground/connected to the same family when the invitation is created. Native OS push notifications for an app that is killed/backgrounded were not added.
- A Render process that has not yet recovered the relevant game can only evaluate a stored timeout when the game is loaded (e.g. via a player's recovery/join); when loaded, the saved expired deadline is enforced and both durable locks are released.
- Unclocked games retain existing manual exit/finish behavior; no arbitrary absence loss was added.
