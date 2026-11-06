# Family Bloom P2.15.1 — Focus Shell First + Copy-over Integrity

Date: 2026-10-12
Baseline: P2.15 FULL CODE

## Purpose

Real-device video 6301 showed that large ancestor branches such as Nguyễn Vũ Đôn / Nguyễn Thị Lan could still feel blocked around Focus preparation and Back. P2.15 also exposed a Windows CLEAN/APPLY regression in the Phase 17.9A9 test loader for the new shared board-game lifecycle module.

## Family Graph Focus corrections

- Removed Detail-screen branch prewarm. Large branches never consume JS work before the user taps **Mở nhánh**.
- Removed synchronous revision-cache peek from the cold/new Focus open path.
- Detail remains mounted while its native Modal flips to `visible=false`; this lets Android deliver `onDismiss` instead of forcing the old 240 ms fallback.
- Vendor fallback reduced to 96 ms and is no longer the normal path.
- New/cold Focus opens as a native shell first with `visual=null` and **Đang chuẩn bị cây…**.
- BSH hydration begins only after two painted Focus frames, so the Focus header/Back affordance owns the presentation before topology/layout work begins.
- Branch-to-branch switches use the same shell-first path instead of a 74 ms fade/timer gate.
- Same-person retained Focus Scene still reopens immediately with no remount.
- Cancel-first BSH and revision-keyed caches remain intact.

Expected cold flow:

`tap Mở nhánh -> dismiss Detail immediately -> Focus shell -> loading -> interruptible BSH -> atomic Scene`

Expected hot same-person flow:

`tap Mở nhánh -> Focus retained Scene immediately`

## Windows copy-over / A9 correction

`src/services/games/boardGameSurfaceLifecycle.ts` was present in P2.15, but the custom TS loader in `test-phase17_9a9-chess-lifecycle-mini-premove.js` delegated the relative TypeScript import to Node directly. Node therefore reported a false `MODULE_NOT_FOUND`.

P2.15.1 explicitly loads and maps the shared lifecycle module for that regression test. PRE-COPY does not remove this module. A new P2.15.1 integrity gate verifies the source file, import target, loader mapping, CLEAN/APPLY registration, and Debug/Release build registration.

## Regression gates

Validated before packaging:

- P2.11.3 Cancel-first Focus: 31/31
- P2.11.4 Retained Chunks: 40/40
- P2.12.1 Native Focus handoff: 15/15
- P2.12.3 Native Focus recovery: 23/23
- P2.13: 44/44
- P2.14: 50/50
- P2.15: 65/65
- P2.15.1: 26/26
- Phase 17.9A9: 44/44
- Xiangqi Phase 16B: 29/29

## Real-device verification requested

1. Open Nguyễn Vũ Đôn detail and tap Mở nhánh. Focus header must appear first; if Scene is cold, loading stays inside Focus.
2. While loading is visible, press **Trở về** / Android Back. It must close Focus without waiting for the tree.
3. Repeat with Nguyễn Thị Lan.
4. Reopen the same branch. Once retained, it should appear immediately.
5. Run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`; Phase 17.9A9 must no longer stop on `boardGameSurfaceLifecycle`.
