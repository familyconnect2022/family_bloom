# Family Bloom — Phase 17.5C Build Report

Date: 2026-10-07
Checkpoint: Phase 17.5C — Tab-Owned Guided HUD
Base: Phase 17.5B — Persistent Guided HUD

## Android regression that triggered 17.5C

Phase 17.5B preserved the guided performance session, but the HUD disappeared after leaving Performance Lab and switching to the requested main tab. Device screenshots showed the session was still active while Trang nhà and other main tabs rendered with no test controls.

The shared HUD host in `(tabs)/_layout` was therefore not a reliable owner for visible controls on the current Android navigator surface.

## 17.5C architecture

The guided run remains app-global in `appWidePerformanceService`; only presentation ownership changes.

- The shared `GuidedPerformanceOverlay host="tabs"` is removed from `(tabs)/_layout`.
- Each of the five main tabs now owns its own HUD host:
  - Trang nhà → `/`
  - Kỷ niệm → `/moments`
  - Lịch → `/planner`
  - Cây nhà → `/family`
  - Nhà Mình → `/play`
- Each tab supplies its stable public path directly to the HUD instead of relying on a parent `usePathname()` update.
- `useFocusEffect` explicitly marks a tab HUD active/inactive and re-reads the singleton performance session whenever that tab receives focus.
- Inactive tab HUDs stay hidden even though all five tab surfaces remain warm.
- Root Stack/detail screens keep the existing screen-local HUD through `ScreenContainer` / `BloomKeyboardScreen`.
- Real-route measurement is still manual-confirm only: the tester opens the requested screen and presses `TÔI ĐÃ MỞ ĐÚNG MÀN · ĐO MÀN NÀY`.
- No automatic production-route navigation was reintroduced.

## Files changed for 17.5C

Core runtime/UI:
- `src/components/system/GuidedPerformanceOverlay.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/moments.tsx`
- `src/app/(tabs)/planner.tsx`
- `src/app/(tabs)/family.tsx`
- `src/app/(tabs)/play.tsx`
- `src/app/(internal)/performance-test.tsx`

Build / regression / copy-over:
- `scripts/test-phase17_5c-tab-owned-guided-hud.js`
- compatibility assertions in Phase 17.2 / 17.5 / 17.5A / 15B.1 gates
- `package.json`
- Android Debug / Release BATs
- `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`
- `Family_Bloom_CLEAN_APPLY_FULL.bat`
- `scripts/setup/cleanup-overlay-routes.js`
- `COPY_OVER_README.txt`

## Safety invariants

The following files are byte-identical to Phase 17.5B:
- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/v2/ChessPiece.tsx`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- `src/app/(chess)/chess-game/[gameId].tsx`
- `src/app/(xiangqi)/xiangqi-preview.tsx`
- `server/src/socket/socketServer.ts`
- `firestore.rules`
- `firestore.indexes.json`

No Render or Firebase deploy is required.

## Static/regression gates

- Phase 17.5C Tab-Owned Guided HUD: **31/31 PASS**
- Phase 17.5A Manual Confirm: **22/22 PASS**
- Phase 17.5 Guided Manual: **32/32 PASS**
- Phase 17.2 Performance Runner: **43/43 PASS**
- Phase 17 lifecycle: **56/56 PASS**
- Phase 17.1 Tab-Switch Hotfix: **40/40 PASS**
- Phase 15B App-wide Performance: **35/35 PASS**
- Phase 15B.1: **12/12 PASS**
- Phase 15B.2: **13/13 PASS**
- Phase 15B.3: **19/19 PASS**
- Xiangqi Phase 16B: **26/26 PASS**
- Current Chess aggregate: **16/16 gate groups PASS**
- Release readiness: **11/11 PASS**

## Device acceptance

Only run the 3-step smoke test first:

1. Start `3 bước thử` from Nhà Mình.
2. Open Trang nhà. The guided HUD must be visible directly on Trang nhà; press `ĐO MÀN NÀY`.
3. Open Kỷ niệm. The HUD must appear there; press `ĐO MÀN NÀY`.
4. Open Lịch. The HUD must appear there; press `ĐO MÀN NÀY`.
5. Expect 3/3 completion.

Device PASS is intentionally not claimed until this flow is confirmed on the physical Android device.
