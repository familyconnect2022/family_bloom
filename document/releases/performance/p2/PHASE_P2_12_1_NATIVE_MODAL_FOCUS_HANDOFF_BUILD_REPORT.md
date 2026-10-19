# Family Bloom P2.12.1 — Native Modal → Persistent Focus Handoff

Date: 2026-10-11
Baseline: P2.12 FULL CODE

## Runtime symptom

Device video 6289 shows the Person Detail page closing quickly after **Mở nhánh**, while the persistent Focus view never becomes visible. The underlying BSH/retained renderer is already faster, so the failure is isolated to presentation ownership rather than topology, layout, geometry, or retained rendering.

## Root cause

`FamilyGraphPersonSheet` was invoking `onOpenBranch(person.id)` and `onClose()` in the same press event. Person Detail is a native React Native `Modal`, while P2.12 Focus is a route-level persistent portal. On Android this allowed the route-level portal to be requested while the native full-screen Modal was still the active presentation window.

The P2.12 portal controller also used two independent updates (`setContent()` then `show()`), leaving an avoidable intermediate presentation state.

## P2.12.1 fix

1. `Mở nhánh` now only requests a pending Focus person.
2. Person Detail becomes invisible first and uses `animationType="none"` only for this branch handoff.
3. `Modal.onDismiss` completes the handoff where supported.
4. Android also uses a two-`requestAnimationFrame` fallback after the instant dismiss commit; no fixed timer is used.
5. Handoff completion is idempotent: pending state is consumed before `handleOpenBranch()` so native `onDismiss` and the fallback cannot open Focus twice.
6. Detail ownership (`detailPersonId` / selection) is cleared before Focus presentation.
7. `FamilyGraphFocusPortal` now exposes atomic `present(content)`, committing content and visibility together.
8. Direct Focus opening outside Person Detail still uses the existing `handleOpenBranch()` path.

## Intentionally unchanged

- BSH Model/Layout/Geometry/Scene pipeline;
- Focus 0.95 entry camera and 42% vertical anchor;
- persistent Focus surface / immediate Back contract;
- retained spatial loading for Focus, 3-gen, 5-gen and Full Tree;
- semantic graph spacing;
- startup tabbar visual-readiness work from P2.12.

## Verification

New gate: `scripts/test-phase-p2_12_1-native-modal-focus-handoff.js`

It verifies the native-modal handoff contract, Android no-timer fallback, atomic portal presentation, direct branch fallback, retained-render invariants, TS/TSX transpilation, and package/BAT registration.

P2.12.1: 25/25 PASS.
P2.12: 44/44 PASS.
P2.11.4: 40/40 PASS.
P2.11.3: 31/31 PASS.
P2.11.2: 30/30 PASS.
P2.11.1: 45/45 PASS.
P2.11: 31/31 PASS.
P2.10: 38/38 PASS.
P2.7: 35/35 PASS.
P2.5: 20/20 PASS.
Phase14F/J, FamilyGraph Query and dense Layout PASS.

The legacy Phase15A structure gate flags pre-existing web/Chess route files that are outside this handoff change. Those files are unchanged from the P2.12 baseline and were not modified merely to satisfy an unrelated assertion.

## Device validation

Primary test: Person Detail → **Mở nhánh**. The Detail native Modal must disappear first, then the persistent Focus portal must appear exactly once. Repeat with Nguyễn Thị Liên, Nguyễn Thị Lan and Nguyễn Vũ Đôn; reopen retained branches; then confirm heavy-branch Back remains immediate.
