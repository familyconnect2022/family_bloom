# Family Bloom A3 — Báo cáo cấu hình Server

## Thay đổi so với A2
- Render: `https://family-bloom-chess.onrender.com` → `https://render-chess-xiangqi.onrender.com` (từ URL người dùng cung cấp).
- Vercel Media giữ nguyên: `https://vercelfamilybloommedia.vercel.app`.
- Cập nhật runtime fallback, Expo config extra, EAS `family-bloom-test`, `.env.example` và kiểm tra release.
- Chặn riêng URL Render cũ tồn đọng ở `.env` / Expo extra, không tự chuyển sang server cũ. Cho phép URL tùy chỉnh khác khi thực sự cần.
- Giữ `server-status` cho developer; URL thực tế và nguồn cấu hình hiển thị trong APK.
- Không đụng Render/Vercel source và không thay đổi logic ván cờ.

## Phạm vi kiểm chứng
- Offline cấu hình + cú pháp + test HTTP mock; chưa chạy Gradle APK hay xác thực server production.
