FAMILY BLOOM R6R1 -- FIX P2.37 LEGACY BUILD GATES (2026-10-30)

Base: FULL R6. No Android runtime, Firebase, Cloudinary, Vercel, Render or Web source changed.
Fixes 4 stale source-text assertions which reject newer legitimate implementations:
1. H23R3 bootstrap expects only literal require.resolve('typescript') instead of verifying looped SDK57 packages.
2. R2R4 journey asserts exact older lineage list even though R5 exists.
3. H10R2 welcome test asserts removed setShowWelcome string, rather than uid/family welcome guard.
4. H6 navigation test asserts old import order, rather than Stack and protected auth routes.
Also adds the ORIGINAL R6 critical-source fingerprint to the safe updater so FULL R6R1 may update R6 without disabling lineage gates.

Prefer PATCH ZIP if R6 Auto Update already copied files and stopped inside Clean Apply: patch just four test files, then rerun existing CLEAN_APPLY_FULL (not Auto Update).
Alternatively extract this FULL R6R1 ZIP separately and run Auto Update onto an unmodified R6 target (new backup + overlay), only when compatibility check passes.
Never copy full ZIP by hand or bypass source-lineage verification.

Verified: 43/43 release Node gates, 23/23 historical Node gates, 13/13 npm-entry Node gates, 14/14 TypeScript dependency bootstrap tests, 4/4 R6 lineage regression, R6 original auto-update check accepted, tampered original rejected, patch idempotent and rollback verified.
Unverified: Windows BAT execution, full npm install with Android native packages, Gradle assembleRelease / APK, Firebase and Cloudinary live environment.
