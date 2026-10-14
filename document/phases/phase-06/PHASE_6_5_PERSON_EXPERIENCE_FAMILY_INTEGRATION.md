# FAMILY BLOOM — PHASE 6.5
## PERSON EXPERIENCE & FAMILY INTEGRATION — DEVICE TEST BUILD

**Trạng thái:** IMPLEMENTED · AWAITING DEVICE TEST  
**Basecode:** Phase 6.4 CLOSED  
**Data decision:** DG-6.5-1 → DG-6.5-10 đã được user xác nhận trước implementation.

## 1. Mục tiêu

Phase 6.5 chuyển FamilyPerson từ một node trong cây thành hồ sơ gia đình có liên kết rõ với Timeline, Moments, Events, Album và Member/Profile mà vẫn giữ từng domain là source-of-truth riêng.

## 2. Timeline contribution contract

- Mọi member trong family được tạo Timeline entry cho mọi Person trong cùng family.
- Entry hiện ngay, không cần Admin duyệt.
- Creator được sửa/xóa entry của chính mình.
- Member khác không được sửa/xóa entry của creator.
- Admin/Owner không được sửa entry người khác nhưng được moderation-delete khi đã xác minh nội dung sai.
- Timeline schema giữ `createdByUid`; không thêm approval/moderation field trong phase này.
- UI hiển thị contributor bằng member/profile projection hiện có.

## 3. Person ↔ Moments

Moment có additive field `personIds: string[]` (legacy missing => `[]`). Một Moment có thể gắn nhiều Person. Person Detail có tab Kỷ niệm liên quan và shortcut tạo Moment với Person hiện tại được preselect. Ownership/moderation Moments không thay đổi.

## 4. Person ↔ Events

Event có additive field `personIds: string[]` (legacy missing => `[]`). Event create/update validate Person thuộc cùng family ở service. Person Detail tổng hợp linked Events vào Dòng thời gian nhưng Event vẫn là source-of-truth riêng. Ownership/moderation Events không thay đổi.

## 5. Person Detail

Tabs production:

```text
Thông tin
Quan hệ
Dòng thời gian
Kỷ niệm
Album
```

Dòng thời gian tổng hợp presentation từ birth/death derived milestones + persisted Timeline entries + linked Events. Không copy dữ liệu giữa collections.

## 6. Profile bridge

Person có `linkedUid` có thể dùng member/profile avatar làm fallback nếu Person chưa có avatar. Profile update không tự overwrite FamilyPerson genealogy fields.

## 7. Profile invite UX

Profile user có section Bloom-style hiển thị active Family ID và nút **Sao chép**. Family ID dùng để chia sẻ cho người thân; join flow hiện tại vẫn yêu cầu request + admin approval.

Dependency mới:

```text
expo-clipboard
```

Sau khi merge patch chạy:

```bash
npx expo install expo-clipboard
```

Nếu development client hiện tại chưa chứa native module này, rebuild Android dev client một lần bằng `npx expo run:android`.

## 8. Canvas cleanup

Bỏ nút zoom `+` / `−`; giữ recenter về Person focus. Pan + pinch-to-zoom vẫn là primary gesture.

## 9. Firestore / Functions

`firestore.rules` Direct Mode được cập nhật cho Timeline member contribution + creator ownership + Admin moderation-delete, và `personIds` của Moments/Events.

`firestore.cloud.rules` giữ Graph client-write deny trong Cloud Mode. `functions/index.js` được đồng bộ Timeline contract cho future Cloud Functions path.

Current feature flag vẫn là Direct Firestore. Để test Timeline quyền mới bằng member thường, cần deploy `firestore.rules` mới. Không cần deploy Functions cho Direct Mode.

## 10. Migration

Không migration bắt buộc. Legacy Moment/Event thiếu `personIds` được normalize thành `[]`.

## 11. Device test trọng tâm

```text
Timeline: member A create/edit/delete own; member B không sửa/xóa; Admin chỉ delete entry A.
Moments: chọn nhiều Person; Person Detail thấy Moment; tap Person chip quay về đúng graph/person.
Events: chọn nhiều Person; Event detail hiển thị Person; Event xuất hiện trong Person Timeline.
Profile: hiển thị Family ID; Copy hoạt động; join approval flow không đổi.
Canvas: không còn +/−; recenter/pinch/pan hoạt động.
Regression: Album, DG-11, Query/Kinship, Full Tree, Moments reactions/comments, Events ownership/moderation.
```

## 12. Phase status

Không CLOSED trước device test của user.
