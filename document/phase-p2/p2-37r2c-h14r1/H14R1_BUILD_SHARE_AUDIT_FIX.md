# Family Bloom P2.37R2C-H14R1 — Build & Share BAT audit repair

## Reported failure

Build & Share stopped at `Build entrypoint audit: FAIL (36 BAT files)` before Gradle. The reference FULL CODE H13 and H14 source trees each contain exactly 32 BAT files. An overlayed local project can retain files from previous releases. The screenshot shows only the tail of the audit: the first failure was scrolled offscreen, so the exact triggering extra or official BAT cannot be confirmed without a complete log.

## Fix

- `scripts/setup/bat-entrypoints-manifest.json`: versioned, canonical list of the 32 BAT entrypoints shipped in H14/H14R1.
- `scripts/setup/check-build-entrypoints.js`: continue strict CRLF, `npm run` and `node *.js` validation for ALL canonical BAT entrypoints. A missing or invalid canonical entrypoint still FAILS the build.
- Unknown BATs are reported by exact relative path as `WARN UNMANAGED BAT`, not executed or trusted; they no longer block a build of the official entrypoints merely because they exist in an overlay directory. No files are deleted.
- When a canonical BAT fails the audit, repeat all `FAIL` diagnostics at the bottom before `Build entrypoint audit: FAIL` so that the first error is visible even in the last console screen.
- Run the H14R1 fixture test as part of `CLEAN APPLY FULL` and release APK build: `node scripts/tests/history/test-phase-p2_37r2c_h14r1-build-entrypoints-copy-over.js`.
- Updated H14R1 label for Build & Share. **NO app runtime, Kotlin, Firebase, server or app identity changes** from H14; same `versionCode 143024`.

## Applying H14R1 to the existing Windows project

1. Extract the H14R1 FULL ZIP into a **new, empty source folder**. Do not extract inside `node_modules` or an already generated `android/` folder.
2. If copying over a project folder, use the supplied `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` from the new FULL source first, with the existing project path, then overlay the new source. Avoid overwriting `.env`/local signing material with unrelated files.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`, and then launch the **root** `Family_Bloom_BUILD_APK_TO_SHARE.bat` from the H14R1 source. The root BAT routes into the official release build script.
4. If the audit prints `WARN UNMANAGED BAT`, review the names. Optionally back them up to a folder **outside the source tree**, then remove only files identified as retired. Do not erase folders blindly.
5. If you still get `FAIL`, run from the source root:

   `node scripts\setup\check-build-entrypoints.js > "%USERPROFILE%\Desktop\family-bloom-bat-audit.txt" 2>&1`

   Send the log, which will contain repeated failures at its end. Do not bypass the build gate.

## Verification executed here

- Clean shipped H14R1 source: `Build entrypoint audit: PASS (32 shipped BAT files, 0 unmanaged)`.
- Fixture BAT audit regression 11/11: unowned legacy BAT warnings, required canonical BAT CRLF/script integrity, missing canonical file, bottom-of-screen failure replay.
- H11/H12/H13/H14 gameplay/presentation source test gates passed; P2.37 full copy integrity 31/31 and native binary identity 14/14.
- Source import integrity: 292 files, 1720 imports; syntax transpile 292/292.

## Not run

Windows CMD BAT execution, Gradle/Kotlin compilation, APK installation, and device runtime regression. H14R1 is tooling-only and needs no Render deployment.
