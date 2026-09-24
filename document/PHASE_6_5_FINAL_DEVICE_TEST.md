# Phase 6.5 — Gói kiểm thử tổng hợp cuối

Trạng thái: OPEN / AWAITING USER DEVICE TEST. Chưa đóng phase, chưa xác nhận runtime PASS.

## Áp dụng

Base: main `646457dbb0883fd849211695b082f43cf4631787`. Giải nén ZIP vào gốc project, ghi đè các file tương ứng rồi khởi động lại ứng dụng. Gói này bao gồm các sửa padding, hiệu năng, thanh tab hồng và splash; thay thế các patch trước. Không cần cài dependency hoặc deploy Firebase thêm cho bản sửa này. User đã xác nhận Rules Phase 6.5 được deploy.

## Hành vi mới

- Sau khi hồ sơ và family hợp lệ, năm tab được dựng dưới splash. Splash chờ dữ liệu ban đầu của thành viên, Kỷ niệm, Person liên quan và Lịch; hoàn tất thì chuyển vào màn hình chính.
- Giới hạn chờ chuẩn bị tab là 8 giây. Khi hết hạn, cho xem phần đã tải, các phần khác tiếp tục theo cơ chế tải/lỗi hiện có. Giới hạn này không bỏ qua xác thực hay kiểm tra membership.
- Tạo hồ sơ, tạo/tham gia family và lỗi đăng nhập giữ luồng riêng. Welcome chỉ mở sau splash.
- Đổi tài khoản/family tạo lại bộ nhớ dữ liệu và trạng thái tab; các tác vụ đăng Kỷ niệm đang chạy không bị hủy bởi việc đổi family.
- Giữ dữ liệu Lịch khi đổi tab, giảm dựng lại lưới ảnh Kỷ niệm. Không tải ảnh gốc/video hoặc toàn bộ lịch sử ngay khi mở app.
- Thanh tab trắng hồng, biểu tượng được chọn có nền hồng nhạt, không ripple xám/bóng elevation. “Có trong kỷ niệm” có padding ngang 16.

## Một lượt test để quyết định đóng phase

| Nhóm | Thao tác | Kỳ vọng |
|---|---|---|
| Khởi động | Tắt/mở app khi còn đăng nhập; đăng xuất/đăng nhập lại | Splash chuẩn bị xong mới vào tab; không nháy Welcome trước splash |
| Luồng tài khoản | Đăng nhập sai; tài khoản chưa hồ sơ; tài khoản chưa family | Báo lỗi hoặc đi đúng màn hình tạo hồ sơ/tham gia family; không treo chờ năm tab |
| Mạng | Mạng chậm, mất mạng trong lúc chuẩn bị, kết nối lại | Phần chuẩn bị tab không giữ splash quá hạn khi JS vẫn hoạt động; có trạng thái tải/lỗi phù hợp; dữ liệu cập nhật khi mạng trở lại |
| Hiệu năng | Ngay khi splash biến mất, chuyển năm tab 10–15 lần; thử Lịch tháng và danh sách | Không cần đợi thêm 4–6 giây trên Trang nhà; giảm lag lần đầu; Lịch không trắng/tải lại mỗi lần quay về |
| Family | Đổi family, kiểm tra Kỷ niệm/Lịch/Cây nhà; trở lại family trước | Không hiển thị dữ liệu của family cũ; nội dung khớp family đang chọn |
| Giao diện | Chạm/nhấn giữ tab; kiểm tra màn hình nhỏ/chữ lớn, điều hướng Android | Màu hồng, không bóng/ripple xám; nhãn đọc được; vùng chạm và safe area đúng |
| Person trong Kỷ niệm | Một/nhiều Person, tên dài, bài không caption; chạm liên kết | Padding hai bên đều; mở đúng Person |
| Timeline | Member A tạo/sửa/xóa của mình; member B thử thao tác; admin thao tác bài A | A được sửa/xóa; B không được; admin chỉ được xóa bài người khác, không sửa; không chờ duyệt |
| Moments / Events | Gắn nhiều Person; xem Person Detail và Event detail | Đúng Person, đúng Kỷ niệm liên quan; Event xuất hiện ở Timeline; ownership giữ nguyên |
| Hồi quy | Album và xem ảnh/video; bình luận/reaction; Family ID copy; pan/pinch/recenter; DG-11 và Full Tree | Các thao tác cũ hoạt động; canvas không có nút +/−; thumbnail đúng |

Khi báo lỗi, ghi nhóm test, thao tác, kết quả thực tế và thiết bị/build đang dùng. Ảnh hoặc video ngắn hữu ích cho lỗi giao diện/lag.

## Đã kiểm tra trong môi trường sửa code

- PASS: mô phỏng vòng đời startup với hook/effect và đồng hồ giả: bypass màn login, chờ dữ liệu/giao diện, deadline, giữ trạng thái hoàn tất, session mới và family mismatch.
- PASS: 128 TS/TSX transpile; Phase 6.5 contracts; Phase 6.4 viewport/progressive; Query/Kinship; DG-11; layout; Functions core và syntax; git diff whitespace.
- Chưa chạy full TypeScript typecheck, native build, đo frame trên thiết bị hoặc visual QA trên Android/iOS. Test mô phỏng không thay thế test React Native thực tế.

## Sau khi user xác nhận đạt

1. Chốt Phase 6.5 CLOSED, cập nhật FULL APP Master Handoff CURRENT và tạo checkpoint PHASE_6_5_CLOSED.
2. Chốt commit/tag tương ứng trên Git khi được yêu cầu. Hiện bản sửa ở workspace/ZIP, chưa push GitHub.
3. Đề xuất phase tiếp theo: proposal/approval cho thay đổi cấu trúc Person và Relationship. Trước khi code, chốt quyền gửi/duyệt, loại thao tác được đề xuất, preview diff, xử lý xung đột và audit trail. Đây là phạm vi đề xuất, chưa được triển khai hay coi là đã duyệt trong Phase 6.5.
