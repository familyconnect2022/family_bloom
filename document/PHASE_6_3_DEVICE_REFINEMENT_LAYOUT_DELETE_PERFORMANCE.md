# FAMILY BLOOM — PHASE 6.3 DEVICE REFINEMENT
## Dense layout · Partner adjacency · Delete semantics · Performance · Bloom confirmation

**Baseline:** Phase 6.2 CLOSED + Phase 6.3 Query/Kinship/Focus UI test build  
**Data safety:** no schema change, no migration, no Rules/Functions deploy  
**Status:** implemented, awaiting user device retest

## 1. Device issues fixed

### Dense generation overlap
A generation row no longer compresses node spacing to fit the old fixed 1020px canvas. The live adapter now computes the row width from actual visual units and expands the logical canvas horizontally when needed.

### Couple split by sibling/relative
People connected by a `partner` relationship are grouped into one atomic visual unit. Another Person in the same generation cannot be placed between the partner-connected members.

Example regression case:

```text
Nguyễn Thị Bích ↔ Huỳnh Văn Long
Nguyễn Thị Liên = chị ruột của Nguyễn Thị Bích
```

Liên may appear before or after the couple unit, but never between Bích and Long.

### Delete relationship vs delete Person
The UI now has separate semantics:

```text
Xóa đường nối / relationship
→ only delete FamilyRelationship
→ preserve both Persons

Xóa người khỏi phả hệ
→ explicit Person deletion only
→ incident structural relationships may be removed by the existing safe cascade
→ linked account + Timeline/Album protections remain active
```

The ambiguous user-facing wording `Xóa node` has been removed from these correction flows.

### Native Android alerts
Graph destructive/correction flows now use Bloom-styled confirmation UI instead of native Android alerts.

Covered flows:

- unlink account;
- delete Person;
- delete relationship;
- delete Person Timeline entry.

Media permission denial uses Bloom Toast because it is informational rather than destructive.

## 2. Performance refinements

- `PersonNode` is memoized.
- connector layer is memoized.
- pan/pinch stays on Reanimated UI thread.
- 3/5-generation bounded rendering is unchanged.
- Full Tree progressively mounts nodes instead of mounting a very large tree in one blocking render.

Central defaults:

```text
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeInitialBatch = 96
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeBatchSize = 64
```

These defaults are intentionally centralized for the future Admin Configuration architecture. No persisted Admin config schema has been created.

## 3. Files changed in this refinement

```text
src/app/family-graph.tsx
src/app/family-graph-admin.tsx
src/components/familyGraph/FamilyGraphPrototype.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
src/components/familyGraph/familyGraphLiveAdapter.ts
src/components/ui/BloomConfirmDialog.tsx
src/constants/appConfiguration.ts
src/services/familyGraph/familyGraphMutationService.ts
scripts/test-familyGraphLayout.js
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
```

`familyGraphMutationService.ts` is included to keep the current safe `deletePersonCascade` / `deleteRelationship` source synchronized; this refinement does not introduce a new mutation contract.

## 4. Validation

```text
Phase 2 static check: PASS — 116 TS/TSX
TS/TSX transpile: PASS — 116 files, 0 syntax errors
Relative imports: PASS — 375 imports, 0 missing
Query/Kinship/Focus tests: PASS
Dense layout regression tests: PASS
Synthetic 50 / 100 / 300 / 500 Person benchmark: PASS
```

Dense layout regression specifically verifies:

- partner pair stays adjacent;
- sibling does not appear between the couple;
- no node overlap in a dense generation;
- logical canvas grows beyond 1020 when required.

## 5. Device retest

1. Open Full Tree with the real family data from the reported screenshots.
2. Confirm Nguyễn Thị Bích and Huỳnh Văn Long remain adjacent.
3. Confirm Nguyễn Thị Liên is outside that couple unit.
4. Pan/zoom a generation with many Persons and confirm no card overlap.
5. Open a Person → `Quan hệ` → `Sửa đường nối` → delete one wrong relationship.
6. Confirm both Persons still exist after the relationship disappears.
7. Use `Xóa người khỏi phả hệ` only on a Person intentionally being removed.
8. Confirm unlink / delete confirmations use Bloom UI, not native Android dialogs.
9. Recheck 3/5-generation focus, Query/Kinship labels, Timeline and Album.

No Firebase Rules or Functions deployment is required for this refinement.
