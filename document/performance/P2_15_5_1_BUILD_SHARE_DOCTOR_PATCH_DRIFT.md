# P2.15.5.1 — Build Share Doctor Patch Drift Recovery

- Expo Doctor 1.20.4 may report `1 check failed` when only newer compatible SDK 57 patch packages are recommended.
- Family Bloom now parses both the old and new Doctor summary formats.
- Compatible patch-only dependency drift is advisory after the strict package.json/node_modules/package-lock contract has passed.
- `expo`, `expo-dev-client`, `expo-router`, and `expo-splash-screen` are now included in the strict dependency/lock checks.
- CLEAN APPLY re-runs those checks before deciding whether `npm install` is needed, so copy-over projects with a stale lock are repaired automatically.
