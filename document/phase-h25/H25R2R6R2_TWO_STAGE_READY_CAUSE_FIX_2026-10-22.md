# H25R2R6R2 — Hai giai đoạn READY cho Chess và Xiangqi

## Phát hiện
So với H23R3 (gần mốc Chess H21R6 đã chạy tốt), H25 tạo trận người-người với `preparationPhase="colors"` và prepopulate cả hai UID vào `boardReadyUids`, bỏ qua xác nhận tải bàn cờ thật. H25 unit test còn yêu cầu trạng thái này, che khuất hồi quy. Native H25 lại chặn READY cuối nếu chưa nhận sự kiện `assetsReady` trong JS. Tổ hợp làm người chơi mắc "Đã chốt màu quân · Đợi Người thân sẵn sàng" nếu một thiết bị nhân bản chạy nền hoặc sự kiện đến muộn/mất.

## Sửa
- Chess server và Xiangqi server giữ nguyên hai manager riêng, cả hai khởi tạo trạng thái `board` và chỉ đánh dấu Bot đã sẵn sàng trước. Người thật KHÔNG được mặc định sẵn sàng.
- Server chuyển `board -> colors` khi có đủ hai `boardReady`; chuyển `colors -> active` khi đủ hai `game:ready`, không khởi chạy đồng hồ sớm.
- Native Xiangqi phát lại tín hiệu assetsReady trong lúc waiting mỗi >=5 giây nếu đúng các điều kiện Audio/Layout (chỉ tín hiệu nội bộ), giúp phục hồi khi ứng dụng clone chuyển nền.
- Sửa H25 regression gate sai, thêm các test tập trung và Chess VM + Xiangqi VM (không cần Firebase thật), bổ sung marker `/health`: `boardReadinessProtocol=h25r2r6r2-two-stage-human-ready`. Marker cũ `chessSessionProtocol` giữ nguyên vì tương thích.

## Cần triển khai và kiểm chứng
- Gói chứa **FULL CODE Family Bloom**, nhưng thay đổi quan trọng nằm ở **server Render**. Chỉ chép ZIP hoặc cài APK cũ KHÔNG deploy server mới.
- Sao lưu server/repo và cập nhật Render dịch vụ Chess từ thư mục `server` trong ZIP, sau đó build lệnh `npm install && npm run build` và start `npm start` theo thiết lập Render hiện có (không thay biến bí mật).
- Mở `/health` xác minh marker mới. Cần test 1 ván với Bloom Bot rồi 1 ván hai tài khoản bằng ứng dụng nhân bản, đặc biệt khi chuyển ứng dụng qua nền.
- Chuẩn bị của hai thiết bị vẫn bắt buộc: nếu một thiết bị không dựng được bàn cờ, hệ thống phải giữ chờ và xử lý timeout 180 giây, KHÔNG tự bật đồng hồ.
- Chưa có kiểm chứng Android Gradle APK thật, Windows BAT thật, Socket.IO/Firebase Render live. Static gates không thay thế thiết bị thật.
