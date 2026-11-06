# Family Bloom R8R3R1 — sửa gate Auto Update (31/10/2026)

## Hiện tượng

Auto Update R8R3 trên Windows dừng trước khi đụng tới dự án cũ:
`AssertionError: TypeScript parser is required for this release gate (Node/TS toolchain)`.

## Nguyên nhân đã xác nhận

`scripts/tests/release/test-r8r3-theme-system.cjs` yêu cầu thư viện TypeScript từ
`node_modules` hoặc một đường dẫn cố định trên máy phát triển. Nhưng Auto Update
bắt buộc chạy preflight **trước khi cài đặt dependencies**, nên dự án mới giải nén
chưa có `node_modules` sẽ lỗi dù máy có Node.js v24.

## Sửa chữa

- Gate dùng `node:module.stripTypeScriptTypes` của Node.js 22+ để kiểm tra và thực thi
  các mô-đun TypeScript thuần trong một phạm vi CJS cô lập, **không tải package nào**.
- Giữ đầy đủ 22 kiểm tra thực tế: 8 bảng màu, tương phản, card trắng, đăng ký nghe
  thay đổi Theme, trạng thái Theme hệ thống, lưu cấu hình, không reset Firebase/Router.
- Thêm kiểm tra âm tính: card bị thay sang màu sai hoặc TypeScript bị hỏng phải
  chặn cập nhật, tuyệt đối không coi là PASS.
- Giữ nguyên versionCode 143044 / version 1.3.34 vì chỉ sửa phần kiểm tra mã nguồn,
  không thay đổi APK hoặc mã ứng dụng Android.
- Bộ fingerprint chấp nhận R8R2 gốc, R8R3 gốc và bản R8R3R1 mới; vẫn từ chối
  sửa đổi trái phép ở các tệp quan trọng.

## Cách chạy

1. Giữ nguyên dự án đang hoạt động, **không chạy Cleanup** để xử lý lỗi này.
2. Giải nén `FAMILY_BLOOM_R8R3R1_OFFLINE_PREFLIGHT_FULL_2026-10-31.zip` vào thư mục
   **riêng**, ngoài dự án cũ, không chép chồng ngay lên bản R8R3 lỗi.
3. Dùng Node.js 22 hoặc mới hơn (log người dùng đã có Node 24.20.0).
4. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` của **bản R8R3R1 mới**.
5. Chỉ khi Auto Update PASS mới chạy Clean Apply và Build & Share.

## Phạm vi và giới hạn

Không thay đổi Firebase, Web, Vercel, Render, Cloudinary, Chess/Xiangqi hay luồng
hồ sơ/Thư Ngõ của bản R8R3. Preflight kiểm tra mã nguồn không thay thế kiểm thử
APK trên thiết bị và Firebase thật. Chưa chạy BAT trên Windows/Gradle trong môi
trường này.
