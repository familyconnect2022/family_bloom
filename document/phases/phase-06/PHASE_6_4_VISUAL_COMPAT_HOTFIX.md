# FAMILY BLOOM — PHASE 6.4 VISUAL COMPATIBILITY HOTFIX

## Mục tiêu
Giữ lại tối ưu Phase 6.4 (progressive Full Tree + viewport-aware rendering) nhưng khôi phục ngôn ngữ hình ảnh Phase 6.3 sau khi device test phát hiện regression.

## Fix
- generationStep: 288 → 216.
- connectorGridCellSize: 160 → 128.
- Planned collision route giữ nguyên geometry nhưng render bằng góc bo Bloom, không còn elbow vuông cứng.
- Partner pair là atomic visual unit khi viewport culling: thấy một người thì giữ partner cùng pair mounted.
- Progressive batch không được cắt đôi một partner component ở ranh giới batch.
- Không render partner connector nếu thiếu một trong hai partner card.
- Không render parent-child connector nếu endpoint bị cull khỏi viewport.
- Shared child branch chỉ render với child đang mounted.

## Không thay đổi
- Firestore schema/data.
- Rules/Functions.
- DG-11.
- Query/Kinship.
- Permission model.
- Spatial routing truth/collision scoring.

## Device gate
Test lại:
1. spouse/partner pair khi pan sát mép viewport;
2. couple + shared children;
3. single parent side-route;
4. rounded elbow khi route tránh collision;
5. pan/zoom Full Tree để chắc viewport culling không tạo line lơ lửng.
