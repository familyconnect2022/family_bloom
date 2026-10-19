# Family Bloom — Performance Architecture P2.8
## Moments + Branch + Chess Audio + TabBar Stabilization

**Build date:** 2026-10-11 (Asia/Ho_Chi_Minh)  
**Baseline:** P2.7 Hard-Isolated TabBar + Branch Visual-Ready

## Why P2.8 exists

Real-device recording `6268.mp4` and the supplied Metro screenshot exposed four remaining stabilization issues:

1. Moment publish still showed a long-lived top loading toast while the feed was scrollable, and upload progress/pending-card state still participated in the same `FlatList` render path. The Metro console also reported a `VirtualizedList` slow update (`dt` around 2.8 s, previous update around 6.9 s).
2. A large genealogy Focus Branch could still spend too long preparing before useful paint. The preparation copy competed visually with the header, and fit-all could reduce a large branch to an unreadably small cluster.
3. Chess piece travel finished before the short move SFX was perceived. The old movement path was ~132/136 ms and regular SFX was fired from the landing boundary, after the physical move had already completed.
4. After leaving a finished Chess game, Home could paint before the bottom tabbar. The bar was persistent, but its visibility still depended on a React subscription inside a Tabs tree that can be frozen while the root Chess surface is on top.

P2.8 addresses those source paths rather than hiding the warning or adding arbitrary delays.

## 1. Moments: isolate upload work from the scrolling feed

### Terminal toast only

`MomentPublishContext` no longer starts the non-auto-hiding `Đang đăng kỷ niệm…` task toast. The Moments edit path also no longer starts `Đang cập nhật kỷ niệm…`.

The user now sees only:

- success after the publish/update is committed; or
- the existing friendly error toast when the operation fails.

BloomToast remains an absolute app-level overlay, so the terminal toast does not reserve feed layout height.

### Active upload no longer mutates the FlatList data

Successful/in-progress publish tasks are deliberately excluded from the Moments `FlatList`. More importantly, queued/uploading/publishing checkpoint changes now stay provider-local: the public publish Context exposes only a referentially-stable `failedPendingMoments` slice. This prevents normal upload state transitions from invalidating the media-heavy Moments screen at all.

Failed publishes remain visible as recoverable items so Retry/Discard behavior is preserved.

### Stable list inputs

The Moments screen now also uses:

- semantic `MomentPostRow` memo comparison;
- linked-person derivation from real post data rather than live pending feed items;
- stable separator, end-reached, scroll-end, scroll-to-index-failure, content-style callbacks/objects;
- `maintainVisibleContentPosition` for arrival of a newly committed post;
- a smaller Android render window/batch for the media-heavy feed.

The goal is to remove the update pattern that produced the `VirtualizedList` warning, not suppress the warning with LogBox.

## 2. Genealogy: large-branch first-useful-frame path

### Root cause removed: N kinship traversals before first paint

The Focus View previously resolved relationship metadata across the branch population during mount. For a large branch, that can call the family relationship solver repeatedly before the user sees the first useful viewport.

P2.8 resolves relationship metadata only for `viewportPeople`. Pan/zoom naturally recomputes labels for the small visible set when new cards enter the viewport.

### Bounded visual-ready contract

For the isolated Focus Branch only, visual readiness now requires:

1. measured viewport;
2. initial camera applied;
3. first bounded useful progressive batch available;
4. selected/anchor person included;
5. two presentation frames.

It no longer waits for every off-screen card in a large branch before removing the preparation shield. Standard/non-Focus surfaces keep the stricter inherited behavior.

### Readable initial camera

Whole-branch fit is still allowed when it stays readable. If a large branch would require excessive shrinking, Focus View clamps to a minimum initial scale of `0.62` and positions the selected person at roughly 40% of viewport height. The rest of the branch remains available by pan/zoom.

### Opening scheduling and loader placement

Heavy branch extraction/layout starts after the Focus card entrance animation settles rather than during it. The preparation message is rendered in the branch viewport shield:

- `Đang chuẩn bị nhánh…`
- `Bloom đang dựng phần nhánh đầu tiên để bạn có thể xem ngay.`

The header remains structurally separate.

## 3. Chess audio: convert, preload once, start with travel

### Converted assets

The 11 short shared board-game SFX were converted from MP3 stereo 48 kHz / 128 kbps to OGG/Vorbis mono 24 kHz.

| Set | Total size |
| --- | ---: |
| Previous MP3 | 60,419 bytes |
| P2.8 OGG | 49,046 bytes |
| Reduction | ~18.8% |

The P2.8 native and web OGG copies are byte-identical. The copy-over pre-clean and post-overlay cleaner delete the retired `*.mp3` board-game files.

