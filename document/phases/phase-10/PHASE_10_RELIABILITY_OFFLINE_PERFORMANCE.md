# Family Bloom — Phase 10 Reliability, Offline & Whole-app Performance

## Baseline
Phase 10 is built from `Family_Bloom_Phase_9_2AB_MEMORY_BOOK_FULL_2026-09-26`.
The Phase 8 performance architecture remains a regression guard: shared realtime registry, one Tabs navigator, Family Graph progressive rendering, and the existing performance instrumentation are preserved.

## 1. Moment reliability
- Failed pending Moments keep successful upload checkpoints instead of discarding/re-uploading completed files.
- Manual **Thử lại** resumes from the completed portion.
- When the app returns to foreground, failed in-session publish jobs are queued once again and reuse completed upload checkpoints.
- Discarding a failed pending Moment marks its completed managed media for cleanup.
- Publishing progress uses a neutral Bloom task notification. Error styling is reserved for an actual failure.

> Current scope: the resumable queue is in-memory for the current app session. Phase 10 does not add a new local-storage dependency, so a force-stop/app process death is not claimed as a persisted upload queue.

## 2. Full Moment editing
The owner can now edit the same meaningful fields offered at creation time:
- caption/text;
- Timeline target: **Tôi / Toàn gia đình / Thành viên**;
- selected related people;
- add/remove image or video.

Existing managed media is reused. Only newly selected files upload. Removed managed assets are marked cleanup-pending after the Moment update succeeds. If a provider upload finishes but metadata sync fails, the edit keeps that checkpoint and retries the small metadata step rather than blindly uploading the binary again.

## 3. User-facing copy and feedback
Technical implementation terms were removed from normal product UI where found (for example Person/Moment-origin/media-storage wording). Product copy should describe what the family sees and can do, not Firestore/Cloudinary/reference details.

The publishing task toast now uses the neutral `notification`/loading treatment. Success and error states remain semantically distinct.

## 4. Button spacing audit
Action groups touched in the current app were normalized to at least 12pt visual spacing where the controls are separate actions, including Moment Timeline target buttons, graph action rows, relationship mode buttons, join review actions, confirmation dialogs, event participant modes, and Memory Book editor controls. Chips that intentionally form one compact semantic group keep their compact spacing.

## 5. Developer-only Performance Lab
The Performance Lab remains compiled into test source but the entry point and direct benchmark routes are shown only when the signed-in Firebase Auth email contains the exact lowercase token:

`huynh235`

This is only a developer/test UI gate. It is **not** a security or admin authorization rule.

## 6. Whole-app stress harness
All synthetic stress datasets are generated in RAM only. They never create Firestore documents or Cloudinary uploads.

### Real-use probe
- Duration: **60 seconds**.
- User uses the app normally: tab switches, family switch, open/close details, scroll lists.
- Measures JS timer stalls, UI press-to-frame, tab/family traces, listener counters and runtime mounts.

### Synthetic datasets
- Moments: 100 / 200, rendered through the real `MomentCard` path with per-card realtime disabled for the synthetic benchmark.
- Family Timeline: 100 / 200, using the same production Year → Month → Day projection function as the real Timeline.
- Events/Planner: 100 / 200, rendered through the real `EventCard` path.
- Memory Book: 100 / 200 references with virtualized editorial pages.
- Family Graph: existing 50 / 100 / 200 / 300 / 500 Person benchmark retained unchanged as the graph regression baseline.

Metrics include synthetic generation/transform time, first painted frame, initial visible batch, UI response when jumping to the end of a long list, JS stalls during the 60-second real-use probe, listener counts, and runtime navigator mounts.

## 7. Device checklist
1. Sign in with the developer account containing `huynh235` and confirm **Góc chơi → Phòng đo hiệu năng** is visible.
2. Sign in with another admin/member and confirm the Performance Lab entry is not visible; direct performance routes must redirect away.
3. Start the 60-second real-use test, use all five tabs and switch family at least once, then copy the report.
4. Run 100 and 200 for Moments, Timeline, Events and Memory Book; run Graph 50–500 once for comparison.
5. Create a Moment with several media files, interrupt the network, let it fail, restore network and press **Thử lại**; completed files must not visibly restart from zero.
6. Edit a Moment: change text, switch Tôi/Toàn gia đình/Thành viên, change selected people, remove one old media item and add a new one, then save.
7. Review main screens/modal action rows for adjacent buttons that visually or physically touch.
