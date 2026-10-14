# Family Bloom P2.23 — Canonical Chess FULL ↔ MINI Route Ownership

Date: 2026-10-14  
Base: P2.22 Real-Device Pan / First-Move Audio / Cross-Game Quiescence

## Device regression addressed

The Chess minigame could fail to stay minimized, and reopening MINI could create unstable FULL transitions. Source audit found two independent navigation writers for the same authoritative Chess `gameId`: `ChessGlobalUiHost` and `chess-lobby`. Both could route to the command screen when `activeGameId` appeared. That allowed duplicate `/chess-game/[gameId]` entries in the native stack.

A FULL -> MINI action changed the presentation rail to `mini` and called `router.back()`, but if a duplicate Chess command route existed underneath, that route immediately focused and reacquired FULL presentation. The user therefore saw the board remain/full-return instead of the mini card. Reopening MINI with `router.push()` could add another duplicate route and repeat the problem.

## P2.23 invariant

`one authoritative session -> one command route identity -> hidden | mini | full presentation`

Changing FULL/MINI never changes `gameId`, socket identity, clock ownership, or ActiveBoardGameSession.

## Changes

- `ChessGlobalUiHost` is the single automatic Chess active-game navigation owner.
- `chess-lobby` no longer routes `activeGameId` to the game screen.
- Chess route opens from Global UI, Mini card, and Game Hub use Expo Router `navigate()` instead of `push()`, so an existing game route is unwound/reused instead of duplicated.
- FULL -> MINI still uses the presentation coordinator and then returns to the underlying route; the live session remains claimed.
- MINI -> FULL raises the same claimed game, then navigates to/reuses the matching command route.
- Phase 16B17 historical assertion was updated to the successor invariant: Lobby may not resurrect a finished receipt and may not compete for active-game navigation.

## Server

No Render/server protocol change. P2.23 is client navigation/presentation ownership only.

## Verification

- P2.23 FULL/MINI route ownership: **30/30 PASS**
- P2.22 inherited pan/audio/quiescence: **32/32 PASS**
- P2.21 terminal teardown / Focus camera: **80/80 PASS**
- P2.20 lifecycle / Focus pan: **48/48 PASS**
- P2.19 route-owner handoff: **60/60 PASS**
- Phase 16B17 away timeout / successor navigation assertion: **38/38 PASS**
- Phase 17.9A9 mini lifecycle / premove: **44/44 PASS**
- Phase 17.9A11 family recovery / sync: **31/31 PASS**
- Phase 17.9A12/A13/A15/A16/A17/A18 successor gates: **PASS**
- Project structure: **18/18 PASS**
- Build entrypoint audit: **22 BAT files PASS**
- Release readiness: **11/11 PASS**
- Modified BAT files remain CRLF.

## Real-device acceptance

1. Start one Chess game and press the minimize control. The full board must leave once and the mini card must remain visible over the underlying app route.
2. Tap the mini card. The same game must return to FULL without creating another Chess route or restarting the session/clock.
3. Repeat FULL -> MINI -> FULL at least five times. Back navigation must never reveal a second copy of the same Chess game route.
4. While MINI is visible, move between normal app tabs/screens. The mini card remains lightweight while the full 32-piece board runtime stays asleep.
5. Finish the game after reopening from MINI; terminal teardown must still clear the session before Xiangqi can start.
