# Family Bloom H23 — Hai sảnh quản lý Cờ vua và Cờ tướng

- Nền: FULL H22R9. Khôi phục chính xác 12 PNG Cờ vua từ FULL H22R8, đồng nhất RN và drawable-nodpi; PNG 192×192 RGBA; gate SHA-256 H23.
- `Trò chơi Nhà Mình`: liên kết hai màn hình sảnh production riêng, không dùng `activateBoardGamePresentation` thử nghiệm.
- `/home-chess`: sảnh Cờ vua tông hồng, chọn 3+2 / 5+0 / 10+0 / 10+5 / không giờ, các tài khoản FamilyMember theo uid; Socket chess presence; gửi thách đấu server.
- `/home-xiangqi`: sảnh Cờ tướng tông vàng, lifecycle và state độc lập, Socket Xiangqi và server riêng.
- Danh sách lấy từ `families/{familyId}/members`, tức tài khoản thành viên Firebase UID, **không** lấy từ graph Person; loại bản thân khỏi danh sách. Online chỉ dựa trên dữ liệu socket, người không có presence vẫn hiển thị offline/không mời được.
- Các lời thách đấu vẫn qua gate 60 giây app-wide, backend xác thực quyền thành viên, bảo vệ khóa chéo game/busy. Không tạo tài khoản giả, không ghi heartbeat Firestore.
- Không thay đổi giao thức server, không cần deploy Render mới chỉ cho hai trang sảnh; bắt buộc build/cài APK mới để khôi phục bộ PNG native.
- Có kiểm tra H23 ở Clean Apply, Build & Share, EAS và npm post-install.
- Mã phiên bản: app 1.3.28, versionCode 143038, native P2.37R2C-H23-native-1.
- Chưa build Android Gradle hoặc chạy hai thiết bị thực tế tại môi trường đóng gói. Kiểm thử nguồn không thay thế test UI và lời mời 2 điện thoại.
