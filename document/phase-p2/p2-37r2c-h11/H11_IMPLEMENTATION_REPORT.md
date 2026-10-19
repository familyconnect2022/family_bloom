# Family Bloom Android — P2.37R2C / H11

**Ngày:** 2026-10-18  
**Nguồn nguyên bản:** `FAMILY_BLOOM_P2_37R2C_H10R2_CHESS_BOARD_VISIBLE_WELCOME_FULL_2026-10-18.zip`  
**Kết quả:** FULL CODE H11, áp dụng copy-over trên bản H10R2; KHÔNG phải patch.  
**Ứng dụng:** `1.3.11`, Android `versionCode=143021`, native `P2.37R2C-H11-native-1`.

## 1. Chứng cứ và nguyên nhân gốc

Hai video thực tế do người dùng cung cấp: `6444.mp4` (~217 giây) và `6445.mp4` (~18 giây), kiểm tra bằng các khung hình chụp trải theo thời gian. Ở H10R2 Full còn khung nền hồng lớn, nhiều lớp khoảng trống, nút X/thu nhỏ; Mini còn nút đóng và có thể xuất hiện khi di chuyển giữa tab. Video không chứng minh riêng định lượng FPS hoặc lỗi luồng Socket. Kết luận nguyên nhân từ đọc mã:

1. `src/app/(internal)/board-game-bot-test.tsx`: `chessBotChallenges` gọi `readyChess` / hồi phục phiên / `testBotChallenge` trước khi trình bày bàn cờ; người dùng ở lại Game Hub trong suốt các `await`.
2. `modules/family-bloom-overlay/.../FamilyBloomOverlayModule.kt`: mini/full dựng các nút đóng không thích hợp, nền hồng và hai lớp biên làm bàn cờ nhỏ đi. Mini trước đó còn cập nhật qua đường bind của native Chess board.
3. `ChessNativeBoardView.kt`: `bind` có thể duyệt lại vị trí, quân, đồng hồ / animation mỗi lần nhận dữ liệu; phần này không cần cho Full đã ẩn khi ở Mini.
4. Màn Bloom Bot test còn nghe socket/diagnostic và cập nhật các React state/log của màn ngay cả khi đã rời sang tab khác; tạo thêm tải JS không cần thiết. Đây là nguyên nhân tải phụ **được xác nhận trong mã**, chưa phải kết luận về tỷ lệ đóng góp FPS.

## 2. Những gì đã thay đổi

### Chess / native Full–Mini

- Full chỉ còn điều khiển thu nhỏ; Mini chạm để khôi phục Full. Không còn nút X/Exit ở hai chế độ; thu nhỏ **không** gửi resign và **không** đóng room/session.
- Mini nhỏ hơn, `96 × 52 dp`, có thể kéo và neo mép. Mini có độ mờ `alpha=0.2` nếu ván Chess active và không đến lượt người chơi; khi đến lượt/đang chờ là `1.0`.
- Gỡ nền hồng của Chess stage. Chỉ giữ một lớp lề ngoài **10 dp mỗi cạnh** (dp dùng native để phù hợp mật độ Android), không lồng lớp lề riêng của board. Full rail vẫn chiếm `90%` viewport theo hợp đồng H9B/H10R2.
- Không hiện khung Ready hay thông báo lượt chơi lớn. Trạng thái đang kết nối/chờ được hiển thị cỡ nhỏ bên cạnh tên Bot/đối thủ; tên có xử lý nhạt. Đồng hồ dựa trên `status=active` server, không tự khởi động bởi trạng thái preview.
- Khi Full không hiển thị, `ChessNativeBoardView.parkForMini` chỉ nhận snapshot/sound-token, ngừng callback đồng hồ và animation; không chạy `bind/render` qua 64 ô. Lần khôi phục Full sẽ `bind` lại trạng thái mới nhất.
- Giữ nguyên cơ chế gửi quân/premove, phong cấp, SFX, nguồn giờ server, phiên reconnect. Server Node/Socket.IO và Firebase Spark/Render Free không bị chỉnh sửa.

### Mời Bloom Bot

- Bấm `Mời Bloom Bot`: `presentPendingChessBoard` mở Full đồng bộ ngay lập tức (preview mang mã `pending-chess:*`). Trạng thái preview **chỉ để trình bày**, không được đưa vào session store/server; chưa thể đi quân hoặc chạy đồng hồ.
- Socket prewake → app/lobby join → recover → challenge → gameState server vẫn chạy theo quy trình cũ, nhưng trong lúc đó Full đã hiển thị đủ quân cờ.
- Khi có state được server xác nhận, thay mã preview bằng gameId thật, giữ `mini` nếu người dùng đã thu nhỏ trong khi đợi, rồi gửi `gameReady` **sau khi** native bind tài nguyên. Chỉ server mới mở đồng hồ/trận.
- Xử lý ACK muộn, inviteRejected/inviteExpired và local watchdog cho preview mồ côi (~150 giây): không được đóng session đã được server xác nhận. Khi màn Bot test còn focus, người dùng thấy toast từ chối/hết hạn và trở lại sảnh bên dưới.

### Giảm tải tab và hygiene

