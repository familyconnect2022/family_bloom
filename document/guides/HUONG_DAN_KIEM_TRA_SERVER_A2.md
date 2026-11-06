# Family Bloom A2 — Kiểm tra trạng thái các server (28/10/2026)

## Mục đích và bảo mật
- Chỉ tài khoản Firebase Auth `huynh235@gmail.com` với `emailVerified=true` nhìn thấy **Cài đặt > Kiểm thử & chẩn đoán > Kiểm tra Render Chess/Xiangqi và Vercel Media** trên cả APK Debug/Release.
- Chỉ chạy kiểm tra khi bấm nút; không polling, không tự mở Socket.IO, không đánh thức Render mỗi lần mở ứng dụng.
- Không dùng Firebase Admin, CRON_SECRET hoặc các khóa Cloudinary trên Android.
- Không sửa Firestore Rules hay server Render/Vercel; giữ riêng 3 ZIP/repository.

## Địa chỉ đã cấu hình
- Vercel Media: `https://vercelfamilybloommedia.vercel.app` (địa chỉ người dùng đã cung cấp).
- Render Chess/Xiangqi: bản A3 dùng `https://render-chess-xiangqi.onrender.com` làm URL chính / dự phòng; Chess và Xiangqi cùng dùng địa chỉ này.
- Để APK dùng Render S1 trong mọi ván cờ, đã cấu hình `EXPO_PUBLIC_CHESS_SOCKET_URL=https://render-chess-xiangqi.onrender.com` trong EAS profile `family-bloom-test`, `.env.example`, Expo extra và dự phòng runtime. Cần tạo APK/JS bundle mới. URL cũ được bỏ qua khi xuất hiện trong `.env` / EAS cũ. Ô thử URL trong màn chẩn đoán **không** thay địa chỉ chơi cờ.
- Media URL có thể được override bằng `EXPO_PUBLIC_MOMENT_MEDIA_API_URL`; khi không có `.env`, app dùng dự phòng đã nhúng URL mới. `eas.json` profile `family-bloom-test` cũng đã dùng URL Vercel Media mới.
- `EXPO_PUBLIC_*` là giá trị được nhúng lúc build, không phải đọc `.env` trên điện thoại khi mở app.

## Cách sử dụng
1. Cập nhật Android bằng `Family_Bloom_AUTO_UPDATE_FULL.bat`, hoặc dùng FULL CODE A2 trong thư mục riêng.
2. Build APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` hoặc EAS profile `family-bloom-test` như trước. Kiểm tra `eas.json` / profile môi trường trước khi gửi APK test.
3. Đăng nhập Firebase đúng tài khoản developer đã xác minh.
4. Vào **Cài đặt > Kiểm thử & chẩn đoán > Kiểm tra Render Chess/Xiangqi và Vercel Media**.
5. URL Render chính thức đã có sẵn trong ô Render; không cần dán lại. Nhấn **Kiểm tra cả hai server**.
6. Dùng **Sao chép báo cáo** để gửi lỗi mà không lộ khóa bí mật.

## Cách hiểu trạng thái
- Render `GET /health`: 200 + JSON `ok:true` -> HTTP health đạt; chưa kiểm tra Socket.IO/login/đấu cờ.
- Vercel `GET /api/media/sign`: 405; `GET /api/cron/cleanup` không có secret: 401 -> đúng định tuyến và bảo vệ Cron; chưa xác nhận Firebase/Cloudinary POST.
- 404 -> sai Root Directory hoặc route chưa deploy. 5xx -> xem runtime logs. Timeout Render có thể do cold start gói Free.
- Nếu `GET /api/cron/cleanup` **200** khi không có secret, kiểm tra ngay `CRON_SECRET`; không được coi là thành công.
- Vercel `/api/dev/data-fault` không được gọi trong màn này để tránh tạo dữ liệu; dùng công cụ Firestore riêng nếu cần và chỉ cho gia đình test.

## Cách triển khai GitHub
- Chỉ đưa thư mục Android trong ZIP này lên repository Family Bloom Android đã tách; **không** thêm thư mục `server` hay `vercel-media`.
- Render `Render_chess_xiangqi_S1` và Vercel `Vercel_media_M1` vẫn dùng repo và deployment của chúng; A2 không yêu cầu redeploy server.

## Giới hạn kiểm thử phát hành
Đã kiểm tra mã nguồn, tuyến UI và chẩn đoán giả lập; chưa xác nhận build APK Gradle Windows hoặc kết nối bằng điện thoại thực. URL Render mới đã được người dùng cung cấp và nhúng trong A3. Chưa thể kiểm chứng API trực tuyến hoặc build APK Windows từ phiên làm việc này.
