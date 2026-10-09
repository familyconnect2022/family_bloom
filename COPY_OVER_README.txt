FAMILY BLOOM - PHASE 17.9A17 - NATIVE-PERSISTENT UI-THREAD TABBAR

Base
- Built directly on Phase 17.9A16 Xiangqi Server Authority / Realtime Bot.
- Preserves A16 server-authoritative Xiangqi, A15 sound/premove/bot pacing, A14 Instant Home/Firebase cleanup, and A12 persistent Chess surfaces.
- No native dependency was added in A17.
- Chess/Xiangqi server code, Firestore Rules and Firestore indexes are byte-identical to A16.

What A17 changes

1. Native-persistent main tabs
- Main Tabs now explicitly set detachInactiveScreens={false}.
- lazy:false remains enabled, so all five main tab React surfaces stay warm.
- TabRuntime still suspends inactive listeners/timers; persistent native views do not mean background feature work is kept live.

2. One geometry slot, two absolute visual icon layers
- Each tab still owns exactly one fixed 26x26 tabIconStack at the same A16 position.
- The inactive glyph and white active glyph are two absoluteFill visual layers inside that one slot.
- The two glyphs never participate side-by-side in flex layout, cannot consume extra width/height, and cannot push the icon or tabbar upward.
- Active/inactive opacity and subtle scale are driven by the same Reanimated SharedValue used by the pink indicator.
- React Navigation state is retained for routing/accessibility only; it no longer controls visual icon color timing.

3. Indicator/icon synchronization
- Press-in still starts the 232ms UI-thread motion optimistically.
- Pink indicator, halo, active white glyph and inactive glyph all read indicatorIndex.
- Accepted navigation state does not restart the running animation.
- Pill geometry remains exactly A16: 50x36, top=11 in the 58px tab row.

4. Moments commit-window isolation
- Moments no longer toggles feed-wide screenFocused on the next requestAnimationFrame during tab navigation.
- Visible-card realtime focus state is reconciled after 280ms, beyond the 232ms tab motion window.
- Focus timers are canceled across rapid switches/unmounts.
- Existing Moments bounded list/viewability behavior is preserved.

5. Regression gates / copy-over safety
- Added Phase 17.9A17 gate checking native persistence, one-slot/two-absolute-layer geometry, SharedValue synchronization, Moments defer timing, and A16 game/server hashes.
- Updated historical tab gates so A17 does not false-fail merely because it intentionally renders two absolute glyph layers.
- Updated older Phase 17.6-17.8D protected-baseline checks to recognize the later A15/A16 Xiangqi architecture.
- Fixed CLEAN_APPLY_FULL so A16 Xiangqi server gate is actually executed before success; in A16 it was accidentally placed after exit /b and therefore unreachable.
- CLEAN_APPLY_FULL now runs A16 + A17 before Current Chess/Release gates.

Copy-over installation from A16
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat against the EXISTING project folder.
2. Copy the entire Phase 17.9A17 FULL package over the project and replace files.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. A17 adds no native dependency. If your A16 Android build is already installed, use:
      npx expo start -c
   Rebuild with npx expo run:android only if your installed native app predates A14/native dependencies or you otherwise need a native rebuild.

Primary real-device checks
- Rapidly tap Home -> Moments -> Planner -> Family -> Nha Minh and back.
- Confirm the pink pill never pauses when the destination content commits.
- Confirm active white icon fades/scales with the pill rather than changing late after route commit.
- Confirm no icon jumps vertically and the 58px tabbar geometry is unchanged.
- Confirm Moments still loads comments/reactions after the short focus settle window.
- Confirm Chess/Xiangqi and their server flows behave exactly as A16.


FAMILY BLOOM - PHASE 17.9W2 - WEB PARITY (IPHONE + IPAD + DESKTOP)

Base native: Phase 17.9A17. Web W2 shares Firebase/Firestore/Render with Android.
Intentional web exclusions: OS background notifications and haptics/vibration only.

Web W2 highlights:
- iPhone bottom-tab layout; iPad portrait/landscape navigation rail + multi-pane; desktop expanded rail.
- Google/phone auth, session restore, profile/avatar, create/join/approve family, family switch.
- Home, Moments upload/reactions/comments/person tags, Planner CRUD/participants/recurrence.
- Interactive Graph pan/pinch/focus + person/relationship edits.
- Nhà Mình: board, Whisper, Poll, Time Capsule, Fund, Kitchen, six family mini games.
- Chess + Xiangqi realtime: lobby/challenge, five time controls, clocks, premove, reconnect, sound, draw/resign/rematch, Bloom Bot.
- Safari/iPad visibility lifecycle + persistent Firestore web cache.
- Vercel static export config.

Run Family_Bloom_WEB_PREVIEW.bat for local web preview.
Run Family_Bloom_WEB_EXPORT.bat to build dist/ for Vercel/static hosting.

