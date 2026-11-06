# Family Bloom R3R14R3R2 — sửa Auto Update P2.37 và bổ sung menu chạy thử

Ngày 27/10/2026. Nền: R3R14R3R1, ứng dụng `1.3.33`, `versionCode 143043`, ID `com.familybloom.android` không đổi.

## Nguyên nhân 20/22

`test-phase-p2_37r2c_h10r2-board-layer-welcome.js` vẫn tìm literal `width: windowWidth, height: windowHeight` và nút `Vào tổ ấm ngay` của Welcome cũ. Giao diện Thư Ngỏ đã đổi sang `sceneSize = { width, height }`, `onPress={openLetter}` và `onPress={continueIntoFamily}`. Bài kiểm thử được đồng bộ với hợp đồng hiện tại và CLEAN APPLY chạy thêm kiểm thử touch static + runtime R3R14R1; không bỏ qua gate.

## Menu / BAT

- Mở `scripts\android\Family_Bloom_MENU.bat` trong FULL CODE mới.
- `1` cập nhật FULL CODE vào project cũ (backup trước); `2` build APK Release để chia sẻ; `3` Firebase; `4` kiểm tra source.
- `9` Android USB bằng `npx expo run:android`; yêu cầu Android SDK, USB debugging, máy đã authorize và `google-services.json`. Debug APK có thể không cài đè Release APK do khác khóa ký.
- `A` iOS: BAT trên Windows chỉ cảnh báo và trả exit code 2; native iOS phải chạy trên Mac/Xcode và hiện không hỗ trợ trong cấu hình Android-first. Có shell helper `Family_Bloom_IOS_RUN_TEST.sh` sau khi cấu hình iOS phù hợp.
- `B` Web: `npx expo start --web`; dùng preview, không bảo đảm các tính năng Kotlin/Firebase native.
- `5` EAS Build Test; `6` EAS OTA; `7` CLEAN APPLY; `8` cấu hình Blaze. `0` thoát.

## Lựa chọn chạy trực tiếp không cần cập nhật

Giải nén ZIP mới ra thư mục FULL CODE riêng, sao chép **chỉ các secrets/hồ sơ máy** hợp lệ như `.env`, `google-services.json` từ project cũ (không commit lên GitHub), chạy `npm install --no-audit --no-fund`. Sau đó chạy menu trong thư mục FULL CODE mới. Nếu dùng Auto Update, chạy BAT từ **bản FULL CODE mới**, không từ source cũ. Không tự xóa thư mục dự án cũ khi chưa xác minh bản mới.

## Giới hạn kiểm thử

Kiểm tra tĩnh trên hệ thống hiện tại không thay thế chạy BAT trên Windows, Gradle, điện thoại, Firebase hoặc Cloudinary thực tế.
