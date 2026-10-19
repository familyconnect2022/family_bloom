# Family Bloom P2.37 — Authenticated Native Sibling Presentation Host

Date: 2026-10-17  
Base: P2.36 Android Native Presentation Plane + P2.35 ALREADY_IN_GAME recovery

## Why P2.37 exists

Device video `6408.mp4` proved the JS/session path was already reaching the presentation layer, but the P2.36 Android binary reported `NATIVE_MODULE_MISSING`. P2.37 therefore makes two changes at once:

1. the game presentation plane is moved from an Activity-global window concept to a native View sibling inside the authenticated FamilySession; and
2. Android/EAS builds now contain hard gates that must prove Expo Autolinking resolves the local module, with local APK builds additionally scanning the built DEX payload for `FamilyBloomOverlayModule`.

The authoritative Chess/Xiangqi server, recovery, Socket.IO protocols and P2.35 `ALREADY_IN_GAME -> recover -> gameJoin -> authoritative state` path are unchanged.

## Final ownership hierarchy

```text
RootLayout
└─ AuthProvider
   └─ FamilySession
      └─ GestureHandlerRootView  (authenticated app native parent)
         ├─ TabStartupProvider
         │  └─ RootNavigator
         │     └─ react-native-screens / ScreenStack
         ├─ DeferredFamilyPrewarm
         └─ BoardGamePresentationRoot   [only if user && activeFamilyId]
            └─ FamilyBloomOverlayHostView  [Expo native View]
               ├─ persistent Full container
               │  ├─ Chess layer
               │  └─ Xiangqi layer
               └─ persistent Mini container
```

The host is rendered after the navigator and is therefore a real native sibling of the native navigation subtree. Native code calls `bringToFront()` and assigns native `elevation` / `translationZ`; presentation no longer depends on React `zIndex` to outrank `react-native-screens`.

The host does **not** exist on Login/Auth. Losing either the logged-in user or the active family clears the presentation store and unmounts the native host.

## Native presentation behavior

- `FamilyBloomOverlayHostView` extends Expo `ExpoView`.
- Full and Mini native containers are created once when the authenticated host is created.
- IDLE hides both containers but does not reconstruct them.
- FULL is 85% of authenticated host width/height and centered.
- Chess and Xiangqi layers are both permanent, stacked siblings at 90% of Full.
- Chess remains deep pink `#D94F87`.
- Xiangqi remains deep gold `#D3A11F`.
- MINI remains 118×72 dp, edge-snapping, with tap-to-restore.
- The host is full-frame but React sets `pointerEvents="box-none"`; native host itself does not intercept touches, so areas outside visible Full/Mini continue to the authenticated route tree.

## Diagnostic chain

The expected independent Surface test now produces a concrete chain such as:

```text
AUTH_PRESENTATION_ROOT_MOUNTED
NATIVE_HOST_CONTAINERS_CREATED
NATIVE_HOST_PROMOTED
NATIVE_HOST_ATTACHED
NATIVE_HOST_FIRST_LAYOUT
AUTH_HOST_PROBE_SENT
AUTH_HOST_PROBE_ACCEPTED
NATIVE_HOST_PROMOTED
NATIVE_HOST_COMMAND_RECEIVED
NATIVE_HOST_FULL_VISIBLE
NATIVE_HOST_PROBE_VISIBLE
NATIVE_HOST_PROBE_RESTORED
```

Every native sibling diagnostic includes, when available:

- native parent class;
- `childIndex` and `childCount`;
- sibling native class list;
- attached/shown state;
- presentation mode/kind/gameId;
- Full/Mini geometry.

This lets a device video prove whether the host is actually the last native sibling above the navigation subtree rather than only proving that JS store state reached FULL.

## P2.36 missing-module ambiguity removed

P2.37 adds an explicit local module `package.json` and pins:

```json
{
  "expo": {
    "autolinking": {
      "nativeModulesDir": "./modules"
    }
  }
}
```

The module remains registered by `expo-module.config.json` as:

`expo.modules.familybloomoverlay.FamilyBloomOverlayModule`

### Build hard gates

`scripts/setup/check-p2_37-native-autolink.js`

- validates local module package/config/Kotlin/build.gradle;
- runs Expo Autolinking `resolve --platform android` when dependencies are installed;
- requires resolver output to include `FamilyBloomOverlayModule` and `family-bloom-overlay`;
- runs automatically in `eas-build-post-install` after EAS install/prebuild;
- also runs after local Expo prebuild.

`scripts/setup/check-p2_37-apk-native-class.js`

- inspects `classes*.dex` in locally built APKs;
- refuses installation/export when the APK does not physically contain `FamilyBloomOverlayModule`.

Therefore local BAT flows cannot install a “P2.37 JS / old native binary” APK silently.

## Build / deployment

- Android `versionCode`: **143012**.
- App version: **1.3.2**.
- Native rebuild/install is required.
- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` is the correct EAS helper for the first P2.37 binary.
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat` is only appropriate after a P2.37 native binary is already installed.
- The entire `server/` tree is byte-identical to P2.36; no Render redeploy is required.
- Firestore Rules/indexes are unchanged.

## Verification completed in packaging workspace

- P2.34 Session/Presentation + Stacked Views: **42/42 PASS**
- P2.35 ALREADY_IN_GAME Recovery Surface: **37/37 PASS**
- P2.37 Authenticated Native Sibling: **28/28 PASS**
- P2.37 static native-autolink contract: **PASS** (real resolver phase intentionally deferred when `node_modules` is absent in the FULL packaging workspace)
- Project structure: **18/18 PASS**
- Release readiness: **11/11 PASS**
- P2.37 changed TS/TSX sources transpile without syntax diagnostics.
- Build-entrypoint audit: PASS after Windows CRLF normalization.

A full Gradle compile cannot be executed in the stripped FULL packaging workspace because `node_modules` and generated `android/` are intentionally absent. The real local/EAS build now hard-fails if native autolinking does not resolve the module; local APK builders additionally hard-fail if the final DEX lacks the module class.

## Recommended device test

1. Copy over the full P2.37 tree and run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`.
2. Build and **install a new native APK** using EAS Build or the local Android build BAT.
3. Open Settings → Kiểm thử & chẩn đoán → Game foundation.
4. Press **Test Surface Chess (1,8 giây)** before involving server/session.
5. Confirm the pink Surface appears and the log includes `NATIVE_HOST_ATTACHED`, `NATIVE_HOST_PROMOTED`, and `NATIVE_HOST_FULL_VISIBLE`.
6. Then test **Bạn mời Bloom Bot** once. The existing P2.35 recovery path should drive the same native host to FULL.
