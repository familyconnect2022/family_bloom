# FAMILY BLOOM R8R3R3 — SỬA GATE TYPESCRIPT OFFLINE

- Khắc phục lỗi `Cannot find module 'typescript'` trong H13 khi chạy AUTO UPDATE trên ZIP chưa cài node_modules.
- Đóng kèm TypeScript 5.8.3 (bản phát hành chính thức Apache-2.0) trong `scripts/vendor/typescript`; chỉ dùng để chạy gate trước khi cài dependencies. Giấy phép Apache-2.0 đặt ở `document/licenses/TypeScript_5.8.3_LICENSE.txt`.
- Khi Clean Apply, `npm install` vẫn cài TypeScript theo package.json của ứng dụng. Không sửa Firebase, Web, Render, Vercel, Theme hay các tính năng.
- Preflight kiểm tra đường dẫn trình biên dịch thực tế và từ chối nếu dùng bản bên ngoài ZIP.
- Gọi thực sự H13 với TypeScript được đóng kèm; không vô hiệu hóa hay bỏ qua H13/Chess.
- Quét tập gate được gọi bởi các quy trình AUTO UPDATE, Clean Apply, Build & Share và EAS trước khi cập nhật dự án.
- Đã xác minh nguồn R8R3R2, R8R3R1, R8R2 cho mục đích nâng cấp.
- Môi trường Node chỉ có sẵn compiler toàn cục có thể che giấu lỗi; R8R3R3 kiểm thử chủ động không dùng trình biên dịch toàn cục.
- Android versionCode 143044 không đổi vì đây là sửa công cụ cập nhật, không sửa mã chạy trên điện thoại.
