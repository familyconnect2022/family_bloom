FAMILY BLOOM P2.28 R2 - COPY OVER
================================

1. Run scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat against the old project.
2. Copy this FULL package over the existing project.
3. Run scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat.
   - P2.28/build/runtime gates remain blocking.
   - Existing TypeScript diagnostics are warnings and no longer block Android test builds.
4. For device testing, run:
      npx expo run:android
5. For a standalone share APK, run:
      scripts/android/build/Family_Bloom_BUILD_APK_AND_SHARE.bat

R2 fixes:
- Family Graph crash: stale detailFocusHandoffPending reference.
- Build/share legacy gate incompatibilities.
- Typecheck incorrectly blocking Metro/Gradle test builds.

No new server logic was introduced by R2 relative to P2.28 R1.
