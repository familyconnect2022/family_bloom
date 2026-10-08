# Family Bloom · Phase 17.9A11 — Family Recovery / Reconnect Sync / Time Controls

Date: 2026-10-08  
Baseline: Phase 17.9A10 Tap-Only Chess / External Material Rail / Smaller Mini

## Goal

Close the remaining Chess lifecycle gaps around network reconnect and multi-family switching without changing the stable A10 board geometry or input model. A11 also formalizes all clock presets on one server-authoritative time-control model.

## Reconnect: transport is not game sync

A11 separates Socket.IO transport recovery from authoritative game recovery.

```text
offline / reconnecting
        ↓
transport connected
        ↓
synchronizing
  appJoin(family)
  sessionRecover(family)
  gameJoin(game)
  authoritative state commit
        ↓
connected / board input enabled
```

- A raw Socket.IO `connect` no longer marks a Chess game ready for input.
- Existing board pixels remain mounted while synchronizing; interaction stays blocked.
- The full surface shows “Đang đồng bộ ván cờ…” while authoritative state is restored.
- State packets whose `familyId` differs from the active family are rejected before entering `ChessGameStore`.
- Move deltas are ignored unless the current canonical game belongs to the active family.
- Rejoin/resync never grants clock increment or resets the running clock.

## Multi-family isolation

When a player changes from Nhà A to Nhà B while a Chess game belongs to Nhà A:

1. Client proactively reports old-board absence and leaves Nhà A.
2. Server repeats the cleanup authoritatively.
3. The socket is disconnected from the old Chess runtime membership and leaves `chess:game:<gameId>`.
4. The old-family session binding is cleared before the socket joins Nhà B.
5. Local Chess session state is reset while the persistent native surface may stay warm.

Switching away from a clocked game still uses the existing server-authoritative away allowance. Repeated away packets do not extend that allowance.

## Family-scoped recovery

New recovery request: `chess:session:recover`.

The server returns exactly one of:

- `active` — an active/waiting/paused game for the current family; client joins it and restores the latest authoritative state.
- `finished_unseen` — a finished result that this user has not acknowledged; client restores the final board and Result surface.
- `none` — nothing to restore for this family.

A finished game creates a small server-only recovery pointer at:

`chessRecovery/<uid>/families/<familyId>`

The pointer survives in-memory runtime eviction. Result dismissal or rematch sends `chess:game:resultAck`; acknowledgement deletes only that user’s matching pointer. A stale/wrong game id cannot delete a newer recovery entry.

## Time controls

All supported presets use one typed server model: `{ initialMs, incrementMs }`.

| Bloom label | Initial | Increment |
| --- | ---: | ---: |
| Siêu nhanh · 3+2 | 3 min | +2 s after accepted move |
| Nhanh · 5+0 | 5 min | +0 s |
| Nhanh · 10+0 | 10 min | +0 s |
| Nhanh +5 · 10+5 | 10 min | +5 s after accepted move |
| Không giờ | null | null |

Clock invariants:

- Increment is applied only after one legal server-accepted move.
- Reconnect, rejoin, resync and Result recovery never apply increment.
- Ready handshake still prevents the initial clock from running until both required boards are ready.
- Rematch preserves the exact prior time control while colors swap deterministically.
- Unlimited games intentionally have no away-time loss.

## Preserved A10 / A9 behavior

- Chess pieces remain tap-only; piece drag/drop remains retired.
- One client premove remains server-revalidated before submission.
- Captured pieces and material advantage remain outside HUD cards.
- Mini Chess remains 88 × 40, independently draggable/snappable.
- Heavy full-board subscription sleeps while Mini is active.
- Root Chess has no full-screen `elevation: 1000` and no full-screen alpha fade.
- Ready / Promotion / Result keep one explicit screen coordinate system.
- Battle FX remains retired.
- Rematch TTL/cancel/double-submit protection remains intact.
- Finished in-memory runtime retention remains bounded.

## Intentional outage policy

A Render/process restart remains distinct from one-player connectivity loss. A restored active game is paused and waits for both players to rejoin before its clock resumes.

## Server / Firestore deployment

A11 changes server code relative to A10/A9.

- **Render server deploy/restart is required.**
- Firebase Admin owns the small recovery documents.
- Client Firestore Rules are unchanged.
- Firestore Indexes are unchanged.
- No Rules/Indexes deployment is required for A11.

## Validation

- Phase 17.9A11 behavior gate: **31/31 PASS**
- Current Chess aggregate: **15/15 gate groups PASS**
- Phase 17.9A9 lifecycle/root/mini/premove: **44/44 PASS**
- Phase 17.9A10 tap-only/material/mini: **21/21 PASS**
- Phase 17.6 Developer Tools: **53/53 PASS**
- Phase 17.7 Moments: **42/42 PASS**
- Planner 17.8: **47/47 PASS**
- Planner 17.8A: **31/31 PASS**
- Planner 17.8B: **45/45 PASS**
- Planner 17.8C: **39/39 PASS**
- Planner 17.8D: **52/52 PASS**
- Planner 17.8E: **39/39 PASS**
- Five-tab runtime lifecycle: **56/56 PASS**
- Tab-switch hotfix: **41/41 PASS**
- Xiangqi current logic: **28/28 PASS**
- Release readiness: **11/11 PASS**
- Full TS/TSX transpile gate: **277 files, 0 errors**
- Production relative imports: **0 unresolved** (including TypeScript NodeNext `.js` → `.ts` source mapping)
- Production conflict-marker scan: **0**
- Root BAT files: **Windows CRLF / ASCII-safe command text PASS**

These are source/behavior regression gates. Network handoff timing and family switching should still receive the normal real-Android acceptance pass.

## Copy-over

1. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the current project.
2. Overlay the entire A11 FULL package and replace files.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`.
4. Deploy/restart the included Render server and wait for `/health`.
5. Run `npx expo start -c` or the normal Android Debug/Release BAT.
