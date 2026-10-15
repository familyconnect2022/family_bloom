# Family Bloom P2.29 — Stable Waiting Shell + Independent Chess/Xiangqi

Date: 2026-10-15  
Base: P2.28 R2 — Independent Focus + independent Chess/Xiangqi lifecycle

## Goal

Remove the visible layout jump between challenge waiting and gameplay, and fix the Xiangqi presentation race seen in real-device video `6381.mp4`, while preserving the strict rule that Chess and Xiangqi are two independent runtime structures.

Family Graph is intentionally untouched in this phase because it already passed device acceptance.

## Architecture boundary

Chess and Xiangqi remain independent:

- separate realtime contexts;
- separate socket protocols;
- separate surface stores;
- separate routes and presentation ownership;
- separate waiting/ready/playing state handling;
- separate renderers and game headers/player rails;
- separate terminal cleanup.

No shared `GameBoardHost`, shared surface lifecycle, or shared game state is introduced.

The only cross-game coordination remains the tiny server pending/active busy lock. It does not own gameplay or presentation.

## 1. Stable waiting shell

Both games now render the final game geometry while an outgoing challenge is pending:

`compact game header -> opponent rail -> board -> user rail`

The opponent rail always contains:

- opponent name;
- a reserved inline status slot;
- the normal game clock in its final position.

During pending acceptance the inline status shows `chưa sẵn sàng` at reduced emphasis. The clock remains visible but frozen. Once the authoritative game starts, the inline status disappears without changing rail height, and only the clock of the side to move begins running.

The old separate status pills and large waiting card were removed from challenge routes, eliminating their geometry change at handoff.

## 2. Stable route handoff

The four challenge/game stack screens use `animation: "none"` during the internal handoff:

- Chess challenge
- Chess game
- Xiangqi challenge
- Xiangqi game

This prevents a navigation animation from being layered on top of an already-changing game surface.

## 3. Chess-specific changes

Chess owns new Chess-only UI pieces:

- `ChessGameHeader.tsx`
- enhanced `ChessPlayerRail.tsx`

The challenge shell and active surface use the same Chess header/rail family and the same width-owned board geometry.

An actual Chess game in `waiting` is no longer covered by the old full-screen Ready/preparing ceremony. Network/reconnect status may still appear when genuinely needed, but normal `waiting` itself does not cover the board.

`chessSurfaceStore.ts` now owns its release-owner predicate locally and no longer imports the shared `boardGameSurfaceLifecycle` helper.

## 4. Xiangqi-specific changes

Xiangqi owns new Xiangqi-only UI pieces:

- `XiangqiGameHeader.tsx`
- `XiangqiPlayerRail.tsx`

The Xiangqi active surface and challenge route use only Xiangqi components.

The critical presentation fix is in `xiangqi-preview.tsx`: a transient `activeGameId === null` is no longer treated as proof that the game ended. The route retains the last concrete Xiangqi game id through the invite -> game/recovery handoff. Only Xiangqi's authoritative terminal cleanup may detach the Xiangqi surface.

`xiangqiSurfaceStore.ts` owns its release-owner predicate locally; Xiangqi no longer imports the shared surface-lifecycle predicate.

## 5. Server pending invitation state

`boardGamePendingReservation.ts` remains a small cross-game busy reservation only. It now records:

- `role: inviter | invitee | participant`
- `phase: waiting_acceptance`
- `inviteId`
- `familyId`
- `gameKind`
- `createdAt`
- authoritative `expiresAt`

Human Chess and Xiangqi invitation creation atomically reserves both real participants with explicit inviter/invitee roles.

Accept validates that both reservations still match the exact invitation and expected roles before creating the game. Terminal reject/cancel/expiry releases all participants for that invite.

This stays in realtime server memory; it is not a Firestore heartbeat/presence system.

## 6. Preassigned side/color

To avoid a board orientation flip at Accept:

- Chess human invites choose `whiteUid` / `blackUid` at invite creation.
- Xiangqi human invites choose `redUid` / `blackUid` at invite creation.
- The accepted game reuses those exact assignments.
- Test-bot invitations also publish their deterministic assignments.

The waiting board therefore already has the same orientation as the eventual authoritative game.

## 7. Build/copy-over safety

Added `phaseP2_29:check` and wired it into:

- `Family_Bloom_CLEAN_APPLY_FULL.bat`
- Android Debug build
- Android Release build
- APK Build + Share

The P2.28 gate remains active as a regression baseline.

Touched BAT files were normalized back to Windows CRLF.

## Verification

- P2.28 invariant gate: **52/52 PASS**
- P2.29 invariant gate: **19/19 PASS**
- Project structure gate: **18/18 PASS**
- Phase 13 release readiness: **11/11 PASS**
- Build entrypoint audit: **22/22 BAT PASS**
- Focused TypeScript transpile/syntax pass: **17/17 changed TS/TSX files PASS**, including both server socket implementations. Full dependency typecheck was not run in this extracted source because the FULL CODE archive intentionally does not contain `node_modules`.

## Device test targets

1. Chess: send invite, verify header/opponent rail/board/user rail do not move when accepted.
2. Chess: verify both clocks are visible while waiting and frozen; after Ready only side-to-move clock runs.
3. Xiangqi: repeat the same visual handoff.
4. Xiangqi: verify board does not disappear during/after `waiting -> active` handoff.
5. Reject/expire: terminal state contains only acknowledgment and returns to the correct lobby.
6. Cross-game lock: while either user owns a pending Chess/Xiangqi invite, starting the other game is rejected until reservation cleanup.
