# Family Bloom Phase 17.9A14 — Instant Home + Firebase Data Source Cleanup

## Base
Built directly on Phase 17.9A13. A13 UI/Graph/Reanimated/Chess-audio fixes and the A12 persistent zero-relayout Chess transition are preserved.

## Boot architecture
- Native Expo/Android splash is held with `SplashScreen.preventAutoHideAsync()` only until Firebase Auth/profile/membership routing can make a safe navigation decision.
- Normal signed-in cold start no longer mounts an additional React boot splash.
- `bootSessionCache` is persisted by uid; it can restore the last confirmed profile + membership projection after Firebase Auth confirms that same uid.
- Profile refresh and the single membership realtime source continue authoritatively after cache hydration.
- No fixed splash delay is used.

## Home cache / skeleton policy
- `familyHomeWarmCache` is keyed by uid + familyId and stores bounded display-only members, upcoming/yearly events and latest Moments.
- `FamilyRealtimeProvider` hydrates this cache before post-first-paint listeners wake, then refreshes it from Firestore.
- Home has separate `membersLoading`, `eventsLoading` and `momentsLoading` projections.
- Empty uncached sections use local Bloom skeletons; cached data is shown instead of skeleton; there is no full-screen skeleton.

## Firebase duplicate-read cleanup
### Membership
- Removed `familyService.listForUser()` from Auth bootstrap.
- `familyService.watchForUser()` is now the sole membership bootstrap/realtime source; its first snapshot replaces the former one-shot read.

### Active-family root feeds
The following use stable shared-registry keys:
- `family.members:{familyId}`
- `family.moments.latest:{familyId}:{limit}`
- `family.events.upcoming:{familyId}:{limit}`
- `family.events.yearly:{familyId}`

`sharedRealtimeRegistry` tracks logical subscribers, physical starts, last value and ref-count. It exposes a dev snapshot and supports explicit family/account boundary reset.

### Time Capsule
- Recipient and creator realtime snapshots populate service-level caches.
- `listVisible()` reuses both when present.
- `listUpcomingForRecipient()` reuses recipient realtime cache when present.
- Existing pooled keys across PushBridge/Play/Time Capsule screen remain one physical listener per identical active-family query.

## Graph warm architecture
- Added persisted `familyGraphWarmCache` containing Graph snapshot fingerprint, adapted visual layout, linked-user focus, view mode/anchor and camera.
- `DeferredFamilyPrewarm` runs only after first Home paint and does not mount Graph UI.
- `familyGraphService.watchSnapshot` combines persons + relationships under one shared key and emits only after both halves have initial snapshots.
- Prewarm releases its logical consumer after the first complete pair and retains the physical source for a 30-second Home -> Graph handoff window.
- `useFamilyGraph` derives default linked person from `snapshot.persons[].linkedUid`; the normal entry no longer opens `personLinks -> persons/{id}` only for focus.
- Graph screen reuses cached visual generation and view/camera state.

## Post-first-paint workload ordering
`FamilySession` delays these until after two painted frames + an idle/short fallback boundary:
- active-family Firestore feed listeners;
- Graph prewarm;
- PushBridge;
- Chess realtime foreground join/socket wake-up;
- Chess persistent full surface and Mini host mounting.

This keeps those systems out of the native-splash -> Home critical path while preserving their runtime architecture after warm-up.

## Firebase ownership cleanup
- Removed retired `src/services/homeHub/homeHubService.ts` and its barrel export.
- Copy-over cleanup removes the same legacy file from an older project before overlay.
- Expanded `FIRESTORE_PATHS` and migrated raw feature-owned path strings for Home Games, Kitchen, Music, Whispers, Polls, Fund family doc, Graph proposals, Chess history, diagnostics/test membership access.
- Added `document/firebase/FIREBASE_DATA_SOURCE_CONTRACT_A14.md` describing authoritative, reverse-index and derived ownership.
- No production collection rename/migration is performed.

## Lifecycle/privacy boundaries
- Caches are read only after Firebase Auth confirms a uid.
- Boot/Home cache is uid-scoped; Home warm cache is uid + family scoped.
- Shared realtime registry and Time Capsule runtime caches reset on auth/family transitions.
- Explicit logout clears notification/device registration, boot cache, uid Home warm cache, Graph warm cache and realtime registry.
- Family providers remount by `uid:activeFamilyId` session key.

## Developer diagnostics
Developer Tools now includes a Firebase listener diagnostics section. It can refresh/copy current shared query keys, consumer counts and physical start counts. No HUD or normal-runtime console runner was added.

## Native dependency / install note
Added `@react-native-async-storage/async-storage` `2.2.0`. Copy-over BAT installs missing dependencies. Because this adds native Android code, run `npx expo run:android` once after installing A14 before returning to Metro-only `npx expo start -c` iterations.

## Preserved infrastructure
- Firestore Rules unchanged from A13.
- Firestore cloud rules unchanged from A13.
- Firestore indexes unchanged from A13.
- Chess server source/protocol unchanged from A13.
- Persistent fixed 32-piece Chess pool, independent Mini host, tap-only input, server authority, reconnect/recovery, away timeout, Ready/Promotion/Result and A13 soundscape remain intact.

## Verification
- A14 Instant Home/Firebase cleanup gate: PASS.
- Full TS/TSX syntax transpile scan: PASS (283 files at verification time).
- A13 UI/Graph/Reanimated/Audio gate: PASS.
- A12 zero-relayout Chess transition: 20/20 PASS.
- Current Chess aggregate: 17/17 phase groups PASS after A14 path-centralization-compatible policy assertions.
- Phase 14C Home functional gate: PASS after updating legacy textual assertions to accept centralized path helpers.
- Phase 14F Graph focus/isolation gate: PASS after updating its in-memory visual assertion to the A14 cached visual helper.
- Phase 14R.4 Time Capsule UX/realtime: 16/16 PASS.
- Phase 17.6 clean Developer Tools: 53/53 PASS.
- Phase 13 Release Readiness: 11/11 PASS.
- SHA-256 verified identical to A13 for `firestore.rules`, `firestore.cloud.rules`, `firestore.indexes.json`, and `server/src/socket/socketServer.ts`.
