# Báo cáo kiểm tra tách repository A1/S1/M1 — 2026-10-28

- Dự án nguồn: Family Bloom R3R14R3R8 FULL CODE, 1.461 tệp.
- Tách `server/` sang `Render_chess_xiangqi/`; tách `vercel-media/` sang `Vercel_media/`.
- Android không còn `server/`, không còn `vercel-media/`.
- Không có thư mục tên chính xác `xxx` trong bản nguồn; không xóa nhầm thư mục chưa rõ mục đích.
- Giữ nguyên byte-for-byte `src/`, `assets/`, `modules/`, `functions/` Android và `src/` Render, `api/`, `lib/` Vercel.
- Giữ `scripts/music/` vì đây là bộ công cụ phục vụ tính năng music trong chính ứng dụng; không phải dịch vụ Vercel Music.
- Giữ mã Web hiện có, chưa sửa/triển khai Web.
- Node source-only release preflight: PASS.
- Kiểm tra cấu trúc Android: 19/19 PASS.
- BAT manifest/entrypoint: 38 tệp PASS.
- Mô phỏng backup và tách backend cũ: PASS, bảo toàn `.env` thử nghiệm và đặt hai thư mục LEGACY ngang hàng.
- Phân tích cú pháp TypeScript/TSX: 354 file, 0 parse diagnostics (dùng TypeScript toàn cục 5.8; không phải typecheck đầy đủ).
- Vercel Media API syntax + kiểm tra đặc quyền cơ bản: PASS.
- Các bài kiểm thử lịch sử yêu cầu backend nằm cùng source có thông báo SKIP-CROSS-REPO rõ ràng, không thay thế kiểm thử tích hợp thật.
- Không thể xác nhận `npm run build` Render ở môi trường này vì thiếu cache dependencies khi thử `npm install --offline` (`ENOTCACHED`).
- Chưa có kiểm thử build Gradle APK Windows, EAS cloud, Render production, Vercel production hoặc kết nối thực tế Firebase/Cloudinary.

**Trình tự triển khai khuyến nghị:** 1) Đẩy Render GitHub riêng và build/deploy/test `/health`, 2) đẩy Vercel Media GitHub riêng và test API, 3) cập nhật Android từ A1 và Build & Share; đừng thay đồng thời các URL production nếu chưa test.
