# Family Bloom P2.17.1 — Xiangqi Shared Transport + Family Graph First Paint

Date: 2026-10-14
Baseline: P2.17 Presentation Rail / Single Owner

## Device evidence

In `6337.mp4`, Chess reaches the root presentation surface and is playable. After leaving Chess and entering Xiangqi, the route remains on `Đang kiểm tra phiên Cờ tướng…` for tens of seconds instead of presenting the Xiangqi surface. The same recording also shows the base Family Graph route eventually appearing, which points to cold-entry responsiveness / Focus preparation rather than a missing route.

## Root causes

### Xiangqi

Chess and Xiangqi target the same Render Socket.IO backend and namespace, but P2.17 still gave Xiangqi its own `socket.io-client` instance. The Xiangqi bootstrap waited for that second connection before session recovery. Its cold/recovery timeout could remain pending for up to 70 seconds, so a user who had just used Chess could still be shown a long Xiangqi loading screen even though an authenticated board-game transport already existed.

### Family Graph

The Family Graph route still built the Full Tree scene synchronously from render-time `useMemo`. A cold/heavy topology could therefore spend Model/Layout/Scene work before React had a chance to paint the route shell, making the tap appear ignored. That violates Bloom Scene Hydration's intended separation between presentation and cold scene preparation.

## P2.17.1 changes

### One process-owned board-game transport

- `chessSocketService` remains the single authenticated Socket.IO transport.
- It now exposes generic protocol ACK and protocol event subscription hooks.
- `xiangqiSocketService` is a thin protocol adapter over that transport; it no longer creates a second socket.
- Xiangqi session recovery and invite acceptance remain server-authoritative.
- The root Presentation Rail remains the only owner of Chess/Xiangqi presentation.
- A Xiangqi heavy surface still enters the rail only after a concrete server-confirmed Xiangqi game exists.

### Family Graph shell-first BSH

- A retained scene for the exact immutable snapshot/focus identity can still be consumed in O(1).
- A cold Full Tree scene is built through the existing interruptible BSH pipeline only after one `requestAnimationFrame` boundary.
- The route paints a Bloom loading shell first instead of synchronously blocking presentation.
- Cold work is cancellation-aware and cannot commit a scene for a stale snapshot/focus identity.
- Focus branch work cannot begin before the base Full Tree scene exists.

## Preserved invariants

- Chess/Xiangqi server authority and the single-active-board-game lock are unchanged.
- Render Free / Singapore hosting and the existing server persistence model are unchanged.
- No per-second Firestore presence or clock writes were introduced.
- FocusHost, ChessHost and XiangqiHost remain independent parked root surfaces under the P2.17 Presentation Rail.
- No visual redesign of Chess, Xiangqi or Family Graph was introduced in this phase.

## Validation

- P2.17.1: 25/25 PASS
- P2.17 Presentation Rail: 48/48 PASS
- Phase 17.9A16 Xiangqi Server Authority: 45/45 PASS
- P2.11 Family Graph Topology: 31/31 PASS
- P2.11.1 BSH Scene Runtime: 45/45 PASS
- P2.11.2 Focus Runtime/Presentation: 30/30 PASS
- P2.11.3 Cancel-first Focus: 31/31 PASS
- P2.11.4 Retained Chunks: 40/40 PASS
- Current Chess build gates: 21/21 PASS
- Project structure: 18/18 PASS
- Build entrypoint/BAT audit: PASS (22 BAT files)

## Device retest sequence

1. Enter Chess and reach a live/current game surface.
2. Finish or leave the Chess session so the server clears the active-game lease.
3. Return to Home/Game Hub and enter Xiangqi.
4. Confirm Xiangqi leaves `Đang kiểm tra phiên Cờ tướng…` promptly and only presents after the server returns a Xiangqi session.
5. Cold-open Family Graph from the Family tab; confirm the route responds immediately with its shell rather than appearing to ignore the tap.
6. Open a person and enter Focus View; repeat open/back several times to verify Focus remains interruptible and does not disturb Chess/Xiangqi ownership.
