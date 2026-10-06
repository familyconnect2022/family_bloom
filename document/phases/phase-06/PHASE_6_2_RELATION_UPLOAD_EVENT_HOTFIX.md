# Family Bloom — Phase 6.2 Relation / Upload / Event Hotfix

Baseline: Phase 5.6.1 FULL + cumulative Phase 6.2 Ownership/Moderation/Cloud Switch patch.

## Family Graph

- Màn `Xây phả hệ` giữ thao tác xóa Person an toàn.
- Person đã `linkedUid` không được xóa trực tiếp; phải unlink trước.
- Person còn relationship không được xóa; ưu tiên xóa relationship sai trước rồi tạo lại đúng.
- Form `Nối quan hệ` đổi thứ tự thành:
  1. Người được chọn
  2. Loại quan hệ
  3. Loại cha/mẹ-con hoặc trạng thái partner
  4. Người tham chiếu
- Có preview câu nghĩa trước khi lưu, ví dụ: `Huỳnh Nguyễn Gia Minh là con ruột của Huỳnh Thanh Nhân`.
- Mapping vẫn dùng đúng chiều domain: `child_of` => `parentId = reference`, `childId = selected`.
- Button mode active dùng `primary` full color; mode còn lại dùng `outline`.

## Moments upload performance

- Không thay đổi upload pipeline/Cloudinary/media_assets.
- Giảm tần suất React state patch của upload progress xuống nhịp coarse 4% hoặc khoảng 140ms.
- Upload callback vẫn chạy đầy đủ; chỉ UI progress bị throttle để tránh FlatList reconcile liên tục khi người dùng scroll.

## Event ownership + moderation

- Event mới có `moderationStatus`, `moderatedByUid`, `moderatedAt` giống semantics của Moments.
- Creator là người duy nhất được sửa/xóa content của Event.
- Owner/Admin không phải creator không được sửa hoặc xóa Event.
- Owner/Admin được `hide/unhide` bằng moderation-only update.
- Event bị ẩn không xuất hiện trong calendar/list/upcoming/past/yearly normal feeds.
- Event Detail có action `Ẩn sự kiện` cho Owner/Admin.
- Planner có khu `Kiểm duyệt sự kiện` để cho hiện lại Event đang ẩn.
- `firestore.rules` và `firestore.cloud.rules` đều tách creator-update và moderation-update bằng `affectedKeys().hasOnly(...)`.

## Deployment policy

- Source và Rules đã được cập nhật đồng bộ.
- Chưa yêu cầu deploy/publish Rules ở hotfix này. Giữ policy hiện tại: gom deployment checklist cuối dự án hoặc khi user chủ động yêu cầu test Rules thật.

## Validation đã chạy

- TypeScript syntax transpile scan: 109 TS/TSX files, 0 syntax errors.
- `firestore.rules`: số `{}` cân bằng.
- `firestore.cloud.rules`: số `{}` cân bằng.
- Chưa claim full semantic typecheck/native Android build vì artifact environment không có project node_modules đầy đủ.
