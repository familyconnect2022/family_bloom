# Family Bloom Android A3R4 · Media M3R4 — Chẩn đoán avatar (29/10/2026)

## Kết luận từ kiểm tra mã

Trong bản Android M3R3, **chọn/cắt ảnh không tự upload**. Upload chỉ bắt đầu sau khi người dùng bấm **Lưu hồ sơ / Lưu thay đổi**. Vì vậy "không thấy tải lên ngay sau khi cắt" chưa chứng minh lỗi API. Tuy nhiên app cũ cũng thiếu phản hồi trạng thái, yêu cầu quyền thư viện không cần thiết trên Android và chưa thử khôi phục ảnh sau khi MainActivity bị tạo lại. Ngoài ra các avatar ảnh cắt có thể là PNG nhưng code trước luôn khai báo JPEG.

M3R4 xử lý các điểm đó, không khẳng định đã kiểm chứng được nguyên nhân cụ thể trên điện thoại của người dùng.

## Phạm vi thay đổi

- `src/hooks/media/useMediaUpload.ts`: giữ crop 1:1, bỏ yêu cầu quyền full library trước hệ thống picker, chặn nhấn lặp, đọc kết quả khôi phục `ImagePicker.getPendingResultAsync()` trên Android; không upload ảnh gốc chưa cắt khi picker lỗi.
- `src/components/ui/BloomInputComponents/BloomInputAvatar.tsx`: nói rõ chọn/cắt xong phải bấm Lưu, không tự tải ngay.
- `src/services/media/avatarFile.ts`: suy ra MIME và tên file từ URI sau crop (JPEG/PNG/WebP/HEIC/HEIF), dùng chung cho avatar tài khoản và phả hệ.
- `src/services/media/avatarStatus.ts`, `mediaService.ts`, `profileService.ts`: thông báo bước chuẩn bị, upload, xác minh, lưu; diễn giải lỗi ngắn gọn, không log khóa, token, chữ ký hoặc public ID.
- `create-profile.tsx`, `profile.tsx`: hiện ảnh tạm và trạng thái lưu. Không thay đổi Firebase Rules hoặc Vercel API.
- `family-graph-person-editor.tsx`, `family-graph-admin.tsx`: dùng đúng MIME ảnh đã cắt; vẫn giữ chức năng lưu/chỉnh sửa phả hệ.

## Cập nhật

Đây là **FULL CODE Android độc lập**. Giải nén ra thư mục mới, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để cập nhật dự án Android cũ. Kiểm tra thành công rồi mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`, cài APK mới lên điện thoại. Không giải nén chồng lên thư mục Vercel Media.

Dùng tiếp **Vercel Media M3R3 đang hoạt động**. Không cần thay Cloudinary API key, redeploy Vercel hay Firebase Rules cho các sửa đổi M3R4 này.

## Kiểm thử trên điện thoại

1. Mở **Hồ sơ → Chỉnh sửa** (hoặc tạo hồ sơ mới), bấm avatar, chọn một ảnh, cắt 1:1 và xác nhận.
2. **Trước khi bấm Lưu:** kiểm tra ảnh tạm thay thế avatar chữ; màn hình phải cho biết phải bấm Lưu mới tải lên. Nếu vẫn là chữ, lỗi ở *picker/preview*, chưa gọi Vercel.
3. Bấm **Lưu thay đổi**. Theo dõi các dòng "Đang chuẩn bị ảnh..." → "Đang tải ảnh lên Cloudinary..." → "Đang xác minh..." → "Đang lưu ảnh...".
4. Thoát rồi mở lại và kiểm tra avatar còn hiển thị. Thử cắt PNG hoặc ảnh JPG, sau đó thử avatar của một người trong phả hệ nếu có quyền quản trị.
5. Nếu lỗi, ghi lại **bước dừng** và **câu thông báo**; không gửi API Secret, ID token, signature, publicId, file ảnh riêng tư.

### Trường hợp chưa thể xác minh tại đây

- `expo-image-picker` có thực sự trả lại URI sau Google Photos crop trên đúng model Android; xác nhận cần APK thật.
- Cloudinary và Firebase Rules trên production (không có quyền tới tài khoản đích).
- Android Gradle build/EAS build trên Windows (môi trường kiểm thử ở đây chỉ kiểm tra cú pháp TS/TSX và các bài kiểm thử source).

## Kiểm tra mã nguồn

```
node scripts/tests/release/test-m3r4-avatar-picker-and-progress.cjs
node scripts/tests/release/test-m3r3-graph-avatar-security.cjs
node scripts/tests/release/test-m3r2-avatar-contract.cjs
node scripts/tests/release/test-a3r4m3r1-media-security.cjs
node scripts/tests/release/test-a3r3-moment-upload-diagnostics.cjs
node scripts/maintenance/check-project-structure.js
node scripts/setup/check-expo-route-uniqueness.cjs
```

**Quan trọng:** Nếu chỉ bấm chọn/cắt ảnh mà chưa bấm Lưu, không có request upload. Nếu bấm Lưu nhưng không xuất hiện bước "Đang chuẩn bị", cần đối chiếu APK hiện có với FULL CODE M3R4 mới.
