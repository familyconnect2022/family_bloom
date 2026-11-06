# Family Bloom P2.37R2C H16 — Native Chess Smooth Motion

**Ngày:** 18/10/2026. **Nguồn:** FULL CODE H15, không phải patch. **Phạm vi:** renderer Chess native, kiểm thử/identity/build. Giữ nguyên server Chess, Xiangqi, Phả hệ, Firebase và ứng dụng Android identity.

## Nguyên nhân kiểm chứng bằng mã

`ChessNativeBoardView.bind()` của H15 dựng FEN đích (`render()`) trước khi `animateChangedPiece()`. Hàm cũ dịch chuyển `ImageView` thuộc **ô đích**, không phải một lớp chuyển động bao trùm bàn cờ; hiệu ứng chỉ 115 ms, không easing. Thuật toán chọn `from/to` suy đoán từ các tập ô bị xóa/được thêm trong FEN, không dùng metadata `lastFrom/lastTo` đã xác thực. Với nhập thành, phong cấp và bắt quân, suy đoán đó không đủ chắc chắn. Việc vẽ ô đích trước khi di chuyển còn gây khó bảo đảm không lộ trạng thái đích ở các bản cập nhật đồng thời. Không có FPS thực tế hoặc log frame thời gian trên video để định lượng riêng các nguyên nhân này.

## Thay đổi mã

- `ChessPieceMotionPlanner.kt`: helper Kotlin thuần, chỉ trả về animation khi **cùng game/đúng hướng bàn cờ** (guard nằm ở View), dữ liệu cho thấy **chính xác một** revision và một ply. Dùng `lastFrom/lastTo` từ server qua `nativeChessGameplayController` thay vì chọn mơ hồ từ FEN. Kiểm tra màu quân, lượt, quân nguồn, quân đích, hợp lệ tối thiểu của FEN, castling và promotion. Khi không thể xác nhận => cập nhật tức thì về FEN authoritative, không dựng animation giả.
- `ChessNativeBoardView.kt`: hai `ImageView` sprite được tạo **một lần** ở lớp cuối của `board` để đi phía trên cả 64 ô. Khi có nước đi: FEN mới được render, ảnh trong ô đích được ẩn trước frame kế tiếp; sprite xuất hiện ở ô nguồn, di chuyển vào đích rồi ảnh quân đích mới được hiện. Nhập thành sử dụng cả hai sprite; bắt quân qua đường và promotion dùng chính ô nguồn/đích đã xác minh. Không tạo thêm một quân cờ View mới cho mỗi nước.
- Animation dùng `PathInterpolator` và thời gian 168 ms bình thường, 178 ms cho nhập thành. Không có per-frame JS/Socket event; ViewPropertyAnimator chạy native.
- Khi chuyển Mini, đổi game, mất View hoặc layout thay đổi: cancel sprite và xóa trạng thái animation bằng generation token để callback cũ không làm lộ quân mới. Các lần bind chỉ đổi ô chọn/hint/trạng thái với cùng FEN không làm gián đoạn animation.
- `chromePaintKey` và `lastOpponentLineKey` loại bỏ việc cấp phát lại gradient/background, SpannableStringBuilder và tên người chơi không thay đổi ở mỗi `bind`. Caching 64 ô bằng `paintedCells` vẫn giữ.
- H10/H11 source gates được cập nhật *chỉ tại assertion lỗi thời* (115ms/cancel mỗi ô) sang hợp đồng motion H16. Các gate authority của H12–H15 vẫn chạy.

## Phiên bản / Build

- App: **1.3.16** — Android `versionCode=143026`, applicationId **`com.familybloom.android`**.
- Native module: **1.3.14**; `P2.37R2C-H16-native-1`.
- Cập nhật cả `src/app/(internal)/board-game-bot-test.tsx`, verifier APK, identity gates, EAS BAT, device BAT và build/share BAT để không kiểm tra nhầm H15.
- Giữ 5 BAT entrypoint ở root; phần triển khai ở `scripts/android/`. Có `.gitignore`, tài liệu `.md/.txt` trong `document/`.
- H16 source gate được chèn vào CLEAN APPLY FULL và Build & Share. Không cần thay đổi server Render riêng cho H16 nếu server đã ở H15.
- **Phải build lại APK** vì đổi mã Kotlin. OTA không áp dụng được cho các thay đổi này.

## Kiểm thử đã chạy

1. Pure Kotlin motion planner: `kotlinc ChessPieceMotionPlanner.kt ChessPieceMotionPlannerTest.kt -include-runtime -d chess-motion-tests.jar && java -jar chess-motion-tests.jar` — **14/14 PASS** (Trắng/Đen, bắt quân, hai hướng nhập thành, bắt tốt qua đường, phong cấp, metadata sai, revision/ply sai, resync, không đổi FEN).
2. H16 source motion gate — **16/16 PASS**.
3. H15 authority/release developer gate — **27/27 PASS**.
4. H14/H13/H12/H11/H10 gates — PASS. Binary identity/full copy-integrity — PASS.
5. H14R1 BAT audit **11/11 PASS**. Build entrypoint audit **32 BAT hợp lệ, 0 unmanaged**.
6. Source imports **1719/1719**; TS/TSX syntax **292/292** PASS. Native package preflight PASS (checks reliant on installed modules deferred).

## Chưa kiểm tra

- Chưa có Android SDK/project generated để biên dịch Gradle/Kotlin và tạo APK trong môi trường này.
- Chưa đo bằng Perfetto/Choreographer FPS trên điện thoại, chưa thử động tác Full ↔ Mini nhiều lần và đo thực tế mạng Render.
- Chưa xác thực Android pixel clipping, touches trên các thiết bị khác nhau; cần thử ván cờ trên APK thật.

Không mô tả source tests hay JVM unit tests là một APK chạy ổn hoặc FPS đã được xác nhận.
