# Family Bloom P2.37R1 — Native Binary Proof + Authenticated Native Sibling

Date: 2026-10-17  
Base: P2.37 Authenticated Native Sibling Presentation

## Why R1 exists

Real-device screenshots from P2.37 showed repeated `NATIVE_MODULE_MISSING`. JS P2.37 was present, but the Android binary did not expose `FamilyBloomOverlay`, so the native sibling Surface never existed and no z-order test was actually reached.

P2.37R1 does **not** change Chess/Xiangqi session, recovery, server protocol, or the authenticated-sibling presentation design. It hardens native packaging and makes the binary prove that the module and Host View are really present before Surface/game testing begins.

## 1. FamilyBloomOverlay is now a direct app dependency

Root `package.json` now pins:

`family-bloom-overlay: file:modules/family-bloom-overlay`

The local module remains under the canonical Expo local-module directory `./modules`, so Expo Autolinking can discover it both as a local Expo module and as an explicit direct app dependency. `CLEAN APPLY` forces `npm install` whenever `node_modules/family-bloom-overlay` is missing.

The module package is versioned as `family-bloom-overlay@1.2.0` and embeds immutable native identity:

`P2.37R1-native-1`

## 2. Native binary proof before Surface proof

The Kotlin module now exposes:

- `getNativeIdentity()` — returns the immutable native identity and whether the authenticated Host View is mounted;
- `proveHost()` — asks the mounted native Host View itself to render a temporary proof badge.

The proof badge is created and painted by Kotlin, not React:

`NATIVE HOST OK`  
`P2.37R1-native-1`

It is shown for about 2.2 seconds and emits `NATIVE_BINARY_PROOF_VISIBLE`.

Developer Tools → Game foundation now shows:

- JS phase: `P2.37R1`;
- Android `versionCode`;
- `FamilyBloomOverlay: YES/NO`;
- exact native identity.

Test order is intentionally strict:

1. `1. Kiểm tra Native Host R1`;
2. only after the native badge appears, `2. Test Surface Chess`;
3. then `3. Test Surface Cờ tướng`;
4. only after presentation primitives pass should Bloom Bot/session tests matter.

## 3. EAS/local build hard gates

### Before native build

`scripts/setup/check-p2_37r1-native-package.js` verifies:

- root `file:` dependency exists;
- local package/config/Kotlin source identity is correct;
- installed `node_modules/family-bloom-overlay` exists when required;
- Expo Autolinking resolver sees both `family-bloom-overlay` and `FamilyBloomOverlayModule`;
- generated Android project enables Expo Autolinking;
- optional Gradle project graph contains the local native module.

EAS runs this in `eas-build-post-install`, which Android executes after dependency install + Expo prebuild.

### After APK build

`scripts/setup/check-p2_37r1-apk-native-proof.js` scans `classes*.dex` and requires all four native markers:

- `FamilyBloomOverlayModule`;
- `FamilyBloomOverlayHostView`;
- `expo/modules/familybloomoverlay`;
- `P2.37R1-native-1`.

EAS runs `check-p2_37r1-eas-apk-proof.js` in `eas-build-on-success`. A build that creates an APK without those native markers is rejected by the R1 release pipeline instead of being treated as a valid Surface test binary.

Local Debug/Release BATs run the same package/autolink/Gradle checks and the same APK DEX proof before install/share.

## 4. EAS upload/cache safety

A root `.easignore` is included and explicitly keeps `modules/**` and R1 proof scripts in the EAS upload.

`scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` now:

- installs/updates the direct local module dependency when missing;
- requires local autolink resolution before upload;
- invokes EAS with `--clear-cache` for this native rebuild.

OTA helper copy explicitly states that P2.37R1 requires a real P2.37R1 binary first.

## 5. Presentation architecture preserved

The approved architecture remains:

Authenticated FamilySession
- RootNavigator / react-native-screens
- native `FamilyBloomOverlayHostView` mounted after navigation as authenticated sibling
- Full/Mini persistent native containers inside that Host View

No Activity-global `PopupWindow` is restored. Surface still cannot exist on Login because the Host View is mounted only when both authenticated user and active family are present.

## 6. Native version

- Expo app version: `1.3.3`
- Android versionCode: `143013`
- Native module identity: `P2.37R1-native-1`

## 7. Source verification

Current source gates after R1 changes:

- P2.34 session/presentation bridge: 42/42 PASS
- P2.35 already-in-game recovery: 37/37 PASS
- P2.37 authenticated native sibling: 28/28 PASS
- P2.37R1 native binary proof: 19/19 PASS
- Project structure: 18/18 PASS
- Release readiness: 11/11 PASS
- Build entrypoint audit: PASS
- Modified TS/TSX syntax transpile: PASS

A full Android Gradle/APK compile is intentionally not claimed in the packaging environment because this FULL archive does not carry `node_modules` or a generated `android/` tree. The real local/EAS build is now required to prove autolinking, Gradle inclusion, and final APK DEX content before the binary is accepted.

## 8. Device acceptance

After installing the new R1 APK, open Developer Tools → Game foundation.

The first card must say:

- `JS phase: P2.37R1`
- `versionCode: 143013`
- `FamilyBloomOverlay: YES`
- `native identity: P2.37R1-native-1`

Then press `1. Kiểm tra Native Host R1`.

Expected visible result: a native badge `NATIVE HOST OK · P2.37R1-native-1` for about 2.2 seconds.

Expected log includes:

- `NATIVE_BINARY_IDENTITY`
- `NATIVE_HOST_ATTACHED`
- `NATIVE_HOST_PROMOTED`
- `NATIVE_BINARY_PROOF_VISIBLE`
- `NATIVE_BINARY_PROOF_ACCEPTED`

Only after this passes should Surface Chess/Xiangqi be tested.
