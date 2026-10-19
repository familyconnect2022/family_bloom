# Phase 15A.3 — Windows Expo Doctor Launch Hotfix

Date: 2026-10-05

## Problem
On Windows, `doctor:native-check` failed before Expo Doctor started:

`Failed to launch expo-doctor: spawnSync npx.cmd EINVAL`

The Phase 15A.2 wrapper attempted to spawn `npx.cmd` directly with Node `spawnSync`. On the tested Windows environment that process launch returned `EINVAL`.

## Fix
- Removed direct `spawnSync('npx.cmd', ...)` usage.
- Windows now launches Expo Doctor through `ComSpec` / `cmd.exe`:
  - `cmd.exe /d /s /c "npx expo-doctor"`
- Added a second Windows fallback using a fixed command with `shell: true`.
- macOS/Linux continue to invoke `npx expo-doctor` directly.
- Existing Phase 15A.2 policy is preserved:
  - a clean Expo Doctor run passes;
  - the one known native-config/non-CNG warning may continue because this project intentionally runs `expo prebuild --clean` later in the build pipeline;
  - all other Expo Doctor failures remain build-blocking.

## Regression guards
- `phase15a2:check`: 16/16 PASS
- `phase15a3:check`: 9/9 PASS
- `phase15a:check`: 30/30 PASS
- `chess:current-check`: 14/14 current gate groups PASS
- `phase14v4p:check`: 17/17 PASS
- `phase14n:check`: 13/13 PASS
- `release:check`: 11/11 PASS
- TS/TSX syntax: 249/249 PASS
- Relative + alias import resolution: 0 broken

## Scope
This hotfix changes only the Expo Doctor launch/build harness. It does not alter Family Bloom gameplay, UI, Firebase logic, Chess behavior, routing, or data contracts.
