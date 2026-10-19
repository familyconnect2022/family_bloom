# Family Bloom P2.37R2C-H10 — Báo cáo cập nhật FULL CODE

Nguồn: H9B FULL ZIP do người dùng cung cấp ngày 18/10/2026. Không phải patch ZIP.

## Mục tiêu và thay đổi đã viết

1. **Chess Native hiển thị cục bộ trước khi server phản hồi**: chess.js kiểm tra luật trên FEN đã nhận; nước hợp lệ hiển thị bằng `optimisticFen` và animation Native. Server Socket.IO vẫn kiểm tra quyền đi, phiên bản (`expectedVersion`) và kết quả. Nếu từ chối/timeout, client loại bỏ dự đoán và yêu cầu resync khi cần. Không ghi Firestore theo từng khung hình.
2. **Premove tối đa 5 nước**: hàng đợi độc lập của Chess, hiển thị vị trí giả định trên bàn cờ, đánh dấu ô premove. Mỗi lần đến lượt thật sẽ kiểm tra nước đầu với FEN authoritative mới, gửi **từng nước một**; không gửi mù cả hàng đợi. Khi illegal/conflict thì xóa hàng đợi. Chỉ hỗ trợ tap-to-move, không bật kéo thả.
3. **Native renderer**: cache trạng thái tô màu/quân/hint từng ô, tránh lặp `setImageResource` và tạo drawable không cần thiết trên tất cả 64 ô. Animation quân di chuyển dùng Android `ViewPropertyAnimator` 115ms. Chỉ làm việc này khi FEN thay đổi, không chạy theo socket từng frame.
4. **Đồng hồ**: Android hiển thị thời gian trên `SystemClock.elapsedRealtime`, không phát socket mỗi giây. Tạm dừng khi view không hiển thị. Đồng hồ luôn được hiệu chỉnh lại theo timestamp/snapshot server sau khi đổi revision.
5. **Phong cấp**: lựa chọn Hậu/Xe/Tượng/Mã tại native overlay, thay cho tự chọn Hậu. Hiện giao diện dùng ký hiệu Chess unicode; cần đánh giá bố cục và glyph thực tế trên thiết bị.
6. **Âm thanh**: 11 file MP3 nguồn được chép vào `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_*.mp3`, nối SoundPool Native. Build preflight và APK postflight kiểm tra **từng đường dẫn** trong ZIP APK bằng `jar tf`. Lỗi cũ `APK MP3 count:0` do không có tham chiếu native/Metro đến các MP3 nay đã có đường đóng gói cố định.
7. **UI sau đăng nhập**: chặn overflow ở root navigator và workspace tab; bỏ transition native stack giữa Login/Tab trên lần đăng nhập; Native decor rail khởi tạo ngoài viewport, kích thước 1x1 thay vì MATCH_PARENT. Đây là sửa phòng ngừa theo đoạn video 6440.mp4, chưa xác nhận nguyên nhân duy nhất trên thiết bị.
8. **Mã nhận dạng APK**: `appVersion=1.3.10`, Android `versionCode=143020`, Native ID `P2.37R2C-H10-native-1`, local native module `1.3.9`. Đồng bộ EAS BAT, verifier APK, Developer binary gate. EAS OTA BAT vẫn yêu cầu nhập message và nhắc phải cài binary H10 trước vì OTA không cập nhật Kotlin.
9. **Chess test bot**: chỉnh khoảng chờ 1000ms thường và 1300ms khi chiếu; đây là thay đổi server, chỉ có hiệu lực khi redeploy Render từ thư mục `server/`.

## Quan trọng: phạm vi CHƯA hoàn thiện hoặc CHƯA xác minh

