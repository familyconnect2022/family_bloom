# Phase 14V.3N — Chess Persistent Piece Layer

## Mục tiêu

Giảm hiện tượng khựng/giật còn lại khi quân cờ di chuyển sau khi đã loại trừ FX là nguyên nhân chính.

Baseline: **Phase 14V.3M — Chess FX A/B Switch**.

## Chẩn đoán bổ sung

14V.3M vẫn có hai nguồn gây hitch đúng ở đầu/cuối animation:

1. Quân nằm trực tiếp trong 64 `Pressable`, trong khi quân đang chạy lại được mount thành một `expo-image` overlay riêng. Mỗi nước làm React thay đổi nhiều native view đúng lúc animation bắt đầu/kết thúc.
2. Ở settle cũ, `setVisualMove(null)` và `progress.setValue(0)` xảy ra sát nhau. Native `Animated.Value` có thể về 0 trước khi React kịp ẩn overlay, khiến overlay ló lại vị trí A trong một frame hoặc tạo cảm giác khựng cuối nước.

## Kiến trúc 14V.3N

- 64 ô bàn cờ là layer input/background riêng.
- `BoardSquare` dùng `React.memo`.
- Quân tĩnh nằm trong `pieceLayer` absolute riêng; `PieceSprite` dùng `React.memo`.
- Moving layer luôn được mount.
- Moving layer preload/mount sẵn đủ 12 ảnh quân WebP; một nước chỉ đổi opacity + native transform.
- Animation chỉ bắt đầu ở frame kế tiếp sau khi state overlay đã commit, tránh mất frame đầu.
- Khi quân tới B, **không reset progress**.
- FEN đích được commit dưới overlay trước.
- Giữ overlay tại B thêm hai animation frame để static piece layer kịp commit/paint.
- Sau đó chỉ ẩn moving layer; progress chỉ reset lúc chuẩn bị nước tiếp theo khi layer đang hidden.
- FX OFF vẫn giữ nút A/B, nhưng callback motion/revision ở parent trở thành no-op nên không tạo parent state update trong lúc test FX tắt.

## Giữ nguyên

- Hybrid Instant Motion.
- Client legality gate.
- Server-authoritative ACK/revision.
- Không rollback B → A.
- Revision queue.
- Bot 24/7.
- FX A/B switch.
- WebP chess pieces.
- Reconnect/resync crossfade.

## Test mục tiêu trên thiết bị

1. Để **FX TẮT**.
2. Chơi với Bloom Bot tối thiểu 20–30 nước.
3. Quan sát riêng:
   - frame đầu khi quân rời A;
   - giữa đường đi;
   - frame cuối khi quân vào B;
   - hai nước bot/người nối nhau nhanh.
4. Sau đó bật FX để so sánh nhưng không dùng kết quả FX để đánh giá layer mới.
5. Nếu vẫn có hitch tương tự khi FX OFF, bước kế tiếp nên chuyển riêng motion sang Reanimated UI-thread / worklet và đo frame pacing, thay vì tiếp tục chỉnh timing React.

## Validation

- Phase 14V.3N static gate.
- Regression Phase 14V.3H → 14V.3M.
- TS/TSX transpile sanity for `ChessBoard.tsx` and chess game screen.
