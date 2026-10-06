# Family Bloom — Tài liệu dự án

`document/` là nơi duy nhất dành cho tài liệu thiết kế, handoff, kiến trúc và ghi chú theo phase. Không đặt các file `.md` / `.txt` ghi chú phát triển ở root project.

## Cấu trúc

- `phases/phase-XX/` — quyết định, checkpoint và lịch sử thay đổi của từng phase.
  - Phase 14 có thêm `chess/` và `history/` để tách chuỗi Chess dài khỏi tài liệu chung.
- `architecture/` — data contracts, multi-family architecture, media/moments architecture và các quyết định kiến trúc dùng xuyên phase.
- `firebase/` — ghi chú Firestore/Firebase/rules/index liên quan triển khai.
- `handoff/` — master handoff prompt và tài liệu bàn giao.
- `guides/agents/` — hướng dẫn cho coding agents.
- `history/legacy/` — tài liệu cũ chưa thuộc một phase cụ thể; chỉ giữ để tra cứu.

## Quy ước

1. Tài liệu mới của một phase phải vào `document/phases/phase-XX/` ngay từ đầu.
2. Không tạo patch note `.md` / `.txt` ở root project.
3. Tài liệu kiến trúc sống lâu hơn một phase đặt ở `architecture/`, không sao chép thành nhiều bản.
4. File sinh tự động hoặc catalog dữ liệu không đặt trong `document/`; chúng thuộc `src/data/<domain>/` hoặc `scripts/<domain>/`.
5. Khi di chuyển source, phải cập nhật cùng lúc app imports, service imports, scripts/regression checks và đường dẫn được nhắc trong tài liệu.

## Source organization liên quan

- `src/app/` dùng Expo Router route-groups `(…)` để gom source theo domain mà không đổi public route URL.
- `src/components/` và `src/services/` được chia theo domain; component dùng chung nằm trong `components/ui` và `components/layout`.
- `src/data/` chia thành `games/`, `kitchen/`, `music/` để tránh catalog của các tính năng nằm lẫn nhau.
- Bloom Supper shared visual tokens nằm ở `src/constants/bloomSupper.ts`.
