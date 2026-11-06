# FAMILY BLOOM A3 — HƯỚNG DẪN CẬP NHẬT RENDER + VERCEL (28/10/2026)

## 1. Các backend đã tách (KHÔNG đóng gói chung Android)
- Render Chess/Xiangqi S1: https://render-chess-xiangqi.onrender.com
- Vercel Media M1: https://vercelfamilybloommedia.vercel.app
- Chỉ cần cập nhật Android bằng **Family_Bloom_A3 FULL CODE**; KHÔNG cần redeploy server nếu hai backend đã hoạt động và API giữ nguyên.

## 2. Kết nối mặc định trong Android A3
- `EXPO_PUBLIC_CHESS_SOCKET_URL=https://render-chess-xiangqi.onrender.com`
- `EXPO_PUBLIC_MOMENT_MEDIA_API_URL=https://vercelfamilybloommedia.vercel.app`
- Cả Chess và Xiangqi cùng đọc `ENV.chessSocketUrl` từ `src/config/env.ts`.
- Đường dẫn Render cũ `https://family-bloom-chess.onrender.com` bị bỏ qua nếu tồn tại trong `.env` cũ hoặc Expo extra cũ, tránh đi nhầm server.
- **Dự phòng** trong `src/config/env.ts` + `app.config.js` đã là Render S1; EAS profile `family-bloom-test` chứa cả hai URL.
- Các biến `EXPO_PUBLIC_*` được nhúng khi build bundle; điện thoại **không đọc** file `.env` sau khi cài APK.

## 3. Cập nhật mã nguồn trên Windows
1. Sao lưu project hiện tại; KHÔNG xóa `.env`, `google-services.json`, keystore hoặc thông tin Firebase.
2. Giải nén FULL CODE Android A3 và chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để cập nhật tự động (không tự build APK).
3. Mở `.env` cũ nếu còn và chỉnh 2 biến trên cho đồng nhất. URL Render cũ vẫn được code A3 bỏ qua, nhưng chỉnh để dễ quản lý.
4. Build APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat`, hoặc EAS script quen dùng. Khi dùng EAS Build, đối chiếu biến môi trường trong EAS Project / profile để đảm bảo không có custom URL ngoài dự kiến.
5. Cài **APK mới** lên điện thoại; APK cũ không tự cập nhật URL. Nếu dùng EAS OTA cần đảm bảo đúng channel/runtime và bản update đã được nhận trước khi đánh giá.

## 4. Kiểm tra server trước và sau build
- Mở `https://render-chess-xiangqi.onrender.com/health` trên trình duyệt: khi server đã thức và hoạt động, kỳ vọng HTTP 200 JSON có `ok:true`.
- Mở `https://vercelfamilybloommedia.vercel.app/api/media/sign` bằng GET: HTTP 405 phù hợp nếu route chỉ nhận POST.
- Mở `https://vercelfamilybloommedia.vercel.app/api/cron/cleanup` không có token: 401 phù hợp nếu Cron được bảo vệ.
- Vào Family Bloom > Cài đặt > Kiểm thử & chẩn đoán > Trạng thái các server > Kiểm tra cả hai server.
- Sao chép báo cáo để gửi khi gặp lỗi. UI kiểm tra chỉ GET và **không** thực hiện upload, xóa media hay tạo ván đấu; màu xanh không có nghĩa mọi chức năng đã qua kiểm thử end-to-end.

## 5. GitHub / deploy
- Android: repo độc lập `Family_Bloom` (tuỳ tên đã tạo); đẩy nội dung ZIP A3 vào thư mục gốc. Đây là source Android, không deploy lên Render/Vercel.
- Render Chess/Xiangqi: repo độc lập dùng ZIP `Render_chess_xiangqi_S1`, Render Root Directory `./`, build/start theo `README.md` server. A3 không thay đổi server.
- Vercel Media: repo độc lập dùng ZIP `Vercel_media_M1`, Vercel Root Directory `./`, biến môi trường Firebase Admin/Cloudinary/CRON đặt trên Vercel. A3 không thay đổi server.
- Không commit `.env` thật, Firebase Service Account hoặc Cloudinary secret lên GitHub.

## 6. Phạm vi kiểm tra
- Đã kiểm tra mã nguồn/URL mặc định, EAS profile, cú pháp và bài test offline tại môi trường tạo ZIP.
- **Chưa** xác nhận kết nối HTTPS thực với Render/Vercel từ môi trường đóng gói, build APK Gradle trên Windows hoặc ván đấu thực với hai tài khoản.
- Không thay code nghiệp vụ Chess/Xiangqi, không đổi Firebase Rules, không sửa Web, không thay đổi backend.
