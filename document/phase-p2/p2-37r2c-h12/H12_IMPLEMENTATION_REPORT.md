# Family Bloom — P2.37R2C H12 — Chess Safe Turns & Bloom Super Hero

## Nguồn kế thừa
- Bắt đầu từ FULL H11 sau H10R2, KHÔNG tạo app mới và KHÔNG thay Firebase/Spark/Render infrastructure.
- Clip kiểm tra: `6451.mp4` (khởi tạo bàn cờ), `6452.mp4` (trình diễn ván đấu), `6453.mp4` (nghi vấn Bot đi sai lượt / lệch bàn cờ).
- Android `applicationId`: `com.familybloom.android` (giữ nguyên); Android `versionCode=143022`, app `version=1.3.12`, native identity `P2.37R2C-H12-native-1`.
- **Quan trọng:** có thay đổi `server/`, nên **PHẢI triển khai server H12 lên Render** ngoài build APK H12. H12 có thay đổi Kotlin native nên **OTA một mình không đủ**.

## Các nguyên nhân đã tìm thấy
1. `nativeChessGameplayController.ts` dùng `planner()` để chiếu các premove giả định vào FEN hiển thị. Khi opponent đi nước khác giả định, quân trên client có thể trông như tự di chuyển. Không đồng nghĩa server cho Bot đi sai lượt. Server `ChessGameManager.move()` kiểm tra uid/màu/lượt/revision; thêm kiểm tra Bot timer và log để xác nhận thực tế.
2. Full native board có khả năng nhận một kích thước khởi tạo rất nhỏ trong rail chờ. Thêm điều kiện kích thước render/tài nguyên trước khi báo `assetsReady` và modal che giai đoạn chuẩn bị.
3. `finished` bị bridge đóng ngay nên result modal không thể xuất hiện. Giữ Full/khôi phục từ Mini tới khi ACK result, sau đó mới dọn.
4. P2.32 source verifier nhận nhầm tên hàm mới `presentPendingChessBoard()` như legacy production board, dẫn tới `apply_full` FAIL. Đổi kiểm tra sang import legacy đúng nghĩa, không tắt verifier.

## Thay đổi tính năng
- **Premove:** Giới hạn một nước queued; highlight from/to trên thế cờ chuẩn, không vẽ các nước tương lai vào FEN. Vẫn có lựa chọn quân phong trước cho premove của tốt. Premove thực thi phát âm thanh move/capture/check/promotion/castling tương ứng. ACK rejected/stale delta kích hoạt hoàn tác/resync.
- **Bot:** ngẫu nhiên server-authoritative Trắng/Đen ở cả hướng mời đến và mời đi. Bot timer kiểm tra phiên bản và màu/lượt ở thời điểm thực hiện nước. Thêm log `[chess:test-bot] authoritative action` với `gameId`, `revision`, `botColor`, `from`, `to` để so log client `CHESS_AUTHORITATIVE_MOVE`.
- **READY/chuẩn bị:** native board che bằng modal Bloom nhỏ cho tới khi có FEN/64 ô, kích thước phù hợp và đủ 11 sample âm thanh `SoundPool`; chỉ sau tín hiệu `assetsReady` mới gửi READY server. Đồng hồ luôn authoritative.
- **Bloom UI:** bỏ viền vàng bàn cờ, tăng tính nhận diện phần phong cấp bằng PNG quân, thêm xác nhận cầu hòa/xin thua, nhận đề nghị hòa, kết quả thắng/hòa/thua với copy ấm. Chiến thắng có hiệu ứng burst các biểu tượng pháo hoa/hoa, không tải nặng trong Mini.
- **Kết quả:** kết thúc từ Mini sẽ đưa Full trở lại, giữ hiện modal cho tới nút về sảnh và `chess:game:resultAck`; không gỡ game presentation trước khi người chơi xem kết quả.
- **Mời Bot:** modal đẹp cho lời mời đến từ Bloom Bot, nút Đồng ý/Từ chối và tín hiệu `chess:invite:reject` đúng server; kết quả từ chối/hết hạn hiển thị thông điệp ấm cho người đang ở màn Bot Test.
- **Kiến trúc:** Chess và Xiangqi không gộp renderer/state/lifecycle. Decor rail native cấp root chung từ H10R2 chưa được tách toàn bộ; tránh đụng cấu trúc feature khác.

## Kết quả kiểm tra thực sự đã chạy (trong môi trường đóng gói)
- `phaseP2_32`, `phaseP2_34`, `phaseP2_35`: PASS.
- `phaseP2_37R2C`, H6, H7, H8, H9A, H9B, H10, H10R2, H11: PASS.
- H12 new safety/result source contract: 23/23 PASS.
- Source TypeScript TS/TSX transpile: 292/292 PASS; source import integrity: 292 file, 1720 import PASS.
- Đây là **kiểm tra tĩnh / hợp đồng source**, không phải xác nhận gameplay thiết bị.

## Hạn chế và việc phải kiểm chứng
- Môi trường chạy test thiếu `node_modules`, Android SDK/Gradle project generated, nên **chưa chạy `tsc --noEmit` đầy đủ, Kotlin compile, Android Gradle APK** trong môi trường đóng gói. **KHÔNG khẳng định APK H12 đã build thành công.**
- `6453.mp4` tự nó không chứng minh Bot đã thực thi nước trái lượt trên server. Sau deploy Render H12, so sánh log Bot server + revision của client/PGN; nếu lệch, gửi cả log.
- Giao diện modal mời Bloom Bot tùy biến đang ở **màn Bloom Bot Test**. Chưa xác nhận hiển thị modal này trên tất cả tab khi Bot chủ động mời trong background.
- Chưa đo FPS/CPU/âm thanh premove, hiệu ứng result và geometry của board bằng thiết bị Android thật. Hãy sử dụng checklist APK.
- Việc giới hạn **một premove** là thay đổi hành vi có chủ ý để đảm bảo an toàn trạng thái; chưa phải tính năng xếp nhiều premove như trước.
- Lỗi H5 verifier cổ (giả định Slot/host cũ) không nằm trong chuỗi apply_full hiện tại. Không sửa kiến trúc quay lại H5 chỉ để làm bài test lỗi thời chạy xanh.

## Bản phân phối
- FULL CODE ZIP copy-over (không phải patch), có `.gitignore`, các root BAT, `scripts/android` được phân nhóm và tài liệu dưới `document/phase-p2/...`.
- **Sau khi giải nén/copy-over:** chạy BAT cleanup/apply FULL; chạy build APK/EAS helper; cập nhật server Render từ cùng source H12. Kiểm tra app cũ cùng khóa ký để cài đè; không tự gỡ app.
