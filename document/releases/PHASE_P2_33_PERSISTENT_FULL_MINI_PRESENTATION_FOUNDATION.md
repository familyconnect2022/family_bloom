# Family Bloom P2.33 — Persistent Full/Mini Presentation Foundation

Date: 2026-10-16  
Base: P2.32 Client Game Reset + Foundation

## Goal

Start the Chess/Xiangqi client rebuild from a deliberately tiny presentation primitive before any board, match route, or production realtime lifecycle is reintroduced.

P2.33 builds only:

- persistent root-level Full presentation;
- persistent root-level Mini presentation;
- explicit `IDLE / FULL / MINI` state;
- deterministic Close reset;
- Mini drag + edge snap;
- Chess/Xiangqi activation labels from Home Games;
- Xiangqi piece asset conversion from WebP to PNG.

No ChessBoard or Xiangqi board renderer exists in this phase.

## 1. Xiangqi assets: WebP -> PNG

All 14 Xiangqi piece assets under `assets/xiangqi/` were converted to transparent RGBA PNG:

- seven Red pieces;
- seven Black pieces.

The old `.webp` payloads are removed. `asset-manifest.json` now records `format: "png"` and a SHA-256 for each PNG.

Verification decoded every old P2.32 WebP and every new P2.33 PNG to RGBA and compared pixels directly: **14/14 exact pixel equivalence**. The artwork is unchanged.

Chess's 12 existing PNG pieces remain byte-identical. The 11 canonical board-game MP3 files remain byte-identical.

## 2. Persistent root presentation

New source:

- `src/components/games/BoardGamePresentationRoot.tsx`
- `src/services/games/boardGamePresentationStore.ts`

`BoardGamePresentationRoot` is mounted once inside the root `GestureHandlerRootView`, as a sibling after the tab/navigation subtree. It is not owned by Home Games, Chess, Xiangqi, or any Expo Router screen.

Inside the root are two persistent sibling views:

- Full view;
- Mini view.

Both exist for the lifetime of the app root. Hiding them means moving them completely off-screen, not unmounting them.

## 3. Deliberately tiny state model

The presentation store contains only:

```text
activeKind: chess | xiangqi | null
mode: idle | full | mini
fullContent: chess | xiangqi | null
miniContent: chess | xiangqi | null
```

It intentionally contains no:

- gameId;
- FEN/board state;
- socket;
- clock;
- recovery;
- ready/prewarm;
- route owner;
- surface owner;
- gameplay/session lifecycle.

Protocol/realtime remain a separate foundation and are not consumed by the production presentation yet.

## 4. Canonical states

### IDLE

```text
activeKind = null
fullContent = null
miniContent = null
Full shell = mounted + parked off-screen
Mini shell = mounted + parked off-screen
```

### FULL

```text
activeKind = chess | xiangqi
Full = visible
Mini = parked off-screen
```

The Full view is 85% of phone width and 85% of phone height, centered, with the agreed pink prototype background.

### MINI

```text
activeKind = chess | xiangqi
Full = parked off-screen
Mini = visible
```

Mini can be dragged with one finger. Its Y coordinate is clamped to the safe screen area; on release it snaps to the nearest left/right edge. Tapping Mini returns to Full.

## 5. Close invariant

Close is deliberately one deterministic operation:

```text
Close
-> activeKind = null
-> fullContent = null
-> miniContent = null
-> mode = IDLE
-> React commit removes all Full/Mini inner content
-> persistent Full shell parks off-screen
-> persistent Mini shell parks off-screen
```

The two root shells are never recreated because of Close.

This is the canonical behavior for both Chess and Xiangqi going forward.

## 6. Home Games prototype entry

The Chess and Xiangqi cards in Home Games now expose `Thách đấu` prototype actions.

They do **not** create a realtime invitation or production match yet. They only call the new presentation primitive:

```text
Chess Thách đấu -> activate("chess") -> FULL Chess label
Xiangqi Thách đấu -> activate("xiangqi") -> FULL Xiangqi label
```

The Xiangqi card loads the new `assets/xiangqi/red_general.png`, giving a real runtime check that the PNG asset path is bundleable.

## 7. Preserved P2.32 foundation

Unchanged:

- complete `server/` tree;
- Chess/Xiangqi server protocol;
- authoritative managers/rules;
- Socket.IO invitation/session/recovery protocol;
- Firestore persistence/recovery;
- two-minute invitation expiry;
- cross-game reservation/busy lock;
- Bloom Bot server behavior;
- low-level client socket transports;
- Developer Tools -> Bloom Bot protocol test;
- Chess PNG art;
- board-game sound pack.

Checksum comparison against P2.32 confirms the entire `server/`, all 12 Chess PNGs, and all 11 board-game MP3s are byte-identical.

## 8. Copy-over safety

`scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` now:

- runs the P2.33 regression gate;
- removes obsolete `assets/xiangqi/*.webp` when copying over an older tree.

`cleanup-overlay-routes.js` was corrected so it no longer deletes the new `src/components/games/` presentation directory while it continues deleting all retired gameplay UI/lifecycle code.

The cleanup script was executed on a cloned P2.33 tree and the P2.33 gate still passed afterward.

## 9. Verification

- P2.33 persistent Full/Mini presentation: **44/44 PASS**
- P2.32 clean client foundation regression: **76/76 PASS**
- P2.12.4 preserved board assets/build: **27/27 PASS**
- P2.12.5 standalone APK/share contract: **26/26 PASS**
- P2.12.6 dependency contract: **20/20 PASS**
- P2.12.7 Expo Asset peer contract: **14/14 PASS**
- P2.12.8 Windows Expo Doctor launcher: **18/18 PASS**
- Project structure: **18/18 PASS**
- Effective Expo config: **PASS**
- Board audio integrity: **PASS**
- Build entrypoint audit: **PASS (22 BAT files)**
- Web W1: **41/41 PASS**
- Web W2: **71/71 PASS**
- Web W3: **34/34 PASS**
- Release readiness: **11/11 PASS**
- TypeScript/TSX syntax transpile: **286/286 PASS**
- Relative import audit: **PASS (286 files)**
- Xiangqi WebP -> PNG decoded pixel equivalence: **14/14 exact**
- `server/` comparison against P2.32: **byte-identical**
- Chess PNG + board audio comparison against P2.32: **byte-identical**

## Typecheck/build limitation

The FULL source baseline intentionally contains no root `node_modules/` or `package-lock.json`. A dependency-aware `tsc --noEmit` therefore cannot resolve `expo/tsconfig.base` in this packaging environment. Syntax transpilation and relative-import checks were run across all active source files instead.

No Android APK compile is claimed from this packaging environment. The included CLEAN/APPLY and Android build BAT files retain dependency bootstrap and regression gates for the user's build machine.

## Next step — intentionally not part of P2.33

Do not add a Chess/Xiangqi board yet until real-device testing accepts:

1. Chess -> Full;
2. Full -> Mini;
3. drag Mini + edge snap;
4. Mini -> Full;
5. Close -> content becomes null and both shells park;
6. repeat the same flow for Xiangqi;
7. navigate between ordinary app routes while Mini is visible and confirm Mini persists.
