# CẬP NHẬT & TEST — PHASE 6.2 CURRENT CHECKPOINT

## Cập nhật source

Copy patch đè đúng cấu trúc project. Patch không thêm package/native dependency mới.

Sau khi copy:

```bash
npx expo start -c
```

Không cần `npm install`, `expo install` hoặc `expo run:android` chỉ vì patch này.

## Firebase hiện tại — Spark

1. Giữ:

```ts
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
```

2. Publish **`firestore.rules`** trong Firebase Console → Firestore Database → Rules.

3. Không deploy `functions/` lúc này.

## Khi nâng lên Blaze sau này

1. Đảm bảo source `functions/` trong project là bản mới nhất.
2. Deploy `familyGraphMutation`.
3. Publish `firestore.cloud.rules`.
4. Đổi:

```ts
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = true
```

5. Restart/rebuild app.

## Test nhanh đề xuất

- User thường đăng một Kỷ niệm → phải thành công.
- Chính user đó mở menu `...` → thấy Sửa/Xóa.
- Đăng nhập user khác → không thấy Sửa/Xóa bài kia.
- Admin → chỉ thấy quyền `Không cho hiện trên trang Kỷ niệm`, không có quyền sửa/xóa bài member.
- Admin ẩn → bài biến khỏi feed; mở `Kiểm duyệt trang Kỷ niệm` → `Cho hiện` → bài trở lại.
- Tạo Sinh nhật/Kỷ niệm yearly từ ngày quá khứ → lưu được.
- Tạo Event một lần với ngày quá khứ → vẫn bị chặn.
- Test Person Timeline + Album + avatar.