- Giảm UI work của Chess Full đang ẩn bằng đường `parkForMini` thay vì bind toàn bộ bàn cờ/clock trên mỗi state.
- Diagnostic subscriptions và UI-specific socket listeners của màn Bot test chỉ sống khi màn này được focus. Listener game/session ở root vẫn hoạt động để ván không bị mất khi chuyển tab.
- Không thay đổi component, data repository hoặc lifecycle của Home, Phả hệ, Moments.
- Giữ helper `scripts/android` được chia `build`, `eas`, `maintenance` và BAT entrypoint root của H10R2; chuẩn hóa 32 BAT về CRLF Windows. Không chuyển tài liệu `.md/.txt` ra root.

## 3. Kiểm thử đã thực hiện trong môi trường này

- TypeScript: `transpileModule` kiểm **cú pháp** 292/292 file `.ts/.tsx` thành công, **không phải kiểm tra type semantic đầy đủ**.
- Import cục bộ: 1.719 import được kiểm tra theo source.
- Test source/state store `scripts/test-phase-p2_37r2c_h11-chess-full-mini-flow.js`: **28/28 PASS** trước khi bổ sung wording toast, sau đó chạy lại trong vòng kiểm thử cuối.
- Bộ check H8, H9A, H9B, H10, H10R2, H11 cùng kiểm tra cấu trúc/source, binary lock, assets audio và BAT entrypoint: PASS. Bản chụp console đầy đủ `H11_STATIC_VALIDATION.txt` cùng thư mục.
- Âm thanh MP3 đã kiểm tra tồn tại/định dạng và tổng dung lượng; **không** xác minh độ trễ audio trên điện thoại.

### Chưa được kiểm thử thực trên thiết bị

- ZIP H10R2 không có `node_modules` hay `android/` đã sinh; môi trường xử lý không có bộ Android SDK/Gradle native đầy đủ. Vì vậy **không có** Gradle/Kotlin compilation, APK mới, hoặc bài test Metro/device được xác nhận ở phiên xử lý này.
- Chưa chạy `tsc --noEmit` với dependencies đã cài, Socket tới Render thật, reconnect/timeout ván, Android native gestures/audio, FPS/chuyển tab trên thiết bị.
- H11 là **mã nguồn bàn giao để build APK native mới**, không phải một OTA có thể cài trực tiếp lên binary H10R2. APK H10R2 sẽ không tự có thay đổi Kotlin qua `eas update`.

## 4. Giới hạn đã biết / không nói quá

- Chess/Xiangqi có controller, transport, renderer và state riêng; **native decor rail đóng vai trò vỏ trình bày chung** vẫn mang cả `chessLayer` và `xiangqiLayer` trong H11. Chưa đạt yêu cầu tách **100% native Full/Mini ownership** thành hai root rail độc lập. Để tránh làm hỏng native Chess H10R2, không thay đổi toàn bộ native Xiangqi trong bản này. Cần phase thử nghiệm riêng để tách nốt container nếu yêu cầu tuyệt đối.
- Màn native Xiangqi trong decor rail hiện là preview/dummy theo code H10R2, chưa phải bàn Xiangqi native hoàn chỉnh; H11 không mở rộng phạm vi này.
- Timeout 2 phút do server kiểm soát vẫn là điều kiện authoritative. Timer cục bộ 150 giây chỉ là van an toàn cho preview bị bỏ quên trong trường hợp mất phản hồi; không thay thế server expiration.
- Thông báo toast cho invite thất bại chạy ở màn Bot test khi focus. Nếu người dùng rời màn, root sẽ đóng preview nhưng không hiện toast từ màn đã ngủ; cần kiểm tra thêm nếu muốn thông báo toàn ứng dụng.
- Chưa đo/khẳng định đạt độ mượt hay FPS cụ thể như Chess.com; cần test trên APK thật và Android profiler.

## 5. Cách cài/bản build đúng

1. Sao lưu thư mục source H10R2 đang dùng. Giải nén **toàn bộ** H11 FULL ZIP. Dùng BAT cleanup/copy-over có sẵn trong ZIP theo hướng dẫn hiện có; không chép file lẻ từ bản H10R2 đè ngược lại.
2. Windows: chạy `npm install` từ root (hoặc `npm ci` khi lockfile phù hợp). Kiểm tra `npm run phaseP2_37R2C_H11:check` và `npx tsc --noEmit` nếu script typecheck không cấu hình riêng.
3. Build APK: BAT root `Family_Bloom_BUILD_APK_TO_SHARE.bat` (các bước thật trong `scripts/android/build/`) hoặc EAS profile `family-bloom-test` qua BAT EAS root. Vì Kotlin native thay đổi **phải cài APK/DEV CLIENT mới** trước khi dùng Metro hoặc OTA.
4. OTA helper `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat` có prompt message, nhưng đang chặn an toàn nếu chưa có package `expo-updates`. Cần cấu hình Expo Updates bằng công cụ Expo/EAS và build lại binary thích hợp trước; không tự giả cấu hình.
5. Kiểm tra `versionCode=143021`, `native=P2.37R2C-H11-native-1`, screenshot board, giao tiếp Bot, gameplay, resize Mini, tab animation, reconnect, end-of-game. Xem `H11_APK_DEVICE_CHECKLIST.txt`.

## 6. Các file thay đổi quan trọng

- `src/services/games/boardGamePresentationStore.ts`
- `src/services/games/nativeChessGameplayController.ts`
- `src/services/games/boardGamePresentationBridge.ts`
- `src/app/(internal)/board-game-bot-test.tsx`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt`
- `modules/family-bloom-overlay/index.ts`
- `scripts/test-phase-p2_37r2c_h11-chess-full-mini-flow.js` và một số gates/build helpers, `package.json`, `app.json`.
