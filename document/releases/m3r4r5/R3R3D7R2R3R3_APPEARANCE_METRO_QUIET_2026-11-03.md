# Family Bloom R3R3D7R2R3R3 — Android test source (03/11/2026)

Base: approved FULL CODE R3R3D7R2R3R2R1. Includes the in-progress Appearance architecture work from the current coding turn, plus Metro logging cleanup requested on 03/11/2026. Does not claim that on-device visual regressions have been solved.

## Metro logging change

- Routine `[BloomGate]`, `[BloomVisualD3]`, `[BloomSession]`, notification E2E success and family switch performance logs are disabled by default. Log arguments are not built when the flag is off.
- The in-memory SessionDiagnostics observer, timers and snapshots are OFF unless `EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS=1` is explicitly provided; Auth/Profile/Membership authorization remains independent.
- Temporary D3 Welcome test ribbons and native Alert are OFF by default. They remain available to the authorized developer when session diagnostics is intentionally enabled in a development build.
- React runtime and genuine warning/error handling are preserved. No global `console` override, no `LogBox.ignoreAllLogs()`.
- To re-enable test traces deliberately in a development build: `EXPO_PUBLIC_FB_METRO_TEST_LOGS=1`. After changing EXPO_PUBLIC values, stop Metro and restart with `npx expo start --clear`.
- No code change to Firebase rules, Auth permission gates, Render or Vercel.

## Other source changes already present in this working baseline

Appearance component subscriptions, typography style precedence, theme selection snapshot and multiple screen-level Appearance hooks are undergoing regression testing. This package is a test candidate, not an APK verified on a real Android phone. Keep the original ZIP and backup created by Auto Update.

## Verified here

- TS/TSX syntax transpile: 385/385.
- All literal imports resolved; external packages declared: 2683/2683.
- Project structure gate 19/19; route uniqueness gate passed.
- Test-only Metro quiet policy 9/9.
- Existing Auth diagnostic contract 22/22; D3 visual probe contract 25/25.
- Appearance root 16/16; local-first mock passed; token inventory passed.
- Existing H13 identity and chess control 20/20.
- Source lineage: official R2R3R2R1 accepts and modified protected files refuse; R2R1 etc existing source gates preserved.
- 36 BAT Windows entrypoints source-audited, actual Windows execution not available here.
- Firestore Rules SHA-256 preserved: `3a7ac319c2355d3930776e16c2d235715a5f139b0a527edff5d78afb7a29b80a`.

## Limitations

- Entire Auto Update preflight on Linux timed out; do not claim full sequence passed. Actual Windows BAT and Android APK were not executed here.
- A Development build with Metro remains slower than a Release APK even when application test logs are disabled.
- Revisit the full Appearance acceptance matrix on device before declaring theme/font/fontSize complete or beginning Web work.
