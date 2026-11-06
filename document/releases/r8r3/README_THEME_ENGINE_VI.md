# Family Bloom · R8R3 Android Theme Engine · 31/10/2026

## Mục đích
- Bloom Rose LIGHT mặc định; tất cả BloomCard / card nội dung dùng surface trắng `#FFFFFF`.
- Bốn phong cách: Rose, Garden, Heritage, Midnight; mỗi phong cách có nền Sáng và Tối độc lập.
- Chế độ sáng, tối, hoặc theo hệ thống Android; lưu lựa chọn vào AsyncStorage riêng trên từng bản cài.
- Khi đổi theme, cập nhật ngay màn đang mở và các component, không remount Root Stack, Firebase session hoặc ván cờ.
- Màu cảnh báo/lỗi/thành công độc lập với màu thương hiệu; ảnh/video, nền bàn cờ và dữ liệu không được filter theo theme.

## Kiến trúc
- `src/theme/palette.ts`: 8 bộ màu ngữ nghĩa, kiểm tra lựa chọn hợp lệ, độ tương phản.
- `src/theme/runtime.ts`: store thuần JS, revision/subscriber, thay đổi đồng bộ; không phụ thuộc Auth/Router/Firestore.
- `src/theme/BloomThemeProvider.tsx`: lấy chế độ hệ thống, lưu AsyncStorage theo thứ tự thao tác, chống đọc dữ liệu cũ ghi đè lựa chọn vừa đổi.
- `src/theme/createBloomStyles.ts`: StyleSheet proxy tái tính toán khi revision thay đổi; không bắt màu tại thời điểm import module.
- `src/constants/theme.ts`: COLORS proxy ngữ nghĩa, biến đổi live; mọi UI Android dùng semantic tokens.
- `src/constants/bloomSupper.ts`: tone card default/soft/accent đồng nhất surface, icon vẫn có nền điểm nhấn riêng.
- `src/components/ui/BloomThemeSettingsPanel.tsx`: 4 bảng màu + 3 chế độ có accessibility state.
- `src/app/(profile)/settings.tsx`: mục Giao diện & chủ đề trong Settings.

## Không thay đổi
- Firebase Auth / Firestore schema, Security Rules, profile/membership/welcome logic, Cloudinary, Render, Vercel, web screens.
- Không sử dụng key mới cho Auth/FamilySession, không chuyển Router khi đổi theme.
- Không thay module Android native (Chess/Xiangqi) — mã nhận diện native giữ nguyên.

## Tự kiểm tra trên máy thật (APK Release)
1. Tài khoản có hồ sơ và nhà: mở Settings, chuyển đủ 4 màu trong chế độ Sáng; kiểm tra card trắng, header, tab, popup và toast.
2. Chuyển đủ 4 màu trong Tối; kiểm tra chữ, icon, nút bấm, StatusBar và modal không chói trắng.
3. Theo hệ thống: đổi Android sang Tối/Sáng khi app đang mở; UI chuyển mà không vào lại Home.
4. Đóng và mở app: lựa chọn lưu lại, không hiển thị Thư Ngõ khi chỉ đổi theme.
5. Tạo profile + avatar, sửa profile + avatar, duyệt thành viên: không đổi hành vi R8R2, không có toast trễ.
6. Mở bàn cờ đang hoạt động, sang mini, đổi Theme rồi quay về: không xóa phiên hoặc làm mất màu bàn cờ chuẩn.
7. Test tài khoản không có hồ sơ và thiết bị mất mạng: không vào Home khi chưa xác minh Firebase.
8. Kiểm tra màn Sự kiện, Gia phả, Góc học tập, Khoảnh khắc, Chụp ảnh và các modal.

## Update an toàn
- Giải nén ZIP R8R3 **ngoài** thư mục dự án gốc.
- Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, xác minh sao lưu → overlay → verify trước khi Build & Share.
- Giữ `.env` và `google-services.json` hiện tại; không chép file secret từ ZIP.
- Nếu BAT fail ở bất kỳ gate nào: dừng; không chạy Build & Share từ dự án đã cập nhật nửa chừng.
- Khi buộc build bằng CLI: `npm install`, `node scripts/setup/check-ts-syntax-transpile.js`, `node scripts/tests/release/test-r8r3-theme-system.cjs`, `npx expo run:android`.

## Giới hạn xác minh ở môi trường bàn giao
- Có thể chạy kiểm tra syntax/import, gate JS thuần, kiểm tra mã nguồn và mô phỏng Auto Update.
- Chưa chạy full `tsc --noEmit` với đủ node_modules; chưa build Gradle/APK hay test Firebase thật, máy Android thật.
- Chess/Xiangqi: chỉ kiểm tra contract Android hiện diện trong repo; kiểm thử Render server authoritative độc lập theo repo riêng.
