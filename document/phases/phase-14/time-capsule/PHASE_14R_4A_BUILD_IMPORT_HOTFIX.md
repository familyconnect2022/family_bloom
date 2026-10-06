# Phase 14R.4A — Time Capsule build import hotfix

## Problem
Android/Metro could fail in `home-time-capsule-compose.tsx` with `Unable to resolve module ../components/ui/BloomDatePicker` when Phase 14R.4 had been overlaid incompletely.

## Fix
The composer now uses the existing shared Bloom custom date picker at `src/components/ui/BloomInputComponents/BloomDatePicker.tsx`. This component already ships in the Phase 14R.3 baseline, so the Time Capsule flow no longer depends on a newly introduced root-level date-picker module.

The user-facing behavior remains a Bloom-styled in-app calendar, not the Android system date dialog. All Phase 14R.4 realtime/open-state improvements remain unchanged.
