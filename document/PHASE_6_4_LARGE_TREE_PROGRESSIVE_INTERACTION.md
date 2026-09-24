# FAMILY BLOOM — PHASE 6.4 LARGE TREE / PROGRESSIVE INTERACTION

**Status:** IMPLEMENTED · AWAITING DEVICE TEST  
**Basecode:** Phase 6.3 CLOSED — Spatial Grid Semantic Routing  
**Data safety:** zero schema/rules/functions migration

## Scope implemented together

- viewport-aware Person rendering;
- connector render culling by viewport;
- progressive Full Tree ordering by graph distance from focus;
- progressive batch mount + manual `Mở thêm`;
- generation spacing increased from ~146px pitch to 288px;
- connector spatial grid recalculated to 160px cells;
- viewport spatial grid 256px + camera bucket 128px;
- search/focus behavior hardened for bounded 3/5 generation modes;
- synthetic 500-Person viewport/performance regression.

## Performance architecture

```text
Firestore snapshot
→ Query Engine / focus scope
→ full logical layout
→ progressive Full Tree mount order
→ spatial node index
→ camera coarse bucket
→ viewport + overscan query
→ React mounts visible nodes/connectors only
```

Pan/pinch stays on Reanimated UI thread. JS does not receive every gesture frame; camera state updates only when the camera crosses a coarse cell or zoom bucket. Overscan keeps nearby nodes mounted between updates.

## Layout metrics

```text
generationTop = 24
generationStep = 288
canvasBottomPadding = 120
connectorGridCellSize = 160
viewportGridCellSize = 256
viewportCameraCellSize = 128
viewportOverscanScreens = 0.85
```

These are runtime defaults in `APP_CONFIG_DEFAULTS`; they are not persisted Admin settings.

## Device acceptance gate

Phase 6.4 is not CLOSED until user tests pan/pinch/full-tree/search/branch expansion on a real device and checks connector visual truth after the larger vertical corridors.
