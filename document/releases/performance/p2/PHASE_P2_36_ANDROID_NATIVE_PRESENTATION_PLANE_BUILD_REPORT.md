# Family Bloom P2.36 — Android Native Presentation Plane + Deep Surface Diagnostics

Date: 2026-10-17  
Base: P2.35 ALREADY_IN_GAME recovery -> authoritative Surface FULL

## Device evidence that changed the diagnosis

Video `6407.mp4` showed the client reaching the authoritative presentation command successfully:

- `recover[preflight] · active`
- `recover[preflight] · game <id> · Surface FULL`

That proves the server, `sessionRecover`, `gameJoin`, authoritative state mapping and P2.35 session/presentation bridge all reached the final `FULL` state. The remaining failure was below the store: the root React sibling Surface had no visible pixels above the active Android native-stack screen.

P2.36 therefore does **not** redesign the game/session lifecycle again. It changes only the Android presentation plane and adds much deeper observability.

## Android presentation architecture

### Before P2.36

`BoardGamePresentationRoot.tsx` rendered an absolute root-level React Native sibling after the Expo Router Stack. Its state could be `FULL` while the native-stack screen remained visually above it.

### P2.36

Android resolves `BoardGamePresentationRoot.android.tsx` instead.

That component is controller-only and returns `null`; it owns no visible React sibling. It sends the canonical presentation snapshot to a local Expo native module:

`modules/family-bloom-overlay`

The Android module creates one `PopupWindow` attached to the foreground Activity decor window and keeps two native containers alive inside it:

- Full container;
- Mini container.

The containers are allocated once for the module/controller lifetime. Entering IDLE dismisses the popup window but does not destroy/recreate those two content containers. Reopening reuses them.

### Full

- Popup size: 85% x 85% of the React Native window dimensions.
- Centered on screen.
- Both Chess and Xiangqi native layers exist at the same time.
- Each game layer is 90% x 90% of Full and centered.
- Chess: deep pink `#D94F87`.
- Xiangqi: deep gold `#D3A11F`.
- Selecting a game changes native stacking/alpha; it does not construct a second Surface.

### Mini

- Native popup size: 118 x 72 dp.
- Uses the current game color.
- Can be dragged vertically/horizontally and snaps to the nearest left/right edge.
- Tap restores Full.
- Android API 29+ uses `PopupWindow.setTouchModal(false)`, so touches outside the small Mini window remain available to Family Bloom underneath.

## Deep diagnostics

P2.36 adds a process-local 80-event diagnostic bus and exposes it in Developer Tools -> Game foundation.

A normal successful path now produces stage-specific rows instead of the ambiguous old `Surface FULL` line:

1. `BRIDGE/CHESS_STATE_RECEIVED` or `BRIDGE/XIANGQI_STATE_RECEIVED`
2. `STORE/STORE_PUBLISH`
3. `ROOT/ROOT_RECEIVED_STORE`
4. `NATIVE/NATIVE_COMMAND_RECEIVED`
5. `NATIVE/APPLY_COMMAND`
6. `NATIVE/CONTENT_GEOMETRY`
7. `NATIVE/CONTENT_KIND_APPLIED`
8. `NATIVE/POPUP_SHOW_REQUEST`
9. `NATIVE/POPUP_SHOWN`
10. `NATIVE/POPUP_FIRST_LAYOUT`
11. `ROOT/NATIVE_COMMAND_ACCEPTED`

Important failure markers include:

- `NATIVE_MODULE_MISSING`: JS was updated but the installed APK is still pre-P2.36; OTA alone cannot add the native module.
- `POPUP_SHOW_ABORTED`: Activity was already finishing/destroyed.
- `POPUP_SHOW_FAILED`: Android rejected native popup attachment and the exact exception is logged.
- `POPUP_SHOWN` without `POPUP_FIRST_LAYOUT`: window attached but content did not complete layout.

## Independent native-plane probe

The Game foundation developer page now contains:

- `Test Surface Chess (1,8 giây)`
- `Test Surface Cờ tướng (1,8 giây)`

These bypass server, invitation, recovery and presentation store. They talk directly to the Android native plane, display a synthetic `P2.36-NATIVE-PROBE` Full Surface for 1.8 seconds, then restore the current authoritative presentation command.

This gives a strict diagnostic split:

- Probe fails -> native presentation layer/build problem.
- Probe succeeds but real game fails -> inspect bridge/store/root logs before native plane.
- Real game reaches `POPUP_SHOWN + POPUP_FIRST_LAYOUT` -> Android native window has actually attached and laid out.

## Native-build requirement

P2.36 adds Kotlin native code. Therefore:

- `npx expo start -c` alone is **not sufficient** when upgrading from P2.35.
- Build/install a new Android binary using `npx expo run:android`, the packaged Android build BAT, or `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`.
- Android `versionCode` is bumped to `143011`.
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat` explicitly warns and asks the tester to confirm that a P2.36 binary is already installed before publishing OTA.
- The JS loader uses `requireOptionalNativeModule`, so accidentally sending P2.36 JS to an old binary gives `NATIVE_MODULE_MISSING` diagnostics instead of crashing at import time.

## Server / Firebase scope

No server change is made in P2.36. The complete `server/` tree hash is byte-identical to P2.35:

`4a1b753f0e33c365ae7028c9268610e9e9d13376c0e2fa224d03ad9f9bc0efee`

No Firestore Rules or index deployment is required.

## Verification completed in packaging workspace

- P2.12.4 build/audio: 27/27 PASS
- P2.12.5 APK/share: 26/26 PASS
- P2.12.6 dependency contract: 20/20 PASS
- P2.12.7 Expo Asset contract: 14/14 PASS
- P2.12.8 Windows Doctor launcher: 18/18 PASS
- P2.32 foundation: 76 assertions PASS
- P2.34 bridge/stacked views: 42/42 PASS
- P2.35 recovery: 37/37 PASS
- P2.36 native plane: 22/22 PASS
- project structure: 18/18 PASS
- Web W1: 41/41 PASS
- Web W2: 71/71 PASS
- Web W3: 34/34 PASS
- release readiness: 11/11 PASS
- build-entrypoint audit: PASS, including P2.36 in CLEAN APPLY, Debug and Release launchers
- board-game MP3 payload: 60,419 bytes PASS

The packaging environment intentionally contains no project `node_modules`, so an Android Gradle APK compile was not run here. The packaged Debug/Release/EAS build entrypoints regenerate Android with `expo prebuild --clean` or EAS prebuild and therefore perform the actual native Kotlin compile on the user's/build-service environment.

## First device test after copy-over

1. Run PRE_COPY and overlay the entire P2.36 FULL tree.
2. Run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`.
3. **Build/install a new P2.36 APK**. Do not judge P2.36 using only Metro/OTA on the old P2.35 binary.
4. Open Settings -> Kiểm thử & chẩn đoán -> Game foundation.
5. Press `Test Surface Chess (1,8 giây)` first. The pink Surface must appear without contacting Render.
6. Confirm log reaches `POPUP_SHOWN` and `POPUP_FIRST_LAYOUT`.
7. Then run `Bạn mời Bloom Bot` once and confirm the same native stages follow the authoritative game state.
