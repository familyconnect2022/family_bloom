# Phase 15A — Build Report

## Baseline

Phase 14V4P Chess Board Local Overlay Host.

## Delivered

### Project structure
- Root project has no stray `.md` / `.txt` development notes.
- `document/` root keeps only `README.md`; content is grouped into phase, architecture, Firebase, handoff, guides and legacy history.
- Home, Family and Activity screens are grouped with nested Expo Router route-groups while public URLs remain unchanged.
- Root `Stack.Screen` registrations were updated to the new physical route paths and are regression-checked.
- `src/data` is grouped into `games/`, `kitchen/`, `music/` and every source/script reference was updated.

### Bloom Supper UI
- Added shared visual tokens at `src/constants/bloomSupper.ts`.
- Home now uses a full Bloom Supper Hero with the active home embedded in the hero and richer feature entry cards.
- Main user-facing routes use Bloom Hero; internal performance routes, visual demo and legacy redirect are explicit exceptions.
- Shared Bloom card/modal/toast language is applied to BloomCard, confirm dialog/modal, toast, loading overlay, welcome/join modals, date picker and time picker.
- Foundational Event/Moment/Pending Moment cards use the shared surface/radius/border/shadow language.

### Input / keyboard safety
- Form screens use `BloomKeyboardScreen`.
- List-based screens use `ScreenContainer keyboardSafe` with Android `softwareKeyboardLayoutMode=resize`.
- `BloomTextInput` now asks the keyboard host to reveal the entire focused field, uses a larger multiline gap, re-measures after Android keyboard/layout settling, and re-measures while multiline content grows.
- Static guard verifies there is no production route containing `BloomTextInput` without a keyboard-safe host.

### Warm copy
- User-facing Admin/technical language was converted to warm household language such as “người giữ nhà”.
- Server/document/window-style technical wording was removed from the checked user-facing surfaces.
- Technical identifiers and diagnostics remain unchanged internally where users never see them.

## Final current regression gates
- Phase 15A: 28/28 PASS
- Chess V4P: 17/17 PASS
- Chess V4K: 11/11 PASS
- Chess V4J: 17/17 PASS
- Chess core Phase 14U: 54/54 PASS
- Current Focus/catalog Phase 14N: 13/13 PASS
- Home functional Phase 14C: 44/44 PASS
- Time Capsule live state Phase 14R.4E: 18/18 PASS
- Whisper app-entry catch-up Phase 14R.5A: 30/30 PASS
- Fund governance Phase 14S.1: 51/51 PASS
- Fund input/keyboard UX Phase 14S.1A: 25/25 PASS
- Games Phase 14T: 44/44 PASS
- Single Android identity Phase 14T.0A: 21/21 PASS
- Release readiness Phase 13: 11/11 PASS
- TS/TSX syntax: 249/249 PASS
- Relative imports: 0 broken
- `@/` alias imports: 0 broken

## Historical gate notes
- Phase 14E is superseded by the later Focus architecture; Phase 14N is the current Focus gate and passes.
- Phase 14K contains V1 music-pool assumptions superseded by the later catalog-first design; Phase 14N is the current catalog gate and passes.
- Phase 14L expects a `.github/workflows/refresh-vietnamese-music-catalog.yml` file that was already absent from the V4P FULL baseline, so it is not used as a Phase 15A acceptance gate.

## Device test focus
1. Home hero spacing on the actual Android device.
2. Open every create/edit flow with the keyboard and focus the lowest multiline field.
3. Test Whisper/Poll/Family Fund/Time Capsule forms with long multiline content.
4. Open Date/Time pickers and confirm shared Bloom modal styling.
5. Navigate old deep links (`/home-whispers`, `/home-polls`, `/home-kitchen`, `/family-graph`, `/notifications`) after physical route grouping.
6. Re-test V4P promotion/preparing overlays and result toast once to ensure Chess remains frozen.

## Typecheck environment note

`npm run typecheck` cannot run in this source-only package because `node_modules` is intentionally not bundled, so `expo/tsconfig.base` is unavailable in the extracted workspace. Phase 15A therefore reports TypeScript **syntax transpilation** separately from full project typecheck and does not claim a full typecheck pass.
