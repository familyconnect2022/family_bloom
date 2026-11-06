# Family Bloom — Appearance Local First / Theme Tokens

## Quy tắc

- Chỉ store JS thuần được quyền thay đổi appearance ngay khi người dùng thao tác. Không `await` network khi render.
- `BloomThemeProvider` không subscribe vào revision để tránh render lại Auth, media, game, navigation.
- Component UI dùng semantic token `COLORS.*`; `createBloomStyles` đổi theo `themeRevision` và `typographyRevision`.
- Text và Input chỉ subscribe typography; palette chỉ khi cần default text color.
- Color/icon trong logo, ảnh hero, quân cờ, đồ họa Toán/Hóa, màu mực Thư Ngõ và trạng thái chẩn đoán có thể là **ngoại lệ**, không được thay bừa.
- Cache appearance nằm ở `@family-bloom/android/appearance/uid/v2/<uid>`, không dùng cache của UID khác.
- Khi cache hợp lệ: **0 read & 0 write** Firestore appearance lúc khởi động. Cache thiếu: đọc từ server một lần, không tự tạo document.
- Thao tác người dùng: state React đổi ngay, cache pending được lưu trước, nhóm thay đổi 850ms gửi Firestore một lần theo giá trị cuối. Không ghi Firebase trong render/effect.
- Không có `onSnapshot` cho appearance; đồng bộ từ thiết bị khác chỉ khi gọi `refreshAppearanceFromCloud()` có chủ đích.
- Firebase Auth và Membership Gate vẫn phải xác minh server phù hợp; quy tắc cache-first không áp dụng cho quyền truy cập.

## Kết quả kiểm kê ban đầu

351 tệp Android/shared, 4.186 phép gán thuộc tính màu, 1.246 `fontSize`, 1.325 Text alias BloomText. Xem file audit bản R3R3D7R2R3R1 đã cung cấp.

## Kiểm thử thủ công còn cần

- APK: Garden → Rose tại các trang, không chạm để kích hoạt; font 90%, 100%, 160%.
- Local cache UID A/B; mở lại offline; kết nối sau đó, đổi liên tục, tắt app giữa lúc pending.
- `appearance:architecture:check` kiểm tra source contract, không thay thế test Firebase và profiler trên thiết bị.
- Kiểm tra các thành phần native/animated/memoized ở toàn bộ màn hình; một số artwork giữ bảng màu riêng có chủ ý.
