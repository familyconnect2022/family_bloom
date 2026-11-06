# Family Bloom H22R7 — Auto Update structure gate fix (2026-10-19)

## Issue reproduced

The H22R7 one-click FULL update bundled **six** intentional root BAT launchers including `Family_Bloom_AUTO_UPDATE_FULL.bat`, but `scripts/maintenance/check-project-structure.js` still required exactly **five**. `npm run structure:check` therefore reported **18/19 PASS** and stopped the updater after copy-over. This was a release-consistency defect, not a user's installation error.

## Fix

- Root BAT allow-list is now derived directly from `scripts/setup/bat-entrypoints-manifest.json`, which already lists all six intentional launchers. Unknown extra BAT files still fail the structural check.
- Updated legacy H4 structure test to validate the manifest rule rather than the old five-launcher text.
- Added a release-source structure preflight **before** backup/cleanup/overlay, then an explicit target structure check **after** copy verification and **before** Clean Apply.
- Expanded automatic updater test to exercise the **actual** structure gate on a copied project, reject a foreign root BAT, and recover when the foreign BAT is removed.
- Preserves all six root BAT shortcuts and the app/native identity of H22R7: versionCode `143035`. No game logic or UI changes in this fix.

## Recovery from failed previous attempt

1. Extract the corrected FULL ZIP to a separate folder outside the existing project.
2. Run `Family_Bloom_AUTO_UPDATE_FULL.bat`; enter the existing Family Bloom project folder if prompted. The updater accepts a same-version source (143035) so reapplying after a partial H22R7 overlay is supported.
3. Let all checks finish. Do **not** build an APK until the updater reports PASS.
4. Use the existing `Family_Bloom_BUILD_APK_TO_SHARE.bat` afterwards, then install the APK and verify versionCode 143035.

Verification caveat: JavaScript source/test scripts execute here, but Windows batch execution, Android Gradle compilation and on-device UI still require testing in the user's Windows/Android environment.
