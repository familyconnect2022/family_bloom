# Family Bloom Android M3R4R8R1 — Firebase Session Gate

Based on M3R4R8 FULL source (R7R1 lineage). Android only; Web not modified.

## Scope

- Super Bloom Minimal waiting screen at always-present `/session-gate`; never loads family documents in the screen itself.
- Firebase Auth initial observer: 15-second deadline; a silent initial listener is treated as an error, not as signed-out. Retry resubscribes without signing out.
- Profile: 15-second deadline for authoritative `getDocFromServer`; no cached data may unlock Create Profile or Home. Request-id + auth epoch and UID checks reject stale responses after retries/account switches.
- Membership: 15-second deadline for `getDocsFromServer` against current UID reverse-membership collection. Cache/pending-write snapshots cannot unlock Home. Errors never set `membershipStatus=ready`.
- All membership listener callbacks remain UID/epoch-scoped; listener errors fail closed. The listener stays subscribed across Activity background/foreground transitions, avoiding an unnecessary full session restart when choosing an avatar.
- Automatic and manual single-family switching: 15-second bounded waits; a stuck server operation cannot hold the transition overlay indefinitely.
- Retry: rechecks Profile and Membership from server for the current UID, clears old authorization evidence before starting, and does not sign out or delete Firebase data.
- The Root protected Home group still requires UID, UID-matching Profile, verified Membership, active family in the authoritative list, and Welcome complete; the always-present anchor prevents blank/unavailable protected routes.
- Welcome sequencing and Family CV/avatar/person-in-graph features from R8 are retained.

## Test-first scenarios

1. New UID without Profile: server confirms absence -> Create Profile; no Home.
2. Profile exists, membership fetch pending: waiting screen; Home inaccessible.
3. Slow Firebase (>15 seconds): error UI with Retry; no Home; no auto-logout.
4. Server returns after timeout/retry: old request may not rewrite current UID's state.
5. Membership snapshot from local cache or with pending writes: never unlock Home.
6. No network and no server verification: show error, not "no profile".
7. Membership listener permission error: fail closed.
8. Firebase verified + Welcome requested: show Welcome at safe anchor before mounting Home.
9. Welcome dismissed: wait for Tabs real first frame before removing transition shield.
10. Camera/gallery Activity returns: no membership listener teardown/boot refresh solely due to foreground change.

## Release gates

- `node scripts/tests/release/test-m3r4r8r1-firebase-retry-timeout.cjs`
- `node scripts/tests/release/test-m3r4r8-bootstrap-navigation-p0.cjs`
- All Node test commands invoked by `Family_Bloom_CLEAN_APPLY_FULL.bat`.
- `node scripts/setup/check-ts-syntax-transpile.js` and structure gate.
- Preflight added to Auto Update BEFORE backup/overlay and Clean Apply BEFORE cleanup.

## Limitations

Tests are offline/source-level and an updater overlay simulation. A real Firebase connection, Google sign-in, Android device transitions, Expo Metro/Gradle/APK build and network timeout performance have NOT been verified. These require physical Android APK tests with a new UID and an existing UID. A passing static gate is not a passing APK.
