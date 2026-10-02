Family Bloom Phase 14R.4A - BUILD IMPORT HOTFIX
Date: 2026-10-01
Base: Phase 14R.4 TIME_CAPSULE_UX_REALTIME_HOTFIX

Fixes the Android Metro build error:
  Unable to resolve module ../components/ui/BloomDatePicker
  from src/app/home-time-capsule-compose.tsx

Cause:
Phase 14R.4 composer imported a newly added root-level component. A partial/overlay extraction can update the composer without copying that new file, leaving Metro with a broken static import.

Hotfix:
- Composer now reuses the already-established Bloom custom calendar:
    src/components/ui/BloomInputComponents/BloomDatePicker.tsx
- No dependency on src/components/ui/BloomDatePicker.tsx remains.
- Keeps the Time Capsule custom Bloom calendar (no Android native date dialog).
- Keeps Phase 14R.4 realtime reminder, ready-card shake/CTA, Back button and reveal behavior unchanged.

Apply PATCH:
1. Extract this ZIP into the project root and allow overwrite.
2. From project root run:
     npx expo start -c
   or rebuild with your existing Android build helper.
3. Metro should resolve the date picker from BloomInputComponents.

Validated:
- Phase 14R functional: 49/49 PASS
- Phase 14Q reveal: 34/34 PASS
- Phase 14R.3 Firebase/lock gate: 8/8 PASS
- Phase 14R.4 UX/realtime: 15/15 PASS
- home-time-capsule-compose relative import resolution: PASS
