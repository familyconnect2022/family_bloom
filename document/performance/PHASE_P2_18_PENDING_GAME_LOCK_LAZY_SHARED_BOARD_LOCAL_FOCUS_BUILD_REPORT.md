# Family Bloom P2.18 — Pending Game Lock + Lazy Shared Board + Local Focus

Date: 2026-10-14
Base: P2.17.1 Xiangqi Shared Transport + Family Graph First Paint

## Scope

P2.18 closes the Chess/Xiangqi pre-match race and simplifies game presentation without restoring startup prewarm work.

### Board-game pending reservation

- One server-side pending reservation registry is shared by Chess and Xiangqi and keyed by UID.
- Reservation begins before an active game exists: connecting/requesting/waiting-confirmation are treated as busy states.
- A user with a pending Chess session cannot start or accept Xiangqi, and vice versa.
- Cancel/reject/expire/accept release the matching reservation; switching games requires authoritative cancellation acknowledgement.
- Session recovery exposes pending state so app resume/reconnect does not forget the lock.
- Client creates an atomic local lease before the first server ACK to close the fast-tap gap.

### Lazy retained GameBoardHost

- Chess and Xiangqi full boards share one app-root `GameBoardHost`.
- Neither board is mounted at app startup.
- A board layer is created only when the first actual session of that game kind exists.
- Once created, the layer is retained for later matches in the same JS process.
- The inactive layer is parked, non-interactive and accessibility-hidden; the active layer is raised by z-order.
- If the user only plays Chess during a process lifetime, XiangqiBoard is never created.

### Lobby interaction

- Bloom Bot card and family-member challenge rows are whole-card press targets.
- Pending state disables conflicting challenge actions and exposes an explicit Cancel path.
- Game Hub also blocks cross-game selection before entering a lobby.

### Family Graph Focus

- Focus View is route-local inside the Phả hệ tab and no longer belongs to the root presentation rail.
- Initial materialization starts from bootstrap nodes; viewport discovery adds nodes as the user pans.
- Already materialized nodes are retained rather than discarded/rebuilt.
- Expensive Focus model/layout/projection child loops contain cooperative yield/cancellation checkpoints.
- Back/hardware Back hides Focus immediately; stale generations cannot commit after cancellation.
- Legacy root Focus host/store/manager files are removed by both copy-over cleanup BATs.

## Compatibility / regression contracts

Historical gates whose assertions explicitly required root-owned Focus or direct ChessSurfaceHost placement were upgraded to successor contracts while preserving their behavioral safety checks:

- P2.11.3 now verifies immediate route-local Focus dismissal with no root handoff.
- 17.9A12 now verifies app-root ownership through `GameBoardHost` while routes still own zero board pixels.
- P2.17 historical rail gate delegates to the P2.18 successor contract when the retired root Focus files are absent.

## Verification checkpoint before packaging

- P2.18: 86/86 PASS
- Current Chess aggregate: 21/21 PASS
- Xiangqi server authority: 45/45 PASS
- P2.11: 31/31 PASS
- P2.11.1 BSH: 45/45 PASS
- P2.11.2 Focus runtime: 30/30 PASS
- P2.11.3 Cancel-first Focus: 31/31 PASS
- P2.11.4 Retained Chunks: 40/40 PASS
- P2.15.2 Focus reopen + Chess audio: 30/30 PASS
- P2.17.1 shared transport: 25/25 PASS
- Build entrypoint audit: 22 BAT files PASS

Final clean-extraction verification is performed after the FULL ZIP is produced.
