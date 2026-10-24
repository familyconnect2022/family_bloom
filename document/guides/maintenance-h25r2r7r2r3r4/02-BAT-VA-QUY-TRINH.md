# BAT và quy trình build — giải thích bằng tiếng Việt

## Tại sao root vẫn giữ 6 BAT?

Chúng là các **lối vào tương thích**; toàn bộ logic chính nằm trong `scripts/android/`. Bớt đường dẫn root bằng cách xóa/move hai BAT nội bộ sẽ làm hỏng các kiểm thử hoặc công cụ cũ đang gọi chúng. Vì vậy bản bảo trì này không tạo thêm BAT root, không di chuyển test lịch sử, chỉ bổ sung trợ giúp cấu hình Firebase trong `scripts/android/build/`.

| BAT root | Người dùng có chạy? | Nó gọi file nào? |
|---|---|---|
| `Family_Bloom_AUTO_UPDATE_FULL.bat` | **Có, bước 1** | `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` |
| `Family_Bloom_BUILD_APK_TO_SHARE.bat` | **Có, bước 2** | `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat` hoặc chuyển về project đã cập nhật |
| `Family_Bloom_EAS_BUILD_TEST.bat` | Chỉ khi build EAS Cloud | `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` |
| `Family_Bloom_EAS_UPDATE_TEST.bat` | Chỉ khi phát OTA | `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`, nhập message khi được hỏi |
| `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` | **Không** chạy tay bình thường | `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`; Auto Update gọi |
| `Family_Bloom_CLEAN_APPLY_FULL.bat` | **Không** chạy tay bình thường | `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`; Auto Update gọi |

## Sửa lỗi ảnh chụp thiếu google-services.json

### Trạng thái trước

Người dùng xác nhận đã Auto Update thành công và file JSON có trong `Family_bloom_V2`; nhưng BAT vẫn có thể báo thiếu nếu đang dùng đường dẫn đã lưu từ project khác hoặc kiểm tra sai vị trí. Trước đây thông báo không in rõ project đang kiểm tra, gây nhầm lẫn. File cấu hình không đi kèm ZIP vì phụ thuộc project của người dùng.

### Trạng thái mới

1. BAT **ưu tiên JSON hợp lệ ở project chứa BAT đang chạy**. Nếu ở FULL ZIP, nó in rõ `last-target.txt`, đường dẫn project và vị trí JSON đang kiểm tra. Nếu sai/mất target, cho chọn lại thư mục project đã cập nhật bằng hộp thoại hoặc nhập tay.
2. Trước khi build, `Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat` kiểm tra `google-services.json`.
3. Nếu đã đúng: dùng ngay, **không đụng vào tệp**.
4. Nếu bị thiếu: thử đọc file hợp lệ trong `android/app/google-services.json` hoặc backup mà Auto Update tạo ra cho cùng project. **Hỏi đồng ý** trước khi sao chép.
5. Nếu không tìm được: mở hộp thoại chọn `google-services.json`, có thể gõ đường dẫn nếu không dùng được hộp thoại. Xác nhận trước khi chép.
6. Node kiểm tra JSON, Android package `com.familybloom.android` và project `family-connect-4184f`; file đã có/khác dự án sẽ **không bị ghi đè**.
7. Nếu hủy/không có file: **không build**. Có thể tải lại trong Firebase Console → Project settings → Your apps → ứng dụng Android.

**Tuyệt đối không chọn** file `*-firebase-adminsdk-*.json` hoặc `service-account.json`: đó là credentials dành cho server, không phải cấu hình ứng dụng Android.

### Lệnh chẩn đoán (không sửa dữ liệu)

Mở CMD trong thư mục FULL CODE:

```bat
node scripts\android\build\firebase-android-config.cjs diagnose "D:\Project Family Bloom\Bloom\Family_bloom_V2"
```

Xem config candidate hợp lệ, không tự copy:

```bat
node scripts\android\build\firebase-android-config.cjs candidate "D:\Project Family Bloom\Bloom\Family_bloom_V2"
```

Nếu muốn thử nghiệm mà không build, chạy:

```bat
node scripts\tests\release\test-h25r2r7r2r3r4-firebase-recovery.cjs
```

## Cơ chế Auto Update

`Family_Bloom_AUTO_UPDATE_FULL.bat` → `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` → `scripts/maintenance/auto-update-full.cjs`:

- `target`: xác nhận nguồn/đích và danh tính dự án. Nếu đã di chuyển thư mục, hỏi chọn lại.
- `check`: kiểm thử cấu trúc/hồi quy trước khi đụng dữ liệu; không cài dependencies.
- `backup`: sao lưu mã nguồn cũ và cả file cấu hình riêng nếu có (không gồm build cache lớn).
- PRE COPY CLEAN: xóa một số đường dẫn cũ đã retire; đừng chạy riêng nếu không cần.
- `overlay`: chép nguồn mới, không ghi đè `.env`, `google-services.json`, khóa ký APK.
- `verify`: đối chiếu checksum các file sao chép.
- CLEAN APPLY: cài/sửa phụ thuộc, kiểm tra trước build.
- `remember`: chỉ lưu lại đường dẫn sau khi thành công.

Nếu update dừng **trước backup**, project cũ vẫn nguyên; nếu dừng **sau backup**, lưu đường dẫn backup và kiểm tra trước khi chạy tiếp. KHÔNG tự xóa backup.

## Build & Share

- `scripts/android/build/resolve-build-target.cjs`: kiểm tra project đã cập nhật khớp FULL source, cấu hình đúng, từ chối build nhầm nguồn cũ.
- `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat`: chạy kiểm tra trước khi gọi Gradle.
- `scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat`: build Android Release, kiểm tra APK.
- `scripts/setup/verify-apk-copy-sha256.cjs`: đối chiếu byte trước khi công bố LATEST.
- Đầu ra: `C:\FamilyBloomShare\apk` hoặc `%FAMILY_BLOOM_SHARE_DIR%` nếu đã cài; đừng chia sẻ file cũ nếu build thất bại.

## Lỗi thường gặp

| Thông báo | Kiểm tra | Không nên làm |
|---|---|---|
| `google-services.json missing` | Trước tiên xem **đường dẫn project đang kiểm tra**. Nếu JSON đã có ở `Family_bloom_V2`, chọn lại đúng project; nếu chỉ có tại `android/app`, BAT đề xuất phục hồi có xác nhận | Không kết luận file mất; không tạo JSON giả |
| `Installed project does not match FULL release` | Chạy Auto Update trước build | Không bỏ qua check để build nhầm bản |
| `permission-denied` | Firestore Rules đã deploy? UID, membership và familyId hợp lệ? | Không mở Rules thành public |
| `MODULE_NOT_FOUND typescript` | Kiểm tra `npm install --include=dev`, test sau dependency gate | Không xóa kiểm thử server tùy tiện |
| `Gradle failed` | Dòng lỗi **đầu tiên** trong log, file Java/Kotlin liên quan | Không phân phối `LATEST` cũ |
