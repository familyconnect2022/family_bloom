# Family Bloom P2.37R2C-H19 — Chess Recovery Prompt & Offline Intent Reconciliation

Ngày: 2026-10-19. Bản nền: H18 FULL, Android app `1.3.19` / versionCode `143029`, native identity `P2.37R2C-H19-native-1`.

## Bằng chứng và chẩn đoán
- Clip `6470.mp4`: sau recover, hình học/render bàn cờ không ổn định và về bình thường sau thao tác xác nhận đầu hàng. Video chưa đủ để chứng minh cuộc gọi Native nào gây lỗi; cần kiểm tra APK.
- Mã H18: chỉ kiểm tra `sessionRecover` tại trang test, không chủ động hỏi từ app shell.
- H18 cấm chọn ô khi offline; ACK mất có thể để `movePending` kẹt; `gameResync` sau reconnect không nhất thiết rejoin Socket.IO room.

## Thay đổi H19
1. `ChessSessionRecoveryGate.tsx` chạy trong authenticated FamilySession khi Home first paint xong; probe `sessionRecover`, hiện lời hỏi **Tiếp tục ván / Để sau** trước khi `gameJoin`. "Để sau" không đầu hàng, không xóa ván.
2. `nativeChessGameplayController.ts` nhận tối đa **một nước chess.js hợp lệ** trong khi mất mạng với FEN/UID/turn chính xác; đây là optimistic UI, không được thay đổi revision/FEN server. Lưu baseFen, baseRevision, clientMoveId và predictedFen trong RAM.
3. Khi rejoin, nếu server đã xác nhận hoặc Bot đã trả lời với lastMoveBeforeFen là predictedFen thì không gửi trùng. Nếu FEN/revision chưa đổi thì kiểm tra lại bằng chess.js, gửi lại cùng clientMoveId. Nếu không hợp lệ thì hủy và báo chọn lại.
4. Sau reconnect dùng `gameJoin` để tham gia lại room và lấy state trước khi gửi intent đang đợi. `gameResync` vẫn dùng cho đồng bộ khi đang trong room.
5. Native `ChessNativeBoardView.kt` nhận tap khi syncing chỉ nếu JS đã bật canMove; `ensureRecoveredGeometry` sửa layout/paint cache của Full sau khi decor đo xong, giữ 64 ô persistent.
6. Thông báo trạng thái offline bị hủy được hiển thị dưới tên đối thủ ở phase active, không dùng popup toàn màn hình.
7. Cập nhật đúng app/native binary identity, script Build & Share/Clean Apply cùng H19 gate.

## Kiểm thử mã đã thực hiện
- H19 mock executable: **15/15 PASS** (offline Trắng/Đen, một nước chờ, join room, replay đúng FEN, lost ACK, Bot reply, chặn gửi trùng, server state đổi, user prompt).
- H18 25/25, H17 23/23, H16 16/16, H15 27/27, H14 20/20, H13 20/20, H12 23/23, H11 28/28, H10 17/17 PASS.
- Binary proof gate 14/14, Kotlin motion planner `kotlinc` JVM 14/14, TS/TSX syntax 293/293, source literal imports 1727 PASS.
- Remote APK Share 26/26, Expo asset peer 14/14, Kotlin `when` static source gate PASS.
- Điều kiện H18 cũ cấm mọi offline tap / yêu cầu `gameResync` khi reconnect đã được cập nhật theo hợp đồng H19: một offline intent + `gameJoin`.

## Chưa xác nhận và giới hạn
- Chưa build Gradle/APK bằng Android SDK, chưa đo FPS hoặc kiểm tra layout trên điện thoại thật.
- Chưa test trực tiếp Render/Socket.IO production trên mạng đổi Wi-Fi/di động.
- Offline intent hiện lưu **RAM**: kill app lần nữa trước khi gửi thì không phát lại intent.
- Nếu FEN/revision server khác và chưa xác minh được nước chờ, client cố ý hủy thay vì gửi bừa.
- H5 legacy Slot/Stack có giả định kiến trúc cũ, không phải bằng chứng APK H19 đạt.

## Triển khai
- FULL CODE copy-over, chạy BAT cleanup và Build & Share đi kèm.
- **Phải build APK mới** vì Kotlin thay đổi, OTA một mình không đủ.
- Server không thay đổi so với H18; Render cần đang chạy H18 hỗ trợ lastMoveBeforeFen.
- Firebase, Firestore, Spark, Xiangqi và Phả hệ không đổi.
