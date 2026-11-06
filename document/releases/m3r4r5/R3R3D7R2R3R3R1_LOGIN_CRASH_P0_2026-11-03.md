# FAMILY BLOOM · R3R3D7R2R3R3R1 · P0 LOGIN CRASH REPAIR

## Evidence and root cause
User video 70428.mp4 shows Android launching, reaching the login screen and then
closing repeatedly, including after a local app-data reset. This demonstrates
that cache and membership state are not prerequisites for the failure.

In R3R3D7R2R3R3, `src/components/ui/BloomHeroHeader.tsx` calls
`useBloomColorsRevision()` *inside the callback supplied to*
`createBloomStyles()` for the `HERO_CONFIG` lazy proxy. The callback is invoked
only on cache miss/theme revision, NOT on every `BloomHeroHeader` render. The
login screen mounts `BloomHeroHeader`; subsequent renders can therefore call a
different number of React Hooks. This violates React's invariant and is a high-
confidence cause of the observed crash. A native logcat stack trace was not
provided, so the specific runtime exception is inferred rather than captured.

## Narrow P0 fix
- Removed the invalid Hook from the lazy HERO_CONFIG factory.
- Preserved the existing `useBloomThemeRevision()` directly inside the
  BloomHeroHeader component, which already makes the style factory respond to
  palette/typography revisions during normal component rendering.
- Added TS AST regression `test-r3r3d7r2r3r3r1-hook-safety.cjs` to reject ANY
  `use*` React Hook inside `createBloomStyles` callbacks in the src tree.
- Required this test in Auto Update preflight BEFORE backup or overlay and in
  the Windows Release APK Build & Share entrypoint.
- Added exact official R2R3R3 source fingerprints so users can update directly
  from the previously crashing FULL CODE; R2R3R2R1 stays supported.
- Kept the app version 1.3.35 / 143045 to avoid triggering old H13 binary
  identity gates; release ZIP identity is R3R3D7R2R3R3R1.

## Preserved
No changes to Firestore Rules, Auth, sessions, member security, Render,
Vercel, game logic, media, login UI, fonts, tokens, or Firebase sync.
Diagnostics remain quiet by default. `console.error` is not suppressed.

## Verification limits
- AST check is structural and passed across 384 TS/TSX source files and
  127 lazy style factories.
- Official R2R3R3 and R2R3R2R1 lineage checks passed.
- Appearance/local-first, Welcome, H13, dock and structure tests passed.
- Android APK build, real device repro, and full Windows updater workflow
  have NOT been run in this Linux environment.

## Phone test
1. Back up the current project and keep the old ZIP.
2. Run the updated `Family_Bloom_AUTO_UPDATE_FULL.bat` from the extracted NEW ZIP.
3. If Auto Update PASS, build a Release APK using the supplied Build & Share BAT.
4. Test fresh app launch, login screen for >=30 seconds, navigation and
   switching theme several times. Avoid clearing app data unnecessarily.
5. If still crashing, capture actual stack trace with ADB:
   `adb logcat -c`
   open app and reproduce the crash; then:
   `adb logcat -d -v time -s AndroidRuntime:E ReactNativeJS:E ReactNative:E > familybloom-crash.txt`
   Redact personal names, URLs, tokens, emails, and device IDs before sharing.
