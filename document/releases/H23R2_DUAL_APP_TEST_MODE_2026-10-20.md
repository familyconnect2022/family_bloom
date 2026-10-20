# Family Bloom H23R2 — Chế độ thử ứng dụng kép (một điện thoại)

## Mục tiêu
Cho phép tài khoản developer được xác minh qua Firebase Auth duy trì trạng thái **thử nghiệm tạm thời** khi đổi từ Family Bloom chính sang ứng dụng kép trên một Android. Không thay đổi quy tắc online của người dùng thông thường, không giả lập online thông qua Person/Phả hệ.

## Hướng dẫn thử với một điện thoại
1. Triển khai backend `server/` H23R2 lên Render **trước** khi bật tính năng.
2. Cập nhật bản FULL bằng `Family_Bloom_AUTO_UPDATE_FULL.bat`. Phần thay đổi chỉ là TypeScript/JS và backend; nếu Debug APK H23 tương thích đã cài, có thể reload Metro, không cần build lại native. Nếu muốn Release mới hãy chạy Build & Share.
3. Mở Family Bloom **chính** bằng tài khoản Firebase verified developer `huynh235@gmail.com`. Vào Avatar → Cài đặt → Kiểm thử & chẩn đoán → **Bật thử nghiệm online khi chạy ứng dụng kép**. Chỉ báo bật khi server ACK thành công.
4. Chuyển sang bản ứng dụng kép đăng nhập **tài khoản gia đình khác**, cùng `activeFamilyId`. Vào sảnh Chess hoặc Xiangqi, xem tài khoản developer xuất hiện với dòng **“Thử nghiệm ứng dụng kép · sẵn sàng tạm thời”** và nút mời đấu.
5. Mời tài khoản developer. Chuyển lại app chính trong **60 giây** để nhận lời mời còn hiệu lực và chấp nhận. Khi bắt đầu ván, server readiness + đồng hồ/away timer hoạt động như phiên thật.
6. Để thử lại, có thể quay lại developer foreground và chuyển app thêm lần nữa. Thời hạn server tự hết sau **180 giây** nếu không trở lại, không gia hạn mỗi giây.

## An toàn và quyền
- Sự kiện Socket `dev:dualapp:lease`: server kiểm tra `developerAuthorized` dựa trên Firebase ID Token đã xác minh, membership Firestore và socket đã `appJoin` vào đúng gia đình. Không dùng quyền admin gia đình.
- Lease chỉ sống trong RAM Render và hết hạn bằng timer một lần, không có heartbeat Firestore; mỗi UID, family được định danh riêng; không thể gửi expiresAt tuỳ ý.
- Khi app rời foreground, client phát lease trước appLeave trên Chess socket; bật trong developer tools còn cấp trước lease để đề phòng Android suspend JS.
- Hai backend Chess/Xiangqi sử dụng nguồn lease presence nhỏ chung **chỉ để hiển thị sẵn sàng nhận mời**, không chung state engine/board/surface/lifecycle của game.
- `status: test_background` khác `online_app`; mỗi lời mời của người thật chỉ tồn tại 60 giây. Trên resume, server phát lại lời mời còn hạn trên Socket; không phát lại lời mời đã hết hạn.
- Server không cấp lease nếu developer đang có ván cờ; chế độ này **không can thiệp clock, deadline, thời gian vắng mặt, xét thua, kết quả hoặc reconnect của trận**.
- Chỉ tài khoản developer được cấp quyền duy trì background-test online; tài khoản phụ không tự động được cấp ngoại lệ. Để kiểm tra chiều A→B khi B offline cần hai foreground thiết bị hoặc phương án test riêng (không mở đại trà quyền lease).

## Kiểm thử thực hiện trong môi trường đóng gói
- H23R2 dual-app lease và bảo vệ quyền: **18/18 PASS** (có kiểm thử module thật về hạn 180s và thu hồi).
- H23 family hub: PASS; Expo Router unique gate 19/19; structure 19/19; Auto Update 21/21; Windows Build & Share 7/7; full code integrity 31/31; binary proof 14/14.
- Toàn bộ 321 tệp TS/TSX client/server đã kiểm tra cú pháp với TypeScript transpiler: 0 lỗi cú pháp.
- Chưa chạy `server npm run build`, Android Gradle hay Render thực tế vì môi trường này thiếu dependencies/Android SDK và credentials. Các PASS không thay cho thử thiết bị thật.

## Định danh
- Không thay đổi native APK: H23 `1.3.28`, Android `versionCode=143038`, `P2.37R2C-H23-native-1`.
- Không yêu cầu cập nhật Kotlin, PNG hoặc Firebase Blaze.
