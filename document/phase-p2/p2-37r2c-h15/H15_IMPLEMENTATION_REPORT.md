# Family Bloom P2.37R2C H15 — Chess authority, private Release Developer Tools & Bloom Hero results

**Nguồn:** H14R1 FULL CODE. **Ngày:** 2026-10-18. **Loại:** FULL source (không phải patch).

## 1. Chess — bảo vệ quyền đi ở cả hai phía

- `server/src/chess/chessGameManager.ts`: sau khi xác thực UID và lượt, kiểm tra **màu quân thực sự ở ô xuất phát** trước khi tiêu thụ đồng hồ; vẫn có revision lock và luật chess.js sau đó. Phân màu gốc do server cấp khi tạo trận, giữ theo `whiteUid/blackUid`.
- `src/services/games/nativeChessGameplayController.ts`: màu quân được tính từ Firebase UID và mapping server, độc lập board orientation. Kiểm tra FEN `turn` và số ply suy từ số nước đi trong FEN. Kiểm tra mỗi move delta bằng chess.js từ FEN cũ: màu quân, quân ở ô xuất phát, SAN, FEN đích, turn và revision. Delta không hợp lệ bị từ chối và yêu cầu resync.
- Không hiển thị FEN giả định cho một nước chưa được server xác nhận. Premove vẫn xếp bằng quân của mình và gửi khi server trả về đúng lượt. Giữ lựa chọn phong cấp trước, sound cue sau delta, reconnect và clock.
- Trạng thái mâu thuẫn chuyển native sang `syncing`, khóa board và tạm dừng countdown hiển thị cho tới khi có snapshot hợp lệ. Resync giới hạn một lần cho mỗi revision không hợp lệ để tránh lặp vô hạn. Đây là cơ chế an toàn chứ không che dấu lỗi: log `CHESS_SIDE_OR_TURN_INVALID`/`CHESS_DELTA_TURN_INVALID` vẫn được ghi.
- **Giới hạn điều tra:** Video xác nhận biểu hiện nhưng không cung cấp log Render có cùng `gameId/revision`. Chưa chứng minh được thực tế backend cũ đã nhận nước sai lượt. H15 từ chối/đồng bộ lại các trạng thái trái luật thay vì cho tiếp tục; cần kiểm chứng với APK H15 + server H15 được triển khai đồng thời.

## 2. Quyền công cụ developer trong Release

- Duy nhất Firebase Auth **email đã xác minh** `huynh235@gmail.com` cùng **UID** hợp lệ được hiển thị Cài đặt → Kiểm thử & chẩn đoán, dù là Debug hay Build & Share Release. Không kế thừa `admin` role gia đình.
- Cả đường điều hướng trực tiếp của Developer Tools, Bloom Bot test, Graph và Data test đều kiểm tra cùng điều kiện. Không có HUD test tại Home.
- `server/src/security/developerIdentity.ts` kiểm tra trực tiếp token được xác minh bởi Firebase Admin (`uid`, `email`, `email_verified`) và hỗ trợ biến Render `FAMILY_BLOOM_DEVELOPER_UID` để pin thêm UID. **Phải lấy UID thật từ Firebase Console trước khi cấu hình**, không đoán UID. Server từ chối các lệnh Bloom Bot test Chess/Xiangqi và rematch test của tài khoản không được cấp phép.
- E2E harness nội bộ khác vẫn giữ rào chắn theo build như trước; không tự động mở toàn bộ E2E cho Release.

## 3. Kết quả thắng / hòa / thua

Native Bloom Arena có ba bảng màu khác biệt, thay vì ba thẻ hồng giống nhau:

| Trạng thái | Nền/viền | Accent | Huy hiệu | Nội dung |
| --- | --- | --- | --- | --- |
| Thắng | Vàng champagne / gold | Nâu vàng | 🏆 | Vinh danh một chiến thắng xứng đáng, tiếp tục giữ pháo hoa |
| Hòa | Xanh lam ngọc | Xanh biển | ⚖️ | Cân tài, tôn trọng hai bên |
| Thua | Xanh sage dịu | Xanh lá | 🌱 | Động viên, học hỏi, vững bước |

Màn chuẩn bị và trạng thái đồng bộ vẫn dùng veil sáng, không có nút giả. Các nút Cầu hòa/Xin thua vẫn có xác nhận và gọi protocol server.

## 4. Build, cleanup và phiên bản

- **Android `versionCode 143025`; app `1.3.15`; native module `1.3.13`; identity `P2.37R2C-H15-native-1`.**
- Đồng bộ verifier, EAS helper, script native-package, APK proof, và BAT verify-device. Chèn test H15 vào cả `CLEAN APPLY FULL` và `Build & Share`.
- Build & Share cài `node_modules/typescript`/dependencies nếu chưa có **trước khi chạy source tests**, sửa trường hợp copy FULL ra thư mục mới dẫn tới test phụ thuộc TypeScript dừng quá sớm.
- Giữ 32 BAT chính thức trong manifest. BAT dư từ copy-over chỉ cảnh báo; BAT chính thức sai vẫn ngăn build và in lỗi ở cuối.
- Bộ kiểm tra H15 gồm 27 trường hợp source + hành vi mock, có các case người chơi cầm quân Đen và Firebase UID/verified email.

## 5. Kiểm tra thực sự đã chạy và giới hạn

- H15 behavior test: **27/27 PASS**.
- Chuỗi Build & Share/source + bổ sung: **27/27 PASS** (Node trên Linux, không phải chạy BAT bằng Windows).
- H14R1 BAT audit: **11/11 PASS**. Binary identity: **14/14 PASS**. Source imports: **1719/1719**, TS/TSX transpile: **292/292**. Server TypeScript syntax transpile: **18 file, 0 lỗi cú pháp**.
- Kiểm tra ZIP integrity: được thực hiện khi đóng gói.
- **CHƯA KIỂM TRA:** TypeScript đầy đủ với dependencies, thực thi Kotlin/Gradle, Build & Share trên Windows, APK thiết bị, FPS chuyển tab, giao diện trên nhiều màn hình, kết nối Render thực tế và bản ghi màu/lượt thật. Không được hiểu các bài mock như chứng minh APK đã build được.

## 6. Cần triển khai đồng thời

1. Cài source FULL H15 và chạy cleanup/BAT copy-over.
2. Build APK native H15 mới (OTA không thay Kotlin). Giữ applicationId và signing key để cài đè; **không gỡ app cũ** nếu chưa cần.
3. Redeploy thư mục `server/` H15 trên Render và bật `CHESS_TEST_BOT_ENABLED=true` chỉ khi muốn thử Bot. Nếu muốn bảo vệ hơn, set UID thực của email được phép vào `FAMILY_BLOOM_DEVELOPER_UID`.
4. Trên APK H15 Release, đăng nhập đúng tài khoản và thử Settings → Công cụ phát triển. Tài khoản admin khác không thấy.
5. Chơi 2 trận với hai màu; ghi `gameId`, `revision`, server bot action logs nếu tiếp tục có biểu hiện đi trái lượt. Xem thêm checklist H15.