- Không có môi trường Android SDK/Gradle và điện thoại kiểm thử thực tế trong phiên này: **chưa có APK H10 do tôi biên dịch**, chưa xác nhận Kotlin build, chưa đo FPS/input latency bằng profiler, chưa xác nhận SoundPool phát trên điện thoại.
- **Chưa tương đương Chess.com ở mức 85–95%**: đó là mục tiêu cần benchmark trên APK cài thực tế; H10 mới là bước xây phần cốt lõi local-first + dirty cell + premove.
- **Xiangqi**: cấu trúc gameplay và renderer Native cờ tướng hoàn chỉnh **chưa được viết**; H9B vẫn chứa giao diện mô phỏng bên trong rail. Không giả vờ đã có cờ tướng chơi được.
- **Kết quả thắng/thua, Mini bàn cờ thật, và kết thúc phiên đầy đủ**: H10 giữ nguyên flow server/client trước đó; chưa khôi phục trọn bộ UI kết quả riêng như đặc tả cũ.
- **Firestore checkpoint** vẫn được `await` trong hot path server. Không chuyển thành async fire-and-forget vì có thể mất hoặc đảo thứ tự checkpoint khi server restart. Cần đo độ trễ để thiết kế lại lưu bền vững đúng thứ tự.
- Premove dự đoán không thể đoán nước đi của đối thủ. Trường hợp chiếu, bắt quân, nhập thành và en-passant phụ thuộc thế cờ mới sẽ được server kiểm tra lại; hủy hàng đợi nếu nước không hợp lệ.
- Lỗi dải màu hồng sau login được xác định ở mức **triệu chứng và nguyên nhân khả dĩ**; cần test lại cả sign-in lần đầu và kill/relaunch, gửi log view hierarchy nếu tái hiện.

## Đường build/test trên Windows

- Sao lưu thư mục dự án đang dùng. Giải nén FULL H10, sao chép đè các file trong ZIP vào thư mục dự án; sau đó chạy `Family_Bloom_CLEAN_APPLY_FULL.bat` tại root dự án đã cập nhật để dọn file cũ, cài dependencies và kiểm tra H10. Không chạy BAT cũ của H9B trước khi copy H10.
- Để tạo APK có thể cài không cần Metro: `Family_Bloom_BUILD_APK_TO_SHARE.bat`. File này chạy Native/Audio preflight; sau Gradle phải qua 11 MP3 resource proof trước khi xuất APK.
- Với EAS development build: `Family_Bloom_EAS_BUILD_TEST.bat` ở root.
- OTA sau khi **đã cài H10 native binary** và cấu hình expo-updates: `Family_Bloom_EAS_UPDATE_TEST.bat`, nhập message tương tác.
- Verify binary đang cài: `scripts/android/verify/Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat`.

## Các bước test tối thiểu bắt buộc trên máy thật

1. Cài APK versionCode 143020 mới; không dùng lại app-release.apk H9B trong build cache cũ. Kiểm tra binary ID đúng H10.
2. Đăng xuất, đăng nhập Google/điện thoại, kiểm tra có dải giao diện ở dưới TabBar không; kill/relaunch và lặp lại; đổi chế độ sáng/tối.
3. Vào Chess với Bot và đối thủ thật: đi 10–20 nước, kiểm tra phản hồi ngay khi chạm, đồng hồ tiếp tục chạy, 11 trường hợp SFX chính, phong cấp q/r/b/n, bấm Full/Mini/Restore/Close nhiều lần.
4. Premove 1–5 nước trong lúc đối thủ đi, kiểm tra revalidate, hủy khi bị chiếu/bắt, reconnect và restore không gửi trùng.
5. Stress test 60 FPS qua Android GPU Profile/Perfetto, so sánh nhịp khựng ở các mốc checkpoint 4 ply. Chỉ công nhận chỉ tiêu khi có log/frame metrics.

## Chính sách code

- Không thay đổi `applicationId` (`com.familybloom.android`).
- Không thêm Firestore realtime heartbeat.
- Không bật DnD. Chess controller chỉ tham chiếu Chess socket, không đưa Xiangqi state vào.
- Build phụ trợ và BAT gọn tại `scripts/android/...`, chỉ giữ các entrypoint đã chốt ở root.
