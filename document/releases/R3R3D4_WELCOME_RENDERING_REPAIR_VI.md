# Family Bloom R3R3D4 · Welcome Android Native Rendering Repair

Ngày: 02/11/2026. **Nguồn:** FULL CODE R8R4R4R3R4R3R3D3, không viết lại ứng dụng. **Phạm vi:** Android Welcome rendering, kiểm thử và updater; không sửa Web, Firebase Rules, Render, Vercel, AuthContext hoặc Membership.

## Hiện tượng và bằng chứng

Bản D3 trên máy thật: nhãn D3 ROOT và D3 GATE có thể nhìn thấy, root shields đã clear, Splash hide resolved, ảnh Thư Ngõ báo decoded nhưng màn nội dung vẫn trắng. Điều này **không chứng minh** Android đã paint ảnh ra màn hình. Lớp Pressable nằm cuối cây với elevation=100 và zIndex=100 là nguồn rủi ro stacking/transparent native layer, nhưng chưa được xác nhận là nguyên nhân duy nhất.

## Thay đổi D4

- Giai đoạn `sealed`: ảnh JPEG tĩnh `<Image>` là **con trực tiếp của `<Pressable>`** không có `elevation` hoặc lớp chạm trong suốt tách biệt; lời nhắc chạm bằng native text nằm cùng Pressable. Nếu ảnh lỗi, hiện fallback chữ và vẫn có thể chạm.
- Giai đoạn `opening`: giữ artwork mở thư và animation chuyển cảnh ngắn. Watchdog cũ vẫn đưa về nội dung đọc nếu animation không hoàn tất.
- Giai đoạn `reading`: ảnh nền tĩnh và **View thực** của tờ thư (không còn Animated.View opacity=0 / elevation). Nội dung 14 đoạn, cuộn, nút tiếp tục không thay đổi.
- Giữ D3 Metro chẩn đoán, Splash logs và điều kiện Auth/Welcome. Không thêm network request.
- Thêm kiểm thử R3R3D4 trước overlay, trong Build & Share; phiên bản APK native 1.3.34 / 143044 giữ nguyên vì chỉ sửa JS/asset; phải build APK Release mới để kiểm tra mà không phụ thuộc Metro.

## Test dự kiến trên máy thật

1. Dùng Auto Update từ source D3 nguyên bản; kiểm tra PASS trước khi Build.
2. Chạy Metro trên thiết bị thật, đăng nhập tài khoản có gia đình cần hiển thị Thư Ngõ. Nhãn D3 GATE/ROOT vẫn hiện trong dev, nhưng phải thấy ảnh phong bì và lời nhắc ngay dưới nhãn.
3. Chạm phong bì một lần. Chờ thư xuất hiện, vuốt qua toàn bộ nội dung, nhấn "Bước vào mái nhà Family Bloom" một lần.
4. Nếu ảnh vẫn trắng, gửi log [BloomWelcomePaint] và ảnh màn hình; nếu đọc thư được nhưng Home trắng, gửi [BloomGate]/[BloomVisualD3] và báo cáo mới. **Không xoá Firebase data hay bypass Home gate.**
5. Cài APK Release build mới và kiểm thử lại không có Metro; thử tài khoản thiếu Profile và trường hợp không có mạng để xác nhận Home không bị mở sai.

Giới hạn: chạy được kiểm thử JS/nguồn trong Linux; không biên dịch Gradle/Windows BAT, không xác nhận painting hoặc APK Release trên thiết bị.
