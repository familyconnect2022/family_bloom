# P2.37R2C-H4 — Root Navigation Layout + Android Script Governance

## Root navigation fix

Real-device `dumpsys activity top` showed the Android window and `ReactSurfaceView` at full size while the root `ScreenStack` was `1280 x 0`. H4 prevents that collapse by giving `FamilySession`, `RootNavigator`, and the navigation plane explicit non-collapsable `flex: 1` hosts.

The post-auth welcome screen no longer uses React Native `Modal` (a second Android window). It is now an in-tree absolute overlay, so dismissing “Vào tổ ấm ngay” cannot detach a modal window and leave the root navigator measured at zero height.

## Gradle preflight fix

The native preflight now runs `gradlew.bat projects --console=plain` through `cmd.exe` on Windows and evaluates command success separately from the project-graph match. It accepts the actual `Project ':family-bloom-overlay'` graph output confirmed on the test PC.

## Android BAT organization

The project root contains no BAT files. Android helpers are grouped under `scripts/android/`: `build`, `dev`, `install`, `eas`, `verify`, and `maintenance`. Pre-copy and post-copy maintenance remove stale root BAT entrypoints from older FULL builds so copy-over remains safe.

## Validation

Static gates cover the root layout invariant, BAT-free root, grouped Android scripts, CRLF build entrypoints, native module graph preflight, P2.35 recovery, P2.37 native presentation, and TS/TSX syntax.
