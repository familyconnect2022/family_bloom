# Family Bloom P2.37R2C-H6 — Android Decor Rail Isolation

## Device evidence behind H6

The captured Android view hierarchy showed the ReactSurfaceView at full device size while the root react-native-screens ScreenStack collapsed to height 0. The same hierarchy also showed FamilyBloomOverlayHostView mounted full-screen inside the React tree. Historical source comparison showed that Stack itself was unchanged across the last known-good builds; the important architectural change was mounting the native overlay as a React/Yoga sibling.

## H6 architecture

- Restore root and auth navigation to Expo Router Stack.
- `BoardGamePresentationRoot.android.tsx` renders `null`; it is a controller only.
- Remove `requireNativeViewManager` and the exported Expo native View from the overlay package.
- Native `FamilyBloomOverlayRail` is created by `FamilyBloomOverlayModule` and attached directly to `Activity.window.decorView`.
- Full/Mini containers remain persistent while the Activity is alive.
- IDLE/background keeps the rail `INVISIBLE`; active Full/Mini can `bringToFront()` only within the Android decor hierarchy.
- React/Yoga and react-native-screens never measure the rail, so rail layout cannot collapse ScreenStack.

## Binary identity

- App: 1.3.8
- Android versionCode: 143018
- Native module package: family-bloom-overlay 1.3.5
- Native identity: `P2.37R2C-H6-native-1`

This is a native-code change and requires a newly rebuilt/reinstalled Android binary. OTA alone cannot add H6.

## Verification

- H6 decor rail gate: 12/12 PASS
- Binary identity lock: 14/14 PASS
- FULL copy/import/native integrity: 31/31 PASS
- Windows Gradle preflight gate: 8/8 PASS
- Project structure: 19/19 PASS
- Source import integrity: PASS
- TS/TSX syntax: 291/291 PASS
- Android/Windows build entrypoint audit: 27 BAT files PASS
