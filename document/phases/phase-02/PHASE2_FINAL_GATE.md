# Family Bloom — Phase 2 Final Gate

## Quyết định UX

Khi user đã có profile nhưng chưa thuộc family, app không còn mở Tabs dưới một modal. Root navigation chuyển thẳng tới `family-gateway` (màn hình toàn trang). Tabs chỉ được phép hiển thị khi `userProfile.activeFamilyId` tồn tại.

## Hai luồng onboarding

1. **Tạo gia đình**
   - User nhập tên gia đình.
   - App tạo `families/{familyId}`.
   - User trở thành `admin` đầu tiên.
   - Tạo `family_codes/{familyCode}` để reserve mã nhà duy nhất.
   - Tạo `families/{familyId}/members/{uid}`.
   - Tạo `users/{uid}/memberships/{familyId}`.
   - `users/{uid}.activeFamilyId = familyId` được ghi trong cùng transaction tạo family/owner/membership. Nút “Vào nhà của mình” chỉ là UX action; Root Navigator quyết định chuyển sang Tabs.
   - Các thao tác tạo family/code/member/membership nằm trong một transaction.
   - Family ID chính là document ID kỹ thuật; family code là alias dễ nhớ để chia sẻ.

2. **Gia nhập gia đình**
   - User nhập Mã nhà dễ nhớ hoặc Family ID cũ.
   - Service kiểm tra family tồn tại trước khi tạo request và tự quy đổi Mã nhà → Family ID.
   - Nếu không tồn tại: `FAMILY_NOT_FOUND`, hiển thị "Không tìm thấy gia đình" thay vì lỗi hệ thống/server bận.
   - Nếu tồn tại: tạo join request pending.
   - User chỉ trở thành member sau khi admin duyệt.

## Profile

- `shortName` không bắt buộc và được normalize thành `null` khi không có.
- `gender` bắt buộc trong domain model, mặc định `other`.
- Không ghi `undefined` vào Firestore.

## Media

`media_assets` là lifecycle record dùng chung cho avatar, event, calendar, moment, album, document và chat.

Lifecycle:

`uploading -> uploaded -> attached`

hoặc:

`failed / cleanup_pending`

## Error

Provider errors đi qua `errorService` và được normalize về `AppErrorCode`. UI không cần biết lỗi đến từ Firebase, Axios hay Cloudinary.

## Kiểm tra trước Phase 3

- app.json JSON parse: OK
- package.json JSON parse: OK
- TypeScript source files: kiểm tra cấu trúc/static; full `tsc` cần chạy sau `npm install` trên máy phát triển vì ZIP không chứa node_modules.
- Firestore rules: đã cập nhật quyền `getAfter()` cho transaction tạo family + family code + membership.
- ZIP integrity: cần kiểm tra sau khi đóng gói.
