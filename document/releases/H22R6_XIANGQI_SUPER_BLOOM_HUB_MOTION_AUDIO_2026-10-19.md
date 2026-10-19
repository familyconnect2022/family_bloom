# Family Bloom H22R6 — Xiangqi Super Bloom, hub, movement and audio

Date: 2026-10-19. Source baseline: H22R5 FULL CODE (NOT a patch ZIP).
Android: `1.3.24`, `versionCode=143034`, native ID `P2.37R2C-H22R6-native-1`.

## Changes

1. **Same Super Bloom design language, independent implementation**: Xiangqi-only full-board Canvas UI has centered title, framed player hubs, player avatars, turn-aware highlighted clocks, warm connecting preview and ready overlay. The Chess renderer/controller/server are not used by Xiangqi.
2. **Invite**: Xiangqi-only global React Native challenge gate has a rose/pastel modal, badge, countdown 00:SS and 60-second progress bar, accept/reject for invitee and server-authorized cancel for inviter. It retains the existing server-imposed expiry and cannot unilaterally terminate an active match.
3. **Three result designs**: golden/warm victory, aqua/blue draw and sage/green defeat; soft rose veil (not dark brown/black), different headline/copy, visible return-to-lobby button. The CTA must actually be tapped to send resultAck (no accidental ack on any canvas touch).
4. **Piece size**: source PNG visible diameter changed from H22R5's 1.14 cell (radius `.57 * cell`) to 0.855 cell (radius `.4275 * cell`), **25% smaller**. Existing crop, 9x10 points, tap hitboxes, orientation, and legal move logic remain untouched.
5. **Move animation**: 205ms smoothstep ease, in the retained Xiangqi-native Canvas with no JS frame loop. Starts only after comparing *one server-authoritative revision* with a stable piece ID travelling between verified `lastFrom` and `lastTo`. No guessed movement on focus, selection, delayed broadcasts, or multi-ply reconnect/resync. The moving target is drawn only once, in its animated position.
6. **Audio**: existing Xiangqi-only SoundPool and server-approved `soundToken`/`soundCue` are retained. Sound begins in the same authoritative native `bind` that schedules animation; preloaded effects use dedicated cues for move/capture/check/end. Stale queued sound is cleared on new game ID.
7. **Hub geometry**: Reserve extra vertical space so lower hub and resign control do not overlap on compact phones. Hub icon reflects actual red/black color even if the user plays Black.
8. **Packaging**: all text version references in source/Build&Share/EAS/source tests updated; Windows BAT CRLF retained; `.gitignore` root and documentation under `document/`. H22R6 source test is a hard gate in both the direct APK build and EAS helper.

## Source checks

- `node scripts/test-h22r6-xiangqi-bloom-motion.cjs`: 18/18 PASS.
- `node scripts/test-h22-xiangqi-parity.cjs`: 26/26 PASS.
- `node scripts/test-h22r1-bot-invite-countdown.cjs`: 10/10 PASS.
- `node scripts/test-h22r3-windows-build-preflight.cjs`: 7/7 PASS.
- `node scripts/test-phase-p2_37r2c-binary-identity-lock.js`: 14/14 PASS.
- `node scripts/test-phase-p2_37r2-full-copy-integrity.js`: 31/31 PASS.
- `node scripts/setup/check-ts-syntax-transpile.js`: 299/299 JS/TS/TSX transpile checks PASS.
- `node scripts/setup/check-android-resource-names.js`: 38 valid Android resource names, all 11 expected MP3 assets PASS.
- `node scripts/test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs`: 10/10 PASS.
- Detailed test output in `document/releases/H22R6_TEST_LOG.txt`.

## Limitations and correct install

**These are source tests, not an Android APK build or a live Render/SoundPool test.** The environment where FULL source was prepared has no Android SDK/Gradle project build toolchain configured, so Kotlin+Android compilation, device motion smoothness, exact audio latency and actual on-device rendering must be tested after building on Windows. A standalone Kotlin parse attempt without the Android SDK cannot be considered a valid compilation. Never claim that APK was compiled here.

1. Backup existing project, run its `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` as intended for safe copy-over, extract new FULL ZIP into project directory, then run new `Family_Bloom_CLEAN_APPLY_FULL.bat`.
2. For a new APK on Windows run root `Family_Bloom_BUILD_APK_TO_SHARE.bat` (delegates to `scripts/android/`); output defaults to `C:\FamilyBloomShare\apk`. The EAS test BAT is also at root.
3. Install APK with **versionCode 143034** and native proof `P2.37R2C-H22R6-native-1`. Kotlin native changes cannot be delivered by JS-only OTA.
4. The existing deployed Render server must already support the H22 Xiangqi protocol (`boardReady`, `ready`, `move`, and terminal results); H22R6 does not change those server protocols or require a different schema.
5. Manual phone verification: invite A → B, cancel A and expiry at 60 seconds; accept and stage transitions; play both Red and Black with 10+0; listen to self/opponent/capture/check; observe one-piece 205ms eased motion; force background/reconnect (no fabricated replay); verify Win/Draw/Loss palettes and return button; Mini/Full and cross-game lock; confirm no overlapped hub/resign buttons on short-screen Android.
