# Family Bloom R3R3D5 — Thư Ngõ hiện như modal chính giữa màn hình

Ngày: 02/11/2026. Nguồn: FULL CODE R3R3D4 gốc.

## Thay đổi
- Không dùng `<Modal>` Android mới; React Native card nổi trong chính màn Native Stack `/session-gate` đã xác minh, để không lặp lỗi màn trắng do đổi native window.
- Đo kích thước THỰC TẾ của vùng Session Gate qua `onLayout`, không trừ chiều cao từ `useWindowDimensions()` của toàn cửa sổ. Khung thư nổi giữa vùng hiển thị, có backdrop tối, tối đa 520px chiều rộng và 745px chiều cao; chừa khoảng cách xung quanh theo màn hình.
- Phần đầu và nút “Bước vào mái nhà Family Bloom” nằm trong khung, **không cuộn**; 14 đoạn nội dung ở `ScrollView` riêng có `flex:1,minHeight:0`.
- Phong bì hiện khi ảnh nền local đã tải/giải mã xong. Nếu tải ảnh không xong sau 5,5s hoặc gặp lỗi thì vẫn hiện fallback native để mở thư. Một lời nhắc có chuyển động nhẹ ở giữa phong bì; mask làm mờ dòng chữ nhúng ở phần dưới ảnh để giảm trùng lặp. Không thay đổi file ảnh JPG gốc.
- Đổi ảnh qua crossfade 3 cảnh `sealed -> opening -> revealed`; sau đó khung thư nổi lên với một nhịp scale/fade nhẹ. Nếu máy chọn giảm chuyển động, chuyển thẳng đến nội dung đọc. Watchdog cũ vẫn đảm bảo không kẹt animation.
- Giữ nguyên xác minh Firebase Auth/Profile/Membership/Family, cơ chế Welcome Ledger và chặn Home trước khi ghi nhận đã đọc. Không thay đổi Render/Vercel/Firebase Rules/Web.
- Giữ D3 visual probes tạm thời trong Metro, và bổ sung log `actual-session-gate-viewport-measured`, `native-centered-reader-layout`, `fixed-cta-footer-layout`.

## Kiểm thử trực tiếp trên điện thoại
1. Giải nén FULL ZIP sang thư mục riêng. Từ mã D4 gốc đã làm việc, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`; đợi thông báo thành công.
2. Chạy Metro: `npx expo start --dev-client -c`. Chạm mở phong bì, quan sát chuyển cảnh, đọc Thư Ngõ dạng card nổi chính giữa và nút vào nhà ngay dưới card (không cần cuộn bên ngoài card).
3. Cuộn 14 đoạn; chạm nút vào nhà và xác minh Home. Test thêm màn nhỏ/đổi chiều ngang nếu có thể. Test tài khoản không có profile phải được dẫn vào Create Profile, không được mở Home.
4. Build & Share APK Release độc lập với Metro trước khi xác nhận sửa triệt để.

## Giới hạn xác minh
Đã chạy kiểm thử mã nguồn, không có máy Android/Gradle ở đây. Không khẳng định đã xác minh pixel thực tế. Không sửa mã Welcome bằng tay sau khi cập nhật vì updater kiểm tra dấu vân tay để bảo đảm an toàn.
