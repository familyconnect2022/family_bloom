# FAMILY BLOOM R3R14R3R1 — BAT tập trung trong scripts/android

Từ bản này **không còn BAT ở thư mục gốc**. Bốn BAT wrapper cũ đã được bỏ vì chức năng chính đã có trong scripts/android. Các BAT thực thi còn đầy đủ:

- `scripts/android/Family_Bloom_MENU.bat` — menu thao tác chung.
- `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` — backup, dọn file cũ, ghi đè FULL, verify, CLEAN APPLY. Chạy file này ở **thư mục FULL CODE mới đã giải nén**.
- `scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat` — Build & Share APK trên Windows.
- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` — EAS build test.
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat` — EAS OTA (yêu cầu message).

## Không muốn Auto Update, muốn dùng trực tiếp FULL CODE mới

1. Giải nén FULL CODE ra thư mục **riêng**; không trộn với thư mục cũ.
2. Chép file `.env` của chính mình và `google-services.json` đúng Firebase app `com.familybloom.android` từ project cũ vào thư mục gốc project mới. Không commit chúng lên GitHub. Nếu dùng Android keystore riêng hay biến môi trường local khác thì cấu hình lại phù hợp.
3. Mở CMD ở thư mục `FAMILY_BLOOM`, chạy `npm install --no-audit --no-fund`, sau đó `node scripts/maintenance/check-project-structure.js` và `node scripts/tests/release/test-h25-source-package.cjs`.
4. Chạy `scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat` (hoặc menu) để build release. Không được bỏ qua gate nếu FAIL.

## Muốn cập nhật đè dự án cũ

- Chạy `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` trong FULL CODE mới và chọn chính xác thư mục dự án cũ.
- Updater **sao lưu trước** rồi mới loại bỏ các wrapper cũ, ghi đè nguồn và chạy kiểm tra. Không xóa tay project cũ trước khi sao lưu.
- Nếu mất `google-services.json` hoặc `.env`, phục hồi từ bản sao lưu cá nhân.

## Kiểm chứng

Kiểm tra tĩnh trong môi trường Linux/Node không tương đương build Gradle trên Windows hay thử máy Android thật.
