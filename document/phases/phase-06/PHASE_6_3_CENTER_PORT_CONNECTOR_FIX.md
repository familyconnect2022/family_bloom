# FAMILY BLOOM — PHASE 6.3 CENTER-PORT CONNECTOR FIX

## Mục tiêu
Sửa regression visual-truth của connector: mọi line phải neo tại midpoint cố định của cạnh node, không được tạo stem lệch tâm hoặc anchor tùy ý.

## Root cause đã xác định

1. `person.x` là origin của node slot rộng 128px nhưng routing plan trước đó nhận `nodeWidth: 112` (visible card width), làm phép tính center lệch 8px.
2. Direct-route tolerance quá rộng (`0.64 * card width`), khiến child lệch ngang vẫn bị coi là direct.
3. Direct connector cũ dùng `child center X` cho cả điểm đầu và cuối, nên điểm đầu không còn nằm ở bottom-center của parent.
4. Side connector cũ cho lane offset tác động `startY`, làm anchor chạy lên/xuống trên cạnh parent thay vì giữ đúng side-center.

## Fix

- Thêm `getFamilyGraphConnectorPort()` làm single source of truth cho TOP/BOTTOM/LEFT/RIGHT center ports.
- Routing plan dùng node slot width để tính center, card width để collision/tolerance.
- Direct route: bottom-center(parent) → top-center(child), một segment duy nhất.
- Side route: left/right-center(parent) → top-center(child); anchor không nhận lane offset.
- Partner connector: side-center ↔ side-center.
- Siết direct tolerance còn `max(8, cardWidth * 0.18)`.

## Không thay đổi

Không đổi schema, relationship truth, Query Engine, DG-11, Rules, Functions hay native dependency.
