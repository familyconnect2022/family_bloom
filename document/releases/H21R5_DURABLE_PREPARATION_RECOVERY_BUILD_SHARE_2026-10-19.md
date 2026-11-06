# Family Bloom H21R5 — Chess pending preparation cannot survive forever

Date 2026-10-19; base H21R4 FULL ZIP. Scope: Chess only. Xiangqi architecture remains separate.

## Root causes found in H21R4

1. The 120-second preparation timeout only ran in `ChessGameManager.checkTimeouts()` for currently loaded in-memory games. When Render Free restarted, `restore()` read a stale `waiting` Firestore record but did not expire the immutable preparation deadline. A stale cross-game active-user lock was therefore treated as genuinely active by `chess:session:recover`, leading to the incorrect "Tiếp tục ván" prompt after hours.
2. `setBoardVisible()` only persisted absence budgets in `active` games. A player leaving during the two-stage `waiting` handshake had no durable absence deadline; thus the away-loss logic never ran.
3. `enqueue()` produced a rejected `Promise.finally()` queue tail independent of the original rejected command; a normal server-domain rejection (e.g. late READY) could produce an unhandled rejection.
4. The client could display `PREPARING` past the deadline without requesting a fresh authoritative state if the server broadcast was missed.

## Changes

- `server/src/chess/chessGameManager.ts`: authoritative `settleExpired` called in cold `restore`, warm `recover`, `join`, `state`, `boardReady`, `playReady`, `boardPresence`, and timer sweeps. All use immutable persisted `createdAt`; no reconnect reset. A `waiting` room that exceeds 120s is terminal and frees both Firestore locks. When the server **recorded** a player's background/exit, it declares `away_timeout` with their loss by the earlier of their allowance and fixed preparation expiry. When no absence proof exists, it cancels an unstarted room as `abandoned` rather than inventing a loss. Normal active/paused away policy remains unchanged. Queue tail now resolves on both success and rejection; command's own ACK still gets the original error.
- `server/src/socket/socketServer.ts`: every Chess active-lock lookup reconciles the durable game against its deadline before reporting "active" / "busy", creating games, or offering "Continue". No special developer bypass.
- `src/components/games/ChessSessionRecoveryGate.tsx`: after choosing to resume a still-valid waiting session in the foreground, sends `gameBoardPresence(true)`, so the earlier absence is not accidentally left running.
- `src/services/games/nativeChessGameplayController.ts`: waiting deadline watchdog issues a server state resync after the fixed waiting deadline and periodically if the response cannot be reached; never declares a result locally.
- `server/src/routes/health.ts`: `chessSessionProtocol: "h21r5-durable-preparation-recovery"` to prove the new Render server is deployed.
- `scripts/setup/check-render-chess-protocol.cjs`: read-only health probe. Default is informative (non-blocking when offline). `--strict` fails if the remote version is absent/unreachable. Root Build & Share prints the status but does not require the internet for Gradle compilation.
- Build & Share BAT calls the new H21R5 regression suite and prints `H21R5` in its release metadata. Existing Expo/AAPT2/audio/DEX/sha256 gates are preserved.

## Historical game behavior

H21R4 did not write an absence checkpoint for a waiting game. Therefore the new server cannot reliably infer that the user actually left a two-hour-old PREPARING room. Such an orphan must be **cancelled** and unlocked, not artificially assigned a defeat. Future games launched on the new server that observe a genuine background/departure during preparation can be settled as an away defeat.

A successfully started `active` game with a previously saved away deadline is still forfeited according to existing H21 clock rules after the persisted deadline even across a Render restart. When Render actually goes down without a recorded departure, server-outage time is paused; do not guess an abandonment that was never observed.

## Verification completed in this environment

- Executed: 17/17 automated legacy/release source/regression suites PASS (H11-H21, H21R1 audio, H21R3 AAPT2, H21R4 build, H21R5 durable recovery, binary identity, APK share preparation).
- New H21R5 executable regression: 14/14 PASS, exercising cold-restore orphan cancellation, early-background preparation forfeiture, lock cleanup, retry deadlines, foreground return, late READY rejection, and code-path verification.
- Server health probe: remote endpoint could not be verified in this execution environment. **No claim is made that Render has been updated.**
- Android Gradle `assembleRelease`, signing, on-device installation and real server Firebase transactions could not be performed in this environment. The user must perform these Windows/Render integration checks.
- This FULL CODE ZIP is source code, not a compiled APK.

## Deployment order (BOTH are required)

1. Deploy the contents of the **`server/`** folder via your existing Render Git deployment, rootDir `server`. Wait for the service to become healthy. On Windows run `node scripts\setup\check-render-chess-protocol.cjs --strict` from the project's root. It must print `[PASS] Live Render Chess protocol h21r5` before treating session recovery as fixed. Merely building/installing an APK does **not** deploy server code.
2. Extract this FULL ZIP, use `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` on the old copy before copy-over, then `Family_Bloom_CLEAN_APPLY_FULL.bat` and `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Preserve required private local `google-services.json` and `.env` as directed by the scripts. Release output remains `C:\FamilyBloomShare\apk` (or override via `FAMILY_BLOOM_SHARE_DIR`).
3. Inspect `Family_Bloom_LATEST.txt` for source marker `H21R5`, current timestamp and SHA256. Install on test Android. Test leaving during `waiting` and during `active`, return before/after deadline, bot handshake to first move, and Render cold restart.
4. Capture the first build/Gradle failure line and backend logs if something still fails. Do not interpret a passing source test as proof a signed APK is installable.

Identity unchanged: `com.familybloom.android`; app version 1.3.21; versionCode 143031; native identity `P2.37R2C-H21-native-1`. No Kotlin/native module changes in this release.
