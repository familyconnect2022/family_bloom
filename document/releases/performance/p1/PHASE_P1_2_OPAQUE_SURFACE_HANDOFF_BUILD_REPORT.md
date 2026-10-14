# Family Bloom — Android Performance Foundation P1.2

Date: 2026-10-09  
Base: Android Performance Foundation P1.1

## Goal
Remove the brief white/washed tab frame observed on a physical Android device after P1.1, while keeping the smoother persistent-tab continuity and latest-tap-wins behavior.

## Root cause addressed
P1.1 animated whole-scene opacity together with translateX. During the handoff, both attached tab scenes could become partially transparent at the same time, exposing the navigator background for a few frames. The destination content was already mounted; the visible white segment was a transition-compositing gap rather than a data-loading delay.

## Implemented
- Removed scene opacity interpolation entirely. Tab scenes stay fully opaque through the handoff.
- Scene transition is transform-only (`translateX`).
- Reduced scene duration from 168ms to **152ms**.
- Reduced travel from 18px to **14px**.
- Tab pill timing is also **152ms** so pill and content settle together.
- Added explicit Bloom background ownership to both the navigator root and each tab scene (`COLORS.background`, currently `#FFF3F7`).
- Preserved `lazy: false` and `detachInactiveScreens: false` so all five main tab surfaces remain persistent.
- Preserved P1/P1.1 UI-critical-window, delayed live-work restore, rapid latest-tap-wins behavior, and the return-to-stale-state force-commit guard.
- Web tab shell is unchanged.
- Chess/Xiangqi gameplay, server code, Firestore Rules and indexes are unchanged by P1.2.

## Copy-over safety
- Root `.gitignore` remains bundled.
- `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` identifies P1.2 and points to the P1.2 FULL package.
- `Family_Bloom_CLEAN_APPLY_FULL.bat` runs the new P1.2 gate plus inherited P1/P1.1/current gates.
- Android Debug and Release helper BATs run `phaseP1_2:check`.
- No native dependency was added, so a native rebuild is not required solely for P1.2.

## Verification
- P1.2 gate: **26/26 PASS**.
- P1.1 inherited gate: **25/25 PASS**.
- P1 inherited gate: **32/32 PASS**.
- Phase 17.9A17: **33/33 PASS**.
- Phase 17.9A18: **15/15 PASS**.
- Phase 17 five-tab lifecycle: **56/56 PASS**.
- Phase 17.8D navigation/event gate: **52/52 PASS**.
- Phase 17.8E tabbar gate: **39/39 PASS**.
- Current Chess/Xiangqi aggregate: **20/20 gate groups PASS**.
- Release readiness: **11/11 PASS**.
- Web W3 regression gate: **34/34 PASS**.

The extracted FULL package does not include `node_modules`, so project-wide `tsc --noEmit` cannot resolve `expo/tsconfig.base` in the packaging workspace. P1.2 and inherited gates use TypeScript transpile checks on the changed/protected TS/TSX files and all passed.

## Real-device validation target
1. Reproduce the P1.1 transition that showed a white/washed frame; P1.2 should stay fully opaque.
2. Rapidly tap Home → Moments → Planner → Family → Nhà Mình and reverse direction.
3. Test Home → Planner → Home quickly to confirm latest-tap-wins is unchanged.
4. Confirm the tab pill and surface settle together with less perceived drag.
5. Confirm Chess/Xiangqi behavior is unchanged.
