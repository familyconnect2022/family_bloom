# Family Bloom H25R2R7R2R1 — Sửa release:check Auto Update (23-10-2026)

## Tình trạng người dùng báo

- Auto Update từ H25R2R7R2 báo `Overall: FAIL (10/11)` trong `npm run release:check`.
- Dòng lỗi: `Cloud Functions remains Spark-safe`.
- Sau khi đã tạo bản sao lưu, CLEAN APPLY dừng và chưa xác nhận project cập nhật thành công.

## Nguyên nhân đã tái hiện

Trong bản R7R1, `src/constants/featureFlags.ts` được thay bằng một cờ duy nhất `ENABLE_FAMILY_BULLETIN: boolean = false`, làm mất export `FEATURE_FLAGS` cùng ba cấu hình gốc. R7R2 kế thừa sự thiếu hụt đó. Bài test Phase 13 đòi `USE_CLOUD_FUNCTIONS: false` nên dừng ở 10/11. Các service của Phả hệ vẫn import `FEATURE_FLAGS`; vì thế không được bỏ qua kiểm tra để build.

## Thay đổi mã nguồn

1. Khôi phục export `FEATURE_FLAGS` với `USE_CLOUD_FUNCTIONS: false`, `CROSS_FAMILY_GRAPH_BRIDGE_AVAILABLE: true`, `CROSS_FAMILY_GRAPH_BRIDGE_DEFAULT_ENABLED: false`.
2. Giữ `ENABLE_FAMILY_BULLETIN: boolean = false`: Bảng tin Nhà Mình vẫn ẩn, code/dữ liệu giữ nguyên.
3. Tăng kiểm tra hồi quy của `scripts/tests/release/test-h25r2r7r1-bulletin-deferred.cjs`, xác nhận cờ mới không xóa cấu hình cũ.
4. `scripts/tests/history/test-phase13-release-readiness.js`: xác nhận cả Direct Mode/Spark, graph-bridge và Bảng tin ẩn.
5. Bổ sung `scripts/tests/release/test-h25r2r7r2r1-flags-regression.cjs` chạy không cần `node_modules` và nối vào `scripts/maintenance/auto-update-full.cjs` ở bước check TRƯỚC sao lưu/copy để tránh lặp lại việc bị dừng quá muộn.

## Kiểm thử thực hiện trên mã nguồn đã sửa

- `node scripts/tests/history/test-phase13-release-readiness.js`: 11/11 PASS.
- `node scripts/tests/release/test-h25r2r7r2r1-flags-regression.cjs`: 10/10 PASS.
- `node scripts/tests/release/test-h25r2r7r1-bulletin-deferred.cjs`: 13/13 PASS.
- `node scripts/tests/release/test-h25r2r7r2-study-qa.cjs`: 14/14 PASS.
- `node scripts/tests/release/test-h25r2r2-release-preflight.cjs`: 10/10 PASS.
- `node scripts/tests/release/test-h25r2r7-super-bloom-unified-ui.cjs`: 24/24 PASS.
- `node scripts/tests/release/test-h25r2r6r3-chess-native-orientation.cjs`: 8/8 PASS.
- Kiểm tra Auto Update `check` trên project giả lập có dấu cách: PASS; file target không thay đổi và không tạo backup/copy trong bước check.
- `node scripts/tests/release/test-h25r2r7r2-study-runtime.cjs` với TypeScript có sẵn: PASS.
- TypeScript transpile (chỉ cú pháp, không phải typecheck đầy đủ): 320/320 PASS.

## Bước sử dụng trên Windows

1. Giải nén FULL ZIP R7R2R1 ra thư mục riêng, KHÔNG giải nén đè lên project hiện tại.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trong thư mục R7R2R1; chọn đúng project Family Bloom đang dùng.
3. Đợi `PASS: Family Bloom FULL source is updated and CLEAN APPLY passed.`. Nếu fail, dừng và giữ backup.
4. Sau PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` từ project đã cập nhật.
5. Firestore Rules của Q&A từ R7R2 vẫn cần triển khai trên Firebase nếu chưa triển khai; bản R7R2R1 không thay đổi Rules.

## Giới hạn xác minh

Các BAT/Gradle/APK chưa chạy trực tiếp trên Windows hoặc điện thoại của người dùng. Đây là bản sửa source/tiền kiểm; không thay đổi Kotlin Native, không cần Firebase Blaze, không sửa tính năng Study Q&A, giữ Android versionCode 143042.
