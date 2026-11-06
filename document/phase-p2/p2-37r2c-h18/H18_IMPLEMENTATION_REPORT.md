# Family Bloom P2.37R2C H18 — Chess stable network resync

Release: **FULL CODE H18** based on H17 (not a patch). App 1.3.18, Android versionCode 143028, native P2.37R2C-H18-native-1, native module package 1.3.16.

## What 6467.mp4 prompted us to investigate

The user observed smooth play on stable internet, followed by bot-piece jank and board flicker when network transport changed. The source audit revealed two relevant failure paths:

1. In H17, `renderBloomDialog()` mapped `status == "syncing"` to a full-board modal. Each transient active/syncing transition could cover and uncover the live board. In H18, an **already active** game's reconnection is a small status beside the opponent and inputs temporarily stop; no full-screen syncing dialog is shown. The waiting and result dialogs are unchanged.
2. When one or more move deltas were missed, H17 accepted a full resync FEN but could not always animate the last missed move, because only the final FEN and from/to were available. H18 optionally transmits `lastMoveBeforeFen` in authoritative snapshots. The client verifies with chess.js that applying the server's `lastMove` to that predecessor reproduces the exact server FEN and SAN. Native may animate **only that proven final move** using an additional visual-only `motionFromFen` field. Other missed moves are not invented or replayed. Older Render versions lacking that field still support safe one-ply predecessor verification; otherwise they snap to final FEN without an animation.

## Changes

- `nativeChessGameplayController.ts`: validate server snapshots before overwriting a good board; reject conflicting same-revision FEN, ignore stale older revisions, validate last-move predecessor and SAN with chess.js; reconcile socket disconnections/reconnections, coalesce resync requests, ignore stale resync responses after a new socket epoch; preserve in-flight optimistic pixels until reconciliation; block new moves while syncing.
- `boardGamePresentationBridge.ts`: subscribe/unsubscribe Chess-only socket connection state; Xiangqi remains separate.
- `chessGameManager.ts` and `chessTypes.ts`: optional `lastMoveBeforeFen` derived from in-memory authoritative chess.js history in PublicGameState; no new Firestore writes or game-state mutation.
- `ChessNativeBoardView.kt`: no full-board modal for live syncing; only paint cell layer when its visual inputs changed, rather than on every status/clock bind; allow verified single-last-move visual animation across active/syncing statuses without remounting the 64 square views.
- `NativeChessBoardState.kt` / native TS type: backward-compatible `motionFromFen` hint; no change to result, turn, clocks or server move authorization.
- H18 Android/native identity and Build & Share scripts updated; H18 executable gate wired into Windows clean apply and local share/release BATs.

## Test results in this environment

- H18 mocked end-to-end controller network cases **25/25 PASS**: single/multi ply, old server fallback, inconsistent FEN/SAN, same-rev conflict and dedup, offline/on-line guard, delayed ACK, stale socket epoch, local optimistic move across network shift, Black-side orientation, native status guard.
- Actual Kotlin `ChessPieceMotionPlanner.kt` + unit test compiled by `kotlinc` and run via JVM: **14/14 PASS**.
- H17 optimistic controller tests **23/23 PASS**, H14 Black-side authority **20/20 PASS**, H15 authority & private release tools **27/27 PASS**.
- H10 (17/17), H11 (28/28), H12 (23/23), H13 (20/20), H16 (16/16), current binary-identity (14/14), full copy-integrity (31/31), build/share contract (26/26), H14R1 BAT audit (11/11): PASS.
- TS/TSX source syntax: **292/292 PASS**; source import integrity: PASS.
- **Not verified:** Android Gradle/Kotlin APK compile (no Android SDK and no generated android/ platform), actual network-switch/screen-refresh performance on a handset, deployment of the new Render code.
- Historical H5 Slot/Stack regression script fails 6 architectural assertions against the pre-existing current navigation architecture; it is not used in the H18 clean-apply/build BAT gate. Do not misrepresent this script as passing.

## Mandatory update order

1. Back up your current Family Bloom source folder and Android signing material. Keep the SAME Firebase project, application ID `com.familybloom.android`, and signing key.
2. Deploy the **H18 server/** source to Render Singapore. It adds optional fields; older clients ignore them. Server restarts may briefly interrupt active games, so do this outside an active match.
3. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` from the package or current project as directed in the existing copy-over workflow; copy the **entire** H18 FULL CODE folder over the project; then run `Family_Bloom_CLEAN_APPLY_FULL.bat`.
4. Build a **new APK** with `Family_Bloom_BUILD_APK_TO_SHARE.bat` (root shortcut). Default share output `C:\FamilyBloomShare\apk`. Android Kotlin changed; OTA-only updates **cannot** apply H18 completely.
5. Verify developer test entry stays visible exclusively for the authorized Firebase identity; do not use the broad family-admin role.

## Real APK acceptance scenarios

- Start from a new Bot match, play >10 white moves and >10 black moves, then toggle Wi-Fi/mobile data as the Bot begins thinking or moving.
- While offline, board pixels and 64 squares remain visible; only a subtle `Đang đồng bộ ván cờ…` status appears beside the opponent; you cannot send moves until authoritative resync returns.
- On reconnection, compare board FEN/revision with Render logs; no old socket ACK should rewind the client.
- If **multiple** moves were missed, only the **final verified** move animates; if the predecessor does not validate, the new final position is displayed without fictitious animation.
- Test castling, capture, promotion, en-passant, own local pending move across an interrupt, and Full -> Mini -> Full. Confirm no game resignation on minimize.
- Record new APK + video + gameId/revision sequence when a flicker occurs; redact Firebase user IDs before sharing logs.
