# Family Bloom P2.37R2C H14 — Chess side authority & edge-docked Mini

Source baseline: H13 (`FAMILY_BLOOM_P2_37R2C_H13_BLOOM_HERO_UI_INSTANT_LOBBY_FULL_2026-10-18.zip`). Review evidence: `6459.mp4` (color/clock mismatch report), `6460.mp4` (Mini not reaching physical screen edge).

## Findings

- Server Chess creates `whiteUid`/`blackUid` and stores them in authoritative game state. `ChessGameManager.move()` already validates signed-in UID, active status, expected revision and current turn before applying the move. Thus a movie of apparent opponent-piece movement is **not** enough to prove the server accepted an illegal command; client display, premove selection, and deployed Render version must be checked as separate hypotheses.
- Client previously used `whiteUid`/`blackUid` for orientation and piece selection, but did not explicitly reject contradictory `turn` vs FEN snapshots/deltas. A stale or malformed packet could therefore leave controls or highlights inconsistent.
- Mini rail is outside React Navigation and is attached to `Activity.window.decorView`, but its snap math included a horizontal 10dp margin and used a phantom minimum `118 × 72dp` during drag despite actual `96 × 52dp` Mini size. Logical viewport dimensions supplied by React Native could differ from the native parent's measured width.

## Changes

1. Client (`src/services/games/nativeChessGameplayController.ts`): fail closed when the logged-in UID does not match exactly one color, bot identity is not in the two-player game state, or server `turn` differs from FEN. Reject out-of-order move color/turn metadata, ask for server resync instead of applying an inconsistent delta. Preserve premove on own pieces only.
2. Server (`server/src/chess/chessGameManager.ts`): explicitly supplied invite color assignments are mandatory/validated instead of silently randomized on malformed input; enforce post-move color invariant. Existing server-side UID, revision, turn and legal move authorization is unchanged.
3. Native (`modules/family-bloom-overlay`): keep tap-to-move latency; do not block fast second tap waiting for a native selected-square repaint. Chess native input requires current authenticated color state.
4. Native Mini: horizontal dock now uses `0` or `parentDecorWidth - miniWidth`. Drag bounds use actual rail dimensions; top/bottom safe-area clearances remain. No Full Surface padding participates in Mini positioning.
5. Identity: app `1.3.14`, Android `versionCode 143024`, native identity `P2.37R2C-H14-native-1`, native module package `1.3.12`. Updated BAT/verifiers and added H14 gate in cleanup/EAS.

## Tests actually executed

- H14 static + transpiled executable TypeScript controller scenarios: 20/20 PASS. Includes black human/white Bot, wrong-color selection, own-color premove, no premature socket move, inconsistent FEN/turn, wrong UID mapping, invalid delta.
- Regression source and executable gate suites P2.32, P2.34, P2.35, H6, H7, H8, H9A, H9B, H10, H10R2, H11, H12, H13, binary identity, FULL copy-integrity: PASS.
- Source TS/TSX transpile syntax, project import integrity, and build entrypoint checks: PASS.
- All 32 BAT files use valid CRLF. All added `.md`/`.txt` located under `document/`.

## NOT verified

- Android Gradle/Kotlin APK compilation (the generated `android/` platform and Android SDK are not bundled in source).
- Real device Mini exact physical-edge layout on gesture navigation/split-screen/device rotation.
- Render deployed commit/version and real-time Socket interactions. Rebuild APK and redeploy matching `server/` before accepting these behaviors as fixed.
- Performance/FPS under the actual APK and real Bluetooth/physical hardware.

## Deployment safety

- Backup original project folder; apply H14 FULL via included cleanup/copy-over BAT. Build a new APK: native Kotlin changed and OTA-only is insufficient.
- Deploy the H14 `server/` changes to Render, then smoke test a **new** bot game (existing active games may retain old in-memory state).
- Keep Firebase project, Spark plan, applicationId and production signing key unchanged.
- If a player appears to move opponent pieces again, capture gameId + revision + whiteUid/blackUid mapping **on the server logs**; redact real UIDs when sharing. Do not assume visuals prove server accepted a forbidden move.
