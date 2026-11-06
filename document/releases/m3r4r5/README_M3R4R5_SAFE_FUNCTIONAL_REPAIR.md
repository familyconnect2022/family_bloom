# Family Bloom Android M3R4R5 — Welcome / Family CV / Avatar / Toast / Build gates

**Ngày:** 30/10/2026

## Nguồn gốc — ĐỌC TRƯỚC KHI AUTO UPDATE

M3R4R5 được sửa trên **M3R4R4 R1_BASE**; bản ZIP R2 chỉ xuất hiện dưới dạng metadata trong thư viện, không thể đọc byte ZIP để diff và merge. Vì vậy bản này **không phải bản hợp nhất chính xác R2 + R4**. Các hành vi được nêu trong mô tả R2 (Welcome sau tạo nhà, khoảng cách nút gia nhập, toast đúng ngữ cảnh) đã được phục hồi và kiểm thử độc lập, nhưng không chứng minh mọi sửa đổi riêng của R2 đã có trong R5.

**Nếu dự án hiện tại được xây từ R2, tuyệt đối không dùng AUTO UPDATE của R5 để ghi đè.** Bộ cập nhật có kiểm tra fingerprint 8 tệp mã nguồn; nếu không nhận diện đúng nền R1 hoặc R4, nó sẽ dừng trước backup, cleanup và overlay. Khi người dùng gửi lại ZIP gốc R2, cần diff 3 chiều R1–R2–R5 và đóng gói bản FULL đã hợp nhất.

## Các lỗi đã sửa và kiểm tra

- Welcome: tạo nhà thành công đã gắn lời mời mở Thư Ngõ theo Firebase UID và familyId; không phụ thuộc vào lần đăng nhập. Nếu Firestore đưa người dùng thẳng tới Home trước khi họ bấm “Vào nhà”, yêu cầu Welcome vẫn còn. Chỉ hiển thị sau khi Tabs sẵn sàng, không hiển thị ở nhà khác hay tài khoản khác. Chỉ đóng khi người dùng tiếp tục.
- Join: thêm gap 14dp giữa nút chính và nút Quay lại; đang loading khóa thao tác Quay lại, tránh hai nút sát nhau.
- Toast: năm màu độc lập (success: xanh lá; info: xanh dương; warning: vàng cam; error: đỏ; notification: lavender), quét 196 lời gọi, không còn trường hợp object literal thiếu type không phân loại. Bật/tắt nhắc nhở, từ chối đơn, hủy bàn giao là success sau khi thao tác thành công.
- Avatar và CV: giữ từ M3R4R4: avatar vuông bo góc; hiển thị URI mới ngay, cắt nội bộ sau khi người dùng căn chỉnh, JPEG thật 512×512; upload nền có queue theo UID và chống ghi đè lựa chọn cũ; vòng tiến trình thực; CV chỉnh sửa trực tiếp và margin 32dp dưới header.
- Web: không chỉnh sửa trang Web trong release này; Render/Vercel độc lập không thay đổi.

## Gate và chính sách build

1. Trước backup / cleanup / overlay: gate nguồn `test-r2r4-preflight.cjs` và `check-r1r4-source-lineage.cjs`; abort nếu không tương thích.
2. Sau khi dependencies được bảo đảm: `test-r2r4-journey.cjs`, kiểm thử chính sách Welcome 12 trạng thái, wiring và chặn khi kết quả không đúng.
3. Trước Gradle APK: gate nguồn, Windows CRLF, route uniqueness, Firebase JSON preflight và các gate native/chess/xiangqi hiện có được giữ nguyên.
4. `npm run typecheck` hiện được xử lý dưới dạng WARN trong CLEAN APPLY cũ. Không được xem WARN là typecheck pass; cần chạy typecheck thực với dependencies trước khi kết luận build được. Không đổi các gate native sang WARN.
5. Android app version và versionCode giữ nguyên **1.3.33 / 143043** vì các kiểm tra binary H25 hiện đang khóa identity này. Việc nâng versionCode là một thay đổi migration riêng cần đồng bộ mọi chứng cứ native, BAT, EAS và gate liên quan; không âm thầm bump làm giả FAIL Build & Share.

## Những việc CHƯA thể chứng nhận

- Không đọc được ZIP R2 gốc; chưa xác nhận merge không mất bất kỳ sửa riêng R2.
- Chưa có môi trường Android SDK/Gradle đầy đủ + node_modules để build APK thật; chưa kiểm thử UI trực tiếp trên điện thoại.
- Chưa xác minh tiến độ upload và URL avatar trên Cloudinary/Firestore thật. Cần 2 tài khoản, mạng yếu, chọn ảnh liên tiếp, kill/restart, đổi nhà, xem profile và verify trực tiếp.

## Dùng thử an toàn

Giải nén vào thư mục riêng. Nếu dự án đang là R1 hoặc R4 đúng fingerprint, chạy Auto Update để sao lưu rồi áp dụng. Nếu đang dùng R2 hoặc bất kỳ bản mới hơn/chỉnh sửa khác, không cố bypass gate: giữ nguyên bản đó và gửi ZIP R2 để hợp nhất đúng mã. Khi chạy Clean Apply / Build & Share, dừng nếu một gate critical FAIL; ghi log lỗi đầu tiên. Không triển khai Firebase Rules hoặc thay đổi cấu hình Cloudinary từ ZIP này.

## Gói bổ sung trực tiếp M3R4R3 → M3R4R5 (30/10/2026)

- Bổ sung chữ ký SHA-256 cho 8 tệp nhận diện R3 cùng 14 tệp quan trọng khác của bản R3 gốc.
- Auto Update cho phép **R3 nguyên bản**; vẫn chặn R2 và R3 đã chỉnh sửa mã quan trọng.
- Chỉ thay đổi công cụ xác minh/update và test để nhận diện R3; không thay đổi UI/logic Android hay Web so với R5.
- Gate tương thích chạy **trước sao lưu và trước mọi thay đổi**. Khi cập nhật thành công thì bản R5 giữ toàn bộ tính năng/avatar/CV/Welcome/Toast của R5.
- Nếu thông báo source identity mismatch, **không được bỏ gate**. Không xóa/reinstall. Gửi log và thư mục zip nguồn đang dùng để đối chiếu.
- Test tự động có thể kiểm tra R3 gốc từ thư mục riêng với `FB_R3_REFERENCE`; Auto Update người dùng không yêu cầu thư mục này.
- Đây không phải bản merge byte-for-byte từ R2, chưa build APK thật.
