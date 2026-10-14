# Family Bloom — Performance Architecture P2.12.4

## Build Integrity + Chess Audio Recovery

Baseline: P2.12.3 FULL CODE.

## Scope

P2.12.4 does not alter Family Graph BSH topology/layout/retained rendering. It audits and repairs the native build/audio path after device testing showed Chess gameplay SFX were still silent and the FULL package did not carry a root `package-lock.json`.

## Expo native configuration

`app.config.js` now preserves all plugins inherited from `app.json` and explicitly injects the Expo Audio config plugin into the final dynamic config used by `expo prebuild --clean`.

Family Bloom only plays short local game SFX, so the audio plugin is playback-only:

- `recordAudioAndroid: false`;
- `enableBackgroundPlayback: false`;
- `enableBackgroundRecording: false`;
- `microphonePermission: false`.

`app.json` also lists the same plugin so config review does not depend on understanding dynamic merge behavior.

No `expo-asset` config plugin is used for the M4A pack. The board sounds are statically `require()`d and Metro explicitly accepts `.m4a`; P2.12.4 verifies the resulting Release payload instead of relying on unsupported expo-asset embedding for M4A.

## Chess audio runtime repair

The old soundscape could produce a false ready state after 1600 ms even when native players were not loaded. Playback functions then returned immediately because `player.isLoaded` was false. A one-shot `replace(source)` failure was also permanently remembered as attached, preventing recovery.

P2.12.4 replaces that path with retryable `useReliableAudioCue` slots:

- source attachment is retried at bounded checkpoints;
- `replace(source)` is never treated as proof of success;
- real readiness comes only from native `player.isLoaded`;
- a sound requested before loading completes is queued once and played when the player becomes usable;
- board SFX preload remains process-singleton and starts only when a board surface is prepared, so it does not compete with app cold start;
- Chess challenge/reconnect cues use the same reliable mechanism.

Chess board preparation is now visual-first. Audio failure can no longer keep the persistent Chess surface in `preparing`; audio recovers independently.

## Asset verification

`check-board-audio-integrity.js` validates:

- all 11 board-game M4A files exist;
- each file has an ISO BMFF/M4A signature and non-trivial size;
- all 11 are statically required from the native soundscape;
- challenge/reconnect WAV files are valid RIFF/WAVE assets and statically required;
- Metro's M4A extension guard remains present;
- no false-positive audio readiness timeout remains.

The Release BAT additionally checks the Gradle/APK payload and refuses to install/export as successful if fewer than 11 M4A assets can be found in both the APK listing and generated native resource tree.

## Dependency/build integrity

`expo-audio@~57.0.5` is now watched by both installed-package and package-lock validators.

`expo-doctor@1.20.4` is pinned in `devDependencies`. Build scripts no longer use an unpinned `npx expo-doctor` fetch; Doctor runs only from `node_modules/.bin` after the supported dependency bootstrap has completed.

The submitted baseline did not contain a root `package-lock.json`. P2.12.4 deliberately does not fabricate a lock without npm registry resolution. On a fresh/copy-over machine, every supported build/setup path treats a missing lock as stale dependencies and runs `npm install`, which creates/refreshes the real lock before build validation continues.

A new `check-build-entrypoints.js` audits every shipped BAT for Windows CRLF, validates every referenced `npm run` target against `package.json`, and verifies referenced Node scripts exist. Debug, Release, and CLEAN APPLY run this audit before native build work.

Updated entry points:

- Debug Build + Run;
- Release APK Build;
- APK-only wrapper;
- Clean Release wrapper;
- CLEAN APPLY FULL;
- Sync Dependencies;
- Install + Doctor.

The legacy `scripts/setup/settup.bat` is retired and no longer performs an unpinned Expo install.

## New gates

- `npm run audio:integrity`
- `npm run phaseP2_12_4:check`

P2.12.4 checks effective Expo config, playback-only plugin options, audio files, static references, reliable native attachment, no fake readiness timeout, pinned local Expo Doctor, build BAT coverage, Release payload verification, dependency/lock checks, and TS/TSX transpilation. Current P2.12.4 gate: **52/52 PASS**.

All project BAT files are normalized to Windows CRLF. Two long-standing build-gate defects discovered during the full chain audit were corrected without changing runtime features: Phase14R now checks the correct Firestore `/documents/` path, and Phase14T accepts the current `Chơi ngay` UI label case-insensitively. Phase15A now explicitly exempts web shells/layouts and the immersive Chess game canvas from the page-Hero rule instead of failing supported builds.

## Device validation priority

1. Run `Family_Bloom_CLEAN_APPLY_FULL.bat` after copy-over so missing/stale native dependencies and lockfile are repaired.
2. Rebuild the native app; Metro restart alone is insufficient after adding/changing a config plugin.
3. Enter Chess, play self/opponent moves, capture, check, premove, promotion/game-end and confirm SFX.
4. Test first game after app launch and later games; the first cue must no longer be silently discarded while native audio is loading.
5. Confirm Chess Ready/board entry is not held behind audio loading.

## Full build-chain audit

The actual static-gate sequence referenced by the Android Debug/Release BATs was exercised in groups. Release readiness, Phase15A/A4, Phase17.6–17.8E, P1/P2 through P2.12.4, Phase16/17, current Chess aggregate, and Phase14Q/R/S/T successor gates pass after the gate-maintenance fixes above. The current Chess aggregate is **21/21 PASS**. Project structure is **18/18 PASS**.

This container intentionally does not ship project `node_modules`, so the pinned local Expo Doctor binary cannot be executed here until `npm install` runs. The supported CLEAN APPLY / Debug / Release flows explicitly bootstrap dependencies first; on the user machine Doctor then runs from the pinned local package instead of fetching an arbitrary version.
