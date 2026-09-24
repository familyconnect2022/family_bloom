# Family Bloom — Phase 6.3 Full-screen Graph Editors + Album Delivery Refinement

## Mục tiêu

Tách màn `Xây phả hệ` khỏi hai flow nặng `Tạo/Sửa Person` và `Nối quan hệ` để giảm render/composition cost trên thiết bị thật, đồng thời sửa Album Person chỉ hiện ô nền hồng.

## Thay đổi

- `family-graph-admin` là overview screen, không còn mở create/connect bằng modal.
- Thêm `family-graph-person-editor` full screen.
- Thêm `family-graph-relationship-editor` full screen.
- Person picker của DG-11 nằm trong chính route relationship editor, dùng `SectionList` A–Z + search + branch count.
- `useFamilyGraph(..., enabled)` cho phép giải phóng realtime listener khi screen bị blur.
- Tree và Admin overview pause listener khi đi vào editor khác.
- Album preview ưu tiên Cloudinary original `secureUrl` cho ảnh và tự fallback qua nhiều delivery URL khi `expo-image` báo lỗi.

## Không thay đổi

- Không đổi Firestore schema/path.
- Không đổi Rules/Functions.
- Không đổi DG-11.
- Không migration dữ liệu.
- Không thêm native dependency.

## Test cần làm trên thiết bị

1. Mở `Xây phả hệ` → `Thêm người`: phải là full screen, không thấy admin screen ở nền.
2. Save Person → quay lại overview và Person xuất hiện từ realtime snapshot.
3. Mở `Nối quan hệ`: phải là full screen và không tự chọn Person khi đi từ nút top-level.
4. Mở picker Person → chọn/bỏ chọn liên tục với 26+ Person; so sánh jank với bản modal.
5. Mở từ action `Cha/Mẹ`, `Con`, `Vợ/Chồng` của một Person: chỉ trường hợp này mới preselect Person tương ứng.
6. Album Person: ảnh phải render từ original Cloudinary URL nếu transformed thumbnail lỗi; video phải có frame preview hoặc fallback icon rõ ràng và vẫn mở được fullscreen player.
