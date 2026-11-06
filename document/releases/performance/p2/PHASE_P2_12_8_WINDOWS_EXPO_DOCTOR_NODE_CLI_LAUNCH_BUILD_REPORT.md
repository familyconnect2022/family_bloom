# Family Bloom P2.12.8 — Windows Expo Doctor Node CLI Launch Fix

Date: 2026-10-12

## Problem
On Windows, the P2.12.7 Doctor wrapper attempted to call `node_modules\.bin\expo-doctor.cmd` directly with `spawnSync(..., { shell: false })`. On the tested Windows environment this failed before Expo Doctor started with `EINVAL`.

## Fix
- Project root is derived from `scripts/setup/run-expo-doctor-native-policy.js` via `__dirname`, never from `process.cwd()`.
- The wrapper reads `node_modules/expo-doctor/package.json` and resolves its `bin` entry.
- The pinned Expo Doctor JavaScript CLI is launched with `process.execPath` (`node.exe`).
- No `.cmd`, `npx`, `cmd.exe`, or `shell: true` is used.
- Child `cwd` is pinned to the Family Bloom project root.
- Debug, Release, Install+Doctor, CLEAN APPLY, and standalone APK/share flows register the P2.12.8 launcher regression gate.

## Regression coverage
The P2.12.8 gate creates a temporary fake `expo-doctor` package under a path containing spaces, resolves its package bin, launches it through Node, and verifies successful stdout/status. Historical Phase 15A.2/15A.3 gates were updated to the successor Node-CLI contract.

## Preserved behavior
- P2.12.7 direct `expo-asset` peer dependency for `expo-audio`.
- P2.12.6 package.json semver + package-lock exact dependency contract.
- P2.12.5 remote standalone APK/share build.
- P2.12.4 Chess audio recovery.
- P2.12.3 Family Graph Focus native-Modal recovery and BSH retained graph.

## Source governance
All documentation remains under `document/`; no `.md`/`.txt` files are added to project root.

## Validation
- P2.12.8 Windows Doctor Node CLI launch: 18/18 PASS.
- Phase 15A.2 native Doctor policy: 15/15 PASS.
- Phase 15A.3 Windows Doctor launch successor: 10/10 PASS.
- P2.12.7 expo-asset peer contract: 14/14 PASS.
- P2.12.6 dependency contract: 20/20 PASS.
- P2.12.5 remote APK/share: 26/26 PASS.
- P2.12.4 build integrity + Chess audio: 57/57 PASS.
- P2.12.3 Focus native-Modal recovery: 23/23 PASS.
- P2.11.4 BSH retained chunks: 40/40 PASS.
- Current Chess aggregate: 21/21 gate groups PASS.
- Project structure: 18/18 PASS.
