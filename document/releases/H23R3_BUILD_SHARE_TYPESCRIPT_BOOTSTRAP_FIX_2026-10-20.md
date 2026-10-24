# Family Bloom H23R3 — Build & Share TypeScript dependency bootstrap

## Reproduced root cause

`scripts/tests/release/test-h22-xiangqi-parity.cjs` imports `typescript` from root or `server/node_modules`. An unprepared FULL ZIP has neither node_modules directory. `Family_Bloom_Android_Release_Build_APK_And_Share.bat` previously ran that gate before dependency installation, causing `MODULE_NOT_FOUND` and stopping build. The screenshot also shows build invoked from extracted FULL source rather than the installed project's directory.

## Changes

- Added `scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat` to the canonical manifest. When root `typescript` cannot be resolved, it installs project dependencies including devDependencies, verifies resolve again and fails closed with a clear message.
- Build & Share, direct Release, EAS and Clean Apply invoke the guard before the first TypeScript-dependent gate.
- Clean Apply checks `node_modules/typescript` when deciding whether to call `npm install`.
- Added `scripts/tests/release/test-h23r3-typescript-bootstrap.cjs` to validate presence and order of guards.
- Preserved native versionCode 143038, Chess/Xiangqi game code and Firebase/Render server protocol.

## Windows usage

1. Extract FULL CODE outside the existing project. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` to update the existing project and install/check dependencies.
2. Build APK from **the updated existing project** (`Family_Bloom_BUILD_APK_TO_SHARE.bat`), not from the clean extracted ZIP folder.
3. If network connectivity or `npm install` fails, check npm logs and stop; do not distribute previously built LATEST APK.
4. No change to Android native resources; this is a BAT/dependency ordering fix.

## Test limitations

Static Node tests are available here. An actual Windows CMD / Gradle build requires the user's Android SDK and project credentials, so must still be performed on their machine.
