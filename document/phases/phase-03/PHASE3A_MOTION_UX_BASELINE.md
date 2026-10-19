# Family Bloom — Phase 3A Motion & UX Baseline

## Scope

Phase 3A focuses on Motion System, navigation polish and shared UX foundation. No new large feature layer is introduced in this checkpoint.

## Motion principles

- The Auth/Profile/Family state machine remains the source of truth.
- Motion never grants access to `/(tabs)` and never substitutes for `activeFamilyId` or membership/authorization rules.
- Navigation transitions remain configured centrally through the Root Stack.
- Modal routes keep a consistent bottom-up native transition.
- Shared UI uses the same `BLOOM_MOTION` duration tokens instead of inventing unrelated timings.

## Current motion baseline

`src/constants/motion.ts` defines the Bloom motion vocabulary:

- screen: fade
- modal: slide from bottom
- durations: fast / standard / gentle

`BloomAppBootstrap` now becomes visible again whenever app routing returns to a resolving state, then gently fades after auth/profile/navigation are stable. This prevents intermediate route flashes without making motion the owner of navigation.

## UX fixes included in this build

### Family Gateway keyboard

The previous implementation combined Android `KeyboardAvoidingView(height)`, a bottom padding based on the full keyboard height and repeated `scrollToEnd()` calls. On some Android devices that stacked three displacement mechanisms and pushed the form too high.

The current implementation:

- does not add keyboard height to the entire content padding;
- does not repeatedly call `scrollToEnd()`;
- keeps Android layout stable and uses native resize + ScrollView;
- measures the focused `TextInput` against the actual keyboard top edge;
- scrolls only by the amount required to leave a small comfortable gap;
- uses iOS `KeyboardAvoidingView(padding)` only where it is useful;
- focuses the first field after the create/join card has mounted, instead of combining `autoFocus` with repeated forced scrolling.

### BloomDatePicker

The Bloom-styled date picker keeps its existing visual language and adds quick navigation:

- tap `Tháng N` in the calendar header to open a 12-month Bloom grid;
- tap the year in the header to open a scrollable Bloom year grid;
- selecting a month or year navigates the calendar and returns to calendar mode without closing the whole date picker;
- selected month/year uses the Bloom primary treatment;
- today receives a subtle Bloom outline when it is not the selected date;
- confirmation behavior remains unchanged: only `XÁC NHẬN` calls `onDateChange`.

### BloomButton

- no-icon buttons keep geometrically centered text;
- percentage-width button styles now get a full-width animated wrapper so `width: "100%"` / `width: "90%"` is calculated against the parent rather than an intrinsic wrapper;
- `flex` is forwarded to the animated wrapper for row actions;
- press scale is gentler;
- button accessibility state exposes disabled/loading state.

### BloomTextInput

- focus/blur transitions use `BLOOM_MOTION.durations.fast`;
- consumer `onFocus` / `onBlur` callbacks can no longer overwrite the internal Bloom focus animation;
- error border stays destructive while focused instead of turning primary;
- password/search behavior is preserved.

### BloomToast

- omitted `type` still defaults to `info`;
- toast position now respects safe-area insets;
- enter/exit timing uses Bloom motion tokens;
- swipe-to-dismiss now calls the current hide handler instead of a stale initial closure.

## Family access decisions retained

- Family creation sets `activeFamilyId` atomically in the family creation operation.
- “Vào nhà của mình” only refreshes profile/state; it does not set `activeFamilyId` and does not directly route to `/(tabs)`.
- Root Navigator remains the navigation owner.
- Authorization must continue to be enforced by membership/role + Firebase Security Rules, not by `activeFamilyId` alone.

## Safe copy / update scope for this checkpoint

Runtime changes are contained in `src/`.

For an existing project based on the same Phase 3A v2 baseline, the safest update is:

1. back up the current project;
2. copy this ZIP's `src/` directory over the project's `src/` directory;
3. optionally copy `document/` if the architecture notes should be updated.

This checkpoint does **not** require replacing:

- `app.json`
- `package.json` / `package-lock.json`
- `android/`
- `ios/`
- `google-services.json`
- `GoogleService-Info.plist`
- Firebase rules/config
- `.env` or local secrets
- `node_modules/`

## Validation

Completed in the packaging environment:

- `node scripts/phase2-static-check.js` — passed, 76 TS/TSX files scanned.
- JSON parse check for `package.json`, `app.json`, `tsconfig.json`, `firebase.json` — passed.
- `src/` scan for `as any` — no matches.

Still required on the developer machine:

- `npm run typecheck` after dependencies are installed;
- `npx expo run:android` on a real Android device, especially Family Gateway create/join keyboard behavior and BloomDatePicker month/year selection.

Do not treat this document as evidence of Android runtime success; native runtime was not executed in the packaging environment.
