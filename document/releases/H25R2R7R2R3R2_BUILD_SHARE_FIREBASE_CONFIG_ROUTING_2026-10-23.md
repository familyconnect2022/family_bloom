# Family Bloom H25R2R7R2R3R2 — Sửa Build & Share khi chạy BAT từ ZIP sạch

## Lỗi được báo
Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` trong thư mục FULL CODE mới giải nén gây `[FAIL] google-services.json is missing.` sau khi hoàn thành hàng loạt bài kiểm tra Chess/Xiangqi.

## Nguyên nhân
FULL CODE cố ý không chứa `google-services.json` cá nhân. BAT cũ xác định `PROJECT_ROOT` từ thư mục BAT đang chạy, vì vậy khi khởi chạy trực tiếp từ thư mục ZIP mới, nó cố build ngay tại thư mục chưa có cấu hình Firebase. Auto Update trước đó đã lưu đường dẫn project đã cập nhật và giữ cấu hình gốc, nhưng Build & Share không sử dụng thông tin này.

## Hướng khắc phục đã code
1. BAT ở root kiểm tra nguồn Firebase ngay khi mở. Nếu thư mục có `google-services.json` hợp lệ, build tại đó.
2. Nếu chạy ở thư mục FULL ZIP sạch, BAT đọc `%LOCALAPPDATA%\FamilyBloom\updater\last-target.txt` và kiểm tra project đích.
3. Chỉ chuyển lệnh build sang project đã cập nhật khi `package.json` xác nhận đúng Family Bloom, `app.json` và ba tệp Hỏi đáp/công thức được đối chiếu mã SHA-256, và Firebase Android client có package `com.familybloom.android`.
4. Nếu project chưa được cập nhật, đường dẫn cũ không tồn tại, cấu hình thiếu hoặc không đúng package, dừng sớm với hướng dẫn chạy Auto Update trước — không build nhầm bản cũ.
5. Các đường build trực tiếp cũng kiểm tra cấu hình Firebase ngay từ đầu, thay vì chạy hàng loạt kiểm thử rồi mới thất bại.
6. Không tạo file `google-services.json` giả, không đóng gói, in nội dung hoặc thay đổi cấu hình Firebase gốc.

## Kiểm thử tự động
- `node scripts/tests/release/test-h25r2r7r2r3r2-build-config-routing.cjs`: 15/15.
- `node scripts/maintenance/check-project-structure.js`: 19/19.
- `node scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs`: 16/16 trong môi trường có TypeScript.
- `node scripts/tests/release/test-h25r2r7r2r2-study-ux.cjs`: 15/15.
- `node scripts/tests/release/test-h25r2r2-release-preflight.cjs`: 10/10.
- Auto Update `check` với thư mục project giả lập có dấu cách: PASS, không thực hiện backup/cleanup/overlay.

## Quy trình sử dụng
1. Giải nén bản FULL CODE H25R2R7R2R3R2 vào thư mục riêng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để cập nhật project Family Bloom hiện có — nơi đã có `google-services.json`.
3. Khi thấy PASS, có thể chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` **trong project đã cập nhật hoặc ngay trong thư mục FULL ZIP**; BAT từ ZIP sẽ chuyển lệnh đến đúng project đã xác minh.
4. Nếu cấu hình Firebase không tồn tại ở project đã cập nhật, cần khôi phục từ bản project/backup cũ hoặc tải đúng cấu hình ứng dụng Android từ Firebase Console, và đặt vào thư mục root project đã cập nhật. Không dùng Firebase Admin SDK JSON của server.
5. APK chia sẻ mặc định xuất vào `C:\FamilyBloomShare\apk` sau khi toàn bộ kiểm tra build hoàn tất.

## Phạm vi và giới hạn
Chỉ sửa scripts/Build & Share/preflight; giữ nguyên code Hỏi đáp, công thức, Native Chess/Xiangqi, Firestore Rules, APK identity `1.3.32 / versionCode 143042`. Đã kiểm thử với Node và mô phỏng đường dẫn Windows; chưa chạy BAT/Gradle trên thiết bị Windows thực tế, chưa tạo APK trong môi trường này.
