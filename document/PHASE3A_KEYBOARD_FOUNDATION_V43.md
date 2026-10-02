# Phase 3A v4.3 — Keyboard Foundation

## Baseline lock

This build is based on Phase 3A v4.2, which preserves the Phase 2 / v4.1 navigation and data-flow baseline.
Navigation, auth gating, profile gating, family gating, activeFamilyId handling, membership resolution, and tab routing are intentionally unchanged.

## Keyboard strategy

Family Gateway now uses the same proven pattern as Create Profile:

- `KeyboardAvoidingView`
  - iOS: `padding`
  - Android: `height`
- `ScrollView`
- `keyboardShouldPersistTaps="handled"`
- drag-to-dismiss keyboard
- Android `softwareKeyboardLayoutMode: "resize"` remains unchanged

The implementation is centralized in `src/components/layout/BloomKeyboardScreen.tsx` so future form screens can reuse the behavior without duplicating keyboard logic.

## Removed from Family Gateway

- auto-focus on mode change
- `InteractionManager` timing
- keyboard/window coordinate calculations
- `onLayout` field-coordinate bookkeeping
- manual `scrollTo()` calls
- fixed keyboard-avoidance offsets / large padding values

The visible Family Gateway UX/UI is preserved. The only intended interaction change is that entering Create/Join mode no longer opens the keyboard automatically; the user taps the desired input to open it.

## Scope rule

`BloomKeyboardScreen` is UI/layout only. It must not import or own router, auth, profile, family, membership, or activeFamilyId logic.
