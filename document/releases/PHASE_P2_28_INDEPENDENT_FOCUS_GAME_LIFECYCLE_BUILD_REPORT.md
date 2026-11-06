# Family Bloom P2.28 — Independent Focus + Independent Chess/Xiangqi Lifecycle

Date: 2026-10-15
Baseline: P2.27 FULL

## Scope completed

### 1. Family Graph Focus View is fully independent
- Main Tree and Focus are siblings at the route level; Focus is not nested inside Main Tree.
- Focus owns its own native Modal host, lifecycle, cancellation token, camera SharedValues, Gesture instances, spatial grid, BSH cache, retained-node cache and card/connector renderer.
- Focus uses the same direct pan/pinch camera principles as Main Tree, but no runtime/render/cache/camera object is shared.
- Render-on-pan is retained: nodes are discovered as the camera enters new cells; discovered nodes remain retained and are not discarded when panning away.
- Focus no longer allows selecting another person to re-anchor. To inspect another person, Back to Main Tree and select again.
- Existing yield-first Back behavior is preserved: route detaches Focus immediately and delayed build callbacks are invalidated.
- Focus frame remains 85% of the device window.

### 2. Chess and Xiangqi client ownership is separated
- Removed shared board/session owners: BoardGameSessionBridge, GameBoardHost, activeBoardGameSessionStore, pendingBoardGameReservationStore/actions, boardGamePresentationCoordinator, bloomSurfaceRailStore, xiangqiSessionBootstrap.
- Chess and Xiangqi each own their own realtime context, surface store, board lifecycle and minigame projection.
- Xiangqi owns an independent authenticated Socket.IO client rather than routing through Chess transport.
- Root BloomSurfaceStack contains only lightweight global invitation/minigame/result projections; full boards are route-owned.

### 3. Cross-game eligibility is server-owned
- One small server reservation layer is the only pending cross-game coordination point.
- Human challenge creation atomically reserves both inviter and invitee across Chess/Xiangqi.
- A user who is inviting, invited, or already in an active match cannot simultaneously enter another Chess/Xiangqi challenge.
- Active Firestore locks are self-healing: a lock referencing a missing/finished/cancelled game is treated as stale and removed atomically.
- Finished result UI is not session ownership; terminal games poison/detach local gameId and ACK results independently.

### 4. Invitation lifecycle
- Authoritative invite window: 120 seconds on the server for both games.
- Late Accept/Reject/Cancel after expiresAt triggers expiry cleanup immediately; the +100 ms timer is only a safety net.
- Expiry informs both sides. Invitee sees a warm “Lời mời đã khép lại” message.
- Challenger rejection/expiry state has one action only: “Đồng ý”, returning to the lobby. There is no inline “Mời lại”.
- Re-inviting must start a fresh challenge from the lobby.

### 5. Challenger waiting room + readiness
- Successful outgoing invite sends challenger immediately to a dedicated Challenge Room.
- Challenge Room renders the initial board and preloads critical board-game audio while waiting for acceptance.
- Back/Cancel is yield-first: navigation returns to lobby immediately; socket cancellation follows asynchronously.
- When invitee accepts, the authoritative game is created in waiting state. Both sides only send gameReady after the board has painted and critical audio is ready.
- Server starts the match only when both players are ready. Clocks do not run during waiting/preparation.
- Reconnect to an already-active match is not blocked by audio preload.

### 6. Minigame lifecycle
- Pending challenge mini uses inviteId, not gameId; it is a projection only and never session truth.
- Pending mini appears only when the Challenge Room is not foregrounded.
- Cancel/Reject/Expire destroys the pending mini immediately.
- When a real game becomes active, active-game mini takes over using gameId; stale challenge identity cannot survive.
- Chess and Xiangqi mini implementations/stores are separate.

### 7. Bot test flows
Both Chess and Xiangqi expose two explicit developer/test actions in lobby:
- “Tôi mời Bot” — server cycles: Accept → Accept → Reject → repeat.
- “Bot mời tôi” — tests incoming invitation UI from outside the lobby.

Outgoing Bot response is delayed briefly so Challenge Room, board warm-up, audio and terminal flows are observable.

### 8. Xiangqi correctness fixes included
- Player side is derived from redUid/blackUid; user is no longer assumed to be Red.
- Black-side board orientation inverse-maps pieces, hints, markers and touch coordinates correctly.
- Player/opponent rails, clocks, move sound ownership and turn status use the actual side.

## Validation executed in this environment
- P2.28 invariant gate: 51 PASS / 0 FAIL.
- Phase 13 release readiness: 11/11 PASS.
- Project structure gate: 18/18 PASS.
- Build entrypoint audit: 22 BAT files PASS.
- Effective Expo config: PASS.
- Board-game audio integrity: PASS.
- Changed/new TS/TSX parse check: 43/43 PASS.
- CRLF-aware git diff check: PASS.
- Pure server pending-reservation runtime test: PASS.

## Validation not executable in this container
The source package intentionally does not ship node_modules. An npm install attempt in this container did not complete, so full app/server TypeScript resolution and Android Gradle compilation could not be executed here. P2.28 Windows clean/build BATs therefore enforce the missing final validation on the developer machine:
1. npm install when dependencies are missing,
2. app typecheck,
3. server dependency install/typecheck,
4. P2.28 gate + release/structure/config/audio checks,
5. Expo Android prebuild,
6. Gradle Release APK build.

Do not treat an APK as validated if those BAT steps fail.
