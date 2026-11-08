# Family Bloom — Tài liệu dự án

`document/` là **nơi duy nhất** dành cho tài liệu `.md` / `.txt` của source Family Bloom. Root project không chứa release note, verification log, checklist hoặc README dạng `.md/.txt`.

## Cấu trúc chuẩn

- `architecture/` — kiến trúc và data contract sống xuyên phase.
- `phases/phase-XX/` — quyết định, checkpoint và lịch sử theo phase.
- `releases/` — build report của các release; chia theo nhánh `performance/`, `phase-17/`, `copy-over/`.
- `verification/` — verification log thủ công/tĩnh.
- `reports/device/` — checklist test thiết bị.
- `reports/validation/` — static/validation/implementation report.
- `web/` — tài liệu Web companion/parity.
- `firebase/` — tài liệu Firestore/Firebase/rules/index.
- `handoff/` — master handoff và tài liệu bàn giao.
- `guides/` — hướng dẫn build, cấu trúc project và coding-agent.
- `history/` — tài liệu legacy chỉ giữ để tra cứu.
- `legacy-import/` — vùng an toàn do copy-over dùng để giữ ghi chú/tài liệu thủ công chưa thuộc cấu trúc chuẩn.

## Quy ước bắt buộc

1. Mọi file `.md` / `.txt` mới của source phải nằm trong `document/` ngay từ lúc tạo.
2. Không tạo build report/checklist/patch note ở project root.
3. Root chỉ giữ file mà Expo/Metro/Firebase/Node hoặc quy trình copy-over thực sự cần ở vị trí đó.
4. File state/report máy sinh không phải tài liệu: đặt cạnh tooling tương ứng, ví dụ `scripts/music/state/` và `scripts/music/reports/`.
5. Khi di chuyển file phải cập nhật đồng thời package scripts, BAT, regression gates và đường dẫn tài liệu đang còn hiệu lực.
6. `npm run structure:check` là gate chống tái phát root clutter.

## Source organization liên quan

- `src/app/` dùng Expo Router route-groups để gom route theo domain mà không đổi URL.
- `src/components/`, `src/services/`, `src/context/` chia theo domain; shared UI nằm trong `components/ui` / `components/layout`.
- `scripts/android/`, `scripts/firebase/`, `scripts/maintenance/`, `scripts/setup/`, `scripts/windows/web/` dành cho tooling; Firebase deploy helper chỉ có một bản chuẩn trong `scripts/firebase/`, và không đưa BAT helper trở lại root nếu không phải copy-over entrypoint.
- Root chỉ giữ 2 launcher dễ dùng: `Family_Bloom_BUILD_METRO.bat` và `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Auto Update nằm trong `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat` (hoặc menu `scripts/android/Family_Bloom_MENU.bat`); các launcher nâng cấp cũ lưu tại `scripts/android/maintenance/legacy/`.
