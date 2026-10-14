# FAMILY BLOOM — PHASE 6.3 DG-11
## Batch Relationship Composer + Visual Truth Layout

**Status:** implemented for device test  
**Baseline:** Phase 6.2 CLOSED + Phase 6.3 Query/Kinship/Focus build  
**Data safety:** no schema migration, no new relationship document type, no Rules deploy

## 1. DG-11 đã chốt

Không tự suy luận cha/mẹ còn lại chỉ vì hai người là vợ/chồng. Đã hiển thị trên gia phả thì structural truth phải được Admin xác nhận.

UI `Nối quan hệ` hỗ trợ batch cho parent-child:

```text
Người được chọn: Thanh Nhân + Kim Duyên + Thanh Phước Hội
Loại: Là con của
Subtype: Ruột
Người tham chiếu: Văn Long + Nguyễn Thị Bích
```

Kết quả persist vẫn là 6 canonical edges:

```text
Văn Long -> Thanh Nhân
Bích      -> Thanh Nhân
Văn Long -> Kim Duyên
Bích      -> Kim Duyên
Văn Long -> Thanh Phước Hội
Bích      -> Thanh Phước Hội
```

Không có relationship document 5 người và không đổi schema.

## 2. Validation batch

- self-reference: reject toàn batch;
- cycle: reject toàn batch;
- cùng edge nhưng subtype khác: reject để Admin xử lý quan hệ cũ trước;
- exact duplicate: idempotent, giữ nguyên và báo đã có;
- Person không tồn tại: reject;
- partner: chỉ 1↔1;
- transaction result được giữ retry-safe để Firestore retry không làm tăng sai counter.

Preview hiển thị câu tiếng Việt và số edge mới/đã có trước khi commit.

## 3. Visual truth — ưu tiên cao

Layout không xếp thuần theo generation nữa. Nó dùng family units/anchors:

- spouse/partner là atomic visual unit;
- người khác cùng generation không chen giữa couple;
- child anchor theo explicit parent(s);
- hai parent là couple và cùng có edge tới child => child đi dưới tâm couple;
- child chỉ có một parent => connector và anchor chỉ đi theo parent thật đó;
- sibling units có cùng lineage parent được giữ gần nhau;
- family clusters khác được tách rộng hơn;
- generation đông mở rộng logical canvas, không ép card chồng lên nhau.

Regression device case được đưa vào automated layout test:

```text
Nguyễn Hoàng Anh = con Huỳnh Kim Duyên
Gia Khôi/Gia Minh = con Thanh Nhân + Kim Hồng
```

Hoàng Anh phải gần nhánh Kim Duyên hơn couple Thanh Nhân–Kim Hồng và không được nhìn như sibling của Gia Khôi/Gia Minh.

## 4. Performance

- generation BFS O(P+R);
- PersonNode memoized;
- connector layer memoized;
- 3/5-generation bounded render giữ nguyên;
- Full Tree progressive mount;
- dense adapter synthetic 500 Persons được benchmark;
- canvas width được tính theo visual units thay vì fixed 1020.

## 5. Delete semantics

```text
Xóa đường nối -> delete FamilyRelationship only -> giữ cả hai Person
Xóa người khỏi phả hệ -> explicit Person delete flow
```

BloomConfirmDialog thay native destructive Alert trong Graph flow.

## 6. Deploy

Không cần Publish Firestore Rules/Functions cho patch này. `functions/index.js` được cập nhật source để giữ future Cloud mode đồng bộ với DG-11 nhưng chưa deploy.
