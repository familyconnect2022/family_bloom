# Family Bloom Android R11R4R2R2 — TypeScript Stabilization R1

Status: **CANDIDATE / pending Windows TypeScript & APK validation**. Original base: `FamilyBloom_Android_R11R4R2R2_FAMILY_GRAPH_FULL_CODE_2026-11-07.zip` (1,751 files).

- User device log: `TYPESCRIPT_ERRORS_R2.txt` shows **140 TypeScript errors across 75 source files**. Categories include 44 unsupported `StatusBar.translucent` uses, 21 `StyleSheet.absoluteFillObject` uses, 20 board game diagnostic source violations, input ref types, relationship picker variable scoping, user profile duplicate style, and non-style service typing.
- Keep Expo/React Native/TypeScript versions and root build BAT unchanged. Do not merge R3 changes.
- TypeScript-oriented edits only; no Firebase Rules, deploy scripts, Cloud Functions, signing files, or application version changes.
- Relationship preflight now uses in-modal `people` and `relationships` rather than unavailable outer `snapshot`; introduces picker loading styles.
- ForwardRef input instance types use `React.ElementRef<typeof BloomScaledInput>`, and Native TextInput focus events use declared RN `TextInputProps` types.
- Rendering: replace outdated Expo StatusBar `translucent` prop; a plain object absolute-fill helper preserves both JSX use and style object spreads. Actual edge-to-edge behavior must be tested on Android.
- Live dashboard service callbacks use explicit page types. Error codes now include `PERSON_HAS_CONTENT` and `AVATAR_SELECTION_SUPERSEDED` with friendly error mappings.

## Verification (current environment)

- [x] Original ZIP CRC test.
- [x] All **369 src TS/TSX parse clean** with bundled TypeScript parser.
- [x] Project structure 19/19 PASS.
- [x] Expo Router duplicate-route check PASS.
- [x] Family Graph node R11R4R2R2 assertions PASS (12 cases).
- [x] Family Graph integrity PASS.
- [x] Family Graph query/kinship/focus tests PASS.
- [x] Added TypeScript stabilization *static* regression test PASS.
- [ ] `npm run typecheck` (Node dependencies absent and `npm install` did not complete in this sandbox). **Do not claim 0 errors yet**.
- [ ] Android Release APK build and real device UI/permissions tests; must run on Windows.

## Windows preflight

1. Extract FULL CODE to a new empty directory, not on top of GitHub/R1/R2.
2. Copy only the correct Firebase `google-services.json` to root; keep local `.env` private if needed.
3. `npm install --include=dev`
4. `npm run typecheck > TYPESCRIPT_AFTER_R2_STABILIZATION.txt 2>&1`
5. `node scripts/tests/features/test-r11r4r2r2-ts-stabilization.cjs`
6. Only when TypeScript passes, run `Family_Bloom_BUILD_APK_TO_SHARE.bat` and check Auth/Profile/Graph/Games/Moments.

No automatic overwrite of GitHub or production source. Patch stops if target files are not original R11R4R2R2 byte hashes.
