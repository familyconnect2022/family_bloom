# Family Bloom Phase 17.9A15 — Shared Board Game Runtime / Physical Sound / Premove / Human-like Bot Pacing

## Base
Phase 17.9A14R1 Gate Hotfix.

## Scope delivered

### 1. User-selected physical board sound set
The exact 11 MP3 files supplied and named by the user are bundled under `assets/audio/board-game/` without re-encoding:
- `game-start.mp3`
- `move-self.mp3`
- `move-opponent.mp3`
- `capture.mp3`
- `move-check.mp3`
- `castle.mp3`
- `promote.mp3`
- `premove.mp3`
- `illegal.mp3`
- `tenseconds.mp3`
- `game-end.mp3`

`useBoardGameSoundscape` is now the shared sound vocabulary for board games. A move uses one physical sound only, with priority:
`promotion > castle > check > capture > normal move`.

### 2. Chess sound is synchronized to the visual landing frame
- Authoritative server state still decides whether a move exists and what semantic it has.
- `ChessSurfaceHost` no longer plays normal move/capture/check/promotion sound merely because a move delta reached React.
- `ChessBoard` reports `onMoveLanded` after the native piece travel animation completes.
- The host classifies the authoritative delta and plays the selected MP3 at that landing callback.
- Move-triggered game-end sound is armed by authoritative terminal state but cannot fire before the final piece lands. Resign/draw/timeout retain a no-move fallback.
- `game-start` is one-shot when the authoritative game changes from waiting to active.
- `tenseconds` is one-shot per active turn crossing the 10-second threshold.
- Invalid attempted moves can emit the selected `illegal.mp3`.

### 3. Chess premove fast path
The old tap path could reject premove taps during opponent visual motion because `MOTION_LOCK` / visual-catchup gating was shared with normal moves. A15 separates the opponent-turn premove window:
- source-piece tap can be accepted while the opponent piece is still visually travelling;
- target tap can queue the premove immediately;
- opponent landing no longer blindly clears a source selection made during that animation;
- if only a source was selected, legal hints are recomputed on the new authoritative position;
- a fully queued premove is revalidated against the new authoritative board before execution;
- premove queue feedback uses `premove.mp3`; the actual executed move still gets its physical landing sound later.

### 4. Shared board-game framework foundation
Added `src/games/shared/boardGameFramework.ts` for behavior that should be common instead of copied between Chess and Xiangqi:
- board-game kind / round phase contracts;
- generic premove intent type;
- one-move-one-sound semantic resolver;
- shared human-like Bloom Bot pacing policy.

This is intentionally an adapter/foundation layer: Chess rules remain Chess-specific and Xiangqi rules remain Xiangqi-specific.

### 5. Xiangqi parity on the current playable Bloom Bot surface
- Xiangqi renderer now emits an exact piece-landing callback.
- Xiangqi uses the shared physical sound vocabulary and sound priority.
- Xiangqi supports a red premove while Bloom Bot is thinking.
- Premove is revalidated only after the bot move lands on the new Xiangqi state.
- Invalid premove is cancelled with light illegal feedback.
- Premove source/target markers are visible.
- Xiangqi legal-move engine can derive legal moves for red even while black owns the turn, specifically for premove preview/validation.
- Ready/game-start, game-end, ten-second warning, result UI and tap-only behavior remain intact.

### 6. Human-like Bloom Bot pacing for both games
Shared policy:
- normal planned bot move: **3000 ms**;
- planned move that gives check: **5000 ms**.

Chess:
- applied server-side, so the real authoritative clock continues to run while Bloom Bot 'thinks';
- the bot first plans the move and determines whether it gives check, then schedules that exact revision/move;
- stale revision protection remains in place.

Xiangqi:
- the local Bloom Bot plans a move and whether it gives check before starting the 3s/5s think window;
- its clock continues to run during the think window;
- the human can select and queue a premove during that time.

### 7. Important boundary
A15 unifies the shared **client/runtime behavior foundation** for Chess and Xiangqi and brings Xiangqi bot play to the same input/sound/pacing model. It does **not** pretend that the existing Xiangqi preview has become a full Socket.IO human-vs-human server-authoritative game. Xiangqi online matchmaking/presence/reconnect/persistence requires its own server rule adapter/protocol and remains separate from this safe A15 change.

## Files / architecture added
- `src/components/games/useBoardGameSoundscape.ts`
- `src/games/shared/boardGameFramework.ts`
- `scripts/test-phase17_9a15-shared-board-game-sound-premove.js`
- `assets/audio/board-game/*` (11 exact user-selected MP3 assets)

## Primary files changed
- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/ChessSurfaceHost.tsx`
- `src/components/chess/ChessClock.tsx`
- `src/components/chess/ChessPlayerRail.tsx`
- `src/components/chess/useChessSoundscape.ts`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- `src/app/(xiangqi)/xiangqi-preview.tsx`
- `src/games/xiangqi/xiangqiEngine.ts`
- `server/src/socket/socketServer.ts`
- current build gates / copy-over updater wiring

## Regression / verification
- Phase 17.9A15 shared board-game gate: **27/27 PASS**
- Current Chess aggregate: **17/17 phase groups PASS**
- Phase 17.1 tab/runtime safety: **41/41 PASS**
- Phase 13 Release Readiness: **11/11 PASS**
- Phase 17.9A14 Instant Home/Firebase cleanup gate: **PASS**
- Phase 16B Xiangqi playable logic: **28/28 PASS**
- The current aggregate includes full TS/TSX transpile scans from the retained current gates.
- Direct standalone `npx tsc --noEmit` was not used as a release blocker in this extracted build environment because `node_modules` / Expo base tsconfig are intentionally absent from the FULL ZIP; the project’s source transpile gates are the applicable static check here.

## Installation / deployment
- Copy-over remains supported.
- Run the packaged `Family_Bloom_CLEAN_APPLY_FULL.bat` after overlaying the FULL code.
- No new native dependency was added in A15; if A14R1 already runs on the device, `npx expo start -c` is sufficient for the client changes.
- **Render server deploy/restart is required for Chess Bloom Bot 3s/5s pacing**, because `server/src/socket/socketServer.ts` changed.
- Xiangqi bot pacing is client-local in the current Xiangqi preview and does not depend on the Render deploy.
- Firestore Rules and indexes are unchanged by A15.
