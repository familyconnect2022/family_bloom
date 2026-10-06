FAMILY BLOOM — PHASE 14T.0A PATCH
SINGLE ANDROID IDENTITY + ROOT HYGIENE

Base: Phase 14T HOME_GAMES_V1 FULL (2026-10-02)

IMPORTANT FOR PATCH USERS
1. Merge/overwrite the patch into the Phase 14T project.
2. From project root run once:
   node scripts/setup/apply-phase14t0a-cleanup.js
3. Confirm:
   npm run phase14t0a:check

The one-time cleanup removes obsolete dual-app files and moves legacy root TXT files into managed folders. FULL source already has this cleanup applied and does not need step 2.

Current Android identity:
- Family Bloom
- com.familybloom.android
- familybloom
- google-services.json

Debug and Release are build modes of the same Android app identity.
Use two real devices or an OS clone/profile for simultaneous-account testing.
