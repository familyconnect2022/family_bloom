# Family Bloom — Phase 10 UX Responsiveness + Sticky Headers

Date: 2026-09-26
Base: `Family_Bloom_Phase_10_PERFORMANCE_LAB_HOTFIX_FULL_2026-09-26.zip`

## 1. Graph branch transition

Opening a graph branch no longer changes `focusPersonId` immediately and then hopes a loading state paints in time.

The new flow is deliberately two-phase:

1. Show a tiny `BranchPreparingOverlay` that owns its own React state.
2. Wait until that overlay has committed and passed two animation-frame opportunities.
3. Only then mark `graph_work_started` and change Graph focus.
4. Keep the overlay above the Graph while the new focus state commits and the first Graph frame paints.
5. Dismiss the overlay after the result has had a native paint opportunity.

The overlay uses real stage copy rather than a fake percentage:
- Đang chuẩn bị dữ liệu…
- Đang nối quan hệ…
- Đang sắp xếp các thế hệ…
- Sắp xong rồi…

Performance Test reports now include a `branch_open` trace with:
- `transition_requested`
- `transition_painted`
- `graph_work_started`
- `graph_state_committed`
- `graph_first_frame`
- `transition_hidden`

The critical regression condition is:

`transition_painted < graph_work_started`

If that order ever reverses, the branch UX optimization is considered regressed.

## 2. Fixed compact page headers

Added a shared `BloomStickyHeader`. It stays outside the page's ScrollView/FlatList/SectionList and always uses the canonical `BloomBackButton` on the left.

Applied to long/detail flows including:
- User Profile
- Member Profile
- Family Timeline
- Memory Book
- Notifications
- Event detail
- Chat
- Performance Lab
- Performance data stress screens
- Multi-family memberships
- Family Graph main screen
- Graph proposal/review flow

Existing fixed Graph admin/editor/join-request headers were also normalized to the canonical Bloom Back control where they represent page navigation. Internal picker/month/date chevrons remain chevrons because they are not page Back actions.

## 3. Performance architecture

No changes were made to:
- realtime singleton/listener registry
- tab navigator singleton
- Family Graph layout algorithm
- synthetic test datasets
- Firebase/Cloudinary data paths

This patch is an interaction/UX scheduling pass, not a new data architecture.

## 4. Device validation

On Android, test:

1. Enter Family Graph and enable Nhánh.
2. Tap a Person on 50, 100, 200+ graphs.
3. Confirm the Bloom preparation screen is visible immediately instead of the UI appearing frozen.
4. Export Performance Lab report and confirm `branch_open` has `transition_painted` before `graph_work_started`.
5. Open long screens, scroll deeply, and confirm Back / header actions remain available without scrolling to the top.
6. Re-run the 60-second real-use probe and confirm listener counts remain singleton.
