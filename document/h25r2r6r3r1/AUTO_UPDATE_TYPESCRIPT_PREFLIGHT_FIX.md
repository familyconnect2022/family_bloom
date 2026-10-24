# Family Bloom H25R2R6R3R1 — Auto Update pre-install TypeScript fix

## Symptom confirmed on Windows Node.js v24.20.0

`Family_Bloom_AUTO_UPDATE_FULL.bat` stops at source-only preflight after printing
`H25R2R6R2 TWO-STAGE READY REGRESSION: 14/14 PASS`:

```
Error: Cannot find module ...\server\node_modules\typescript
...\scripts\tests\release\test-h25r2r6r2-chess-ready-vm.cjs
...\scripts\tests\release\test-h25-firebase-invitation.cjs
```

The previous H25R2R6R3 source gate inadvertently invoked a dynamic test that imports
TypeScript. Clean FULL ZIP packages intentionally exclude both `node_modules/` and
`server/node_modules/`. The automatic updater performs this source-only test **before**
backups/copy/npm-install, so it failed even though no source file was missing.

## Fixed order

1. **Before touching existing project:** dependency-free static source gate still checks
   Firebase invitations, two-stage READY state, native Chess orientation and release package.
2. Back up old project, run PRE COPY cleanup, overlay source, verify, CLEAN APPLY.
3. **After installing/checking root dependencies** with
   `Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat`: run the actual ChessGameManager VM
   dynamic test `scripts/tests/release/test-h25r2r6r2-chess-ready-vm.cjs`. If it fails, CLEAN APPLY,
   Build & Share, direct APK and EAS scripts stop. It has **not** been disabled.

The regression `scripts/tests/release/test-h25r2r6r3r1-auto-update-ts-preflight.cjs` executes the
source gate with global module search disabled to reproduce a clean Windows zip.

## Upgrade / safety

This is a maintenance-only fix to R3, not a change to Chess logic, Kotlin renderer,
Firebase, native APK package or app version. Android remains v1.3.31 / 143041.

Use `Family_Bloom_AUTO_UPDATE_FULL.bat` from THIS R3R1 FULL ZIP. It should offer to
reselect missing saved target paths and save them only after success. User credentials,
`.env`, Firebase configuration and installed dependencies are preserved during overlay.
Generated Android and Gradle caches are not copied. The updater intentionally performs
no APK build. Run `Family_Bloom_BUILD_APK_TO_SHARE.bat` after the updater completes.

If dependency installation fails later, the updater must stop rather than claiming
success. An ordinary network/npm failure is separate from the pre-install bug fixed here.
