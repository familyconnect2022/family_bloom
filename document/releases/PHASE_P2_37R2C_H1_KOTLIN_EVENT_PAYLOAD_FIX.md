# Family Bloom P2.37R2C-H1 — Kotlin EventDispatcher payload fix

- Fixes `:family-bloom-overlay:compileDebugKotlin` at `FamilyBloomOverlayModule.kt` where Expo SDK 57 `EventDispatcher` requires `Map<String, Any>` but the module passed `MutableMap<String, Any?>`.
- Diagnostic payload now uses a non-null map. Nullable `kind`, `gameId`, and nullable `extra` entries are only inserted when non-null.
- Keeps Android app version `1.3.6`, versionCode `143016`, native package `family-bloom-overlay@1.3.2`, and native identity `P2.37R2C-native-1`.
- No server changes.
- Regression gate: `npm run phaseP2_37R2C_H1:check`.
