# Family Bloom — P2.6 Interaction + Event Detail + Moments Scroll Polish

Date: 2026-10-10
Baseline: P2.5 Visual-Ready Startup + No-Reload Return

## Scope
P2.6 addresses three real-device UX findings from the supplied recordings:

1. The bottom-tab selection pill used one fixed 152 ms duration regardless of travel distance, making long jumps feel much faster than adjacent jumps.
2. Event Detail duplicated the same people as both genealogy Persons and app participants, while description and moderation actions were visually fragmented.
3. While a Moment media upload was active, progress updates patched the global pending-Moment React state roughly every 140 ms, rebuilding feed data while FlatList was scrolling.

## Implemented

### 1) Distance-aware tab pill motion
- Adjacent movement: 164 ms.
- Each additional tab step adds 38 ms.
- Far-edge movement is capped at 278 ms.
- The pill still runs on Reanimated/UI thread and the feature surface swap remains `animation: none`.
- Active icon still responds immediately on touch-down; the longer duration applies only to the lightweight pill travel.

### 2) Event Detail simplification
- When the event has genealogy Person ids, the separate `Người tham gia` list is omitted immediately (no duplicate-list flash while the Person directory finishes resolving).
- Each related Person with `linkedUid` gets a compact chain-link badge indicating an attached Bloom account.
- `Một chút về ngày này` is moved inside the `Thông tin` card under a divider.
- `Ẩn sự kiện` is moved to the bottom of the page after media.
- Events without related Persons retain the participant list, preserving existing behavior for ordinary calendar events.

### 3) Moments upload scroll isolation
- Continuous upload progress moved to a tiny per-pending-item external store.
- Progress callbacks no longer patch the provider's `pendingMoments` React state on each progress tick.
- Only the matching `PendingMomentCard` subscribes to progress.
- Progress notifications are bounded to >=6 percentage-point advancement or >=220 ms.
- Structural state changes (queued/uploading/publishing/published/failed and completed-file checkpoints) still use the existing provider state and retry semantics.
- FlatList now uses `maintainVisibleContentPosition` so insertion/removal/replacement of the pending item at the head does not nudge the visible feed while the user is reading/scrolling.

## Safety / compatibility
- No Firestore Rules changes.
- No Firestore index changes.
- No Cloud Function changes.
- No Render/Socket server changes.
- No native dependency changes.
- Existing copy-over workflow remains supported.

## Device-test focus
1. Tap Home → Moments (adjacent), then Home → Nhà Mình (far). The far pill should glide longer instead of racing across the bar, while the destination content still switches immediately.
2. Open an Event with related genealogy Persons. There should be one people section only; linked accounts show a chain badge.
3. Verify `Một chút về ngày này` sits inside `Thông tin` and `Ẩn sự kiện` is the final action.
4. Publish a Moment containing a video, then continuously scroll while upload is in progress. The feed should no longer pulse/jitter with progress updates.
5. Stay scrolled away from the top while the pending Moment becomes a published post. Visible content should remain anchored.

## Verification summary

- Phase P2.6 interaction/detail/scroll polish gate: 21/21 PASS.
- Phase P2.5 Visual-Ready + No-Reload Return: 20/20 PASS.
- Phase P2.4 Frozen Tab Surfaces / hard render isolation: 41/41 PASS.
- Phase P2.3 Zero-Work Tab Press: 23/23 PASS.
- Phase 17.7 Moments regression gate: 42/42 PASS.
- Phase 17.8D shared-event / UI-thread navigation gate: 52/52 PASS.
- Phase 13 release-readiness gate: 11/11 PASS.
- Full TypeScript/TSX source transpile: 337/337 PASS.

Device validation is still required for subjective motion feel and real-world scroll smoothness because source/regression gates cannot reproduce every Android compositor/GPU timing condition.
