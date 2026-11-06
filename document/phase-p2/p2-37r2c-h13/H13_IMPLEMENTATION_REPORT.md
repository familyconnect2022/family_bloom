# Family Bloom Android — P2.37R2C H13 (18/10/2026)

## Phạm vi
Kế thừa **H12 FULL CODE**; không viết lại game engine, không sửa server Chess/Xiangqi, Firebase, Phả hệ, Moments, Home. Thay đổi UI native Chess, UI mời Bot ở màn test và lifecycle **đóng kết quả**. Xiangqi giữ nguyên.

## Vấn đề nguồn H12

1. `ChessNativeBoardView.kt`: `bloomBackdrop` dùng `#B82A1633` (lớp phủ tối); cả waiting/result/confirm dùng cùng card và status waiting là `bloomPrimary` màu hồng đậm nhưng không click. Kết quả đọc như một popup thường.
2. `nativeChessGameplayController.ts`: action `resultAck` `await chessSocketService.emitAck(...)` tối đa 15 giây **trước** `closeFinishedChessBoard`, làm bấm Về sảnh bị chậm nếu mạng/Render phản hồi trễ.
3. `boardGamePresentationBridge.ts`: `finished` state/delta có quyền mở lại Full. Khi người dùng về sảnh sớm, một gói Socket cũ có thể bật lại kết quả nếu không chặn.
4. Các nút cầu hòa/xin thua là hai TextView 35dp rất nhỏ, màu sắc ít phân cấp.
5. Modal mời Bot ở màn test còn lớp phủ tối `rgba(38,16,35,0.76)`.

## H13 triển khai

- `modules/family-bloom-overlay/.../ChessNativeBoardView.kt`: veil hồng/trắng sáng `#D8FFF3F9` thay cho đen; card nhiều sắc độ, viền nhỏ, huy hiệu và nội dung riêng cho chiến thắng/hòa/thua, confirm và waiting. Không dùng network/ảnh mới.
- Waiting: `bloomPrimary` ẩn/disable, thay `bloomStatus` TextView không tương tác, đồng bộ `current.waitingMessage` cả khi phase waiting không thay đổi. Không tạo hành động Ready mới; logic `assetsReady` của H12 giữ nguyên.
- Victory: cúp, lời chúc xứng đáng, pháo hoa một lần khi kết quả hiển thị; draw và loss nhận màu/nội dung tôn trọng, động viên, không tạo vòng lặp animation.
- Cầu hòa/Xin thua: nút cao 42dp, gradient và thứ bậc trực quan, vẫn phải qua modal xác nhận; lệnh Socket giữ protocol H12.
- `src/app/(internal)/board-game-bot-test.tsx`: đổi lớp phủ mời Bot/đã từ chối sang màu sáng; logic accept/reject giữ nguyên.
- `src/services/games/nativeChessGameplayController.ts`: resultAck chỉ khi trạng thái `finished` authoritative; đánh dấu gameId, đóng local UI/snapshot đồng bộ, sau đó **gửi ACK nền**. ACK trễ/thất bại chỉ log, không reset một game mới.
- `src/services/games/boardGamePresentationStore.ts`: giới hạn 40 tombstones cho Chess result đã đóng, TTL 30 phút trong JS runtime hiện tại.
- `src/services/games/boardGamePresentationBridge.ts`: bỏ qua state/delta từ ván đã đóng để không bật lại Full trong khoảng TTL, giữ quyền phục hồi sau app restart nếu ACK chưa được server xác nhận.
- Chỉ thay đổi ACK của **kết quả đã finished**. Việc kết thúc ván, điểm thắng thua, khóa hai game, timer, server kết thúc game vẫn do server authoritative xử lý. Không chuyển quá trình kết thúc ván sang client.

## Binary/package
- applicationId: `com.familybloom.android` (không đổi).
- App version: **1.3.13**, Android versionCode **143023**.
- Native identity: **P2.37R2C-H13-native-1**, local native module **1.3.11**.
- Các verifier build/identity và BAT cập nhật đúng H13. Bổ sung `scripts/tests/history/test-phase-p2_37r2c_h13-bloom-results-return.js` vào Clean Apply, EAS và APK build preflight.
- Không cần redeploy Render cho **các thay đổi H13 riêng lẻ**; vẫn cần server H12 để giữ các sửa lỗi Bot/ván cờ H12. H13 sửa native Kotlin nên cần build APK mới (OTA JS đơn thuần không thay thế được Kotlin).

## Kiểm tra nguồn
- H13 source/runtime gate 20/20 PASS, gồm mô phỏng Socket `resultAck` không bao giờ trả lời và bridge nhận state/delta trễ.
- P2.32, P2.34, P2.35; R2C binary; H6, H7, H8, H9A, H9B, H10, H10R2, H11, H12 đều PASS sau khi đồng bộ verifier cũ với identity mới.
- TS/TSX transpile 292/292; import scan 1720; root structure 19/19; build entrypoint audit 32 BAT PASS.

## Giới hạn bắt buộc báo cáo
- Chưa chạy `gradlew assembleRelease`, chưa compile Kotlin với Android SDK/Gradle vì project ZIP không kèm `node_modules` và generated `android/`; không nên gọi các kiểm tra JS/source là chứng nhận Kotlin build.
- Chưa đo FPS/jank hay render modal trên APK thiết bị thật. Thiết kế đã được sửa bằng native code, phải build/cài và quay video xác nhận typography, status, fireworks.
- `resultAck` nền có thể thất bại khi mất mạng; server lưu unseen-result, lúc app khởi động lại có thể hiện lại kết quả, cho tới khi ACK được xác nhận. Đây là fallback có chủ đích.
- Tính độc lập native decor rail Chess/Xiangqi chưa được tái cấu trúc trong H13, không nằm trong scope thay UI/ACK.
