# Family Bloom H22R1 — Bloom Bot invitation countdown (Chess + Xiangqi)

## Nền và nguyên nhân

- Nền: FULL CODE H22, native APK 1.3.22, `versionCode=143032`, native identity `P2.37R2C-H22-native-1`.
- Ảnh 6489.jpg là modal “Bloom Bot mời bạn!” tại trang `(internal)/board-game-bot-test.tsx`. Modal cũ không render countdown dù đã có `ChessInvite.expiresAt` từ server.
- `ChessChallengeGate` và `XiangqiChallengeGate` (lời mời gia đình) có đồng hồ nhưng loại `isTestBot` khỏi hiển thị, có chủ đích để không tranh quyền modal của màn test. Vì vậy không thể dựa vào các gate đó để hiển thị cho Bot.
- Ở H22, Cờ tướng chưa có modal lời mời Bot tương đương Chess trong trang kiểm thử; chỉ có nút “Nhận lời mời bot”.

## Thay đổi

1. `src/components/games/BotInviteCountdown.tsx`: một bộ đếm **chỉ hiển thị** `mm:ss`, tính từ server `expiresAt` (mốc tuyệt đối, millisecond Unix). `AppState` foreground refresh; interval 1 giây được dọn khi unmount. Không tạo thêm thời hạn khi re-render/reconnect, không làm tab/game shell render mỗi giây.
2. Trang developer Bot protocol test: hiển thị countdown Chess ngay trước nút “Đồng ý tham gia”, cùng modal Cờ tướng tông vàng và hai thao tác Accept/Reject.
3. Đến 0:00, UI đóng lời mời và hiện màn ghi nhận đã hết hạn. Server vẫn là nơi kiểm chứng ACK và dọn pending reservation; app không tự thay đổi deadline server. Trước khi gửi ACK Accept/Reject, kiểm tra hạn tuyệt đối; từ chối Cờ tướng gửi đúng `XIANGQI_EVENTS.inviteReject`.
4. Nhận `inviteExpired` chỉ đóng state khi `inviteId` trùng lời mời đang hiển thị; event cũ không đóng lời mời mới.
5. Tích hợp kiểm thử H22R1 vào BAT `Build & Share`, `Android Test Release`, `EAS Build`, `CLEAN APPLY`, và `eas-build-post-install`.

## Kiểm thử và giới hạn

- H22R1 countdown: 10/10 PASS; so sánh biên 60s, 1s, 0s; foreground; idempotency; hạn trước ACK; từ chối thật ở Xiangqi.
- H22 Xiangqi: 21/21 PASS. H21 Chess 60s/away: 32/32 PASS. H21R4 ready/Build & Share: 12/12 PASS. H21R5 durable recovery: 14/14 PASS. H6 native identity: 14/14 PASS. H6 copy-over integrity: 31/31 PASS.
- Kiểm tra bằng TypeScript transpile và regression contract, **không chạy full Android Gradle APK** và không test trực tiếp trên thiết bị thật ở môi trường này.
- Backend server không sửa. Native Kotlin/Android không sửa, giữ nguyên binary identity của H22. Nếu điện thoại đã cài APK H22, bản này thay đổi JS nên **về mặt mã nguồn không đòi nâng native module**; APK mới Build & Share là cách triển khai rõ ràng nhất. Chỉ dùng OTA nếu dự án thực sự cấu hình `expo-updates` và thiết bị cài đúng runtime/channel H22; H22 hiện không khai báo dependency đó trong `package.json`.

## Cách copy-over và test

1. Sao lưu mã nguồn đang dùng. `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` trước copy; chép đè FULL CODE H22R1; `Family_Bloom_CLEAN_APPLY_FULL.bat` sau copy.
2. Build APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat`, cài bản mới cùng chữ ký Android lên thiết bị. **Không cần deploy lại Render**, vì server protocol không đổi.
3. Developer Tools -> Game foundation -> Bloom Bot protocol test -> Cờ vua -> “Bloom Bot mời bạn”: xác nhận xuất hiện `01:00` giảm dần, 2 nút vẫn hoạt động.
4. Lặp lại cho Cờ tướng (modal vàng); kiểm tra Accept -> Full, Reject -> về sảnh; đợi đến hết 60 giây -> tự đóng và kết thúc phiên test.
5. Thử đổi tab / đưa app nền / trở lại trước & sau deadline. Đồng hồ phải tiếp tục theo `expiresAt` cũ; không được quay lại 60s, không nhận một lời mời cũ đã hết hạn.
6. Khi server chỉ có pending test bot còn tồn tại, phải đợi server expire/từ chối xong mới bấm tạo lời mời mới. Không tìm cách reset deadline trên điện thoại.
