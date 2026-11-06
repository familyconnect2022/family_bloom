# Family Bloom — Performance Architecture P2.12.3

## Focus Native Modal Recovery + BSH Retained Graph

Baseline: P2.12.2 FULL CODE.

## Device finding

Videos 6290 and 6291 showed a global presentation regression after Family Graph Focus was moved from React Native `Modal` into custom persistent/root presentation hosts. Detail closed and the base graph returned, but no Focus shield, header, loader, or graph painted even for one frame. This demonstrated that BSH data/layout speed and Focus presentation were separate problems.

P2.12.3 stops extending the failed custom presentation architecture. It restores the last device-proven native Focus presentation path while retaining the P2.12 BSH runtime improvements.

## Recovery design

Focus lifecycle is split into two independent concepts:

- `focusOverlay`: the retained Focus session (person, prepared Scene, visual readiness, request identity);
- `focusOverlayVisible`: whether the native Focus `Modal` is presented.

Opening a new branch creates/updates the session and sets presentation visible. Back hides presentation without setting the session to `null`. An unfinished build is cancelled before hide; an already prepared Scene is preserved.

The same-person reopen path restores the existing request identity and reuses the Scene rather than rebuilding the branch.

## Interrupted first-paint recovery

A specific edge case is covered: Back can happen after Scene creation but before `visualReady` commits. When that retained Scene is shown again, P2.12.3 runs a two-native-frame readiness confirmation and then releases the loader without remounting the Scene.

## Presentation simplification

Removed from the Family Graph Focus execution path:

- global ReactNode Focus store;
- `useSyncExternalStore` Focus host;
- root Focus ReactNode layer;
- pending portal handoff state;
- portal content/visibility atomic transport.

`BloomSurfaceStack` remains for persistent Chess/game/global UI. Family Graph Focus uses native `Modal`, which presents above ordinary root views. The surface-layer module is now data-only and does not carry component subtrees.

## BSH preserved

No rollback was made to:

- GraphModel;
- GraphLayout;
- GraphGeometry;
- GraphScene;
- Geometry cache;
- retained node/connector sets;
- visited spatial regions;
- Full / 3-generation / 5-generation retained loading;
- Focus 0.95 initial camera;
- startup tabbar first-frame readiness.

The retained contract remains: pan to an unseen region mounts only new geometry; returning to a visited region performs no spatial query/remount/reroute.

## Regression coverage

New P2.12.3 gate verifies:

- native Focus Modal presentation;
- session and visibility state separation;
- Back does not clear retained session;
- same-person Scene reuse;
- interrupted `visualReady` re-show recovery;
- Focus shell exists before Scene hydration;
- no Family Graph Focus ReactNode store/host remains;
- Chess persistent game plane remains;
- BSH retained Full/3/5/Focus contract remains;
- Debug/Release/copy-over gate registration.

Historical P2.12.1/P2.12.2 presentation gates were updated to accept this explicit successor Recovery contract rather than forcing the device-failing portal implementation back into source.

## Validation

Source validation passes P2.12.3, P2.12.2 successor compatibility, P2.12.1 successor compatibility, P2.12, P2.11.4, P2.11.3, P2.11.2, P2.11.1, P2.11, P2.10, P2.8, P2.7, P2.6, P2.5, Phase14F, Phase14J, Family Graph Query Engine, dense layout and project structure gates.

Device validation remains mandatory for the native presentation and Back latency because JS/static gates cannot prove Android pixels or native Modal detach timing.
