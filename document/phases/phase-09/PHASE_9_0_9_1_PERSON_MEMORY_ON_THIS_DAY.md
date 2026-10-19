# Phase 9.0 + 9.1 — Person Memory Profile & On This Day

## Scope
- Person sheet now exposes a memory-profile summary that joins existing graph identity, relationships, derived/persisted timeline, tagged Moments, authored self Moments and linked events without copying source data.
- Home adds **Ngày này năm xưa**, a bounded one-shot historical projection of `timelineAudience == family` Moments from the same calendar day in previous years.
- Historical lookup intentionally creates **no realtime listener**. It queries a narrow ISO `createdAt` range per prior year and keeps only a small UI result set.
- Phase 8 carry-forward visual TODO fixed: Family Timeline shortcut and genealogy hero now use the white Bloom surface.

## Performance rules
- No new realtime subscription for On This Day.
- Home keeps at most 8 historical results and renders at most 3.
- Person content remains bounded by the existing person Moment/event integrations and progressive timeline window.
- No media duplication and no timeline projection documents are created.

## Test
1. Open Home. `Ngày này năm xưa` must show a graceful empty/loading surface when no historical family Moment exists.
2. A `Toàn gia đình` Moment created on the same month/day in a previous year should appear; self/person-only Moment should not.
3. Open Cây nhà -> a Person -> Thông tin. Verify `Câu chuyện của ...` counts and shortcuts.
4. Tap Dấu mốc / Kỷ niệm / Quan hệ to switch tabs.
5. Verify Family Timeline shortcut and `Mở cây phả hệ` hero are white/elevated against the pink page.
6. Re-run Phase 8.5B performance report and confirm listener/runtime singleton counts do not increase from Phase 8 baseline.
