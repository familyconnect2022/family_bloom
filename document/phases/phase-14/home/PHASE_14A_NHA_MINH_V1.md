# Family Bloom — Phase 14A · Nhà Mình V1

Base: Phase 13 Android RC1 (preserved as immutable release checkpoint).

## Product direction
"Góc chơi" is renamed to **Nhà Mình** — a shared family living space, not a second Moments feed.

V1 ships three real, family-scoped areas:
- **Thì thầm**: warm short notes visible to the active family.
- **Cùng quyết định**: polls with one vote per family member and live family results.
- **Bếp Nhà Mình**: offline-friendly curated recipes with ingredients and step-by-step cooking.

The hub also reserves clear Bloom Supper cards for later modules:
- mini games,
- music / shared listening,
- family fund / expense tracking,
- family notices.

## Architecture / safety
- All user-generated Nhà Mình data is under `families/{familyId}/...`.
- No inactive-family listeners are opened from the tab hub.
- Realtime listeners start only when the user opens Thì thầm or Cùng quyết định.
- Poll votes are stored inside the poll document as `votes.{uid}` and Firestore Rules only allow a member to change their own vote key.
- Kitchen V1 is local/static so recipes remain available without Firestore or Cloud Functions.
- Performance Lab remains gated to internal/performance builds.
- No Cloud Functions or Blaze dependency is introduced.

## New Firestore collections
- `families/{familyId}/homeWhispers/{whisperId}`
- `families/{familyId}/homePolls/{pollId}`

Deploy `firestore.rules` before testing Thì thầm / Cùng quyết định against Firebase.

## Regression contract
Run:

`node scripts/test-phase14a-nha-minh-v1.js`

Expected: 13/13 PASS.
