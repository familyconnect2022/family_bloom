# Family Bloom P2.37R2 — FULL Copy / Import / Native Integrity

Date: 2026-10-17
Base: P2.37R1 Native Binary Proof + Authenticated Native Sibling

## Why R2 exists

Real-device development testing exposed a chain of Metro failures after copy-over:

1. `src/services/chess/chessSocketService.ts` missing;
2. `src/components/games/BoardGamePresentationRoot` missing;
3. after restoring those files, Metro could not resolve the bare package import `family-bloom-overlay`.

The first two failures shared one root cause: the P2.37R1 PRE_COPY BAT still deleted three paths that had become live again in P2.33+:

- `src/components/games`;
- `src/services/chess`;
- `src/services/xiangqi`.

R2 removes those live directories from PRE_COPY entirely and adds a regression gate that parses every destructive PRE_COPY target and proves none exists in the current FULL tree.

## Metro/import hardening

Runtime source no longer imports the native wrapper through the bare package name. Both Android presentation callers import directly from:

`modules/family-bloom-overlay`

The `file:modules/family-bloom-overlay` dependency remains in `package.json` only for Expo/Gradle autolinking and native packaging. Therefore a stale/missing `node_modules/family-bloom-overlay` cannot by itself prevent Metro from reading the JS presentation layer.

Added `scripts/setup/check-source-import-integrity.js`:

- scans all TS/TSX/JS/JSX under `src/` and the local native wrapper;
- resolves relative imports and `@/` / `@assets/` aliases;
- understands Android/native/web and normal index candidates plus media assets;
- verifies external package roots are declared;
- hard-fails on any missing literal import.

Current result: 291 source files / 1710 literal imports / 0 missing.

Added `scripts/setup/check-ts-syntax-transpile.js` to transpile every TS/TSX source after dependencies are installed. Packaging verification also transpiled all 291 files with zero syntax diagnostics.

## Copy-over safety

`scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` is now source-safe for the current build:

- it does not delete `src/components/games`;
- it does not delete `src/services/chess`;
- it does not delete `src/services/xiangqi`;
- parsed destructive PRE_COPY target list intersects the P2.37R2 FULL tree at **0 paths**.

`cleanup-overlay-routes.js` still removes retired gameplay implementation while explicitly preserving only the two low-level transports in the Chess/Xiangqi service folders.

A post-clean clone was executed and then rechecked: 291 files / 1710 imports / 0 missing; P2.37R2 gate 30/30 PASS.

## Native package/update hardening

Native binary identity: `P2.37R2-native-1`

Android version: `1.3.4`

Android versionCode: `143014`

Local native package: `family-bloom-overlay@1.3.0`

The native module remains an authenticated native sibling presentation host; Activity-global `PopupWindow` remains retired.

Build helpers now detect not only a missing native local dependency, but also an installed version that differs from `modules/family-bloom-overlay/package.json`. A stale installed local module automatically triggers `npm install` before native preflight.

Native build gates continue to require:

- Expo autolinking resolves `family-bloom-overlay` and `FamilyBloomOverlayModule`;
- generated Android project enables Expo modules;
- Gradle project graph contains the local native module;
- final APK DEX contains `FamilyBloomOverlayModule`, `FamilyBloomOverlayHostView`, and exact identity `P2.37R2-native-1`.

## Root verification helper

Added `scripts/android/verify/Family_Bloom_VERIFY_FULL_SOURCE.bat`.

It verifies critical game/native files, full source import graph, P2.37R2 integrity, optional TS/TSX transpile when TypeScript is installed, project structure and all BAT entrypoints before Metro/build.

## Verification

- Source import integrity: **291 files / 1710 imports / PASS**
- Full TS/TSX syntax transpile: **291/291 PASS**
- P2.32 reset foundation: **76 assertions PASS**
- P2.34 session/presentation: **42/42 PASS**
- P2.35 already-in-game recovery: **37/37 PASS**
- P2.37 authenticated native sibling: **28/28 PASS**
- P2.37R2 FULL copy/import/native: **30/30 PASS**
- Project structure: **18/18 PASS**
- Build entrypoint audit: **25 BAT PASS**
- P2.12.4 build/assets: **27/27 PASS**
- P2.12.5 standalone APK/share: **26/26 PASS**
- P2.12.6 dependency contract: **20/20 PASS**
- P2.12.7 Expo Asset peer: **14/14 PASS**
- P2.12.8 Windows Doctor launcher: **18/18 PASS**
- Web W1: **41/41 PASS**
- Web W2: **71/71 PASS**
- Web W3: **34/34 PASS**
- Release readiness: **11/11 PASS**
- Server tree SHA-256 unchanged from P2.37R1: `ca3ede3c1004c627749d5865e95ab29fa1d36cdf920d3e9f1cd81104623a90ca`

## Build boundary

The packaging environment does not contain the project `node_modules` or generated Android project, so a real Gradle APK compile cannot be claimed here. R2 deliberately moves those checks into CLEAN APPLY / local Android builders / EAS hooks, where the installed dependency graph and produced APK actually exist. A native build is valid only if the R2 native package/autolink and APK/Dex gates pass.