A new `metro.config.js` preserves Expo's default Metro configuration and explicitly adds `ogg` to `resolver.assetExts`, so local OGG `require()` calls do not depend on a default extension list.

### First-surface / process-lifetime preload

`useBoardGameSoundscape` now has a module-level preload promise/readiness gate.

- Nothing is attached while the board surface is unprepared.
- The first prepared persistent Chess surface starts one preload of all short board SFX.
- Long-lived players attach after that preload.
- Later games and rematches reuse the process cache/player set.
- A new app/JS process naturally performs the preload again.

The first Chess Ready gate waits for both board visual readiness and this one-time audio readiness. This does **not** create a per-game load ceremony.

### Sound/motion synchronization

Regular move audio moved from `onMoveLanded` to a new `onMoveStarted` boundary. The sound-kind decision (self/opponent/capture/check/castle/promotion) is made immediately before piece travel begins.

Movement timing is now:

- local normal move: **205 ms**;
- opponent normal move: **215 ms**;
- premove: **170 ms**;
- reconciliation: **180 ms**.

The converted move-self/move-opponent clips are ~154/~153 ms, so sound begins with motion while the visual piece settles shortly afterward instead of sound starting after a ~132–136 ms move has already landed.

The replay path issues `seekTo(0)` fire-and-forget followed immediately by `play()` instead of awaiting the seek promise and adding another JS/native round trip before the click.

Game-end audio intentionally remains landing-owned so checkmate/result sound cannot precede the final physical piece arrival.

## 4. Tabbar: no second paint after Chess

`PersistentBloomTabBarHost` no longer derives Chess visibility through the React `useChessSurfaceMode()` hook.

It subscribes directly to the external Chess surface store and writes visibility to a Reanimated SharedValue. This continues to receive the surface transition even while the Tabs React tree is frozen underneath the root Chess surface.

Behavior:

- entering full Chess may hide the bar with a tiny 45 ms fade;
- leaving Chess sets visibility to `1` immediately;
- the already-mounted bar does not replay an entrance animation or wait for Tabs React to unfreeze.

The full Chess surface remains above the tabbar in the root native stack while active, preserving game input ownership.

## 5. Copy-over / packaging changes

- `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` relabeled P2.8 and deletes only retired board-game MP3 assets in addition to inherited cleanup.
- `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` relabeled P2.8, deletes retired MP3 assets after overlay, and runs the P2.8 regression gate.
- Android Debug/Release helper BATs invoke `phaseP2_8:check`.
- Root `.gitignore` is retained.
- `metro.config.js` is included in the FULL package.

## 6. Verification

### Dedicated P2.8 gate

- `test-phase-p2_8-stabilization-audio-moments-branch-tabbar.js`: **34/34 PASS**
- Changed P2.8 TS/TSX files transpile cleanly inside the gate.
- Native/web OGG assets, retired MP3 absence, process-singleton preload, first-surface Ready gate, move-start audio boundary, branch viewport work, Moments render isolation, immediate tabbar reveal, updater cleanup, Metro OGG config, and `.gitignore` are all asserted.

### Inherited regression gates

Historical static gates that encoded an older implementation shape were migrated only where P2.8 intentionally replaces that shape (for example the 132/136 ms Chess timing or React-subscribed tabbar visibility). Their preserved behavior assertions remain active.

**Updater static regression chain:** **37/37 test scripts PASS**. The first long aggregate command was split only because the execution shell reached its single-command time limit; P2.7 and the remaining scripts were rerun directly and all passed.

Additional focused reruns after the final Moments Context isolation change also passed: Phase 17.7 Moments **42/42**, P2.6 **21/21**, P2.7 **35/35**, A15 shared board audio **27/27**, A17 persistent tabbar **33/33**, Phase 16B13 **34/34**, and current Chess aggregate **20/20**.

## 7. Real-device acceptance still required

Static/transpile/regression gates verify the implementation paths, but the original issues are frame timing / device rendering / native audio timing symptoms. P2.8 therefore does not claim physical-device acceptance before retesting.

Priority acceptance sequence:

1. publish a media Moment and continuously scroll during upload — no persistent loading toast, no feed shake, no `VirtualizedList` slow-update warning;
2. open the largest branch — centered viewport loader, useful branch appears promptly, readable cards rather than tiny fit-all;
3. play move/capture/check sequences — SFX begins with movement and normal motion still feels crisp;
4. finish Chess and return Home — Home and the persistent tabbar appear together without the old delayed tabbar flash;
5. enter/leave/rematch repeatedly — no per-game SFX preload phase.
