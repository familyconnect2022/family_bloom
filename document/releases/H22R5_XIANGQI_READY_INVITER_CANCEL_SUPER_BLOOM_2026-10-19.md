# FAMILY BLOOM H22R5 — XIANGQI READY / INVITER CANCEL / SUPER BLOOM

Ngày: 2026-10-19
Nền FULL source: FamilyBloom_H22R4_FULL_WIN.zip (ngày 19/10/2026)
Android: version 1.3.23, versionCode 143033
Native identity: P2.37R2C-H22R5-native-2

## Các thay đổi

1. **A hủy lời mời (người thật)**: Cổng XiangqiChallengeGate có nút “Hủy lời mời” và đếm ngược 60 giây. XiangqiSocketService nay phát sự kiện `outgoingInvite` ngay từ ACK `xiangqi:invite:create` (ngoài server push) và giữ invitation gần nhất cho gate mount muộn; server `xiangqi:invite:cancel` vẫn là thẩm quyền hủy và giải phóng lock. Không cho phép hủy trò chơi đã bắt đầu qua nút hủy lời mời; khi trạng thái kết thúc, giao diện chỉ theo kết quả từ server.
2. **Không đi được quân**: Chẩn đoán ảnh cho thấy trạng thái waiting/colors với đồng hồ chưa chạy, nghĩa là client chưa tới `active`; không phải bằng chứng engine nước đi sai. Xiangqi native/controller gửi lại `boardReady` và `playReady` sau ACK lỗi/thiếu trạng thái; không latch request ID mãi mãi, không gửi nhiều yêu cầu đồng thời khi ACK còn đang chờ, và không khóa yêu cầu do renderSequence/revision thay đổi qua hai frame. Chỉ gửi playReady sau khi native đã nhận board đúng màu, không phải accepted cache. Không có thay đổi quy tắc di chuyển hay quyền xác nhận nước cờ của server.
3. **Quân Cờ tướng lớn ~2x vùng nhìn thấy**: 14 sprite PNG gốc có vùng padding alpha lớn (~35% chiều ngang). Renderer cắt khung src và vẽ bán kính .57cell so với .45cell trước, làm vùng quân nhìn thấy gần gấp đôi, vẫn dùng tọa độ 9×10 / phép hit-test cũ. Quân có thể hơi chạm nhau ở hàng đầy; kiểm tra trên APK thực tế trước khi tinh chỉnh thẩm mỹ.
4. **Super Bloom chuẩn bị**: Overlay chờ mới thuộc độc lập native Xiangqi, hồng pastel, panel giữa, biểu tượng 帥, tiêu đề “CHUẨN BỊ VÁN CỜ”, lời nhắn từng giai đoạn và trạng thái đếm ngược. Overlay tự biến mất khi server chuyển `active` và không che ván đang chơi. Chess không thay đổi cấu trúc/render/owner.
5. **Bản phát hành**: Đồng bộ app.json/package, Kotlin native identity, JavaScript verifier, EAS và BAT Build & Share với 1.3.23 / 143033. Giữ CRLF Windows trên các BAT. Giữ .gitignore root; report trong document/.

## Kiểm tra trong môi trường đóng gói

- `node scripts/tests/release/test-h22-xiangqi-parity.cjs`: 26/26 PASS, gồm test runtime server với virtual bot và hồi quy màu/chuẩn bị/premove.
- `node scripts/tests/release/test-h22r1-bot-invite-countdown.cjs`: 10/10 PASS.
- `node scripts/tests/release/test-h22r3-windows-build-preflight.cjs`: 7/7 PASS.
- 15 nhóm test chạy qua: H22R5/H22R1/H22R2/H22R3, native binary lock, integrity, H6, H11, H17, H20, H21R5, source imports, Android resource names, native package checks, TS syntax; 0 nhóm thất bại.
- `node scripts/setup/check-ts-syntax-transpile.js`: 299/299 TS/TSX files transpile.
- Android AAPT2 source gate: 38 tên tài nguyên được kiểm tra; 11/11 âm thanh và cấu trúc res/raw hợp lệ.
- **Chưa thể xác nhận Gradle thực sự biên dịch APK, chạy trên thiết bị Android hay server Render live** trong môi trường đóng gói này (không có môi trường Gradle/Android SDK đầy đủ hoặc credentials). Cần chạy BAT Build & Share trên Windows.

## Cài đặt

1. Backup thư mục mã nguồn hiện tại; giải nén FULL ZIP ra thư mục riêng.
2. Ở dự án cũ chạy `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` theo quy trình đã thống nhất; copy toàn bộ nội dung FULL ZIP đè vào thư mục dự án; chạy `Family_Bloom_CLEAN_APPLY_FULL.bat` trong dự án mới.
3. Trên Render phải triển khai server hỗ trợ H22 Xiangqi `game:boardReady`/`game:ready` (nếu chưa triển khai). Bản H22R5 không cần thay server đã đúng H22R4.
4. Trên Windows chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` tại root (không cần cắm điện thoại), hoặc `Family_Bloom_EAS_BUILD_TEST.bat`. Theo mặc định APK share nằm ở `C:\FamilyBloomShare\apk`.
5. **Cài APK mới** phiên bản 143033. OTA JS không cập nhật file Kotlin native trong bản này.
6. Test: người A mời B, A thấy countdown/hủy, B nhận lời mời; Bloom Bot 10+0 sẵn sàng hai stage, đồng hồ bắt đầu chỉ sau active, bên Đỏ di chuyển; thử bên Đen, chọn quân/tap đích, Mini/Full, mở lại sau tắt app, thử timeout/khôi phục.
