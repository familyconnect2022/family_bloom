# Family Bloom H22R2 — Xiangqi CLEAN APPLY source-retention hotfix

## Reported failure (19 Oct 2026)

`H22 XIANGQI REGRESSION FAIL Error: ENOENT: no such file or directory, open '.../src/services/xiangqi/xiangqiLocalRules.ts'` followed by `FAIL: P2.37 verification did not complete`.

## Confirmed root cause

H22R1 FULL ZIP contained the correct `src/services/xiangqi/xiangqiLocalRules.ts`, but `scripts/setup/cleanup-overlay-routes.js` called the old `pruneDirectoryExcept('src/services/xiangqi', ['xiangqiSocketService.ts'])`, deleting **all other files** from `src/services/xiangqi`, including the new H22 rules module. CLEAN APPLY called this legacy cleaner before H22 parity tests. The missing file error was therefore deterministic after a complete overlay, rather than proof of an incomplete ZIP or a Gradle/Render issue.

## H22R2 changes

1. Replace unsafe directory-wide pruning of Chess/Xiangqi service folders with explicit cleanup of **three named retired files**: `chessSurfaceStore.ts`, `xiangqiSurfaceStore.ts`, `xiangqiSessionBootstrap.ts`. New or future service files are retained.
2. Add `scripts/test-h22r2-cleanup-retention.cjs`: checks ten required source files and runs the **real** cleaner twice inside a throwaway test project, proving that Chess/Xiangqi sockets, Xiangqi local rules and hypothetical future modules are preserved while named retired files are removed.
3. Run H22R2 source completeness checks **before and after CLEAN APPLY cleanup**, and add regression guard to CLEAN APPLY, Build & Share, direct Android Release build, EAS build and EAS post-install hook.
4. Update legacy P2.37 full-copy checker to forbid prune-whole-directory and to recognize the current H22R1 developer screen rather than outdated H9B copy.
5. Preserve Chess H21R6, Xiangqi H22, Bloom Bot invitation countdown H22R1, and native Android binary identity (`1.3.22`, `versionCode 143032`, `P2.37R2C-H22-native-1`). No new server protocol or Kotlin changes.

## Checks executed in this environment

- H22R2 safe source retention test, real cleaner twice in isolated fixture — PASS.
- Actual H22R2 source copy: run cleanup, verify `xiangqiLocalRules.ts` preserved byte-for-byte by SHA-256, rerun H22 tests — PASS.
- H22 Xiangqi server/native parity: **22/22 PASS** (includes H22R2 protection assertion).
- H22R1 Bloom Bot 60-second invitation: **10/10 PASS**.
- P2.37 FULL source/import/native integrity: **31/31 PASS**.
- P2.35 already-in-game recovery: **37/37 PASS**.
- P2.32 client foundation: **76 PASS**.
- H21R5 durable cold recovery: **14/14 PASS**.
- H21 invite/away server behavior: **32/32 PASS**.
- H21R4 readiness/Build & Share: **12/12 PASS**.
- H20 mini/premove isolation: **16/16 PASS**.
- Full-source import graph: **299 files / 1766 imports, PASS**.

Some unrelated historical phase checks are snapshot tests for superseded UI designs and may not pass (e.g. old P2.33 presentation checks); do not interpret those as validated here. Actual Windows CMD, Gradle, Android compilation and physical-device deployment were **not performed** in this environment.

## Install / recovery from failed H22R1 CLEAN APPLY

1. Stop any running Metro/Gradle build. Back up the existing project folder.
2. **Extract the H22R2 FULL ZIP into a different folder, outside the existing project.**
3. In the extracted H22R2 folder run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` and enter the existing project's root folder when prompted. (Do not run the stale H22R1 copy of the BAT.)
4. Copy **all** contents of the extracted H22R2 folder into that existing project folder, replacing the old files. This restores the rules module deleted by H22R1 CLEAN APPLY and updates the dangerous cleanup script.
5. In the updated existing project run `Family_Bloom_CLEAN_APPLY_FULL.bat`. It will check all required files before and after cleanup.
6. Then run `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Missing sources must block rather than quietly producing an invalid release.

You can verify directly in the project folder with:

`node scripts/test-h22r2-cleanup-retention.cjs`

and

`node scripts/test-h22-xiangqi-parity.cjs`

No Render redeployment is needed solely for H22R2, because the server is unchanged from H22R1. If the H22 server from the previous release has not yet been deployed, deploy that server separately.
