# Family Bloom H21R2 — Build & Share legacy P2.12.5 gate fix

## Source
- Based on H21R1 FULL CODE, Android 1.3.21 / versionCode 143031.
- Does **not** alter server, Socket.IO, game UI, game rules, Android native source, assets, or signing.
- The prior package failed during the **preflight gate** at P2.12.5 25/26, before Gradle ran: `Release builder still verifies board MP3 payload`.

## Root cause
`test-phase-p2_12_5-remote-apk-share-build.js` required obsolete text `expected 11 board-game MP3 assets`. H21R1 correctly switched to `stage-board-audio-native.js` before Gradle and `check-board-audio-apk.js` after Gradle; the old text no longer appears in the release BAT.

## Fix
- P2.12.5 checks real control flow: Expo clean prebuild -> protected audio staging with immediate failure on error -> Gradle Release -> compiled APK audio verification with immediate failure on error -> publication only upon success.
- Verifies native staging hashes and Android resource verifier still checks all 11 MP3s via canonical paths or AAPT2 compiled resource table.
- P2.12.4 audio gate also checks the active verification method, not a dead variable.
- No guard is disabled; failure to stage or verify actual Android resources still blocks publication.

## Validation limits
Run `node scripts/test-phase-p2_12_5-remote-apk-share-build.js`, `node scripts/test-phase-p2_12_4-build-integrity-chess-audio.js`, `node scripts/test-phase-p2_37r2c_h21r1-audio-packaging.cjs`. These are **static/source tests only**. A real Windows Gradle build is still required to verify the finished APK.

## Install
Backup H21R1, use the bundled full copy-over BAT, overlay H21R2 FULL CODE, run CLEAN APPLY then BUILD APK TO SHARE. No Render redeploy; no OTA-only update for this workflow (this patch affects build scripts only).
