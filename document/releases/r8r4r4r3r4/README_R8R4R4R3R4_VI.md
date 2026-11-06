# Family Bloom R8R4R4R3R4 — Auth/Welcome Theme/Visual foundation

**Bản Android FULL SOURCE** được xây dựng từ R8R4R4R3R3. Không có đổi Web/Render/Vercel.

## Phần có thay đổi trong source
- Luồng login → protected welcome: lớp chờ chỉ được gỡ khi route `/welcome` có native layout đầu tiên; không dựng Home trước khi xác minh quyền; thêm log `[BloomGate]` ở Dev, không ghi UID.
- `Stack.Protected` cho Welcome phải có UID, profile, membership và `showWelcome`. Session-gate vẫn là chốt an toàn công khai.
- Header: ảnh full-bleed, cao hơn, tiêu đề chuyển lên vùng giữa bên trái với nền đọc được, giữ các cảnh art và màu sương theo theme. Sửa cảnh báo expo-image `contentPosition`.
- `appearanceCloudSync`: khi tài khoản chưa có preference hoặc bản ghi không hợp lệ, dùng Rose/Light và ghi bản hợp lệ lên Firestore theo UID (bất đồng bộ, có pendingSync retry). Không chờ đồng bộ theme để vào Home.
- Semantic color roles `textOnSelected`, `onPrimary`, `iconForeground`...; sửa nhãn nút, Lịch/Sự kiện, icon card và các host riêng có listener theme. Không đổi mã điều khiển bàn cờ.

## Giới hạn
- **Không có APK chạy trên thiết bị**: cần kiểm thử login/logout hai tài khoản, Welcome với tap, Midnight/Garden Light/Dark, màn con và tabbar.
- Chưa xác nhận các rules live đã deploy; source chứa Firestore rules phải được kiểm tra trên Firebase Console trước khi thử lưu default.
- Các bộ test Node là static contract + theme runtime, không xác nhận toàn bộ 92 màn hình thực tế.
- Nếu đăng nhập vẫn bị trắng: lấy log `adb logcat` với các dòng `BloomGate`, `ReactNativeJS`, `AndroidRuntime` rồi chia sẻ bản đã xóa dữ liệu nhạy cảm. **Không** xóa app data hoặc đổi Firebase Rules chỉ để thử.

## Cập nhật
1. Giải nén FULL ZIP vào thư mục hoàn toàn riêng với project đang chạy.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, kiểm tra kết quả preflight/backup/overlay/verify/clean apply.
3. Chỉ Build & Share khi Auto Update đạt PASS; giữ nguyên `.env`, `google-services.json` và khoá ký.
