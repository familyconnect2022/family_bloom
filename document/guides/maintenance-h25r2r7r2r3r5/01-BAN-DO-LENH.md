# Bản đồ BAT và lệnh tương đương

| Việc cần làm | File BAT chuẩn | Lệnh Windows từ root project |
|---|---|---|
| Menu bảo trì | `scripts/android/Family_Bloom_MENU.bat` | `call scripts\android\Family_Bloom_MENU.bat` |
| Auto Update + sao lưu | `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` | `call scripts\android\maintenance\Family_Bloom_AUTO_UPDATE_FULL.bat` |
| Build APK + chia sẻ | `scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat` | `call scripts\android\build\Family_Bloom_BUILD_APK_TO_SHARE.bat` |
| CLEAN APPLY | `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` | `call scripts\android\maintenance\Family_Bloom_CLEAN_APPLY_FULL.bat` |
| Dọn trước khi copy | `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` | Chỉ dùng trong Auto Update hoặc sau khi có backup |
| EAS Build | `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` | `call scripts\android\eas\Family_Bloom_EAS_BUILD_TEST.bat` |
| EAS OTA | `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat` | `call scripts\android\eas\Family_Bloom_EAS_UPDATE_TEST.bat` |
| Chẩn đoán Firebase | `scripts/android/build/firebase-android-config.cjs` | `node scripts\android\build\firebase-android-config.cjs diagnose .` |

* Tất cả BAT đều có CRLF chuẩn Windows. Manifest: `scripts/setup/bat-entrypoints-manifest.json` (33 mục; không có BAT root).
* `scripts/android/build/` chỉ có tác vụ build và xác minh cấu hình trước khi compile.
* `scripts/android/maintenance/` sở hữu updater/cleaner/dependencies.
* `scripts/android/verify/` xác minh identity/APK; `scripts/android/install/` chứa lệnh cài đặt; `scripts/android/dev/` là debug; `scripts/android/eas/` là cloud build/OTA.
* `scripts/setup/` là cài đặt/kiểm tra môi trường, `scripts/firebase/` là deploy rules/indexes/functions (phải xác nhận môi trường), `scripts/music/` công cụ media.

## Lưu ý chuyển từ H25R2R7R2R3R4

File BAT ở root cũ và file test dưới `scripts/test-*.js|cjs` chỉ được xóa sau khi hệ thống tạo backup, thông qua `scripts/maintenance/retire-legacy-script-paths.cjs` + `scripts/setup/script-migration-map.json`. Không xóa file ở vị trí khác. Bản sao cũ của chúng vẫn có trong backup.
