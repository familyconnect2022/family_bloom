# Family Bloom · Phase 12 Purpose-aware Hero UI

Checkpoint date: 2026-09-28
Base: Phase 12 Full-screen Flow UI, built on the Phase 11 Performance Hotfix #3 PASS base.

## What changed

- Full-screen/create/edit/manage flows now use a richer Bloom hero that owns the status-bar/top-safe-area surface instead of a white header strip.
- Header illustration changes by purpose:
  - Event: calendar / tulip / envelope motif.
  - Moment: photo / heart / sparkle motif.
  - Family Tree / Relationship: family branch / person nodes / home motif.
  - Profile: portrait / flower motif.
  - Family: home / people motif.
  - Moderation / settings: purpose-specific symbols.
- Event and Moment create/edit keep full-screen Back behavior and unsaved-work protection.
- Family Graph admin: Add/Edit Person and Create Relationship are now full-screen flows; the old draggable sheet/handle is removed.
- Family membership/manage/join/create, join-request review, notification preferences, family selection and create-profile now use the same edge-to-edge purpose-aware header language.
- Warm copy is page-specific; the Family Tree visual is not reused for unrelated pages.
- Compact transient UI stays compact: confirmations, date/time pickers, reaction menus, media viewer, quick search, logout confirmation.

## Regression protection

- Phase 12 UI contract: 25/25 PASS.
- Phase 11 Final Performance Gate static contract: PASS.
- Phase 11.2B harness safety: PASS.
- Phase 11.2B Firebase E2E safety: PASS.
- TypeScript parser/syntax check: PASS for all changed TS/TSX files.

## Runtime test focus

On Android, visually inspect:
1. Event create.
2. Moment create/edit.
3. Family Graph admin / Add Person / Connect Relationship.
4. Family switcher and family membership routes.
5. Notification preferences.
6. Create profile (new-account flow, when convenient).

The header should extend behind the status bar, remain readable, and use page-specific artwork/copy.
