# Family Bloom P2.12.5 — Remote Standalone APK Share Build

## Scope

P2.12.5 adds one root entrypoint for building a standalone Android Release APK without any connected phone/emulator and publishing it into a fixed shared folder for remote retrieval. It preserves the P2.12.4 native/audio validation path.

## One-click entrypoint

Run `scripts/android/build/Family_Bloom_BUILD_APK_AND_SHARE.bat`. It delegates to `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat`, which calls the canonical Release builder with `--apk-only`; therefore no ADB/device discovery, install, or launch is required.

## Output

Default share directory: `C:\FamilyBloomShare\apk`. Override with `FAMILY_BLOOM_SHARE_DIR`. The remote folder receives `Family_Bloom_LATEST.apk`, a timestamped Release history APK, a SHA-256 sidecar, and a metadata TXT file. The canonical local Release APK remains in `dist/android/Family_Bloom_Release_LATEST.apk`.

## Why Release

The remote-share entrypoint intentionally uses the standalone Release APK rather than a Debug development APK so a downloaded APK can run without Metro after installation.

## Security boundary

The BAT only creates/writes the local folder. It does not expose SMB ports or modify Windows/Tailscale sharing permissions.
