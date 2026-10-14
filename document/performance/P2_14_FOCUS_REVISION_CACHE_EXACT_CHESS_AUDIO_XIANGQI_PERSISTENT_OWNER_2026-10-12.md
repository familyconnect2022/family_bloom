# Family Bloom P2.14 — Focus Revision Cache + Exact Chess Audio + Xiangqi Persistent Owner

## Mục tiêu

P2.14 xử lý ba lỗi thực tế được ghi nhận trên thiết bị Android:

1. Focus View của phả hệ nhiều nhánh vẫn có nhịp chờ khi mở lại dù nhánh đã render trước đó.
2. Cờ vua dùng sai bộ âm thanh, âm thanh đến chậm và có lúc mất.
3. Cờ tướng có thể mở ra nền trắng dù route đã vào, thay vì giữ board persistent giống Cờ vua.

## Family Graph / Bloom Scene Hydration

- Bổ sung renderer-ready scene cache theo **graph revision + mode + focusPersonId + scene version**, không còn phụ thuộc duy nhất vào identity của object snapshot Firestore.
- Cache revision giới hạn 48 scene theo kiểu LRU đơn giản; snapshot object mới nhưng dữ liệu không đổi vẫn nhận lại scene đã hoàn chỉnh.
- Cache hit được gắn lại vào WeakMap snapshot hiện tại để những lookup tiếp theo trong cùng vòng render trở lại O(1) theo identity.
- Focus cache hit đi thẳng vào `visualReady`, không chờ `Modal.onShow` rồi mới hydrate.
- Detail Person -> Focus native Modal được tách thành hai native frame: đóng Detail trước, frame kế tiếp attach Focus. Không có data/layout await trên hot path.
- Cold branch vẫn dùng BSH interruptible build và chỉ commit scene hoàn chỉnh.

## Chess audio — khôi phục đúng bộ người dùng cung cấp

Runtime chỉ dùng 11 file MP3 gốc trong `assets/audio/board-game/`:

- `game-start.mp3`
- `move-self.mp3`
- `move-opponent.mp3`
- `capture.mp3`
- `move-check.mp3`
- `castle.mp3`
- `promote.mp3`
- `premove.mp3`
- `illegal.mp3`
- `tenseconds.mp3`
- `game-end.mp3`

Bộ WAV song song của P2.13 dưới `assets/audio/chess/` đã bị xóa hoàn toàn để không còn hai sound bank cạnh tranh.

### Giảm latency / chống mất tiếng

- Nước đi local hợp lệ phát cue ngay lúc visual move bắt đầu, trước socket round-trip.
- Authoritative delta dùng cùng `clientMoveId`; persistent host dedupe để một nước chỉ phát một lần.
- Native player attach retry rút xuống 0 / 180 / 520 / 1200 ms.
- Event tới trước khi native player load sẽ được queue.
- Nếu Android thu hồi một player từng load, cue tiếp theo sẽ **wake** lại bounded recovery loop ngay lập tức, attach lại source và phát pending cue khi native load xong. Không giữ 11 poll timer chạy thường trực.

## Xiangqi parity với Chess

- Xiangqi board/audio/socket UI tiếp tục nằm trong persistent root host, route chỉ nhận/release ownership.
- Mỗi lần route focus có một `ownerId` mới. Cleanup trễ từ route cũ không được phép hide surface của route mới.
- Xiangqi dùng chung app presentation-ready gate với Chess để board chỉ bước vào full presentation khi root visual plane đã sẵn sàng.
- Persistent board chỉ được dịch ra khỏi màn hình khi hidden; sau lần prepare đầu tiên không bị unmount theo route.
- Battle FX vẫn bị loại bỏ.
- Hint global reveal giữ <= 60 ms.
- Cross-game durable uid lock của P2.13 vẫn được giữ: một user không thể đồng thời chơi Chess và Xiangqi.

## Copy-over

FULL package giữ cả hai entrypoint ở root:

- `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`: chạy trên project cũ trước khi copy overlay; xóa audio cũ/codec cũ/WAV bank sai và file Xiangqi FX đã retire.
- `Family_Bloom_CLEAN_APPLY_FULL.bat`: chạy sau khi copy; giữ nguyên 11 MP3 gốc, chỉ dọn M4A/OGG/WAV bank cũ rồi chạy regression gates.

Root `.gitignore` vẫn có mặt.

## Regression gates đã chạy trong môi trường đóng gói

- P2.14: 50/50 PASS.
- P2.12.1 Native Focus handoff: 15/15 PASS.
- P2.12.3 Focus native modal recovery: 23/23 PASS.
- P2.12.4 Build integrity + Chess audio: 57/57 PASS.
- P2.13 Focus/Audio/Xiangqi exclusive runtime: 44/44 PASS.
- Phase 16B Xiangqi playable logic: 29/29 PASS.
- Board audio integrity: PASS, đủ 11 MP3 và không còn competing Chess WAV bank.
- Build entrypoint audit: PASS, 22 BAT files, CRLF hợp lệ.

`tsc --noEmit` không được dùng làm gate trong container đóng gói này vì package không kèm `node_modules`; `expo/tsconfig.base` không hiện diện trong môi trường tạm. Các file thay đổi đều được transpile/syntax-check trong regression gates. Trên project đã cài dependencies, các BAT build vẫn chạy dependency/doctor/type gates theo pipeline hiện có.
