# Phase 15B.3 — Runner State Machine + Chess Layering Hotfix

## Why this hotfix exists

Phase 15B.2 proved that the performance service itself could advance, but Android UI evidence showed three correctness problems:

1. The visible Performance Lab could remain on top while a hidden navigator advanced underneath it.
2. HUD progress and the Lab button could show different step numbers.
3. A navigation failure could surface as an invalid `file:///` screen instead of a real Expo route.

The same fast route sweep exposed a Chess bootstrap race: `ChessBoard` could mount before the authoritative FEN arrived. Because the initial piece descriptor state only consumed the first render, PieceLayer could remain empty even while clocks/material/state continued updating.

## 15B state-machine changes

- Performance Lab owns exactly one startup navigation action.
  - Existing in-app stack: dismiss the Lab once.
  - Cold/deep-link entry: replace once with the first public route.
- Global driver is not armed until a non-Lab route is visibly acknowledged.
- All 29 production steps now use public Expo URLs (`/`, `/moments`, `/planner`, etc.), not physical route-group paths such as `/(tabs)/moments`.
- Production routes carry no app-sweep query parameters. Only synthetic Graph/List routes receive automation params.
- The global driver uses replace-only navigation after runner readiness so there is always one visible test route owner.
- HUD progress uses the same `currentStep` source as the state machine.
- Static gate resolves all 29 configured production URLs against the actual `src/app` tree.
- Historical Phase 15B.1/15B.2 gates remain in source for history, but current Android build scripts use Phase 15B + Phase 15B.3.

## Chess rendering changes

- Added delayed-FEN bootstrap recovery: if PieceLayer mounted empty and the real FEN arrives later for the same game, descriptors/runtime are rebuilt once.
- Chess board now has an explicit relative stacking contract:
  - square plane: z0
  - highlight plane: z10
  - hint plane: z20
  - interaction plane: z30
  - piece plane: z40
  - border: z60
- Interaction surface is explicitly transparent.
- PieceLayer owns an explicit absolute stacking surface.
- Game-level `boardSurface` remains relative/protected.
- Promotion/rematch still use the Phase 15A.6 window-level board-anchored portal via `measureInWindow()`.

## Validation

- Phase 15B.3: 19/19 PASS
- Phase 15B: 33/33 PASS
- Current Chess aggregate: 13/13 PASS
- Phase 15A.6 portal: 14/14 PASS
- Phase 15A.4: 10/10 PASS
- Phase 15A: 30/30 PASS
- Release readiness: 11/11 PASS
- Phase 11 Final Performance Gate: PASS
- Phase 14T Games: 44/44 PASS
- Phase 14S.1 Fund governance: 51/51 PASS
- Phase 14S.1A Fund form UX: 25/25 PASS
- Phase 14R.4E Time Capsule live state: 18/18 PASS
- TS/TSX syntax: 251/251 PASS
- Import/asset resolution: 1086/1086 PASS

## Test focus on device

1. Start Phase 15B once.
2. Performance Lab must disappear.
3. HUD and visible screen must advance together from 1/42 onward.
4. No `file:///` screen should appear.
5. When Chess is visited during the sweep, pieces must be visible immediately or self-recover as soon as FEN is available.
6. Promotion/rematch overlay must remain board-centered and above surrounding rails/actions.
