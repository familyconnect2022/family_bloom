# Family Bloom — Phase 3A v4 Stability Fix

## Scope

This build keeps the existing Phase 3A architecture and fixes three regressions reported during Android device testing.

### 1. Family Gateway keyboard

- Android app config now explicitly uses `softwareKeyboardLayoutMode: "resize"`.
- Family Gateway does not add the keyboard height to content padding and does not call `scrollToEnd()`.
- Focus handling measures only the active input and scrolls only when that control is too close to the keyboard.
- A small controlled clearance is reserved below the focused input so the next action remains reachable without pushing the whole page too high.
- Because `softwareKeyboardLayoutMode` is native app config, Android Development Build must be rebuilt after this change.

### 2. BloomDatePicker

- The user-provided `BloomDatePicker.tsx` is the baseline for this build.
- Month and year are independent touch targets in the Bloom calendar header/navigation.
- Selecting a year moves directly to month selection; selecting a month returns to the date grid.
- Bloom colors, rounded surfaces, typography, haptics and modal layout are retained.
- The draft date clamps the day when changing to a month/year with fewer days.

### 3. Optional avatar during profile creation

Avatar is optional. The previous failure without an avatar came from an unbound service method: `createWithAvatar()` used `this.create(...)`, while the hook exposed that method as a standalone function. Without an avatar, that branch executed with `this === undefined`.

The profile service now uses module-local functions instead of `this` for profile create/get paths. An omitted avatar is normalized to `avatarUrl: null` / `avatarPublicId: null` and the profile can save normally.

### 4. Navigation ownership

`create-profile.tsx` no longer routes directly to `/(tabs)`. It refreshes profile state and leaves the destination to the Root Navigator state machine. A new profile without `activeFamilyId` therefore proceeds to `/family-gateway`.

## Verification performed

- Phase static check: 76 TS/TSX files scanned successfully.
- TypeScript parser/transpile syntax check: 76 TS/TSX files successfully transpiled.
- JSON parse check: `app.json`, `package.json`, `firebase.json`, `tsconfig.json`.
- No `as any` found under `src/`.
- No direct `router.replace/push("/(tabs)")` found under `src/`.
- ZIP integrity test required before release.

Full semantic TypeScript typecheck and Android runtime testing are not claimed because the packaged source does not include `node_modules`; `expo/tsconfig.base` is therefore unavailable in this build environment.

### 5. Root family gate verification

The Root Navigator now treats `activeFamilyId` as navigation state only and also verifies that the id is present in the resolved user membership list before allowing `/(tabs)`. This prevents a stale `activeFamilyId` from briefly opening family tabs.
