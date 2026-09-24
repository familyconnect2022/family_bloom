# Family Bloom — Phase 6.3 Family Entry UX / Navigation Refinement

## Scope

Device fix for the Family tab genealogy entry only. The previous `Phả hệ gia đình` card was decorative and not pressable.

## Runtime change

`src/app/(tabs)/family.tsx`

- whole genealogy hero is pressable;
- member -> graph viewer;
- owner/admin -> one-shot snapshot on tap, empty graph opens builder, existing graph opens viewer;
- failure fallback still opens viewer so the card never becomes a dead end;
- explicit admin `Quản lý phả hệ` shortcut;
- richer Bloom-style genealogy hero with abstract/non-semantic visual;
- no graph realtime listener on Family tab;
- warmer copy + improved visual hierarchy.

## Data safety

No schema, Firestore Rules, Cloud Function, migration, auth/root state-machine, activeFamilyId, DG-11, Query/Kinship or Family Graph mutation semantics changed.

## Test

1. Tap anywhere on genealogy hero.
2. Admin + empty graph -> builder.
3. Admin + existing graph -> viewer.
4. Member -> viewer/read path.
5. Admin shortcut -> graph admin.
6. Back navigation returns to Family tab normally.
7. Re-test DG-11, graph layout and delete semantics unchanged.
