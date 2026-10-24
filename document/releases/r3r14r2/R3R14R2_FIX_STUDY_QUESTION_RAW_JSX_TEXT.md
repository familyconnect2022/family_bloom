# Family Bloom R3R14R2 – Sửa lỗi JSX chữ ngoài Text

**Nền phát hành:** R3R14R1 (giữ các tính năng khác và toàn bộ file gốc).

## Nguyên nhân xác thực

Màn *Cả nhà cùng giải → Câu hỏi & lời giải* dùng hai biểu thức JSX viết trên cùng dòng, ngăn bởi một dấu cách trong `src/app/(home)/(learning)/study-question-detail.tsx:84`. Transpiler sinh `" "` là một text child của `BloomKeyboardScreen`/`View`. React Native Android ném `Text strings must be rendered within a <Text> component` tại `BloomKeyboardScreen.tsx:152`. File container không phải thủ phạm.

## Thay đổi

- Đưa hai biểu thức JSX xuống hai dòng riêng, bảo đảm không phát sinh raw string child.
- Thêm `native-jsx-raw-text-guard.cjs` để phát hiện các chuỗi khoảng trắng cùng dòng bên ngoài `<Text>` trong TSX native.
- Gắn kiểm tra mới vào `scripts/setup/check-ts-syntax-transpile.js`, vốn đã được BAT Build & Share, EAS và CLEAN_APPLY_FULL gọi sau khi cài dependencies.
- Bổ sung regression tests cho ví dụ lỗi, ví dụ an toàn và màn thực tế.
- Không thay Firebase, thông tin người dùng hay danh tính gói Android.

## Kiểm tra và giới hạn

Đã kiểm tra bộ test JSX, quét nguồn, cú pháp TypeScript, integrity ZIP và đối chiếu file nền. Chưa xác nhận runtime trên thiết bị Android hay xây APK trong môi trường Windows/Gradle.

## Cập nhật

Giải nén ZIP FULL CODE sang thư mục mới, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để sao lưu và chép đè lên project cũ, sau đó chạy app/test theo quy trình quen thuộc.
