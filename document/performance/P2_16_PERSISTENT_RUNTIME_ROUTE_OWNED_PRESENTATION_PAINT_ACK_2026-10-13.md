# Family Bloom P2.16 — Persistent Runtime + Route-Owned Presentation + Paint ACK

## Mục tiêu
P2.16 sửa tận gốc nhóm lỗi presentation đã xuất hiện ở Focus View, Chess và Xiangqi: route còn sống nhưng full visual surface ở app-root không xuất hiện, dẫn đến màn trắng hoặc arbitration che nhầm surface khác.

## Kiến trúc chốt
- Persistent ở root: runtime/session/socket/cache/audio/minigame/global challenge state.
- Route-owned: full Focus pixels, full Chess pixels, full Xiangqi pixels.
- Không route nào được trả một backdrop trắng rồi chờ sibling root surface xuất hiện.
- Root arbitration chỉ tin Paint ACK, không suy đoán từ intent/`visible`/`mode`.

## Presentation lifecycle
`idle -> requested -> shell_painted -> hydrating -> content_painted -> active`

`requested` chưa được coi là visible. Surface chỉ được coi là presented sau `shell_painted`. Owner + request id bảo vệ stale ACK khỏi session cũ.

## Focus View
- Pixels nằm trong Family Graph route, không còn app-root visual host/native Modal.
- Shell xuất hiện trước, ACK sau hai painted frames.
- Hydration BSH chỉ bắt đầu sau shell ACK.
- Content paint ACK mới nâng lifecycle lên active.
- Query/layout/scene cache vẫn persistent và Back vẫn cancel/yield theo P2.11.3/P2.11.4.
- Mini Chess chỉ bị occlude sau Focus shell ACK thật.

## Chess
- `/chess-game/[gameId]` tự render `ChessSurfaceHost`.
- Route luôn có shell fallback “Đang chuẩn bị bàn cờ…”.
- Runtime/store/socket vẫn persistent.
- Visual readiness không phụ thuộc audio readiness.
- Lobby/recovery/challenge/mini đều điều hướng về route full-board thay vì dựa vào root full board.

## Xiangqi
- Route Cờ tướng tự render `XiangqiSurfaceHost`.
- Route luôn có shell fallback “Đang chuẩn bị Cờ tướng…”.
- Runtime state vẫn persistent; full pixels không còn phụ thuộc root z-order/elevation.
- Visual readiness không phụ thuộc audio readiness.

## Root Surface Stack
Root stack chỉ còn:
- process-wide board-game audio runtime,
- Chess mini,
- global Chess challenge/result UI,
- arbitration dựa trên lifecycle Paint ACK.

## Verification
Các gate chính dùng để khóa P2.16:
- P2.16 route-owned presentation + paint ACK
- P2.11.3 cancel-first Focus
- Phase 16B Xiangqi playable logic
- Phase 17.9A9 Chess lifecycle/mini/premove
- Current Chess aggregate
- board audio integrity
- project structure
- Windows BAT/build entrypoint audit
- P2.15.5.1 Build Share Doctor policy

## Copy-over
FULL package vẫn gồm root `.gitignore`, `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`, `Family_Bloom_CLEAN_APPLY_FULL.bat`, và `Family_Bloom_BUILD_APK_AND_SHARE.bat`.
