# Family Bloom H22R4 — H8/H9B/H13 historical native gate refresh

Date: 2026-10-19
Source base: H22R3 Windows ZIP (same native module, gameplay code, server and APK identity).

## Why H22R3 CLEAN APPLY failed

The H8 regression checker expected the literal Kotlin declaration `Events("onDiagnostic", "onAction", "onChessAction")`. H22 adds `onXiangqiAction` to the events list, preserving the Chess bridge. The historical H8/H9B gates also expected a probe-only Xiangqi `configureGameLayer(xiangqiLayer...)` call, whereas H22 now has a dedicated `configureXiangqiLayer()` and `XiangqiNativeBoardView`.

A follow-on H13 executable test mocked the historical Chess-only presentation bridge and raised `Unknown bridge require ./nativeXiangqiGameplayController` when it loaded the current independent Xiangqi controller.

## Changes

- `scripts/test-phase-p2_37r2c_h8-native-chess-tap-move.js`: require the actual `onChessAction` event, `setChessBoardState` handler and emitted event, allowing additive Xiangqi native events. Verify distinct Xiangqi board, actions and socket controller; the Chess controller must not use the Xiangqi socket or vice versa.
- `scripts/test-phase-p2_37r2c_h9b-bloom-super-hero-ui.js`: assert the actual dedicated Xiangqi native board layout rather than the retired probe-only `configureGameLayer` call.
- `scripts/test-phase-p2_37r2c_h13-bloom-results-return.js`: stub the new isolated Xiangqi presentation controller for the H13 Chess-only behavioral test, preserving the rest of the executable test.

No app, game, Firebase, server, native Kotlin, resources or build BAT behavior changed.

## Verification (Node.js local environment)

- H8 Native Chess authority: **18/18 PASS**.
- H9B Super Hero UI: **24/24 PASS**.
- H13 Result acknowledgement and presentation: **20/20 PASS**.
- H22 Xiangqi parity, H22R1 Bot countdown, H22R2 cleanup retention and H22R3 Windows preflight: **PASS**.
- Relevant H10–H21 Chess regression scripts, source imports, binary identity, asset checks and TypeScript transpile: **PASS**.
- Full ZIP: Windows-compatible DOS metadata, CRC and extracted file hash verification.

**Limit:** Gradle/Windows CMD and physical Android APK were not executed in this environment. Server strict compilation requires configured dependencies. Do not distribute an APK unless the Windows release BAT actually completes.

## Copy-over

1. Extract the H22R4 FULL ZIP directly (files at archive root).
2. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` from H22R4; copy all files over the existing project.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`, then `Family_Bloom_BUILD_APK_TO_SHARE.bat`.
4. No Render server redeployment or APK identity change is needed for this script-only fix.
