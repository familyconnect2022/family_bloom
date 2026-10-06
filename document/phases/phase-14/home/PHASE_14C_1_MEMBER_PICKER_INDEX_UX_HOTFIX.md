# Phase 14C.1 — Member Picker + Filter + Firestore Index UX Hotfix

Base: `Family_Bloom_Phase_14C_NHA_MINH_FUNCTIONAL_V1_FULL_2026-09-29.zip`

## Mục tiêu

- Không dùng chip cuộn ngang để chọn user khi Nhà Mình có 100–200+ thành viên.
- Giữ nguyên nguyên tắc: danh sách người nhận/người tham gia lấy từ `families/{familyId}/members`, không lấy Person của phả hệ.
- Làm gọn bộ lọc Lời thì thầm, không để 5 tab kéo ngang.
- Không hiển thị nguyên URL lỗi `firestore/failed-precondition` trên UI khi composite index chưa Enabled.

## Thay đổi UX

### Lời thì thầm

- `Người thân` mở `FamilyMemberPicker` full-screen.
- Có tìm tên, FlatList ảo hóa, phù hợp danh sách lớn.
- Bộ lọc feed đổi thành một control duy nhất; `Lời đã lưu` là nút bookmark riêng.
- Các lựa chọn: `Mới nhất`, `Gửi riêng cho tôi`, `Tôi đã gửi`, `Chia sẻ với cả nhà`.
- Hero subtitle được rút ngắn để tránh ellipsis ở màn hình nhỏ.

### Cùng quyết định

- `Nhóm riêng` mở cùng `FamilyMemberPicker`.
- Người tạo bị khóa trong nhóm.
- Vẫn yêu cầu tối thiểu 3 user.
- Search + FlatList, không còn danh sách chip ngang.

## Firestore index

Các query production vẫn dùng composite indexes trong `firestore.indexes.json`.
Nếu index chưa deploy hoặc đang ở trạng thái Building, Lời thì thầm/Cùng quyết định có bounded fallback để màn hình vẫn dùng được và không phơi Firebase URL ra người dùng.
Fallback không thay thế index production.

Deploy một lần bằng:

`Family_Bloom_Deploy_Phase_14C_Firestore.bat`

Không cần Functions hoặc Blaze cho hotfix này.
