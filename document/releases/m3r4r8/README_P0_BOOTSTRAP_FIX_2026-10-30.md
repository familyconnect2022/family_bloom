# FAMILY BLOOM M3R4R8 — P0 bootstrap / Welcome / blank Home

Android source base: M3R4R7R1, not a bytewise merge with R2. Web unchanged.

## Failure observed

- R7R1 RootRouteGate referenced `inTabs` without declaring it; a new UID routed to `/create-profile` can trigger a real `ReferenceError: inTabs is not defined`. This is confirmed by executing the original redirect predicate.
- A signed-in UID with no Firestore profile can also be sent into an invalid protected-route screen during identity bootstrap.
- After reading and dismissing Thư Ngõ, the app can expose a white navigator before Tabs mounts. Foregrounding again may allow Home to appear.
- A failed local cache read could previously prevent the authoritative profile read, keeping the session in `loading`.

## Confirmed crash patch

- R8 RootRouteGate now compares `rootSegment === "(tabs)"` rather than the undeclared `inTabs` symbol.
- The release gate executes the redirect predicate for the new-user route and detects this category of ReferenceError (29/29 checks). Syntax-only transpilation would not catch it.
- Auto Update recognizes the exact original R7R1 source fingerprint, including critical Root/Avatar/BAT files; modified or partial R7R1 sources remain blocked.

## Invariants

1. `src/app/session-gate.tsx` is always addressable and public only as a data-free waiting screen. It does not access profile/family data.
2. Root protected guards: login requires signed-out; create-profile requires signed-in + confirmed missing profile; family entry requires confirmed current-UID profile; Home requires UID + matching profile UID + ready membership + matching active family and no pending Welcome.
3. A first-login Profile is fetched via `getDocFromServer`. Missing server response is an error/retry, **not** authorization to create Profile or open Home.
4. Auth/profile boot must not await optional local cache read.
5. Welcome is shown over the session-gate anchor before Home mounts. After dismissal, the transition is covered until Tabs reports both page and tab-chrome readiness.
6. Delayed family switching/completion from a previous UID must not update the current account's React state.
7. Failed Profile verification displays a retryable overlay, never Home.

## Test method

- Run `node scripts/tests/release/test-m3r4r8-bootstrap-navigation-p0.cjs` (29/29 offline checks, including executable redirect predicate; Node >=22 without node_modules supported).
- Run Clean Apply/Build & Share preflight only after the full source is overlaid via the supported Auto Update flow.
- Source gate validation is not equivalent to an APK run. Android device and Firebase integration still must be tested.

## Mandatory phone scenarios

1. Clear app data, sign in to UID with no Profile. Expect Create Profile. No Home, no Welcome, no crash.
2. Sign in to existing UID + valid family. Expect Welcome before any Home content. Open letter, continue; visible progress page as needed, then Home; **never white**.
3. Force-stop and reopen. Expect existing Home without a new first-login Welcome, unless explicitly requested for a new family.
4. Switch UIDs. Slow Firestore responses from the old UID must never expose its profile or family under the new UID.
5. Test weak/offline network. Server Profile verification failure must show a retry flow, not Create Profile/Home.

## Restrictions

- No Web, Render, Vercel, Firebase rules or credentials modified.
- This source does **not** include a tested APK. Build Windows/Gradle and on-device test remain mandatory.
- Keep project backup; never bypass source-fingerprint gate if Auto Update refuses to apply.
