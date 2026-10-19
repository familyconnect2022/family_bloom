# Family Bloom — Phase 16A.2 Build Report

## Baseline
Phase 16A Xiangqi Visual Foundation on top of Phase 15B.3 state-machine + Chess layering baseline.

## What changed
- Replaced all 14 Xiangqi production WebP pieces with the approved precise-safe-crop batch.
- Each asset is a 384×384 transparent lossless WebP.
- Measured safe alpha margins are stored in `assets/xiangqi/asset-manifest.json`.
- Minimum measured margins in the approved batch: left 65 px, right 66 px, top 53 px, bottom 61 px.
- `XiangqiPiece` keeps `resizeMode="contain"` and explicitly allows visible overflow.
- Added `phase16a2:check` and wired it into Android Debug + Release build gates.

## Android visual test surface
`Nhà Mình → Trò chơi Nhà Mình → Cờ tướng Nhà Mình`

The screen includes:
- seven Red + seven Black production masters,
- 32 / 40 / 48 / 56 / 64 px review sizes,
- normal / selected / hint / drag / disabled states,
- 9×10 Xiangqi board foundation with river and palaces,
- 32-piece opening position using the exact production assets.

## Regression results
- Phase 16A: 22/22 PASS
- Phase 16A.2: 12/12 PASS
- Phase 15B.3: 19/19 PASS
- Current Chess build gates: 13/13 PASS
- Phase 15A.6 portal: 14/14 PASS
- Games: 44/44 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 255/255 PASS

Import scan note: four pre-existing optional/generated Vietnamese Music catalog modules are absent from this source-only baseline. They predate Phase 16 and were not modified or fabricated in this phase.

## Scope boundary
Phase 16A.2 intentionally does not add Xiangqi rule validation, server authoritative games, invitations, clocks, reconnect, or realtime transport. Those begin only after the Android visual foundation is approved.
