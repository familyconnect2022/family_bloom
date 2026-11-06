# Family Bloom A3R4 — Đọc chi tiết Cloudinary HTTP 403 (Android)

**Mốc nguồn:** A3R3 Full Code ngày 29/10/2026. Gói này là FULL CODE Android độc lập, KHÔNG chứa Server Render hoặc Vercel Media.

## Thay đổi

- `src/services/media/cloudinaryService.ts`: giữ lại **một bản đã lọc** của `response.data.error.message` và `X-Cld-Error` khi Cloudinary trả HTTP 4xx/5xx. Mã HTTP giữ nguyên để UI và nút thử lại hoạt động như A3R3. Không giữ object AxiosError hay multipart body/raw response.
- `src/services/media/momentUploadDiagnostic.ts`: chỉ giữ **lỗi Moment gần nhất** trong RAM của tiến trình JS; lọc JWT, Bearer, token, signature, URL, email, public_id, folder, đường dẫn file và chuỗi định danh dài trước khi lưu / sao chép.
- `src/context/MomentPublishContext.tsx`: ghi nhận bản chẩn đoán khi Moment thất bại, không đổi queue, retry hay lifecycle ảnh đã upload thành công.
- `src/app/(internal)/moment-upload-diagnostics.tsx`: màn hiển thị, làm mới, sao chép báo cáo, xóa chẩn đoán trong RAM. Chỉ tài khoản Firebase developer đã xác minh được vào.
- `src/app/(internal)/developer-tools.tsx`: thêm mục **Moment · Chẩn đoán Cloudinary** trong Công cụ developer.

## Hướng dẫn cài đặt

1. Sao lưu project hiện có. Giải nén `Family_Bloom_R3R14R3R8_A3R4_CLOUDINARY_403_DETAIL_FULL_CODE_2026-10-29.zip` vào thư mục MỚI.
2. Chạy **`Family_Bloom_AUTO_UPDATE_FULL.bat`** từ thư mục giải nén mới. Đảm bảo dòng New FULL release có `A3R4`; nếu lỗi, dừng, không build.
3. Khi AUTO UPDATE thành công mới chạy **`Family_Bloom_BUILD_APK_TO_SHARE.bat`** để tạo APK mới. Hai BAT root vẫn giữ nguyên như A3R3; EAS BAT vẫn ở `scripts/android/eas/`.
4. Cài đúng APK vừa build lên điện thoại. Không cần redeploy Render hay Vercel Media chỉ để dùng tính năng chẩn đoán này.
5. Đăng nhập tài khoản developer Firebase đã xác minh `huynh235@gmail.com`, mở một Moment test với **một ảnh JPG nhỏ**.
6. Khi Moment báo lỗi 403, **không đóng ứng dụng**. Mở **Cài đặt → Kiểm thử & chẩn đoán → Công cụ developer → Moment · Chẩn đoán Cloudinary → Xem lỗi upload Moment**.
7. Bấm **Làm mới kết quả**, đọc `error.message`, `X-Cld-Error`, cloud name thực tế, HTTP status; bấm **Sao chép báo cáo đã lọc** và gửi văn bản đó cho AI để phân tích. Không gửi ENV, Cloudinary secret, Firebase ID token.

## Hạn chế quan trọng

- Đây là **công cụ đọc lỗi 403**, chưa sửa chính sách Cloudinary. Nếu Cloudinary thực sự từ chối signed upload, thao tác đăng vẫn có thể thất bại.
- Nếu provider không gửi `error.message`, hoặc phản hồi bị môi trường mạng/CORS ẩn, màn hình báo `Chưa có thông báo chi tiết trong phản hồi`; không tự phỏng đoán.
- Báo cáo chỉ lưu trong RAM, không ghi Firestore, không gửi Vercel, không lưu thư viện ảnh. Khi ứng dụng bị kill hoặc Android thu hồi tiến trình, kết quả biến mất.
- Không cần làm lại 8 ENV trên Vercel nếu bạn đã kiểm tra đúng. Không chuyển sang unsigned upload, không nới Security Rules.
- Chỉ developer xác minh mới thấy màn chẩn đoán, còn các thành viên thông thường vẫn thấy thông báo lỗi Moment ngắn gọn.

## Kiểm thử offline

```bash
node scripts/maintenance/check-project-structure.js
node scripts/tests/release/test-a3r3-moment-upload-diagnostics.cjs
node scripts/tests/release/test-a3r4-cloudinary-provider-error.cjs
node scripts/tests/release/test-h25r2r2-release-preflight.cjs
node scripts/setup/check-expo-route-uniqueness.cjs
```

Không thể khẳng định build APK Gradle hoặc upload thật đã thành công nếu chưa thực hiện trên máy Windows/Cloudinary Production.
