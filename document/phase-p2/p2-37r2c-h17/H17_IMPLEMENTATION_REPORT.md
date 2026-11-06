# Family Bloom P2.37R2C H17 — Client-First Chess, Server-Authoritative

**Ngày:** 18/10/2026. **Nguồn:** H16 FULL CODE, phát hành H17 FULL CODE (copy-over, không phải patch).  
**App:** `1.3.17`, Android `versionCode=143027`, `com.familybloom.android`.  
**Native:** `P2.37R2C-H17-native-1`, package `family-bloom-overlay@1.3.15`.

## Kết luận mã nguồn H16

`nativeChessGameplayController.ts` đã kiểm tra nước đi bằng `chess.js` nhưng đặt `optimisticFen = null` và chỉ truyền `fen: state.fen` cho Native. Vì vậy quân đợi nước đi authoritative từ Render/Socket mới đổi vị trí. Motion H16 168ms có easing không giải quyết được thời gian chờ mạng trước animation. H16 Native chỉ animate khi tăng đúng một revision/ply, chưa biết trạng thái optimistic client hợp lệ.

## H17 đã thay đổi

- Client chỉ nhận một nước đi tại lượt chính mình khi Firebase UID khớp duy nhất `whiteUid` hoặc `blackUid`, FEN side/ply đúng và `chess.js` xác nhận nước hợp lệ, màu của kết quả move đúng màu đã xác minh.
- Tạo **visual-only `optimisticFen` và `optimisticMove`**, gắn `clientMoveId` và `pendingBaseRevision`. **Không thay** `currentState.fen`, `revision`, `turn`, đồng hồ, kết quả hoặc quyền server.
- Truyền visual FEN và `optimisticMoveId` cho Native trước khi chờ Socket ACK. Native dùng chung sprite rail của H16, kiểm tra màu/ô và vẽ một chuyển động 168ms (178ms nhập thành) ngay trên UI thread. Không repaint 64 ô theo từng frame.
- ACK/delta server trùng FEN dự đoán thì cập nhật revision/turn nhưng **không di chuyển lại quân**. Sound-token của chính nước đi cũng không phát hai lần. Snapshot chính thức đến trước ACK vẫn được chấp nhận; ACK muộn không thể rollback.
- Nếu server từ chối, hủy preview ngay, khôi phục FEN server, khóa/hủy nước dự đoán và resync nếu conflict. Dữ liệu khác phiên/revision, màu quân/FEN không nhất quán tiếp tục bị khóa theo H15.
- Trước khi thi hành premove, client hiển thị bản authoritative mới rồi mới lấy nước đã xếp hàng ra kiểm tra lại. Không vẽ chuỗi premove giả định.
- Native thêm `renderSequence` và guard ở board, rail và module để một cập nhật JS cũ không ghi đè visual frame mới; Full/Mini vẫn tách, khi thu nhỏ không animate board ẩn.
- Server Chess, server Xiangqi, Firestore Rules, Firestore Spark và UI Xiangqi không sửa đổi.

## Khôi phục BAT Build & Share bị thiếu trong H16

- H16 thiếu toàn bộ năm `.bat` dưới `scripts/android/build` dù vẫn có manifest. H17 cung cấp đủ năm: Release, Clean Release, APK Only, Build & Share wrapper và entrypoint nội bộ.
- `Family_Bloom_BUILD_APK_TO_SHARE.bat` tại root dẫn đến script Release Build + Share, mặc định `C:\FamilyBloomShare\apk`, override `FAMILY_BLOOM_SHARE_DIR` hoặc tham số dòng lệnh.
- Script chạy kiểm tra phụ thuộc, H17 controller gate, Expo clean prebuild, Gradle `:app:assembleRelease`, kiểm tra 11 native MP3 và APK package/version/native DEX trước khi copy. Có SHA256, metadata và bản sao theo thời gian.
- Giữ 5 root BAT theo yêu cầu, tài liệu trong `document/`, `.gitignore` giữ nguyên.

## Kiểm thử trong môi trường này

- H17 client-first gameplay mocked executable: **23/23 PASS** (Trắng/Đen, optimistic paint trước ACK, server ACK, snapshot confirmation, từ chối/rollback, ACK muộn, âm thanh không trùng, UID/màu/revision).
- Kotlin pure ChessPieceMotionPlanner: **14/14 PASS** (kể cả promotion/castling/Đen), không phải Android instrumentation.
- Regression: H10 17/17, H11 28/28, H12 23/23, H13 20/20, H14 20/20, H15 27/27, H16 16/16: **PASS**.
- Build contracts: P2.12.4 27/27, P2.12.5 26/26, P2.12.6 20/20, P2.12.7 14/14, P2.12.8 18/18, P2.15.5.1 21/21; full-copy integrity 31/31; binary identity 14/14: **PASS**.
- Script manifest: **32/32 Windows BAT present**, CRLF valid, no unmanaged BAT; source imports **1719/1719**, TS/TSX syntax **292/292**.

## Chưa được xác thực (không được gọi là đã fix triệt để trên máy thật)

- Chưa build Gradle/APK do không có Android SDK/node_modules cài sẵn trong môi trường nguồn.
- Chưa đo frame pacing, FPS hoặc touch-to-motion latency trên Android thật (trước/sau H14 và H16).
- Chưa chạy end-to-end với Render đang triển khai, 2 máy, reconnect mạng thực, và native JNI/view instrumentation.
- Source tests là unit/static gates, không phải bảo đảm APK thực tế đã mượt.

**Triển khai:** sao lưu; chạy PRE_COPY BAT; copy đè FULL; CLEAN_APPLY_FULL; build APK H17 mới (Kotlin đổi nên OTA không đủ). Giữ server Render đang dùng với H15/H16 nếu đồng bộ; không cần redeploy server riêng vì H17 không sửa server.
