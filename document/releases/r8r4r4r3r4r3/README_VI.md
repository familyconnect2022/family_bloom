# Family Bloom R8R4R4R3R4R3 — P0 Firebase / Thư Ngõ / mạng

Bản này sửa ổn định AuthContext và xác minh Firebase từ R8R4R4R3R4R2, không thay đổi Web/Render/Vercel hay layout của 92 màn.

- Thử lại chỉ khởi động kiểm tra **bước chưa được xác minh**, không xóa hồ sơ/gia đình đang được server xác nhận của cùng UID.
- Khi UID thực sự thay đổi hoặc Firestore báo `permission-denied`, khóa dữ liệu cũ và xác minh lại theo server.
- Listener Firestore bị ngắt tạm thời không tự gỡ Thư Ngõ nếu có server verification trước đó cho đúng UID trong phiên; khi online trở lại sẽ thử đồng bộ lại có giới hạn.
- Thư Ngõ chỉ được đóng sau khi lưu thành công xác nhận đã đọc; không mở Home nếu lưu thất bại.
- Hai phép thử Google/Cloudflare thất bại là `unknown`, không đồng nghĩa `offline`; tránh thông báo mất mạng giả.
- Màn xác minh phân biệt lỗi timeout Firebase và quyền truy cập; không mặc định là mất Internet.
- Auto Update: bổ sung fingerprint nguồn R8R4R4R3R4R2 và gate P0 mới; giữ versionCode 143044 vì không đổi native.

## Cách kiểm tra trên điện thoại

1. Sao lưu trước rồi chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` từ ZIP đã giải nén.
2. Chạy `npx expo start --dev-client -c` trong dự án được cập nhật, tắt Metro cũ trước đó.
3. Đăng nhập Google, kiểm tra Thư Ngõ có xuất hiện và có thể mở; nếu cần, lấy log `[BloomGate]`, `[BloomWelcomePaint]`, `[BloomSession]`.
4. Mất mạng 20 giây rồi kết nối lại; kiểm tra ứng dụng không hiện báo mất Internet nếu chỉ Firebase chậm; Thử lại không reset Thư Ngõ đã dựng.
5. Thử tài khoản chưa có profile: không được vào Home. Thử quyền Firebase bị từ chối: không được vượt qua gate.
6. Kiểm tra bản Release riêng để loại bỏ ảnh hưởng từ Metro trên LAN.

Đã chạy kiểm tra cú pháp và source gates trên Linux. **Chưa kiểm thử trên điện thoại Android hoặc thực thi BAT trên Windows.**
