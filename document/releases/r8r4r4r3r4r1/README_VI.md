# FAMILY BLOOM R8R4R4R3R4R1 — ROOT WELCOME P0

Nguồn: FULL CODE R8R4R4R3R4. Chỉ sửa phần hiển thị Thư Ngõ và các gate kiểm thử lịch sử tương ứng. Không sửa backend, Firebase Rules, Web hoặc game logic.

## Tại sao sửa
Video 68889.mp4 và log chụp từ Metro cho thấy auth/profile/membership `ready`, pathname `/welcome`, `navigationStable=true`, `welcomeFrameReady=true` nhưng thiết bị hiển thị trang trắng. `onLayout` chỉ xác nhận khung, không chứng minh scene đã được vẽ. Đây là bằng chứng lỗi hiển thị/handoff, chưa phải chứng minh một nguyên nhân Native chính xác.

## Triển khai
- Welcome được render ở lớp RootNavigator cuối cùng, phủ trên Bootstrap, không phải Modal hay Native Stack.
- Khi Welcome đang chờ, RootRouteGate về `/session-gate`; Legacy `/welcome` redirect an toàn về session gate và bị khóa trong Stack.
- Chỉ render Welcome khi UID/profile/membership đã xác minh và `welcomeReady && showWelcome`. Home được guard không cho mount đến khi xác nhận đọc thư.
- Thêm native-text fallback trong scene khi ảnh chưa giải mã.
- Giữ nguyên 14 đoạn, onPressIn, animation, timeout, lưu acknowledgment.

## Kiểm tra
Node/TSX/ZIP/Auto-update preflight (trên Linux) chỉ xác minh mã nguồn, không chứng minh thực tế Android. Nếu trắng vẫn xảy ra, thu `adb logcat -v time ReactNativeJS:V ReactNative:V AndroidRuntime:E *:S` khi đăng nhập và quay video.

## Cập nhật
Giải nén FULL ZIP ngoài thư mục dự án, chạy Family_Bloom_AUTO_UPDATE_FULL.bat. Chỉ build sau khi báo PASS. Với development build tương thích, thử `npx expo start --dev-client -c`. Dữ liệu Firebase không bị xóa.
