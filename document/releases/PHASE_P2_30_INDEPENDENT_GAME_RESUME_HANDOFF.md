# Family Bloom P2.30 — Independent Game Resume + Handoff Stabilization

Date: 2026-10-15  
Base: P2.29 — Stable Waiting Shell + Independent Chess/Xiangqi
Evidence: real-device videos `6383.mp4`, `6384.mp4` and screenshot `6385.jpg`

## Scope

This phase fixes the two real-device lifecycle regressions without rejoining Chess and Xiangqi into a shared runtime. Family Graph is intentionally untouched.

## 1. Chess FULL -> MINI no longer loses the mini card

`ChessSurfaceHost` used to call `minimizeChessSurface()` without the route owner. The Chess surface store correctly rejects an ownerless release when the FULL surface is owned by a route instance. Navigation then went Back while the store remained `mode: full`; `ChessMiniHost` therefore had no MINI state to render.

P2.30 releases with the exact current Chess owner before `router.back()`. The realtime game id/socket/session are not cleared.

## 2. Chess resumes the authoritative board position

Video `6383.mp4` showed the clock/session continuing while the visible pieces returned to the initial setup after reopening. The failure was visual hydration, not server state loss.

`ChessBoard` creates its 32 native piece refs over several frames. A snapshot could reconcile the logical runtime before a late native controller existed. That controller then retained PieceLayer's initial square until another packet arrived.

Each controller now synchronizes immediately from `runtimeRef` when it registers, including current artwork, square, orientation and captured/visible state. This closes both orderings:

- controller first -> snapshot later;
- snapshot first -> controller later.

## 3. Chess route ownership ignores transient null recovery frames

The Chess route now retains its concrete game id while its own surface still owns that game. A brief `activeGameId === null` during accept/recovery does not send the route to Home Games and does not execute a focus cleanup. Authoritative terminal teardown remains distinct because terminal handling clears the Chess surface game id first.

## 4. Xiangqi board no longer disappears at waiting -> active

Video `6384.mp4` showed the board correctly painted, then disappearing exactly when the match became active. Two presentation effects could react to a transient `activeGameId` emission: the global route latch could be cleared/re-navigate, and the focused game route could run cleanup because its callback depended on `activeGameId`.

P2.30 keeps a concrete Xiangqi routing latch through transient null frames and ties the FULL lease to route focus rather than every realtime id emission. Xiangqi keeps its own refs/store/route; no Chess helper is imported.

## 5. Accepted challenge is consumed, so Back cannot reveal ∞ fallback

Screenshot `6385.jpg` was the old Xiangqi challenge screen underneath the active game. Once the invite was accepted, `outgoingInvite` had already been cleared; that waiting screen therefore had no time-control payload and displayed its normal unlimited fallback (`∞`). The server had not converted 10+0 into unlimited.

When a concrete game is created from a challenge route, each game's global UI host now uses `router.replace(...)` for that handoff. The waiting challenge is removed from the stack. Normal resumes from elsewhere continue using `navigate(...)`.

## 6. Game Hub restore

When an active Chess/Xiangqi card is pressed, Home Games first raises that game's independent surface to FULL, then navigates to the matching game route. It never creates a fresh session or resets the board.

## Independence boundary

Still enforced:

- Chess and Xiangqi have separate realtime contexts;
- separate surface stores and owner predicates;
- separate routes and focus leases;
- separate renderers and terminal cleanup;
- no shared `GameBoardHost`;
- no shared game presentation lifecycle helper.

The only cross-game coordination remains the small server pending/active busy guard already present in P2.29.

## Validation gate

Added `phaseP2_30:check` covering the exact regressions above and wired it into Clean Apply, Android Debug, Android Release, and APK share metadata.
