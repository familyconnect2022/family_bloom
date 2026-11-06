# Family Bloom P2.17 — Presentation Rail / Single Owner

## Mục tiêu

P2.17 thay cơ chế presentation phân tán bằng một root Presentation Rail duy nhất cho ba surface nặng: Focus View, Chess và Xiangqi.

## Invariant chính

- Chỉ một full-screen root surface được phép hiện tại một thời điểm: `focus | chess | xiangqi | null`.
- Chess/Xiangqi chỉ mount heavy runtime khi có Active Board Game Session tương ứng.
- Route không còn quyền tự hide/show surface khác. Route chỉ gửi request qua `boardGamePresentationCoordinator`.
- Chess và Xiangqi không thể cướp session của nhau bằng local route/bootstrap. Chỉ authoritative server recovery có thể thay cross-game lease.
- `full -> mini -> full` của Chess giữ nguyên gameId/session; không reload board, không tạo game khác.
- Surface parked vừa `pointerEvents="none"` vừa `opacity: 0`, nên không được chặn Phả hệ/Focus hoặc để lại ghost pixels.
- Focus View dùng root rail nhưng giữ BSH retained scene; đóng/mở không phá game session nằm dưới.
- Board game audio có một process-wide provider ở trên Navigator + root rail. Challenge audio có một subscriber duy nhất ở `ChessGlobalUiHost`.

## Luồng chuẩn

### Focus
`Family Graph -> request Focus -> Focus rail slot visible -> close -> rail restores previous full game if any`.

### Chess
`server active/recovered game -> ActiveBoardGameSession(chess) -> ChessHost mount -> full`.
Khi minimize: `full -> mini` trên cùng session/gameId.

### Xiangqi
Route chỉ bootstrap server session. Chỉ sau khi server trả về Xiangqi game thật mới claim/present Xiangqi. Nếu server cho biết Chess đang active, Xiangqi không được mount/present.

## Server rule

Không thay luật away timeout hoặc single-active-game của server. P2.17 sửa client presentation/orchestration để không che lỗi client bằng thay đổi luật server.
