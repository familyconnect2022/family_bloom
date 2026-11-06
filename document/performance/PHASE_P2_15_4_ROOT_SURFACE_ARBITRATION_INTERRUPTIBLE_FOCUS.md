# Family Bloom P2.15.4 — Root Surface Arbitration + Interruptible Focus BSH

Date: 2026-10-13

## Scope

P2.15.4 finalizes the shared persistent-surface architecture without adding new product UI.

### Bloom Root Surface Manager

- `BloomSurfaceStack` no longer reads Chess/Xiangqi prepared hooks.
- One canonical z-order authority lives in `bloomRootSurfaceManager.ts`.
- Game hosts, Focus and global game UI remain independent lifecycle owners.
- When Family Graph Focus is visible, the game plane is occluded and cannot receive input.
- Chess Mini is hidden immediately but remains mounted.
- Chess full and Xiangqi full retain their native/runtime state while presentation work is suspended.
- Incoming Chess challenge state is retained but its overlay/action is suspended until Focus closes.

### Focus Back / cancellation

- Focus remains a process-persistent root surface; no native Android Modal is attached/detached for repeated opens.
- Back invalidates the current Focus build token before hiding presentation.
- Focus branch traversal now yields/cancels inside descendant BFS, partner expansion and relationship materialization.
- Focus scene projection yields/cancels inside people/connections filtering, bounds calculation and routing-plan map/set filtering.
- Cooperative work budget is approximately 5 ms per slice.
- The route reuses its already-created FamilyGraphQueryEngine and Full-Tree topology revision, avoiding redundant index/fingerprint work on Focus opens.
- A stale Focus build cannot commit into a later reopen.

### Regression fix

P2.15.3 referenced `useChessSurfacePrepared` / `useXiangqiSurfacePrepared` from `BloomSurfaceStack` without importing them. P2.15.4 removes that root dependency entirely instead of adding imports, matching the finalized ownership architecture.

## Verification

Key gates run before packaging:

- P2.11.3 Cancel-first Focus: 31/31
- P2.11.4 Retained Chunks: 40/40
- P2.13: 44/44
- P2.14: 50/50
- P2.15: 65/65
- P2.15.2: 30/30
- P2.15.3: 40/40
- P2.15.4: 40/40
- Chess A9: 44/44
- Shared board audio A15: 27/27
- Current Chess aggregate: 21/21
- Project structure: 18/18
- Build entrypoint/BAT CRLF audit: PASS
- Exact supplied board-game MP3 pack: 11/11, 60,419 bytes
- FamilyGraph Query/Scene TypeScript semantic compile: 0 errors
- Synthetic 320-person Focus branch: interruptible result matches synchronous topology; cancellation interrupts traversal.
