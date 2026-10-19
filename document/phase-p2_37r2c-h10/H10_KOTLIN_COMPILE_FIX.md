# H10 – Kotlin compile fix (18/10/2026)

## Nguyên nhân từ log Windows

`ChessNativeBoardView.kt:536:11 Incompatible types: 'String' and 'Boolean'` ở task `:family-bloom-overlay:compileDebugKotlin`.

Mã H10 cũ sử dụng `when (square)` với nhánh `current.queuedPremoveSquares.contains(square)` có kiểu `Boolean`, trong khi `square` là `String`. Đây là lỗi source Kotlin trong gói H10, không phải lỗi Gradle/Manifest/thiết bị.

## Đã thay đổi

- `ChessNativeBoardView.kt`: chuyển từ `when (square)` sang `when { ... }` với tất cả điều kiện Boolean. Thứ tự ưu tiên tô màu vẫn giữ: ô chọn → ô chiếu → premove → nước vừa đi → màu gốc.
- `scripts/setup/check-h10-native-kotlin-when.js`: bổ sung preflight để phát hiện hồi quy ngay khi chạy BAT build Release.
- `scripts/test-phase-p2_37r2c_h10-chess-native-latency.js`: bổ sung assertion vào kiểm tra H10.
- `scripts/test-phase-p2_37r2c_h8-native-chess-tap-move.js`: cập nhật kiểm tra H8 tương thích kiểu viết Kotlin đúng, không kiểm tra chuỗi sai cũ.
- `scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat`: gọi preflight trước các bước Gradle.

Đây là **FULL CODE H10 sửa Kotlin**, không phải ZIP patch. Giữ nguyên app version `1.3.10`, `versionCode=143020` và Native ID `P2.37R2C-H10-native-1` vì chỉ sửa lỗi không biên dịch của chính H10.

## Giới hạn xác minh

Phải chạy Android Gradle trên Windows mới xác thực được quá trình biên dịch Kotlin đầy đủ và các lỗi khác nếu xuất hiện. Static test kiểm tra đúng điều kiện mã nguồn nhưng **không thể thay thế Android compile**.

## Cập nhật

1. Sao lưu thư mục dự án; giải nén FULL CODE mới, copy đè thư mục dự án. Không chạy BAT cũ trước khi copy.
2. Chạy `Family_Bloom_CLEAN_APPLY_FULL.bat` (tại root của bản mới).
3. Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` để build APK Release. Nếu test qua `npx expo run:android`, Kotlin fix cũng tự động có hiệu lực vì module Native là source module của dự án.
4. Nếu Kotlin báo lỗi khác, gửi các dòng bắt đầu bằng `e: file:///...` và tên task lỗi; không cần gửi toàn bộ log dài.
