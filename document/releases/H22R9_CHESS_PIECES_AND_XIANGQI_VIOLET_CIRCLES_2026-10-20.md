# FAMILY BLOOM H22R9 — CHESS PNG & XIANGQI LAST-MOVE POLISH

Release date: 2026-10-20  |  Base: H22R8 FULL  |  Android version: 1.3.27 / 143037  |  Native ID: `P2.37R2C-H22R9-native-1`

## User-requested changes

1. Correct centered royal piece in all four Bloom Bot test dialog states, and both live Chess and Xiangqi challenge dialogs. The image now sits in a full-width absolutely positioned **centered slot** (`left: 0; right: 0; alignItems: center`), rather than percentage offsets. Slot overlaps the panel top 50/50; graphics do not intercept touch.
2. Xiangqi **last move** highlight now uses only two violet circular markers (origin/destination). Transparent violet discs are underneath pieces, soft violet outlines after pieces; no blue/green distinction between teams, no square/arrow/connecting line. Legal-target dots, capture rings, clocks, server moves and pointer mapping stay unchanged.
3. Replace **12 Chess PNG resources** with the user's `pieces_chess.zip` (all 512 × 512 RGBA). Each piece is cropped to nontransparent bounds, height-aligned to its previous silhouette and baseline, horizontally expanded at most 1.60× for mobile readability, and centered on a 192 × 192 transparent RGBA canvas. Same processed bytes placed in:
   - `assets/images/chess/pieces-png-default/{wk,wq,wr,wb,wn,wp,bk,bq,br,bb,bn,bp}.png` (React Native)
   - `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/{...}.png` (Android native)
   The source ZIP is not altered, nor are board geometry, hit-targets, renderer ownership or server move semantics.
4. Added strict H22R9 PNG/header/hash gate: `node scripts/tests/release/test-h22r9-chess-assets-royal-highlight.cjs`. Included in native share BAT, EAS build BAT, Clean Apply BAT and EAS post-install.
5. Bumped `app.json`, Kotlin native identity, binary proof, device verify BAT, EAS expected artifact identity and release helper text consistently.

## Gate results

- 29 / 29 selected existing/new groups PASS on source environment.
- H22R9 PNG/hint gate: 12/12 PNG copies byte-identical, correct 192x192 RGBA headers and each SHA-256 matches `H22R9_CHESS_PIECES_MANIFEST.json`; additional modal/highlight/identity rules PASS.
- Xiangqi H22R8 UX: 16/16 PASS; H22R7 royal modals: 20/20 PASS; Xiangqi server/native: 32/32 PASS.
- Windows Build & Share source preflight: 7/7 PASS; Auto Update logic simulation: 21/21 PASS; Structure: 19/19 PASS; Binary identity: 14/14 PASS; Full integrity: 31/31 PASS.
- TypeScript syntax: 299/299 PASS; all literal source imports resolve.

**Limit:** Actual Windows BAT + Android Gradle/APK install and screenshots have NOT been tested in this Linux packaging environment. Source contract checks are not a replacement for an on-device rendering test. Do not claim visual perfection without checking device. Source-only Kotlin changes are not type-compiled without Android SDK.

## Release steps

1. Extract H22R9 FULL into its own folder outside the old Family Bloom project. Run the included root `Family_Bloom_AUTO_UPDATE_FULL.bat`; it backs up source and performs clean → overlay → clean apply.
2. Build new APK with root `Family_Bloom_BUILD_APK_TO_SHARE.bat` (default `C:\FamilyBloomShare\apk`), install over the existing application using `adb install -r path\to\new.apk`.
3. Verify `adb shell dumpsys package com.familybloom.android | findstr /i "versionCode versionName"` shows versionCode 143037. Inspect developer test UI for `P2.37R2C-H22R9-native-1`.
4. Visually test King centering in test-bot dialogs; Xiangqi move by both sides (origin and destination circles are violet, no line); Chess pieces in light/dark squares and modal king.
5. Backend behavior did not change; no new Render deployment necessary if H22R8 server is already deployed.
