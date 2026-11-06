# Family Bloom — Appearance 3.0 Lab (trial only)

Baseline: `R3R3D7R2R3R3R1_P0_LOGIN_CRASH_HOOK_FIX`, November 3, 2026.

## Scope and intent

This is **an isolated developer experiment**, not a claim that the legacy app-wide
Appearance system has been migrated or fixed. `app.json` retains
`experiments.reactCompiler=true`, and Auth, Firebase Rules, games, Moments,
Render, Vercel, notifications and Web are unchanged. The previous source ZIP
and the Compiler-OFF trial remain rollback baselines.

A single route is added under **Dev Tools → Appearance 3.0 Lab**. It is only
accessible to the already-verified developer account. These primitives are
implemented without `COLORS` Proxy, `createBloomStyles`, `BloomText`, mutable
module-level palette reads during render, or the typography WeakSet registry.
Instead they consume explicit snapshots from `useSyncExternalStore` and pass
immutable semantic tokens as props. Typography is applied exactly once.

Samples: theme palette, light/dark/system selection, five font variants,
font scale 90–160%, card, text, input, primary/outline button, native modal.
The default **Sandbox** mode changes only this page's React state — it does
not write Firestore or override account appearance. The separate **Live**
mode explicitly updates the user's account Appearance via the existing
Local-First workflow and may schedule a Firebase write after a user action.

## Cold-start reproducibility

The live account appearance bridge currently resets to Rose defaults when
binding a UID and **then reads UID-scoped AsyncStorage**. This can expose a
transient default palette before hydration. A component that caches styles
without reactive dependencies may retain that transient palette. This is a
possible mechanism, not yet proof of the reported regression.

In the Lab, tap **Save baseline before restart** after choosing the real
palette/font/scale, force-close the app, reopen, and return to the Lab.
The Lab displays the saved marker versus the final account snapshot and the
last hydration status: `ready-local`, `ready-cloud`, `ready-default`,
`offline-default`, etc. If the marker matches but a visual component looks
old, investigate stale styling/render. If it differs, investigate persistence,
UID binding and user actions. The marker is stored only locally; no personal
identity or input content is exported.

## Performance and interpretation

Use **Capture measurements** after interacting with the samples several times.
The Lab records React `Profiler` commit count, actual JS render duration,
mean and p95 when profiling is available, plus user gesture to
`useLayoutEffect` JS latency. It does **not** provide true native FPS, frame
presentation timing, CPU, battery, or memory measurements. React Profiler can
be unavailable in production builds without profiling support — zero callbacks
must not be interpreted as zero renders. No continuous Metro logging or
background performance timer is installed.

## A/B experiment

1. Install the Lab patch on the exact supported R3R3D7R2R3R3R1 baseline.
2. Turn React Compiler **ON** (the Lab's intended mode), clear Metro cache,
   reload Dev Client. Do 20 manual theme/font/scale changes and record results.
3. Save a cold-start marker; force-close and reopen. Record status and layout.
4. In a second run with the *same source and phone*, set Compiler **OFF**,
   clear Metro cache, reload, repeat the steps.
5. Compare behavior and performance metrics. When using Release APK, each
   change to Compiler requires a fresh build; `expo start --clear` alone does
   not update an already compiled Release bundle.
6. Restore the baseline using the dedicated rollback script. If source
   identity validation fails, do NOT force copy or wipe the project.

## Testing limitations

Static tests and a mocked-runtime token smoke test passed. Actual React
Compiler compilation, full TypeScript semantic typecheck, install on Windows,
Android runtime rendering and native-performance comparisons are **not**
confirmed in this environment (no project `node_modules` / physical phone).
The Lab only validates the new subset while most existing app screens retain
legacy Appearance code and can still show stale theme under Compiler ON.

## Files changed / created

- `src/appearance3/useAppearance3.ts` — explicit reactive hooks and tokens
- `src/appearance3/labComponents.tsx` — isolated samples
- `src/app/(internal)/appearance3-lab.tsx` — developer UI and benchmark
- `src/app/(internal)/developer-tools.tsx` — Lab entry
- `src/theme/appearanceCloudSync.ts` — read-only hydration status (no IO added)
- `scripts/tests/release/test-appearance3-lab.cjs` — static / runtime smoke
- `document/reports/APPEARANCE_3_LAB_COMPILER_ON_2026-11-03.md` — this report

The `app.json` React Compiler value is already true in the base source; the
patch kit enables it when the installed baseline is the sanctioned OFF trial.
