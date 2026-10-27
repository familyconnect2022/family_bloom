# Family Bloom R3R14R3R2 — FULL CODE correction (27/10/2026)

- Base: R3R14R3R1 FULL CODE. Application still `1.3.33`, `versionCode 143043`, Android package `com.familybloom.android`.
- Fix H10R2 legacy test 20/22 to actual R3R14R1 Thư Ngỏ implementation: responsive `{width,height}` and functional opening/continue buttons; retain the newer interactive design and 14 approved paragraphs.
- `CLEAN_APPLY_FULL.bat` now runs modern Welcome touch static + runtime tests; Windows CRLF line endings repaired.
- Add `scripts/android/build/Family_Bloom_Android_RUN_TEST.bat` (`npx expo run:android`), `Family_Bloom_WEB_RUN_TEST.bat` (`npx expo start --web`), and `Family_Bloom_IOS_RUN_TEST.bat` (Windows guard/clear macOS instructions). Also a macOS `.sh` helper if the app is ever configured for iOS.
- Android menu 1–9, A, B, 0 with explicit descriptions. `scripts/setup/bat-entrypoints-manifest.json` and older Blaze regression gate updated to include them. Zero root BAT files.
- Auto-update source preflight, release Build & Share and CLEAN APPLY validate platform BATs before user build.
- Unchanged: Mom​ent Android-first cancellation, Vercel backup media cleanup, Firebase schema, Render game server, native Kotlin, Firestore Rules. No secret credentials included.

## Verification (Linux source only, not Windows/Android runtime)

- Legacy H10R2 welcome: 22/22 PASS. Current R3R14R1 welcome interaction simulation: 6/6 PASS.
- Platform BAT/menu: 10/10 PASS; source structure: 19/19 PASS; H25 source package: PASS.
- Auto update backing-up/overlay/copy/hash: 21/21 PASS in synthetic fixture. Release source-only preflight: 10/10 PASS.
- TS/TSX syntax: 333/333; Expo Router uniqueness PASS; Moment 13/13 PASS.
- Real Windows BAT/Gradle/Android phone/Vercel have NOT been tested here.

Read `R3R14R3R2_FIX_WELCOME_GATE_DEV_MENU_2026-10-27.md` for usage details.
