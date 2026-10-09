# Family Bloom Phase 17.9A16 — Xiangqi Server Authority + Realtime Bot

## Base
Phase 17.9A15 Shared Board Game Runtime / Selected Sound Set / Premove / Human-like Bot pacing, with A14R1 boot foundation preserved.

## Goal
Move the Xiangqi test experience off local client authority and onto the same Render/Firebase server-authoritative model used by Chess, so real-device testing exercises network ACKs, server clocks, reconnect, recovery, away timeout, durable state, and server bot pacing.

## Delivered

### Server-authoritative Xiangqi
- Added a dedicated Xiangqi domain under `server/src/xiangqi/`:
  - `xiangqiTypes.ts`
  - `xiangqiEngine.ts`
  - `xiangqiPersistenceService.ts`
  - `xiangqiGameManager.ts`
  - `xiangqiSocket.ts`
- `server/src/app.ts` installs Xiangqi Socket.IO handlers beside Chess on the same Render service.
- Move intents carry an expected authoritative revision. The server validates player, turn, revision, coordinates, Xiangqi legality and terminal state before applying a move.
- Xiangqi rules remain independent from `chess.js`: palace/general, flying generals, advisor, elephant eye/river, horse leg, chariot, cannon screen, soldier river behavior and self-check filtering are server-owned.

### Durable state and shared cross-game lock
- Durable games are stored at `families/{familyId}/xiangqiGames/{gameId}` through Firebase Admin.
- Result recovery pointers use `xiangqiRecovery/{uid}/families/{familyId}`.
- Xiangqi reuses the existing `chessActiveUsers/{uid}` active-game lock with `gameKind: "xiangqi"`.
- Chess locks now write `gameKind: "chess"`.
- Therefore one UID cannot hold a live Chess and Xiangqi game simultaneously.
- Chess recovery explicitly ignores a Xiangqi lock rather than trying to open it as a Chess game.

### Server clocks / lifecycle
- Same five time-control shapes are accepted: 3+2, 5+0, 10+0, 10+5, and unlimited.
- Clocks are computed on the server from remaining time + monotonic turn anchor.
- Shared 300 ms timeout sweep; client text ticks are display-only.
- Board-away behavior is server authoritative: leaving the Xiangqi route/app grants one allowance equal to 50% of that player's remaining clock; repeated away packets do not extend it.
- Server restart restores an active durable Xiangqi game as paused. A valid join/reconnect resumes it when players are available.
- Finished results are recoverable until the client reveals and ACKs them.

### Bloom Bot moved to Render
- Xiangqi Bloom Bot no longer chooses or executes moves in the phone screen.
- Bot move choice and execution are server-side and pass through the same `XiangqiGameManager.move` validation as human moves.
- Human-like pacing is server owned:
  - normal bot move: 3000 ms
  - move that gives check: 5000 ms
- Test bot keeps the existing development behavior of bypassing the family new-game quiet window.
- `CHESS_TEST_BOT_ENABLED` remains the single Render-side capability switch for both board-game test bots; no new environment variable is required.
- Bot rematch keeps the real user on the Red side for the current test UI.

### Realtime client
- Added `src/types/xiangqiRealtime.ts` and `src/services/xiangqi/xiangqiSocketService.ts`.
- Socket authentication uses the current Firebase ID token and the existing `ENV.chessSocketUrl` Render endpoint.
- The Xiangqi screen now creates/recovers a server game, joins its room, consumes authoritative state/move deltas, and sends move intents to the server.
- Local Xiangqi engine remains only for legal hints and premove preview/revalidation; it no longer owns authoritative move execution, result, bot, or game clock.
- Route/AppState visibility is sent as server board presence.
- Socket reconnect triggers session recovery.
- Finished result is acknowledged only after the result reveal becomes visible, preventing unseen-result loops.

### Premove / audio / A15 behavior preserved
- Premove may be queued during the opponent/Bloom Bot turn, including the 3 s / 5 s thinking window.
- After the opponent landing, premove is revalidated against the new authoritative board before being sent as a server move intent.
- A15 selected 11 user-provided sounds remain intact and landing-synchronized.
- Chess A15 fast premove and server bot pacing remain intact.

### Human-v-human protocol foundation
Server events exist for Xiangqi app/lobby presence, invite create/receive/accept/reject/cancel/expiry, game join/state/move/ready/resign/resync, recovery, result ACK and rematch entry.

The current Xiangqi phone route is intentionally still the Bloom Bot test surface. A full family-member Xiangqi lobby/challenge UI, color/orientation UX and human rematch voting UI are not claimed as complete in A16. The server protocol foundation is present for that next UI layer.

## Firebase / deployment
- No Firestore Rules or index deployment is required for A16; Xiangqi durable realtime documents are written by the Firebase Admin server.
- Render server **must be rebuilt/redeployed/restarted** for A16 because the authoritative Xiangqi backend is new.
- Existing Render Firebase Admin environment variables are reused.
- Keep `CHESS_TEST_BOT_ENABLED=true` when testing Bloom Bot.
- No new React Native native dependency was added; an A14R1/A15 dev client can run A16 JS with Metro after copy-over.

## Verification
- Phase 17.9A16 Xiangqi Server Authority: 44/44 PASS.
- Current Chess + board-game aggregate: 18/18 phase groups PASS (A16 included).
- Phase 16B15 Chess/Xiangqi smoothness: 50/50 PASS.
- Phase 17.1 tab-switch hotfix: 41/41 PASS.
- Phase 17.9A14 Instant Home/Firebase cleanup: PASS.
- Release Readiness: 11/11 PASS.
- Phase 17.9A15 sound/premove/bot pacing: 27/27 PASS within current aggregate.
- New Xiangqi server/client TS/TSX files transpile without syntax diagnostics.

## Copy-over
1. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` in the existing project.
2. Copy the full A16 tree over the project.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`.
4. Redeploy/restart the Render service from the A16 `server/` source.
5. For the Android client, `npx expo start -c` is sufficient if the A14R1/A15 dev client is already installed.
