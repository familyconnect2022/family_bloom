# Phase 14V4C — Chess Diagnostic Build

Mục tiêu: ngừng chẩn đoán bằng suy đoán và ghi lại pipeline thật của một nước đi ngay trên thiết bị.

## Runtime
- Trace chỉ nằm trong RAM, tối đa 240 event.
- Không ghi Firestore.
- Không thêm console hot-path.
- Panel hiển thị trực tiếp trong màn hình Chess.
- Có thể xóa trace ngay trên thiết bị.

## Pipeline được đánh dấu
`piece_hit / square_hit → selection → attempt_start → local_validate_ok|illegal → optimistic_start → socket_emit → socket_ack_ok|fail → move_applied_received → delta_commit_applied|stale|gap → board_delta_start → authoritative_commit → visual_settle`.

Resync cũng có `resync_start / resync_ok / resync_fail`, snapshot có `snapshot_commit`.

## Cách test
1. Vào một trận Bloom Bot.
2. Để FX TẮT.
3. Thử tap-to-move e2→e4.
4. Nếu thất bại, chụp panel Diagnostics ngay sau thao tác.
5. Thử lại bằng drag e2→e4.
6. Panel sẽ cho biết checkpoint cuối cùng đã chạy và delta thời gian tương đối.

Nếu pipeline dừng trước `socket_emit`, lỗi ở interaction/local controller.
Nếu có `socket_emit` nhưng không có `socket_ack_ok`, lỗi command/server/transport.
Nếu ACK OK nhưng không có `move_applied_received`, lỗi broadcast/protocol.
Nếu delta nhận nhưng `gap/stale`, lỗi version/reconciliation.
Nếu `authoritative_commit` có nhưng chưa `visual_settle`, lỗi visual transaction.
