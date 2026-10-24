# Family Bloom H25R2R6R3 — Sửa hướng bàn cờ Chess Native

**Nền mã:** H25R2R6R2 (giữ nguyên hai giai đoạn BOARD READY → COLORS → PLAY READY).  
**Ngày:** 2026-10-22.  
**APK mới:** 1.3.31, Android `versionCode=143041`, Native identity `P2.37R2C-H25-native-2`.

## Quan sát từ video 8678.mp4

Hai ứng dụng Family Bloom chạy song song với hai tài khoản Firebase. Cả hai đang hiển thị quân đen ở hàng dưới. Trong một ván 1v1, chỉ một tài khoản nhận quân đen; vì vậy ít nhất một bàn có hướng thực tế không khớp màu được gán cho tài khoản.

## Nguyên nhân xác định từ code (không cần sửa màu/server)

* Server giữ `whiteUid` và `blackUid` khác nhau, công bố khi hai bàn đã board-ready. Client `verifiedSide()` dùng Firebase UID thật để tính `meColor`.
* `ChessNativeBoardView.parkForMini()` thay `state = next` nhưng có chủ ý KHÔNG đổi vị trí 64 `FrameLayout` ô cờ trong chế độ Mini/IDLE.
* `ChessNativeBoardView.bind()` cũ chỉ so `previous?.orientation != next.orientation`. Sau `parkForMini`, hai giá trị JSON có thể bằng nhau trong khi bố cục vật lý vẫn thuộc hướng cũ. Tái mở Full bỏ qua `layoutSquares()`.
* `ensureRecoveredGeometry()` cũ chỉ so kích thước và số ô được paint, không so hướng 64 ô đang nằm thực tế.

Đây là đường lỗi quyết định trong mã nguồn phù hợp với video, nhưng để biết nó có phải là *đường thực thi chính xác trên máy người dùng* hay không vẫn cần chạy APK Native mới và kiểm tra 2 tài khoản thực tế. Không khẳng định đã test trên thiết bị.

## Cách sửa

1. Thêm `ChessBoardOrientationPolicy.kt` định nghĩa identity của **bố cục đã đặt thực tế**: gameId, màu nhìn từ dưới, kích thước; ánh xạ 64 ô `a8→h1` cho Trắng và `h1→a8` cho Đen.
2. `ChessNativeBoardView.kt` giữ `laidOutSquares` độc lập với `state`. Lệnh Mini không được đánh dấu 64 ô đã bố trí. Mỗi `bind()` Full so với **identity thực tế** rồi gọi `layoutSquares()` nếu đổi ván/màu/kích thước. Cập nhật identity chỉ sau khi đã đặt cả 64 ô.
3. `ensureRecoveredGeometry()` cũng kiểm tra identity, không chỉ kiểm tra kích thước.
4. `chessFacingForPlayer()` ưu tiên `meColor` do UID xác nhận thay vì hint orientation cũ. `nativeChessGameplayController.ts` cấp `orientation` từ chính `mine` dùng cho nhãn và đồng hồ.
5. Không thay đổi luật Chess, Firebase, server clock, status của ván, hoặc Xiangqi. Màu mặt bàn không thay theo `turn`.

## Kiểm thử tại nguồn

* `node scripts/tests/release/test-h25r2r6r3-chess-native-orientation.cjs`: 8/8 PASS (gồm điều kiện tái hiện Mini→Full).
* `kotlinc .../ChessBoardOrientationPolicy.kt scripts/tests/kotlin/ChessBoardOrientationPolicyTest.kt -include-runtime -d <test.jar>` + `java -jar <test.jar>`: 15/15 PASS (Kotlin JVM policy thật, không có Android SDK).
* `node scripts/tests/release/test-h25r2r2-release-preflight.cjs`: 9/9 PASS.
* `node scripts/tests/release/test-h25-firebase-invitation.cjs`, `node scripts/tests/history/test-phase-p2_37r2c_h14-chess-color-mini-edge.js`, `node scripts/tests/history/test-phase-p2_37r2c-binary-identity-lock.js`: PASS.
* Legacy test `test-phase-p2_37r2c_h5-root-slot-offscreen-idle.js` có 6 assertions đã lỗi ngay từ bản nền R2 (test nhắm kiến trúc Slot/offscreen React khác). Không do bản vá Chess; đây không phải chứng nhận host UX đã đạt.
* Không biên dịch được APK Android/Gradle và không có thử nghiệm trực tiếp hai tài khoản trên thiết bị trong môi trường đóng gói này. **Phải build APK thực tế** để kiểm thử UI cuối cùng.

## Cập nhật an toàn

Giải nén FULL ZIP ra thư mục nguồn mới, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` (chọn thư mục project cũ nếu đã đổi đường dẫn), sau đó chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` để biên dịch APK Release. Bản vá Kotlin yêu cầu APK Native mới; OTA đơn thuần không thay mã Native. Nếu muốn dùng EAS Cloud, dùng `Family_Bloom_EAS_BUILD_TEST.bat`.

Updater giữ sao lưu trước copy, không xoá `.env`, Firebase config hay dữ liệu SQLite trên điện thoại. Luôn đọc báo cáo BAT rồi mới phân phối APK. Nếu thử ở hai tài khoản: kiểm tra A Trắng dưới/B Đen dưới, đổi lượt không lật, thu nhỏ-phục hồi không lật, kết thúc và mở ván mới đổi màu, sau đó thử kết nối lại.
