# Family Bloom H25R2R3 — Fix update preflight npm ENOENT on Windows

## Observed
`spawnSync npm ENOENT` in `scripts/test-h25r2-xiangqi-black-turn-reconnect.cjs` running against a freshly extracted FULL ZIP on Windows/Node 24.

## Root cause
The H25R2R2 updater advertised a dependency-free preflight, but its Xiangqi test attempted to load TypeScript globally by invoking `execFileSync('npm', ['root','-g'])` when project-local node_modules had not yet been installed. On Windows, this invocation can fail with ENOENT: npm is a `npm.cmd` shim, not a native executable. Merely changing to npm.cmd would not make this pre-install test genuinely dependency-free.

## Changes
- `--source-only` validates 9 grounded Xiangqi native/input invariants with only Node builtins; no npm subprocess, TypeScript or Android dependencies.
- Default test continues the real dynamic controller VM/TypeScript tests and **fails** if local TypeScript is absent. It runs in CLEAN APPLY, Build & Share, direct APK build and EAS *after* dependency bootstrap.
- Source-only release preflight explicitly selects `--source-only`.
- Added an updater/Build & Share regression gate checking Windows call ordering, preflight behavior and the lack of npm child processes.
- Updater failure message no longer advertises a stale backup from an earlier run if the current attempt failed before any source mutation.
- H25 runtime claims test also moved after TS bootstrap across updater, Build & Share, direct Release and EAS, removing a second Windows/fresh-project failure.
- No Chess/Xiangqi gameplay logic, Firebase Rules, indexes, Render server or Android native files changed.

## Test boundary
Node-only integration/source gates can be executed on Linux. Actual Windows CMD, npm install, Expo Gradle Android APK compilation must still be executed on user's Windows workstation before distributing APK.
