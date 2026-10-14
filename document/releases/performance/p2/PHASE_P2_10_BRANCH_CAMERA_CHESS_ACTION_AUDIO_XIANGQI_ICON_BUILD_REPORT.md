# Family Bloom — P2.10 Branch Camera + Chess Action/Audio + Xiangqi Icon

Date: 2026-10-11  
Baseline: P2.9 Clean Source Structure + Document Governance

## Scope

P2.10 addresses four real-device regressions reported after P2.9:

1. Genealogy Focus View still placed its preparing UI near the header and a large branch could appear to render as a whole-tree overview.
2. Chess `Cầu hòa / Xin thua` actions were visually occluded by the native board layer on Android.
3. Board-game sound effects stopped producing audible playback after the P2.8 OGG/preload migration.
4. The Xiangqi hub card lost its piece icon.

No Firestore schema, server protocol, Chess authority rule, Xiangqi authority rule, Android application id, or family data contract is changed by this phase.

## 1. Genealogy Focus View

### Root cause

The Focus child still entered through a whole-branch auto-fit path and used the normal tree overscan (`0.85` screen on every side). That made camera culling too permissive and allowed a large branch to visually resemble an overview. The initial JS camera snapshot also did not account for the selected Person being intentionally placed at 42% of viewport height. In addition, visual-ready logic was evaluated before the derived `viewportPeople` block in source order.

The preparing layer was inside the graph shell, but its inner centering view depended on `flex: 1` under an absolute parent. On the tested Android layout this could collapse toward the top of the graph and visually merge with the header.

### P2.10 behavior

- Focus View entry scale is fixed at `0.92`; it never fits the entire branch on initial entry.
- The selected Person is the initial camera target and remains around 42% of the graph viewport height.
- The camera snapshot used by spatial culling now represents the true graph-space center of the visible viewport, including the 42% anchor offset.
- Focus-only overscan is `0.24` screens. Standard/full-tree overscan remains unchanged.
- Focus progressive mounting starts at 28 people and grows in batches of 24, but React Person components are created only from `viewportPersonIds`.
- Focus visual-ready waits for a real `viewportPeople` set and requires the selected anchor to be inside it.
- Kinship-label resolution remains viewport-scoped.
- The preparing shield and its card use explicit absolute-fill geometry inside `focusOverlayGraph`, so `Đang chuẩn bị nhánh…` is centered in the graph viewport rather than the header.

The full branch data still exists so the user can pan/zoom to it. P2.10 changes what is mounted/painted, not the genealogy relationship semantics.

## 2. Chess Cầu hòa / Xin thua

### Root cause

The previous dropdown was a child of `ChessPlayerRail`. On Android, the board was a later native sibling. A high `zIndex/elevation` inside the rail could not escape that native sibling stacking context, so the board painted over the dropdown.

### P2.10 behavior

- The old rail-local `overflowMenu` is removed.
- The ellipsis button remains in the opponent rail.
- The action panel is now a root-screen sibling after persistent Chess content.
- Its layer uses z-index 15000; Promotion/Ready/Result modal remains at z-index 20000.
- The panel uses Bloom Super Hero styling: sparkle badge, soft glow fields, two large action cards, UI-thread opacity/translate/scale timing, and an outside-tap close area.
- User-facing names are now `Cầu hòa` and `Xin thua`; confirmation dialogs use the same wording.

## 3. Native Chess/Xiangqi SFX

### Root cause addressed

P2.8 could mark the process preload as ready even if `preload()` rejected, and `replay()` issued `seekTo(0)` and `play()` without sequencing the asynchronous seek. The native bundle also depended on OGG after previously using MP3.

### P2.10 audio format

The 11 native gameplay sounds were transcoded to AAC-LC in M4A containers:

- mono
- 24 kHz
- total native pack: 33,103 bytes
- move-self: 0.192 s
- move-opponent: 0.192 s

Normal/opponent Chess motion remains 205/215 ms, so the short move SFX can begin with the move and finish around the physical landing window.

Web keeps the existing OGG assets. Native OGG/MP3 board-game files are removed from `assets/audio/board-game`. Copy-over cleanup removes stale native OGG/MP3 files from older installations.

### Playback lifecycle

- Process-level preload is still attempted only once after the persistent board surface is first prepared.
- `Promise.allSettled` records whether preload genuinely succeeded; failure is no longer silently reported as success.
- Long-lived native players then attach their local M4A source through `replace(source)` as a direct fallback.
- Ready state observes the player `isLoaded` state, with a bounded 1.6 s audio wait so audio can never deadlock board readiness.
- First playback at t=0 calls `play()` immediately with no asynchronous seek.
- Replays sequence `seekTo(0)` and only then call `play()`.
- Playback exceptions remain non-fatal to chess moves.

## 4. Xiangqi hub icon

The home-games card no longer renders its icon through `XiangqiPiece` / `expo-image` WebP. A dedicated 128x128 transparent PNG was produced from the finalized red General piece and is rendered with React Native `Image` at a stable 50x50 size.

Asset:

`assets/images/games/xiangqi-general-icon.png`

This change is limited to the hub card. The Xiangqi board keeps its existing piece renderer and assets.

## Copy-over / source governance

P2.10 continues P2.9 governance:

- no `.md` or `.txt` documentation at project root;
- all source documentation stays under `document/`;
- root contains only required build/config files and the two intentional copy-over BAT entrypoints;
- PRE_COPY removes stale native board-game OGG/MP3 assets before overlay;
- CLEAN_APPLY removes them again after overlay and runs the P2.10 gate;
- Debug and Release Android BAT flows run `phaseP2_10:check`.

## Verification

P2.10 dedicated gate: **38/38 PASS**.

Regression gates executed after the final functional edits:

- P2.8 stabilization: **33/33 PASS**
- P2.7 hard-isolated tabbar/branch: **35/35 PASS**
- P2.6 interaction/detail/scroll: **21/21 PASS**
- Phase 17.9A15 shared board-game audio/premove: **27/27 PASS**
- Current Chess aggregate: **20/20 gate groups PASS**
- Phase 17.9W3 web stability: **34/34 PASS**
- P2.9 project structure: **18/18 PASS**

P2.7 also performs a whole `src` TypeScript/TSX transpile scan. P2.10 itself transpiles all four changed TS/TSX files.

## Device verification still required

Static/source gates cannot prove real-device frame timing, native audio output routing, or Android native-layer composition. Verify these exact flows on the physical device:

1. Open a large genealogy branch: loader centered in graph viewport; first useful frame shows only nearby nodes at readable scale; pan reveals the rest without a fit-all jump.
2. Open Chess ellipsis: Super Hero action panel remains fully above the board; test both Cầu hòa and Xin thua confirmation flows.
3. Play several normal/capture/check moves: native SFX begins with piece travel and continues to work on later games without re-preload.
4. Return to Games hub: red Xiangqi General icon is visible immediately.

No server restart is required for these P2.10 client/source changes. Start Metro once with cache clear after copy-over because the native SFX extension changed from OGG to M4A.
