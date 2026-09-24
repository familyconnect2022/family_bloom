# FAMILY BLOOM — PHASE 6.3
## Spatial Grid + Semantic Port Occupancy + Collision-Aware Connector Routing

**Ngày:** 2026-09-24  
**Trạng thái:** IMPLEMENTED · chờ device visual acceptance trước khi CLOSED lại Phase 6.3

## Mục tiêu

Sửa tận gốc các regression visual-truth của connector thay vì vá theo từng case.

Hai case bắt buộc phải cùng đúng:

- Parent-child thẳng trục như `Đinh Văn Anh → Đinh Quốc Trung` phải ưu tiên một connector sạch từ `BOTTOM_CENTER(parent)` đến `TOP_CENTER(child)`.
- Khi một parent có nhiều family-group khác nhau, ví dụ case `Nguyễn Vũ Quang → Nguyễn Vũ Minh`, group mới không được nhập/chồng vào bottom trunk của group khác chỉ vì geometry gần nhau.

## Kiến trúc routing mới

```text
explicit graph truth
→ exact parentSignature
→ semantic family-group
→ immutable center ports
→ semantic port occupancy
→ spatial-grid index
→ candidate route generation
→ collision scoring
→ final polyline
→ renderer
```

### Spatial Grid

Tạo `familyGraphSpatialGrid.ts` làm spatial hash độc lập.

- Không snap node vào grid.
- Không thay layout Person.
- Grid chỉ index node bounding-box và connector segment.
- Route chỉ query các cell gần candidate thay vì scan toàn graph.

### Center-port invariant

Mỗi node có 4 anchor duy nhất:

```text
TOP_CENTER
BOTTOM_CENTER
LEFT_CENTER
RIGHT_CENTER
```

Lane/collision logic không được dịch anchor khỏi midpoint cạnh node.

### Semantic port occupancy

- `BOTTOM_CENTER(parent)` chỉ được owner/share bởi cùng `familyKey`.
- `familyKey` được tạo từ exact explicit parent set của child.
- Với nhiều family group của cùng parent, group có child nằm tự nhiên gần trục dưới nhất được ưu tiên bottom.
- Group khác phải thử LEFT/RIGHT center.
- Partner-facing side port được xem là occupied bởi partner relationship, để child route không xuyên qua spouse connector nếu còn route sạch khác.

### Collision-aware side routing

Mỗi side candidate:

1. xuất phát đúng `LEFT_CENTER` hoặc `RIGHT_CENTER`;
2. đi ngang thẳng ra khỏi node trước;
3. mới đi vào corridor;
4. tiếp cận child tại `TOP_CENTER`.

Candidate bị loại/phạt theo thứ tự:

- xuyên node khác: loại;
- trùng line khác family-group: loại;
- cắt line khác family-group: phạt rất cao;
- nhiều góc/đường dài: phạt nhẹ;
- bottom-direct đúng semantic: ưu tiên mạnh;
- cùng family-group có thể share segment/trunk có chủ đích.

### Performance

Spatial grid cell mặc định theo node slot width, nên collision query chỉ kiểm tra vùng lân cận.

Synthetic test hiện tại:

```text
440 Person
418 parent-child routes
~52ms routing trong môi trường test container
```

Con số này là test synthetic, không phải benchmark thiết bị production, nhưng xác nhận routing không còn thiết kế O(n²) toàn graph cho mỗi candidate.

## Data safety

Không thay đổi:

- Firestore schema;
- persisted Person/Relationship;
- DG-11;
- Rules;
- Functions;
- migration;
- native dependency.

Đây là render/layout infrastructure refinement.

## Acceptance gate

Phase 6.3 chỉ CLOSED lại khi device test xác nhận:

1. bottom trunk không bị share giữa hai family-group khác nhau;
2. child thẳng dưới parent dùng connector sạch ở center ports;
3. side connector rời node thẳng ngang từ midpoint cạnh;
4. side route tránh cắt node/connector khác khi tồn tại route sạch;
5. couple/shared-child vẫn đúng visual truth;
6. pan/zoom không làm routing recompute liên tục.
