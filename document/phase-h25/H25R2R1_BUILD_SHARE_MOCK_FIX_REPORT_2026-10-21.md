# Family Bloom H25R2R1 — Build & Share regression repair

Ngày: 2026-10-21. Gốc: FULL CODE H25R2 (1290 files). Đây là bản FULL CODE cập nhật, không phải patch. **Không thay đổi cơ chế invitation, Chess/Xiangqi network, APK native identity** (app 1.3.29, Android versionCode 143039, `P2.37R2C-H25-native-1`).

## Lỗi người dùng ghi nhận

Windows Build & Share dừng trước Gradle ở:

```
Error: unknown mock react-native
[FAIL] H17 build/share stopped
```

**Nguyên nhân đã tái hiện:** `nativeChessGameplayController.ts` import `AppState` từ `react-native`, trong khi các harness VM Node cũ không mock mô-đun đó. Kiểm thử H15/H13/H14 cũng mắc cùng lỗi nhưng chưa đến lượt thực thi, nếu chỉ sửa H17 thì vẫn còn nguy cơ dừng ở các gate khác.

## Sửa đổi

- H17, H15, H14, H13: mock AppState với `{ currentState:'active', addEventListener:()=>({remove(){}}) }` trong sandbox; không cần tải React Native thật trong Node.
- H11: cập nhật assert kiểm tra đúng `markReady()` hai giai đoạn (both `boardReady` rồi `playReady`), bảo đảm `turnStartedMono` chỉ được thiết lập sau khi cả hai đã Ready. Bỏ đối chiếu string cũ `if (!bothReady) return ...` vốn không còn khớp do persist READY giữa các lần reconnect. Giữ kiểm tra quyền clock ở server, không bỏ test.
- Thêm `scripts/test-h25r2r1-build-share-regression.cjs` thực thi đầy đủ H11, H13, H14, H15, H17, kiểm tra mock và kiểm tra thứ tự các BAT. Được gọi sau bước bảo đảm TypeScript ở 4 luồng: Build & Share, direct Release, EAS Build, Clean Apply.
- Thêm file gate mới vào kiểm tra độ đầy đủ của FULL source. Giữ CRLF Windows ở các BAT.

## Các kiểm tra đã chạy thực tế trong môi trường soạn mã

- H11 28/28, H13 20/20, H14 20/20, H15 27/27, H17 23/23.
- H18 25/25, H19 15/15, H20 16/16.
- Native Kotlin standalone ChessPieceMotionPlanner: biên dịch Kotlin/JVM rồi chạy 14/14.
- H22R3 Windows source preflight: 7/7. H25R2 release contract: 9/9. BAT entrypoints: 36/36.
- Tổng 63 lệnh `node` trong bốn script cập nhật/build: 59 PASS khi chạy thực tế; 4 chưa xác minh tại đây:
  - `scripts/setup/check-package-lock.js`: FULL ZIP cố ý không mang `package-lock.json` của máy người dùng, quy trình build sẽ chạy `npm install` để tạo/cập nhật.
  - `scripts/setup/check-p2_37r2-local-install.js` và `scripts/setup/check-expo-dependencies.js`: không có `node_modules` trong FULL ZIP, máy người dùng cần chạy bước cài dependency trong BAT.
  - `scripts/setup/check-p2_37r2c-apk-native-proof.js`: cần đường dẫn một APK thật đã biên dịch, không thể chạy kiểm chứng APK khi chưa chạy Gradle.
- Kiểm tra `check-ts-syntax-transpile.js` và `check-source-import-integrity.js` đạt.

## Giới hạn kiểm chứng

Đây là kết quả kiểm chứng mã nguồn, unit tests, Kotlin planner và static Windows BAT contracts. Chưa thực sự chạy file `.bat` trên Windows, chưa `expo prebuild`, chưa biên dịch `assembleRelease`, chưa có APK native để xác nhận manifest/AAPT2/chữ ký, và chưa thử nghiệm trên điện thoại. Đừng diễn giải các PASS trên là cam kết APK biên dịch thành công tuyệt đối. Không phát hành APK cũ làm bản LATEST nếu build fail.

## Các bước áp dụng

1. Giải nén FULL ZIP H25R2R1 riêng ngoài thư mục dự án cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để backup, clean, overlay, verify, clean apply. Cập nhật giữ cấu hình Firebase và bí mật cục bộ.
3. Trong dự án được cập nhật, có thể chạy `node scripts\test-h25r2r1-build-share-regression.cjs` để kiểm chứng sớm; nếu báo thiếu `typescript`, chạy `npm install` rồi thử lại.
4. Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Theo dõi lỗi **đầu tiên** nếu còn.
5. Đây chỉ là sửa **mã kiểm tra và BAT**: không cần deploy lại Firebase Index/Rules hay Render chỉ vì bản H25R2R1.
