# FAMILY BLOOM — PHASE 6.2
## Ownership, Moderation, Cloud Function Switch, Timeline & Album Integration

**Trạng thái:** working checkpoint của Phase 6.2, chưa tuyên bố đóng phase.  
**Firebase plan hiện tại:** Spark / chưa dùng Blaze.  
**Mutation Family Graph hiện tại:** Direct Firestore + Security Rules.  
**Cloud Function source:** vẫn được duy trì để sẵn sàng bật lại sau.

## 1. Quyền Kỷ niệm / Moments đã chốt

- Mọi thành viên hợp lệ trong family đều có thể tạo bài Kỷ niệm.
- Chỉ **người tạo bài** được sửa lời bài đăng của chính mình.
- Chỉ **người tạo bài** được xóa bài của chính mình.
- Owner/Admin **không được sửa** caption/media của bài do người khác tạo.
- Owner/Admin **không được xóa** bài do người khác tạo.
- Owner/Admin chỉ có quyền kiểm duyệt hiển thị: `visible` / `hidden` trên trang Kỷ niệm.
- Bình luận cũng không còn quyền admin-delete; người viết tự chịu trách nhiệm nội dung của mình.
- Reaction/comment summary vẫn được phép cập nhật qua transaction hiện có.

### Moderation fields

Bài mới ghi:

```ts
moderationStatus: "visible" | "hidden";
moderatedByUid: string | null;
moderatedAt: string | null;
```

Legacy Moment không có các field này được normalize như `visible` để không bắt migration.

## 2. Quyền Event / Kỷ niệm trong Planner

- Mọi family member hợp lệ vẫn được tạo Event/Kỷ niệm.
- Chỉ `createdByUid` được sửa/xóa Event của chính mình.
- Admin không có quyền sửa/xóa Event của người khác.
- Sinh nhật/Kỷ niệm lặp `yearly` được phép giữ ngày gốc trong quá khứ.
- Event một lần (`recurrence=none`) vẫn không cho chọn ngày đã qua.

## 3. Cloud Function flag

File:

```text
src/constants/featureFlags.ts
```

Hiện tại:

```ts
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
```

### false — Spark/dev

```text
UI
→ familyGraphMutationService / familyPersonContentService
→ Firestore direct transaction/batch
→ firestore.rules
```

### true — Blaze/trusted backend sau này

```text
UI
→ same service facade
→ familyGraphMutation Cloud Function
→ Admin SDK transaction
→ Firestore
```

UI không đổi khi chuyển mode.

Khi bật Cloud mode bắt buộc thực hiện đủ 3 việc:

1. Deploy `functions/` mới nhất.
2. Publish `firestore.cloud.rules` để chặn client ghi trực tiếp Family Graph.
3. Đổi `FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = true` rồi rebuild/restart app.

Không chỉ bật flag mà giữ Direct rules, vì khi đó malicious client vẫn có thể bỏ qua Cloud Function.

## 4. Cloud Function được duy trì song song

`familyGraphMutation` hiện giữ các action:

- create/update/delete Person;
- set Person avatar;
- link/unlink Person;
- create/update/delete Relationship;
- create/delete Person Timeline entry;
- attach Person Album media asset.

Person Album vẫn upload file lên Cloudinary từ client/media pipeline; khi Cloud mode bật, backend chỉ xác nhận asset hợp lệ rồi attach reference + chuyển lifecycle asset sang `attached`.

## 5. Person Timeline thật

Path:

```text
families/{familyId}/persons/{personId}/timeline/{entryId}
```

Timeline không copy Events/Moments. Ngày sinh/ngày mất lấy trực tiếp từ Person. Timeline chỉ lưu life-event do Admin nhập thêm.

## 6. Person Album thật

Path reference:

```text
families/{familyId}/persons/{personId}/album/{mediaAssetId}
```

Media source of truth vẫn là:

```text
media_assets/{mediaAssetId}
Cloudinary
```

Cloudinary folder cho Person đã sửa thành:

```text
family_bloom/families/{familyId}/persons/{personId}/{purpose}
```

Vì vậy `avatar` và `album` không còn bị ghi chung folder.

## 7. Hai ruleset được version hóa

### `firestore.rules`

Rules active cho Spark/dev hiện tại:

- Direct Family Graph write cho Owner/Admin với validation.
- Member đọc Graph.
- Timeline/Album write cho Owner/Admin.
- Moment creator-only edit/delete.
- Admin moderation-only.
- Event creator-only edit/delete.

### `firestore.cloud.rules`

Dùng khi Blaze + Cloud Function được bật:

- Family Graph Person/Relationship/personLinks/Timeline/Album direct client writes = deny.
- Read permissions giữ nguyên.
- Moments/Events tiếp tục dùng ownership rules như trên.
- `media_assets` vẫn cho client lifecycle upload phù hợp vì file upload còn chạy từ app.

## 8. Không thay đổi

- Root Auth/Profile/Family gating.
- `activeFamilyId` ownership.
- Family membership architecture.
- Cloudinary provider config.
- Moment/Events realtime scale budgets.
- centralized errorService.
- Firebase project config.

## 9. Test bắt buộc cho checkpoint này

1. Member thường đăng Kỷ niệm text-only.
2. Member thường đăng Kỷ niệm có ảnh.
3. Member A chỉ sửa/xóa bài của A.
4. Member A không sửa/xóa bài của B.
5. Admin không sửa/xóa bài member.
6. Admin ẩn bài khỏi trang Kỷ niệm.
7. Bài ẩn biến khỏi feed/Home.
8. Admin mở danh sách bài ẩn và `Cho hiện` lại.
9. Event Sinh nhật/Kỷ niệm yearly chọn ngày gốc quá khứ và lưu thành công.
10. Event one-off ngày quá khứ vẫn bị chặn.
11. Event chỉ creator update/delete.
12. Graph Person/Relationship Direct Firestore vẫn lưu trên Spark.
13. Timeline + Album Person vẫn lưu realtime.
14. Avatar và Album đi đúng Cloudinary purpose folder.
15. Regression: Auth, Family Gateway, Join/Approve, Moments reactions/comments, Planner, Home, Media Viewer, keyboard, navigation.
