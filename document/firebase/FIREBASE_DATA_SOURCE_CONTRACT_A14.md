# Family Bloom — Firebase Data Source Contract (Phase 17.9A14)

This document defines **ownership**, **authoritative sources**, **reverse indexes / derived data**, and **listener policy**. A14 does not rename or migrate production collections; it makes runtime ownership explicit and removes duplicate reads/listeners.

## Runtime rules

1. Firebase Auth is the privacy gate. Local caches are read only after Auth confirms the same `uid`.
2. A stable Firestore query key may own only one physical `onSnapshot` at a time. Additional screens/providers become logical subscribers through `sharedRealtimeRegistry`.
3. One-shot `getDoc/getDocs` is not allowed immediately before opening the same realtime query just to bootstrap it. The first `onSnapshot` delivery is the bootstrap snapshot.
4. Root listeners are restricted to cross-app, active-family data. Feature-specific listeners attach only while the feature needs them.
5. Changing family is a data boundary. Shared realtime entries are reset, old-family callbacks are ignored by component/effect generation, and the new family creates its own sources.
6. Logout resets shared realtime state and deletes uid-scoped boot/Home warm caches.
7. Firestore path strings belong in `src/services/firebase/firestorePaths.ts`; features consume helpers rather than creating parallel path ownership.

## User-private / reverse-index data

| Path | Role | Authority |
| --- | --- | --- |
| `users/{uid}` | User profile + selected `activeFamilyId` | Authoritative for the user's own profile and current family preference |
| `users/{uid}/memberships/{familyId}` | Fast reverse index of homes visible to a user | **Index/cache**, not role authority |
| `users/{uid}/pushTokens/*` | Device push registrations | Authoritative technical data for that user/device |
| `users/{uid}/savedHomeWhispers/*` | User's saved whisper snapshots | User-private derived/saved data |
| `users/{uid}/homeInbox/*` | Inbox projection for direct Home events | **Derived/index** from family-domain content |
| `users/{uid}/homeMusicFavorites/*` | Personal music favourites | Authoritative user preference |
| `users/{uid}/diagnostics/*` | Internal diagnostics | Technical only |

### Membership rule

`families/{familyId}/members/{uid}` is authoritative for whether the uid is a member and for its family role. `users/{uid}/memberships/{familyId}` is a reverse index used to discover the user's homes quickly. Family switching verifies both sides before updating `users/{uid}.activeFamilyId`.

## Family-domain data

| Path | Role | Authority |
| --- | --- | --- |
| `families/{familyId}` | Family metadata | Authoritative |
| `.../members/*` | Membership + role inside family | **Authoritative membership** |
| `.../persons/*` | Genealogy people | Authoritative Graph entity |
| `.../relationships/*` | Genealogy relationships | Authoritative Graph entity |
| `.../personLinks/{uid}` | uid → person reverse lookup | **Index**; Graph can derive current person from loaded `persons.linkedUid` without rereading it |
| `.../events/*` | Planner events | Authoritative |
| `.../moments/*` | Family moments | Authoritative |
| `.../homeWhispers/*` | Whispers | Authoritative |
| `.../homePolls/*` | Polls + ballot subcollections | Authoritative |
| `.../homeTimeCapsules/*` | Time Capsules | Authoritative |
| `.../homeKitchenPreferences/*` | Per-member kitchen preferences | Authoritative family-scoped preference |
| `.../homeGameSessions/*` and slots/rotations | Home games | Authoritative game-domain data |
| `.../homeFundTransactions/*` | Fund ledger | **Authoritative ledger** |
| `.../homeFundMeta/summary` | Fast fund totals | **Derived summary**; ledger wins on conflict |
| `.../homeMusicCycles/*`, `.../homeMusicSongs/*` | Shared family music cycle/content | Authoritative shared music state |
| `.../activities/*` | Family activity feed | Authoritative activity entries |
| `.../chessGames/*` | Durable Chess checkpoints/results | Authoritative Firestore history; live move/clock authority remains the realtime Chess server |

## Global technical/index data

Collections such as family-code lookup, media/index data, Chess active/recovery indexes, and similar global technical collections are not feature-domain truth unless explicitly documented by the owning service. They exist to locate or recover authoritative data efficiently.

## A14 root realtime ownership

After first Home paint, the active-family runtime owns bounded shared sources for:

- family members;
- latest Moments head;
- upcoming events;
- yearly recurring events;
- user Home inbox / active Time Capsule sources when PushBridge starts;
- Graph `persons + relationships` only as an idle prewarm/shared source, never as hidden Graph UI.

Chess socket/presence, PushBridge and Graph warm-up are deliberately outside the critical native-splash → Home path.

## Warm-cache policy

- `bootSessionCache`: uid-scoped profile + membership snapshot for instant shell routing after Firebase Auth confirms the uid.
- `familyHomeWarmCache`: uid + family-scoped **display-only** bounded Home data; Firestore realtime refresh remains authoritative.
- `familyGraphWarmCache`: family-scoped Graph snapshot/layout/focus/camera warm data; Graph realtime refresh remains authoritative.
- Caches never bypass Firebase Auth, Firestore Rules, server Chess validation, or mutation services.
- Logout deletes uid-scoped boot/Home warm caches and clears runtime realtime sources.

## Intentionally retained denormalization

The following are not treated as accidental duplication:

- user membership reverse index vs family member authority;
- `personLinks/{uid}` vs `persons.linkedUid`;
- `homeInbox` projections vs their family-domain source documents;
- fund summary/meta vs fund transaction ledger.

The rule is: **one clearly documented authoritative source, optional indexes/derived projections, and one runtime query owner per identical listener.**
