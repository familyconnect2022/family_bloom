# FAMILY BLOOM H22 — ĐỒNG BỘ CỜ TƯỚNG THEO CHESS H21R6

Ngày: 19/10/2026  |  Nền: H21R6 FULL CODE  |  Bản nguồn mới: H22

## Mục tiêu và ranh giới kiến trúc

Đồng nhất trải nghiệm Cờ tướng với Chess đã ổn định nhưng **giữ riêng hoàn toàn** Xiangqi manager, rules, Socket, state, renderer, mini/full, presentation lifecycle, bot, dữ liệu bền vững. Không gộp hai board vào một host hay dùng Chess để xử lý nước cờ tướng. Khóa chéo trò chơi chỉ được kiểm tra ở lớp điều phối phiên đã có.

## Các phần triển khai

1. **Lời mời 60 giây**: server quản lý `expiresAt` bất biến; người mời có thể hủy, người nhận chấp nhận hoặc từ chối; UI Super Bloom hiển thị qua App shell dù đang ở tab nào; từ chối/hết hạn chấm dứt pending reservation.
2. **Khởi động hai bước**: mỗi client render bàn cờ native, hoàn tất PNG/âm thanh rồi gửi `xiangqi:game:boardReady`; khi đủ hai người server chốt màu Đỏ/Đen, bàn tự xoay; sau đó client gửi `xiangqi:game:ready`; chỉ khi cả hai xác nhận đồng hồ mới bắt đầu, Đỏ đi trước.
3. **Bàn cờ Android native**: vẽ đúng 9×10, sông, cung, 14 tài nguyên quân PNG; tap-to-move, gợi ý nước hợp lệ theo engine Cờ tướng, làm nổi ô ăn, chiều bàn theo màu, đồng hồ và trạng thái đang chờ; premove một nước có kiểm tra lại theo state server; SoundPool riêng Cờ tướng với âm thanh preload.
4. **Full/Mini độc lập**: bấm thử Bloom Bot chuyển ngay sang Full trong lúc đợi server; trạng thái chờ và bản có kết quả được đồng bộ về root persistent board; thu nhỏ không kết thúc ván.
5. **Đồng hồ authoritative**: quản lý trên Render; 3+2, 5+0, 10+0, 10+5, không đồng hồ. Với 10 phút còn trên 2 phút, 5 phút còn trên 1 phút thì lần vắng mặt tính theo 50% quỹ thời gian còn lại; khi xuống ngưỡng, áp dụng toàn bộ thời gian còn lại. Không cộng lại quỹ đã dùng; không gia hạn deadline bằng background/foreground liên tục.
6. **Vắng mặt và khôi phục**: ghi dữ liệu quỹ, timestamp rời app và deadline tuyệt đối xuống Firestore; khôi phục sau restart Render xử lý hạn vắng mặt/hạn chuẩn bị trước khi trả kết quả; người thua không được tiếp tục ván cũ; giải phóng khóa game sau khi kết thúc.
7. **Kết quả**: status thắng/thua/hòa, đầu hàng có xác nhận, acknowledgment kết quả và reset presentation theo game riêng.
8. **Quyền test**: giữ khóa thử bot trên server cho tài khoản developer có quyền; không mở test ra cho toàn bộ quản trị viên.
9. **Đóng gói**: tăng Expo version 1.3.22, Android `versionCode=143032`, native identity `P2.37R2C-H22-native-1` để phân biệt APK chứa module native mới. `Family_Bloom_BUILD_APK_TO_SHARE.bat`, `Family_Bloom_EAS_BUILD_TEST.bat` vẫn ở root, thực thi theo nhóm dưới `scripts/android/`.

## Kiểm tra thực tế trong môi trường tạo nguồn

- `node scripts/tests/release/test-h22-xiangqi-parity.cjs`: **21/21 PASS** — kiểm thử runtime server bằng TypeScript transpile/mocks và các kiểm tra contract client/native/tài nguyên/build.
- Bộ kiểm thử cũ của Chess H15–H21R5, binary identity, Build & Share contract và tài nguyên Android: chạy kiểm tra hồi quy trong môi trường này; kết quả được rà trước khi đóng gói.
- Không thực hiện build Gradle APK hoặc deploy Render live trong môi trường đóng gói do không có Android SDK/toolchain và server credentials. Việc kiểm thử tự động **không có nghĩa đã xác nhận APK cài trên điện thoại chạy hoàn hảo**.

## Trình tự cài đặt / triển khai

1. Sao lưu thư mục Family Bloom hiện tại. Giải nén FULL CODE H22 và dùng quy trình copy-over đã có: chạy `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` đúng theo hướng dẫn dự án, copy đè toàn bộ code rồi `Family_Bloom_CLEAN_APPLY_FULL.bat`. Không copy thêm Android build output cũ.
2. **Cập nhật backend Render từ `server/` trước khi thử Cờ tướng H22**. Tại môi trường server chạy `npm install --include=dev` và `npm run build`, deploy đúng `server/dist`/start command hiện tại. `Build & Share` có bước kiểm tra TypeScript server độc lập.
3. Trên Windows chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` (đầu ra dự kiến `C:\FamilyBloomShare\apk`) hoặc `Family_Bloom_EAS_BUILD_TEST.bat`. Máy không cần cắm điện thoại để tạo APK; phụ thuộc môi trường Android/EAS được cài đầy đủ.
4. **Cài APK H22 mới lên thiết bị** trước khi kiểm tra. Các thay đổi Kotlin/native resources không thể cập nhật qua OTA thuần JavaScript.
5. Sau khi server và APK cùng phiên bản, kiểm tra thử: mời người thật/chưa sẵn sàng; bot; màu đỏ/đen; thao tác đi quân; thu nhỏ/khôi phục; liên tục đóng/mở app; timeout cả ngưỡng cao/thấp; mất kết nối/hồi phục; kết quả và thoát ván; chuyển sang Chess và ngược lại.

## Lưu ý triển khai

Backend và APK là hai phần phải tương thích về protocol. Không triển khai chỉ server mới hoặc chỉ APK mới rồi đánh giá lỗi Cờ tướng. Không cấp phép mở Developers/Test tools cho tài khoản admin chung. Các tệp `.md`/`.txt` của báo cáo đặt trong `document/`.
