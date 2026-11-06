# Family Bloom P2.31 — Route-Owned Match + Active Mini

Date: 2026-10-15  
Base: P2.30 Independent Game Resume Handoff

## Goal

Remove the game Surface/SurfaceHost ownership model and return Chess and Xiangqi to the simpler match contract:

- one live match = one concrete route identified by `gameId`;
- the route owns the full match page and board renderer;
- leaving the route does **not** end the authoritative session;
- while an active match exists and its route is closed, a lightweight MINI card represents that exact `gameId`;
- tapping MINI opens the same route with the same `gameId` and hydrates the latest authoritative snapshot;
- terminal state destroys the live session identity/cache and the game route/board unmounts completely.

Chess and Xiangqi remain two independent runtimes. They do not share a board host, surface store, renderer, route lifecycle, or game-state ownership layer.

## 1. FULL -> MINI -> FULL

### FULL

Chess full play lives only in:

`/(chess)/chess-game/[gameId] -> ChessGamePage -> ChessBoard`

Xiangqi full play lives only in:

`/(xiangqi)/xiangqi-game/[gameId] -> XiangqiGamePage -> XiangqiGameBoard`

The match route parameter is the concrete server game identity.

### MINI

Pressing Back/minimize closes the match route. It does not clear the provider's active `gameId` or authoritative snapshot.

The root MINI card is only a projection of the still-live session:

`activeGameId exists + matching game route absent -> MINI visible`

MINI owns no board renderer and cannot create/revive a match.

### Restore

Tapping MINI navigates to the matching dynamic route with the same `gameId`. The route waits for the exact cached/server snapshot before mounting the board. It does not paint the initial chess/xiangqi position as a temporary fallback.

## 2. Chess changes

- `ChessGamePage.tsx` now owns the Chess board and match chrome directly.
- `ChessGameRoute` reads `[gameId]` and guards only authoritative session identity/recovery.
- `ChessMiniHost` reads `activeGameId` + current pathname; it no longer depends on `chessSurfaceStore` or presentation mode.
- `ChessRealtimeProvider` remains the single Chess transport/state owner.
- Terminal Chess state publishes an immutable result, tombstones the old id, clears active identity/cache/store, ACKs the result, and causes the dynamic game route to leave. The board unmounts with the route.
- A minimized active game keeps its latest authoritative Chess store/cache so MINI -> FULL restores the current FEN/revision/clock instead of the initial board.

## 3. Xiangqi changes

- Added a real `/(xiangqi)/xiangqi-game/[gameId]` match route.
- `xiangqi-preview` is now compatibility redirect only; it no longer owns gameplay.
- `XiangqiGamePage` owns the Xiangqi board and sends only user intents / board-presence commands.
- `XiangqiRealtimeProvider` is the sole listener for Xiangqi state/move transport packets.
- Provider publishes authoritative state into Xiangqi's own runtime cache; route and MINI subscribe to the same cache without opening competing socket listeners.
- Foreground recovery performs `sessionRecover -> gameJoin -> authoritative snapshot -> activeGameId`, so a route cannot open first with an empty/partial board and later be replaced by state.
- Terminal Xiangqi state publishes the immutable result, tombstones/clears the old session cache, clears active identity, ACKs the result, and lets the route/board unmount.

## 4. Retired game presentation architecture

Removed from live source:

- `src/components/chess/ChessSurfaceHost.tsx`
- `src/components/xiangqi/XiangqiSurfaceHost.tsx`
- `src/services/chess/chessSurfaceStore.ts`
- `src/services/xiangqi/xiangqiSurfaceStore.ts`
- `src/services/games/boardGameSurfaceLifecycle.ts`
- `src/components/system/BloomSurfaceStack.tsx`

The root successor is `BloomGameOverlayStack.tsx`, which contains only lightweight global invitation/result/MINI UI. It does not own a full board.

## 5. Navigation ownership

- Challenge -> game uses the concrete dynamic match route and replaces the dead waiting shell.
- Home Games opens the currently active Chess/Xiangqi `gameId` directly.
- Rematch routes to the newly authoritative game id.
- Route focus/blur no longer owns a game presentation mode and cannot silently force FULL -> MINI.
- MINI -> FULL uses the same active game id; it never creates a replacement match.

## 6. Terminal contract

A finished/cancelled match is intentionally different from a minimized match.

### Minimized

- active `gameId`: retained
- authoritative snapshot: retained
- socket/session: retained
- board renderer: unmounted
- MINI: visible

### Terminal

- immutable result: retained only for result presentation
- active `gameId`: cleared
- live snapshot/store: cleared
- recovery identity: cleared
- server result: ACKed
- dynamic game route: leaves
- board renderer: unmounted/destroyed
- MINI: hidden

Therefore the old board cannot remain alive after a finished game and cannot reclaim presentation ownership later.

## 7. Server / Firestore scope

No server source, Firestore rules, Firestore indexes, or backend deployment contract was changed by P2.31. This phase is a native client route/state ownership refactor.

## 8. Verification

Static/regression verification completed in the build workspace:

- P2.12.4 Build Integrity + Chess Audio: **57/57 PASS**
- P2.12.5 Remote Standalone APK + Share Build: **26/26 PASS**
- P2.12.6 Build Dependency Contract: **20/20 PASS**
- P2.12.7 Expo Asset Peer Contract: **14/14 PASS**
- P2.12.8 Windows Expo Doctor Node CLI Launch: **18/18 PASS**
- Project structure: **18/18 PASS**
- Build entrypoint audit: **PASS — 22 BAT files**
- Web W1 companion: **49/49 PASS**
- Web W2 parity: **88/88 PASS**
- Web W3 stability/visual rebuild: **34/34 PASS**
- P2.31 route-owned match + active MINI gate: **48/48 PASS**
- Release readiness: **11/11 PASS**
- TypeScript syntax/transpile parse for the changed active TS/TSX set: **PASS**

A full dependency-resolved app TypeScript build / Android APK compile was not claimed in this workspace because the FULL source baseline does not include installed `node_modules`. `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` retains dependency bootstrap and local diagnostics before Android build.

## 9. Device acceptance checklist

1. Chess: make several moves -> minimize -> MINI appears -> tap MINI -> exact current position/clock returns with no initial-position flash.
2. Chess: wait through waiting -> active handoff -> board must remain visible.
3. Xiangqi: waiting -> active -> all pieces remain visible; no one-piece/blank-board transient.
4. Xiangqi: minimize -> MINI -> reopen -> exact same `gameId` and position.
5. Finish Chess -> result may remain visible, but active session/route/board are dead and MINI is absent.
6. Finish Xiangqi -> same terminal behavior independently.
7. Starting/using one game must not import or claim the other game's renderer/lifecycle.
