# Family Bloom Phase 2.1 — Debug Notes

## Fix: `useMediaUpload` gạch đỏ tại `return Promise.all(...)`

Nguyên nhân là `UploadResultItem` kế thừa `UploadResult`, nên bắt buộc phải có `resourceType`.

Nhánh thành công đã trả toàn bộ `UploadResult`, nhưng nhánh `catch` trước đây trả:

- `id`
- `success`
- `secureUrl`
- `publicId`
- `thumbnailUrl`
- `error`

và **thiếu `resourceType`**. Vì `Promise.all()` suy luận kết quả là một mảng chứa các object không cùng shape, kết quả không khớp `Promise<UploadResultItem[]>`, nên VS Code gạch đỏ ở `return Promise.all(...)`.

### Cách khắc phục

`uploadSingleFile` có return type rõ ràng:

```ts
Promise<UploadResult>
```

Callback của `Promise.all()` cũng có return type rõ ràng:

```ts
async (file): Promise<UploadResultItem>
```

Nhánh thất bại luôn trả:

```ts
resourceType: file.type
```

và kết quả được tách ra:

```ts
const results = await Promise.all(...);
return results;
```

Không dùng `as any` để che lỗi type.

## Profile

- `gender` mặc định là `other`.
- `shortName` là tùy chọn; domain model dùng `string | null`.
- Không ghi `undefined` vào Firestore.
- Khi đọc profile, service normalize field thiếu thành `null` hoặc `[]` để UI có shape ổn định.

## Media lifecycle

`media_assets` là record bền vững cho vòng đời upload:

`uploading -> uploaded -> attached`

Nếu upload provider hoặc bước attach lỗi:

`failed` hoặc `cleanup_pending`.

Cloudinary và Firestore không phải một transaction phân tán. Khi provider đã upload nhưng Firestore attach thất bại, asset được đánh dấu `cleanup_pending` để xử lý cleanup sau này.

## Error handling

Provider errors được quy về `AppError` tại `src/services/error/errorService.ts`. Code provider được normalize về lowercase trước khi map, vì vậy khác biệt uppercase/lowercase không làm thay đổi kết quả mapping.
