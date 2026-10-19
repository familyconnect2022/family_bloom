# Family Bloom H22R8 — Xiangqi UX, avatars, move clarity and draw protocol

## Scope
Base is the H22R7 Auto Update Structure Fix FULL source. The current release
updates Xiangqi native rendering, Xiangqi-owned Socket.IO/Node manager protocol,
and the developer Bloom Bot invitation; it does not merge Chess and Xiangqi
presentation or session ownership.

## Visible updates
- Developer bot-to-human invite used to show literal `帥 仕 將`. Both Xiangqi invite and expired invite now use `red_general_modal.png` as a large edge-overlapping image. Chess bot invite also uses the white King PNG.
- Xiangqi chessmen increase **10%** relative to H22R7: cell radius 0.4275 → 0.47025. Intersection hit geometry is unchanged.
- Last from/to intersections get filled highlights, direction line, and destination ring. The latest opponent move is purple, own move green. Capture and ordinary legal targets use distinct visible rings/dots.
- Player hubs are separated vertically from the board, include names and clocks, with player initials rather than Chinese piece glyphs. One-shot profile retrieval supplies short names and Cloudinary avatar URLs; off-thread HTTPS image loading falls back to initials if inaccessible.
- `Xin hòa` and `Đầu hàng` appear together directly below the lower player hub. Both require confirmation; an incoming draw offer shows accept/decline, and one's own pending offer can be withdrawn.
- The final server-confirmed move is animated and kept visible for ~1.7 seconds before the results modal. Authoritative server result/clock/persistence are NEVER delayed; timeout/away/resign/agreed draw results display immediately. Game-end SFX for a decisive last move follows the reveal rather than hiding the move early.

## Server contract changes requiring Render deployment
- Events: `xiangqi:draw:offer`, `xiangqi:draw:accept`, `xiangqi:draw:decline`.
- `drawOfferByUid` persists on the Xiangqi game document, surfaces through public game state, and clears on an accepted move or finish. A real opponent must accept; the sender cannot accept their own offer. Bloom Bot developer test games accept a draw immediately on the server for deterministic coverage. Draw proposals DO NOT pause running clocks.
- Backend, client and native module must all be upgraded together; an older Render server does not understand the draw events.

## Verified with source/runtime harnesses
- Runtime Xiangqi manager regression 32/32 PASS including 6 new server draw cases.
- H22R8 UX/socket/native contract 16/16 PASS.
- H22R6 motion/sound/source gate 18/18 PASS.
- H22R7 royal modal source gate 20/20 PASS.
- TS/TSX syntax 299/299 PASS; FULL source import graph PASS.
- FULL copy/native identity 31/31 PASS, structure 19/19 PASS, Auto Update 21/21 PASS.
- Broad regression sweep 26/27 PASS: the H5 root Slot test fails 6 of 7 assertions on both H22R7 base and H22R8; not a newly introduced failure. It is NOT an Android compile check.
- No Android SDK/Gradle, installed APK check, real Render deploy, or physical device animation verification was available in this release environment. Kotlin source has not been built into an APK here. Full user/Play tests must follow building the native APK.

## Packaging
Expo 1.3.26, Android versionCode 143036, native identity `P2.37R2C-H22R8-native-1`. Keeps the one-click updater root BAT and existing clean/apply/build/EAS BATs. `.md/.txt` documentation stays under `document/`.

## Install
1. Extract this FULL ZIP outside the installed source folder. Run `Family_Bloom_AUTO_UPDATE_FULL.bat`, choose the project target and wait for PASS. Do not build on FAIL.
2. Build and deploy `server/` to Render FIRST; validate the server build there.
3. Run root `Family_Bloom_BUILD_APK_TO_SHARE.bat`, then install the new APK over the old one. H22R8 contains Kotlin changes: OTA alone cannot upgrade native renderer.
4. Device smoke tests: bot invite red General image; opponent and self hub name/photo; both colors; last move green/purple; draw invite/accept/decline and bot draw; winning move 1.7s before result; Mini restore; test fail/restart; confirm versionCode 143036 and native identity H22R8.
