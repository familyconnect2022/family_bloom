# Family Bloom R3R14R3R8 A2 — Server Status

## Thay đổi
- Chỉ Android: màn `src/app/(internal)/server-status.tsx`, mở từ Cài đặt > Kiểm thử & chẩn đoán. Gate developer account verified giữ cả release APK.
- `src/services/network/serverStatusService.ts`: GET Render `/health` (tối đa 65 giây do Render Free có thể cold start), Vercel `/api/media/sign` và `/api/cron/cleanup` (GET không có CRON_SECRET).
- Phân biệt HTTP health/routing với khả năng chơi game/POST upload thực tế; các phản hồi không phù hợp không báo đạt sai.
- URL hiện hành trong APK, nguồn cấu hình, URL nhập để thử nghiệm, kết quả HTTP/thời gian, copy báo cáo không có token.
- Tất cả request chỉ chạy khi người dùng chủ động bấm; không mở Socket.IO, không tạo dữ liệu, không xóa media.
- Cấu hình Vercel Media đồng bộ về `https://vercelfamilybloommedia.vercel.app`: fallback code, EAS profile `family-bloom-test`, `.env.example`, MomentMediaApi và màn Firestore diagnostics.
- URL Render cũ không bị thay vì chưa có URL Render production mới từ người dùng. Ô kiểm tra Render chỉ dùng thử HTTP, không thay game Socket URL.
- Không thay đổi Web, Render server, Vercel server, Security Rules hoặc chức năng Cờ vua/Cờ tướng.

## Build identity
- Giữ app `1.3.33`, `versionCode 143043`, package `com.familybloom.android`, binary/native proof của A1 vì A2 chỉ thay JS/UI/config công khai, chưa thay native. Các gate lịch sử và BAT của A1 vẫn yêu cầu identity 1.3.33/143043. Tên mã nguồn phát hành A2 phân biệt ZIP.
- Khi tạo APK, bảo đảm build từ đúng ZIP A2, không dùng APK cũ có cùng versionCode. Cập nhật versionCode chính thức cần làm thành đợt đồng bộ binary-proof/BAT riêng để không phá build.

## Kiểm tra đã chạy trong môi trường hiện tại
- 336 tệp TS/TSX parse/transpile không lỗi cú pháp.
- 19/19 structure gate đạt.
- Kiểm tra Expo Router không có route trùng.
- 8/8 kiểm thử giả lập tình huống HTTP và contract: Render 200 ok/200 bad/404, URL HTTP sai, Vercel 405+401, Cron 200 bất thường, Sign 404, developer gate/source config.
- Các gate liên-repository Render/Vercel được đánh dấu SKIP-CROSS-REPO theo kiến trúc A1, không được tính là đã test server.
- Chưa build được APK Gradle/Windows tại đây; chưa thử trực tiếp trên điện thoại hay với production credential.
