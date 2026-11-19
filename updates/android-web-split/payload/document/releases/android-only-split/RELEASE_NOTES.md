# Family Bloom Android Only – Legacy Web Separation (2026-11-05)

Baseline: **FamilyBloom_NODE_R7_FULL_CODE_2026-11-05.zip**.

## Scope
- Removed the old legacy Expo companion Web app, `.web.tsx` routes and `+html.tsx`.
- Removed legacy PWA `public/`, Web-only Firebase JS SDK, Web script commands, Web BATs, Vercel static configuration and Web-specific historical tests.
- Updated Android Windows menu, BAT manifest, native CLEAN APPLY checks, structure gates and source-only regression tests.
- Kept Android `.webp` hero assets, Android diagnostic `tutorial-web.png`, native `expo-web-browser`, Firebase Native, Firestore Rules, Render Chess/Xiangqi and Vercel Media integration.
- Archived Web-only files separately into `FamilyBloom_LEGACY_WEB_SOURCE_ARCHIVE_FROM_R7_2026-11-05.zip` for reference; NOT a deployment-ready new Web.

## Update & safety
Extract **FULL CODE** or **PATCH** into a folder outside the installed Android project. Run `00_TACH_WEB_ANDROID_AN_TOAN.cmd` from the extracted release, select the existing verified R7 project folder and inspect CHECK before INSTALL. A complete backup of all changed/deleted managed source paths is created in sibling `_FamilyBloom_Backups/Web_Split_Android/` before modifications. Local `.env`, `google-services.json`, Firestore Rules, media URLs and native code are not overwritten.

A modified R7 source file other than the optional root BAT causes the updater to refuse to proceed; report the SHA mismatch rather than overriding.

## Limitations
Source-level validation only. Native Android Release APK and two-account live Firebase testing require Windows/Android tooling and device tests. Existing historical documents may still contain records of the former Web app; these are archives, not active runtime imports or build targets.
