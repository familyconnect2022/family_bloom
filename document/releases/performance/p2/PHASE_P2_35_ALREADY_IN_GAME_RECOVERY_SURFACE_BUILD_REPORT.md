# Family Bloom P2.35 — ALREADY_IN_GAME Recovery → Authoritative Surface

Date: 2026-10-17  
Base: P2.34 Session/Presentation Bridge + Stacked Game Views  
Device evidence: `6406.mp4`

## Root cause confirmed

P2.34 correctly attached the persistent root presentation bridge, but the internal Bloom Bot create actions still treated `CHESS_ALREADY_IN_GAME` / `XIANGQI_ALREADY_IN_GAME` as terminal client errors.

That created the exact device symptom from `6406.mp4`:

1. server already owned an active/pending board-game session;
2. the test screen still showed no local state / Surface IDLE;
3. a new Bloom Bot create call returned `*_ALREADY_IN_GAME`;
4. the client threw before `sessionRecover -> gameJoin -> sync*PresentationFromState` could execute;
5. the authoritative game therefore remained valid on the server while the persistent Full Surface stayed parked off-screen.

The server was not the broken layer. P2.35 fixes only the client reconciliation path.

## Chess fix

Chess now keeps its own recovery function:

`chess:session:recover -> chess:game:join -> ChessGameState -> syncChessPresentationFromState -> FULL`

Behavior:

- before `Bạn mời Bloom Bot`, Chess preflights server recovery;
- existing active Chess is joined and immediately presented instead of creating another game;
- existing pending Chess is preserved and waits for its authoritative state rather than creating a duplicate invite;
- active/pending Xiangqi remains a cross-game busy condition and is never opened as Chess;
- if `CHESS_ALREADY_IN_GAME` still wins a race after preflight, the error is intercepted and converted into the same recovery path instead of being thrown directly;
- successful outgoing Bloom Bot challenge keeps realtime `gameState` as the fast path, then performs a bounded reconciliation after 1.65 s. This covers the case where the server created the game but the realtime state event was missed by the client presentation path;
- manual `Recover ván Chess` reuses the same recovery implementation instead of maintaining a second recovery flow.

## Xiangqi parity without coupling

Xiangqi receives the same reliability policy through its own independent path:

`xiangqi:session:recover -> xiangqi:game:join -> XiangqiRealtimeState -> syncXiangqiPresentationFromState -> FULL`

Chess and Xiangqi still do not share:

- Socket.IO client instance;
- game state;
- rule engine;
- recovery function;
- invitation state;
- board/gameplay lifecycle.

Only the existing presentation primitive remains common at the final visual handoff.

## Lightweight screen-entry reconciliation

When the internal Bloom Bot test screen opens, it performs recovery only if a game transport is already connected.

It deliberately does **not** wake Render merely because the test page was opened. Normal user actions still own the normal `prewake/appJoin/lobbyJoin` sequence.

This catches a warm-process mismatch where the server/socket is already alive but local test UI has not yet reflected the active game.

## First-click guarantee for Bloom Bot test

The outgoing Bloom Bot server path auto-resolves after about 1.2 s. P2.35 waits 1.65 s after a successful outgoing bot challenge and runs authoritative recovery once.

Therefore the intended flow is now:

`tap once -> create/preserve authoritative session -> gameState fast path OR recovery fallback -> gameJoin -> Surface FULL`

A second tap is no longer required as a recovery mechanism.

## Presentation preserved from P2.34

Unchanged:

- persistent root Full and Mini shells;
- Full Surface = 85% of device window;
- two always-mounted overlapping game views inside Full;
- Chess layer = centered 90% x 90%, deep pink `#D94F87`;
- Xiangqi layer = centered 90% x 90%, deep gold `#D3A11F`;
- active game raises only its own layer through opacity/z-index/elevation/pointer-events;
- terminal events close only the matching `kind + gameId`;
- deterministic Close resets kind, gameId, Full content, Mini content and mode to IDLE, then parks both persistent shells off-screen.

## Backend / deployment

No server source changed.

P2.34 server tree SHA-256 and P2.35 server tree SHA-256 are identical:

`d50fec37ec8deaa8ce33fc9eaeb069ee414a2b151f923dc5252d2c5a2d35e07b`

Therefore:

- no Render redeploy is required for P2.35;
- no Firestore Rules change;
- no Firestore index change;
- no native dependency change.

## Delivery / copy-over

P2.35 remains a FULL CODE copy-over package.

Recommended local flow:

1. run the packaged `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the existing project when doing a full overlay;
2. copy the entire P2.35 tree over the project;
3. run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`;
4. test the Bloom Bot flow again.

Root helpers remain included:

- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`;
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`;
- `eas.json` with `family-bloom-test` Android APK profile.

The OTA helper still performs its own readiness checks and prompts interactively for the update message.

## Verification

Current-successor gates:

- P2.32 reset foundation: **76 assertions PASS**;
- P2.34 session/presentation + stacked views: **42/42 PASS**;
- P2.35 ALREADY_IN_GAME recovery Surface: **37/37 PASS**;
- project structure: **18/18 PASS**;
- Web W1: **41/41 PASS**;
- Web W2: **71/71 PASS**;
- Web W3: **34/34 PASS**;
- P2.12.4 build/audio: **27/27 PASS**;
- P2.12.5 standalone APK/share: **26/26 PASS**;
- P2.12.6 dependency contract: **20/20 PASS**;
- P2.12.7 expo-asset peer: **14/14 PASS**;
- P2.12.8 Windows Doctor launcher: **18/18 PASS**;
- build entrypoint audit: **PASS, 24 BAT files**;
- release readiness: **11/11 PASS**;
- TypeScript syntax transpile for all P2.35 touched/runtime files: **PASS**.

Historical P2.33 gate is intentionally superseded by P2.34 and is not a current release blocker: its three stale assertions require the pre-P2.34 no-`activeGameId` store, old pink prototype background, and direct P2.33 CLEAN APPLY invocation.

## Device acceptance target

Reproduce the `6406.mp4` scenario:

1. enter Developer Tools -> Bloom Bot protocol test;
2. tap `Bạn mời Bloom Bot` once;
3. if an old active Chess already exists, it should recover/join and Full Surface should appear without a technical `CHESS_ALREADY_IN_GAME` stop;
4. if no game exists, the bot challenge should resolve and Full Surface should appear from realtime state or the 1.65 s authoritative fallback;
5. repeat for Xiangqi;
6. verify cross-game busy never raises the wrong colored/game layer.
