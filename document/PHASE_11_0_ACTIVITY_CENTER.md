# Family Bloom — Phase 11.0 · Chuyện trong nhà

Status: **IMPLEMENTED / AWAITING ANDROID DEVICE TEST**  
Base: **Phase 10 Stress Media Runtime Hotfix FULL**

## Mục tiêu

Phase 11.0 tạo trung tâm hoạt động trong app tên **Chuyện trong nhà**. Đây không phải log kỹ thuật và không biến mọi thay đổi thành thông báo. Mục tiêu là đưa đúng chuyện đáng chú ý tới đúng người mà vẫn giữ Family Bloom nhẹ nhàng.

## Quy tắc Kỷ niệm

- `Tôi`: không tạo activity cho người khác.
- `Thành viên`: chỉ tài khoản đã liên kết với Person được tag mới nhận activity trực tiếp; người đăng không tự nhận activity của mình.
- `Toàn gia đình`: xuất hiện trong Chuyện trong nhà nhưng **không tạo badge mặc định**.
- Khi người đăng chủ động bật **Thông báo cho cả nhà**, activity gia đình mới được đánh dấu đáng chú ý để tạo badge.
- Activity không thay đổi quyền đọc Moment và không phải nguồn authorization.

## Quy tắc Sự kiện

Loại sự kiện hiện có thêm: **Sinh nhật, Giỗ, Kỷ niệm, Họp mặt, Cưới hỏi, Chuyến đi** bên cạnh các loại hiện tại.

Mức thông báo:

- `Bình thường` — mặc định, xuất hiện nhẹ nhàng trong Chuyện trong nhà.
- `Khá quan trọng` — được làm nổi bật và tính badge cho người khác.
- `Quan trọng` — mức nổi bật cao nhất trong Activity Center; Phase 11.1 sẽ dùng mức này cho reminder cadence.

Sinh nhật / Giỗ / Kỷ niệm tự chọn lặp hằng năm khi người dùng chưa tự chọn recurrence khác.

## Quy tắc Cây nhà

Graph không tự động thông báo khi admin lưu một Person/Relationship.

Sau thay đổi, admin có lựa chọn **Thông báo thay đổi cho gia đình?**:

- Một thao tác `thêm Person`: `Admin đã thêm <Tên> vào phả hệ.`
- Một thao tác `xóa Person`: `Admin đã xóa <Tên> khỏi phả hệ.`
- Hai thay đổi trở lên trong cùng phiên chỉnh sửa: chỉ hiện bản tóm tắt `Admin đã thực hiện N thay đổi trong phả hệ.`

Một change session tự hết hạn sau khoảng 10 phút để những chỉnh sửa ở các thời điểm xa nhau không bị gom nhầm.

## Multi-family

Chuyện trong nhà tổng hợp activity từ tất cả family mà user đang là member. Mỗi item có nhãn tên nhà. Khi user chạm một activity của family khác, app dùng flow `switchFamily` hiện có trước rồi mới deep-link vào Event, Moment hoặc Graph.

## Read / unread

`activityLastSeenAt` nằm trên projection membership của chính user trong từng family. Trạng thái này là riêng từng UID/family. Activity mới có thể hiện nhãn **Mới** trong Activity Center; badge Home chỉ tính activity có `badgeEligible=true` và không tính hoạt động do chính user tạo.

## Performance

- **Không thêm realtime listener.** Activity Center và Home badge dùng bounded one-shot reads.
- Không thay runtime singleton, shared realtime registry, Graph layout hoặc Performance Lab.
- Baseline mục tiêu sau device test vẫn là `10 listeners ×1` và `tabs.navigator = 1`.

## Firestore

Collection mới:

- `families/{familyId}/activities/{activityId}` — activity chung của family.
- `families/{familyId}/members/{uid}/activities/{activityId}` — activity chỉ dành cho một user.

Activity document là immutable summary và không được dùng làm authorization source.

**Device test cần publish `firestore.rules` mới** trước khi test việc tạo/đọc Chuyện trong nhà.

## Checklist device test

1. Đăng Moment `Tôi` → không có activity cho người khác.
2. Tag Person đã liên kết account → account đó thấy `Mới`; người đăng không tự có badge.
3. Moment `Toàn gia đình`, notify OFF → có trong Chuyện trong nhà, không badge.
4. Moment `Toàn gia đình`, notify ON → thành viên khác có badge.
5. Event `Bình thường / Khá quan trọng / Quan trọng` → badge/visual đúng mức.
6. Event Sinh nhật/Giỗ → recurrence năm mặc định đúng.
7. Admin thêm một Person → chỉ thông báo khi bấm nút; copy cụ thể.
8. Admin thực hiện >=2 thay đổi → chỉ 1 activity tổng hợp.
9. Activity family B khi đang ở A → switch family rồi deep-link đúng.
10. Performance report vẫn `10 listeners ×1`, `tabs.navigator = 1`.
