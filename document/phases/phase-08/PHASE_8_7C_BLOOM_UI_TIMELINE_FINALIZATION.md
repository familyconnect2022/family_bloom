# Phase 8.7C — Bloom UI & Timeline Finalization

## Visual system
- Page background: Bloom pale pink `#FFF3F7`.
- Default content/card surface: white `#FFFFFF`.
- Pink is semantic accent only: primary action, icon surface, selected/focus state, badges.
- Default cards no longer alternate pink/white.
- BloomPageHeader now supports a left navigation slot; Family Timeline Back is always on the left.
- Planner moderation control is rendered below the page header (never above the title).
- Play Performance Lab and “Một chút vui cho cả nhà” use white surfaces so they stand clearly above the pink page.

## Adaptive timeline hierarchy
- Year header appears only when the year changes.
- Month header appears only for months that contain data.
- Day header appears only when multiple Family Timeline memories share the same day.
- No empty time periods are generated.
- Person life milestones keep their real precision: year-only milestones remain year-only; no fake 01/01 date is introduced.

## Performance
- Family Timeline migrated from ScrollView/full map to SectionList virtualization.
- `initialNumToRender=10`, `maxToRenderPerBatch=8`, `windowSize=7`, clipped off-screen rows enabled.
- Timeline media thumbnails use memory/disk cache and 180px delivery thumbnails.
- Person Timeline progressively mounts 30 entries at a time with explicit “Xem thêm”, avoiding 100–200 cards mounting at once inside the Person sheet.
- Existing bounded realtime/listener architecture remains unchanged.

## Media UX
- Timeline copy explicitly teaches users to tap overlapping image/video circles for fullscreen viewing.
- Existing Phase 8.7B media viewer loading feedback remains preserved.
