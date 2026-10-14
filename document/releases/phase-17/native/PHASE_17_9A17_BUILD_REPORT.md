# Family Bloom Phase 17.9A17 — Native-Persistent UI-thread Tabbar

## Base
Phase 17.9A16 Xiangqi Server Authority / Realtime Bot.

## Problem reproduced
Real-device video `6183.mp4` showed a small tabbar hitch at route commit even though the pink indicator already used Reanimated SharedValues. Inspection found two remaining synchronization costs:

1. `lazy:false` kept React screens mounted, but `detachInactiveScreens` was not explicitly false, so React Navigation could still detach inactive native screen views.
2. The pink indicator moved from `indicatorIndex`, while icon color still switched from React Navigation `state.index`, creating two visual clocks.

Moments also toggled a feed-wide `screenFocused` state around focus/blur in the same navigation window.

## Delivered changes

### Native-persistent tab surfaces
- Added `detachInactiveScreens={false}` to the five-tab navigator.
- Retained `lazy:false` and `animation: none` through `BLOOM_MOTION.tabs.animation`.
- Kept `TabRuntimeProvider` lifecycle suspension so inactive tabs can remain native-attached without keeping listeners/timers live.

### One slot / two absolute icon layers
- Preserved A16 `TAB_ICON_SIZE = 26`, 58px row, and the exact icon slot position.
- Each tab owns one `tabIconStack` only.
- Inactive and active-white `Ionicons` are layered with `StyleSheet.absoluteFillObject` inside that slot.
- The two glyphs do not participate separately in layout and therefore cannot push each other, the label, indicator, or tabbar geometry.
- Visual opacity and subtle transform scale are calculated from the same `indicatorIndex` SharedValue used by the pink pill.
- `focused` remains only for accessibility/navigation semantics, not visual color timing.

### Shared UI-thread visual clock
- Pink pill/halo and both icon layers read the same `indicatorIndex`.
- Press-in starts the 232ms motion before navigation commit.
- Navigation reconciliation does not restart accepted motion.
- A16 indicator geometry remains 50x36 with top=11.

### Moments focus commit isolation
- Replaced next-frame feed-wide focus toggling with a 280ms focus gate.
- Rapid switches cancel pending focus timers.
- Unmount cleanup prevents delayed state updates.
- Per-card realtime may stay warm briefly while the UI-thread tab animation finishes, avoiding a competing feed-wide React/native commit in the 232ms visual window.

### Build/gate cleanup
- Added `scripts/test-phase17_9a17-native-persistent-tabbar.js`.
- Added `phase17_9a17:check` and included it in Current Chess aggregate and Android Debug/Release builds.
- Updated A9 / 17.8E historical icon assertions for the intentional one-slot/two-absolute-layer A17 design.
- Updated Phase 17.6-17.8D historical Xiangqi baseline checks to recognize the later A15/A16 architecture.
- Fixed `Family_Bloom_CLEAN_APPLY_FULL.bat`: A16 Xiangqi server gate is now reachable and runs before A17/current/release checks.

## A16 protected baseline
A17 does not modify gameplay/server/Firebase behavior. Protected hashes remain unchanged from A16 for:
- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/ChessSurfaceHost.tsx`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- `src/app/(xiangqi)/xiangqi-preview.tsx`
- `server/src/socket/socketServer.ts`
- `server/src/xiangqi/xiangqiGameManager.ts`
- `firestore.rules`
- `firestore.indexes.json`

## Verification
- Phase 17.9A17 native-persistent tabbar: **35/35 PASS**
- Phase 17.8E icon-only/UI-thread compatibility: **39/39 PASS**
- Phase 17.6 Developer Tools: **53/53 PASS**
- Phase 17.7 Moments: **42/42 PASS**
- Phase 17.8 Planner: **47/47 PASS**
- Phase 17.8A: **31/31 PASS**
- Phase 17.8B: **45/45 PASS**
- Phase 17.8C: **39/39 PASS**
- Phase 17.8D: **52/52 PASS**
- Phase 17 main-tab lifecycle: **56/56 PASS**
- Phase 17.1 tab-switch hotfix: **41/41 PASS**
- Phase 16B.15 Chess/Xiangqi smoothness: **50/50 PASS**
- Phase 17.9A14 Instant Home/Firebase: **PASS**
- Phase 17.9A15 shared board-game runtime: **27/27 PASS**
- Phase 17.9A16 Xiangqi server authority: **44/44 PASS**
- Current Chess/Xiangqi aggregate: **19/19 phase groups PASS**
- Release Readiness: **11/11 PASS**
- Full TS/TSX syntax scan inside current Chess gate: **292 files PASS**

## Runtime / deploy notes
- No native dependency added in A17.
- No Render/server deploy required for the A17 tabbar change itself because server files are unchanged from A16.
- If the device already runs the A16/A14 native build, `npx expo start -c` is sufficient after copy-over.
