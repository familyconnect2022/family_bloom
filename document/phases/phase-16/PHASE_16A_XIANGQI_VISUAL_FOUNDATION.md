# Phase 16A — Xiangqi Visual Foundation

## Mục tiêu

Khóa bộ quân và hình học bàn Cờ tướng bằng asset thật trước khi nối luật/realtime. Đây là cách tránh khoảng cách giữa mockup và kết quả code đã từng gặp ở Cờ vua.

## Đã triển khai

- 14 WebP production assets nền trong suốt: 7 Đỏ + 7 Đen.
- Runtime không dựng chữ Hán bằng `Text`; `XiangqiPiece` load đúng asset đã duyệt.
- 5 trạng thái visual: normal / selected / hint / drag / disabled.
- Piece Gallery với 32 / 40 / 48 / 56 / 64 px.
- Xiangqi board foundation 9×10, 90 giao điểm, sông và hai cung.
- Initial position đủ 32 quân, đặt trên giao điểm.
- Chạm quân trên preview để xem trạng thái selected; chưa tạo nước đi giả.
- Entry `Cờ tướng Nhà Mình` trong Trò chơi Nhà Mình.
- Route public `/xiangqi-preview`.
- Phase 16A gate chạy trong cả Android Debug và Release build.

## Không làm trong Phase 16A

- Chưa có luật Xiangqi.
- Chưa có Socket.IO / realtime session.
- Chưa có server authoritative Xiangqi.
- Chưa có move/drag/hint thật theo legal moves.

Các phần trên chỉ bắt đầu sau khi bộ quân + bàn trên thiết bị Android được duyệt.

## Files chính

- `assets/xiangqi/*.webp`
- `src/components/xiangqi/XiangqiPiece.tsx`
- `src/components/xiangqi/XiangqiPieceGallery.tsx`
- `src/components/xiangqi/XiangqiBoardPreview.tsx`
- `src/app/(xiangqi)/xiangqi-preview.tsx`
- `scripts/test-phase16a-xiangqi-visual-foundation.js`

## Cách test trên Android

1. Mở `Nhà Mình` → `Trò chơi Nhà Mình`.
2. Chạm `Cờ tướng Nhà Mình`.
3. Đổi lần lượt 32 / 40 / 48 / 56 / 64 px.
4. Kiểm tra đủ 7 quân Đỏ + 7 quân Đen, chữ rõ và không đổi style.
5. Kiểm tra 5 trạng thái của Tướng Đỏ.
6. Kéo xuống bàn thử: đủ 32 quân, quân nằm trên giao điểm, có sông và hai cung.
7. Chạm một vài quân để kiểm tra viền selected.

## Gate

`npm run phase16a:check`

Kỳ vọng: **22/22 PASS**.
