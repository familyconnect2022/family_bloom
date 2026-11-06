# Family Bloom R9 — Android-only Release gate repair (2026-11-05)

**Baseline:** R8 Android Only — source SHA-256 `e0613c552a4ab8a9e702033c96321927f5e27de253a6db6ea89fa4709b6582e5`.

**Scope:** Release gate and Windows Android menu only. No runtime, Web app, Firebase Rules, Gradle, game server or Moment media changes.

- Corrected legacy migration-map gate: 175 included three retired Web-only tests; R8 correctly has 172 remaining. All mapped native tests and no retired Web tests must remain.
- Corrected historical Windows BAT preflight to honor canonical audit PASS even when copied/archived BAT files are reported as *unmanaged warnings*. Required managed BATs still must pass.
- Corrected Blaze menu contract to the Android-only actual menu (`12345678ABCDEFGHIJKL0`) while retaining specific E-to-Blaze mapping and developer-confirmed deployment.
- Removed duplicate `:update` menu label that silently returned to menu; aligned printed action numbers with their current shortcuts.
- Fixed structure-gate false failure on Markdown/TXT contained only in inert historical `updates/<release>/payload` snapshots; live project documentation remains restricted to `document/`.
- Added forward-compatible R9+ source-release gate, wired into Build & Share, CLEAN APPLY and EAS BAT. Validates release ID, Android native dependency sentinels, test migration and safe Android-menu state.

**APK version unchanged:** 1.3.35 / versionCode 143045. Source release ID R9 is independent of Android binary version.

The R9 patch validates R8 native sentinels and SHA-256 of every touched file, backups originals before update, and verifies/restores files on failure. It never modifies `google-services.json`, `.env`, Firestore Rules or user data.
