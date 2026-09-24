# Family Bloom — Family Join & Admin Approval

## Quyết định kiến trúc

- `families/{familyId}.ownerId` là chủ sở hữu kỹ thuật của family.
- Trong Phase 2, **owner chính là admin duy nhất của nhà** để tránh có hai nguồn quyền khác nhau.
- Member projection của owner dùng `role: "admin"` ở dữ liệu mới. `owner` chỉ giữ lại để tương thích dữ liệu cũ.
- User đã có profile/membership: dùng `users/{uid}.activeFamilyId` làm family mở lại lần cuối.
- User mới hoặc user chưa thuộc family: sau khi profile hoàn tất, hiện `JoinFamilyModal` yêu cầu Family ID.
- Việc nhập Family ID đặt **sau đăng nhập + sau khi profile sẵn sàng**, không nhét vào Welcome. Welcome chỉ là lời chào; Join Family là một bước nghiệp vụ bắt buộc.

## Approval data

Không đặt `isApproved` trên `users/{uid}` vì một user có thể thuộc nhiều family và mỗi family có trạng thái khác nhau.
Nguồn sự thật là:

`families/{familyId}/joinRequests/{uid}`

```text
status: pending | approved | rejected
applicant: thông tin giúp admin nhận diện
message: lời nhắn
requestedAt
reviewedAt
reviewedByUid
rejectionReason
```

Khi approved, transaction tạo đồng thời:

- `families/{familyId}/members/{uid}`
- `users/{uid}/memberships/{familyId}`
- `users/{uid}.activeFamilyId`
- cập nhật request → `approved`

Khi rejected, giữ request để audit và đặt `status = rejected`.

## UI flow

```text
Login
 ↓
Có profile + có memberships?
 ├─ Có → activeFamilyId → mở nhà lần cuối
 └─ Không → JoinFamilyModal
              ↓
          nhập Family ID
              ↓
          gửi request pending
              ↓
       chờ admin gia đình
              ↓
       Admin xem hồ sơ + lời nhắn
          ├─ Duyệt → tạo member/membership
          └─ Từ chối → lưu lý do
```

## Admin screen

Route: `/family-join-requests`

Chỉ render nút từ Family tab nếu role hiện tại là `admin`/legacy `owner`. Tuy nhiên đây chỉ là UX; Firebase Rules vẫn là lớp bảo mật thật.

Admin card hiển thị:

- Avatar
- Họ tên
- Tên gọi
- Số điện thoại
- Ngày sinh
- Sở thích
- Lời nhắn
- Thời gian gửi
- Duyệt / Từ chối

## Review checkpoint 18/09/2026

Đã rà soát tĩnh các file liên quan đến auth/profile/family/join request/layout/rules. Đã sửa luồng profile mới để không tự tạo family, bổ sung fallback activeFamilyId, approval transaction, admin-only screen và error messages.

TypeScript full check chưa chạy được trong môi trường tạo ZIP vì `npm ci --ignore-scripts` bị timeout; vì vậy không tuyên bố `tsc` đã pass. Trước khi merge production cần chạy `npm ci` và `npm run typecheck` trên máy phát triển/CI.
