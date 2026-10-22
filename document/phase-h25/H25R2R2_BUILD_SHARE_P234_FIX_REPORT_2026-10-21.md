# Family Bloom H25R2R2 — P2.34 updater failure fix (2026-10-21)

## User-reported error

`P2.34 Session/Presentation + Stacked Views: 41/42 PASS`; the `Family_Bloom_AUTO_UPDATE_FULL.bat` stopped during `Family_Bloom_CLEAN_APPLY_FULL.bat`, after it had already created a source backup and overlaid the new files. This is **not a Gradle compilation error**.

## Root cause and correction

`src/app/(home)/(games)/home-games.tsx` opens two independent lobby routes (`/home-chess` and `/home-xiangqi`), consistent with the H25 server-authoritative invitation flow. The old P2.34 verifier still required direct prototype-only `activateBoardGamePresentation('chess'|'xiangqi')` calls from Home. Reintroducing manual surface activation would make this stale test pass but could open unowned game surfaces.

The P2.34 test now confirms the two lobby routes **and rejects unowned manual presentation activation**. The underlying game runtime, Firestore invitation rules, native Android assets, backend protocol, app version (`1.3.29`) and Android versionCode (`143039`) are unchanged in this release.

## Preventing the same failure from changing the existing project

`auto-update-full.cjs check` now runs `scripts/test-h25r2r2-release-preflight.cjs` before the BAT advances to step 1/6 (backup), step 2/6 (clean old project) or step 3/6 (overlay). The preflight includes P2.34, P2.35, H25 Firebase invitations, source ZIP completeness, H25R2 Xiangqi black-turn input, current P2.37R2C native identity and BAT/EAS gate wiring.

`CLEAN APPLY`, `Build & Share`, `Debug` and `eas-build-post-install` also invoke the preflight; the BAT files retain Windows CRLF line endings. A separate wiring test ensures the gate cannot be silently omitted in later packaging.

The legacy `phaseP2_37:check` expects an older native host architecture; current release flows use the newer `phaseP2_37R2C:check`. Do not substitute the obsolete gate for the current one.

## Tests performed in the source environment

- Exact original H25R2R1 P2.34 failure reproduced: **41/42**.
- Updated P2.34: **42/42 PASS**.
- P2.35 (next gate): **37/37 PASS**.
- New H25R2R2 preflight: **7/7 PASS**; BAT/EAS wiring test: **8/8 PASS**.
- H25R2R1 legacy mock/READY regressions H11/H13/H14/H15/H17: **5/5 executable gates PASS**.
- TS/TSX syntax transpile: **305/305 PASS**; BAT entrypoints: **36/36 PASS**.
- Source-only test audit: **64/64 eligible commands PASS** after rerunning large commands individually; **8 environment/artifact-dependent commands not verified** (missing npm-installed dependencies, generated Gradle Android project or built APK).
- Safe-updater simulation: intact FULL source check PASS. Corrupt Home route in a cloned source => preflight exits 1, and no source backup or old-project overlay runs. PASS.

## Windows/Android validation still required

Tests do **not** establish an end-to-end Android APK compilation. On the user's PC, updater / CLEAN APPLY must run dependency installation and native module checks before Gradle, and Gradle must produce an APK that passes native class, asset and SHA256 checks. Do not distribute any pre-existing LATEST.apk as the new build if these steps fail.

## Installing this version

1. Extract **the entire** H25R2R2 FULL ZIP into a new folder outside the existing Family Bloom project.
2. Keep the previous backup. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` from the extracted root.
3. Wait for `PASS` from preflight and CLEAN APPLY. Only then run `Family_Bloom_BUILD_APK_TO_SHARE.bat` in the updated project.
4. H25R2R2 changes verifier / BAT / updater behavior only. No Firebase Rules/Indexes or Render redeploy is required if H25R2 backend was already deployed.
