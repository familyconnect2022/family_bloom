# Family Bloom R3R14R3 — Moment 10 ảnh/video + toast Hủy + Android-first / Vercel fallback

Nguồn nền: `FAMILY_BLOOM.zip` người dùng cung cấp (R3R14R2). Ngày 27/10/2026.
Ứng dụng: 1.3.33, Android versionCode 143043, package `com.familybloom.android`.

## Lỗi đã tìm đúng dòng

`src/app/(tabs)/moments.tsx` cũ dùng `previewLimit = previewColumns * 2` => 3 cột chỉ xem được 6 ảnh. Đồng thời tính ô theo khoảng cách 8px dù CSS dùng `SPACING.sm = 10`, khiến cột thứ ba bị tràn/wrap thành chỉ 2 cột trên một số Android. Bản này bỏ `slice` giới hạn, lấy độ rộng thực bằng `onLayout`, chia tile theo đúng khoảng cách. Cả tạo mới và sửa Moment đều hỗ trợ đầy đủ tối đa 10 ảnh/video; màn hình có thể cuộn, nút bỏ chọn còn nguyên.

## Toast

Root overlay riêng `MomentUploadToast` tại `src/app/_layout.tsx`; chỉ nút **Hủy** bắt touch; toast body không có onPress. Thumbnail ảnh hoặc khung video (Expo Video chỉ sinh ảnh đại diện của video đang tải), tiến độ tổng thể; video lỗi không tạo thumbnail sẽ dùng biểu tượng. Chỉ dùng một signal store nhỏ để không cập nhật cả feed khi upload progress thay đổi. Ở bước ghi Firestore cuối cùng, nút đổi thành **Đang lưu** và vô hiệu hóa để tránh xóa một bài đã commit; vẫn hiện tiến độ.

## Luồng hủy

1. Android chặn worker lấy file kế tiếp; `AbortController` hủy request Axios và cả thời gian chờ retry.
2. Các media asset đã được tạo được đặt `cleanup_pending` (Firestore xử lý ghi offline theo khả năng SDK); ứng dụng cố xóa ngay bằng Cloudinary `delete_token` nếu đã nhận được token.
3. Nếu triển khai Media API, Android yêu cầu Vercel dọn nốt. Mỗi tệp mới dùng **signed upload** với public ID xác định trước từ `media_assets`, giúp tìm cả trường hợp Cloudinary hoàn tất nhưng điện thoại không nhận phản hồi.
4. Vercel có endpoint dọn theo yêu cầu, xác thực Firebase ID token, kiểm tra owner và trạng thái; không xóa asset `attached`. Kiểm tra lại Moment thực tế trước khi xóa binary.
5. Cron `/api/cron/cleanup` chạy mỗi ngày (03:00–03:59 giờ Việt Nam, gói Hobby); tìm `cleanup_pending`, upload đã bỏ dở hơn 6 giờ, và các checkpoint chưa gắn vào bài hơn 72 giờ.

**Không có cam kết xóa ngay trong mọi tình huống mạng/tắt app.** Trạng thái `cleanup_pending` giữ dữ liệu để retry; signed upload chỉ hoạt động sau khi Vercel Media API được triển khai và Android được build với URL chính xác. Nếu chưa triển khai, upload vẫn dùng unsigned preset cũ, hủy/dừng có hiệu lực nhưng không có server privileged cleanup, và token xóa chỉ có nếu Cloudinary preset trả token. Các upload unsigned **cũ** có `publicId=null` do mất phản hồi sẽ chuyển sang `cleanup_needs_review` và **phải đối soát Cloudinary thủ công**; không giả báo đã xóa thành công.

## Triển khai Media API (cần người quản trị thực hiện)

- Trên Vercel, tạo **project riêng**, Root Directory `vercel-media` (đừng thay root `vercel.json` dành cho web tĩnh). Cài Node runtime, project noncommercial nếu sử dụng Hobby.
- Cấu hình biến môi trường **chỉ ở Vercel**: `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON service account Firebase Admin nguyên vẹn), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CRON_SECRET` (giá trị ngẫu nhiên mạnh). Không sao chép service account/API Secret vào Expo, ZIP hay Git.
- Sau khi `/api/media/sign` và `/api/media/cleanup` được deploy thành công, thêm `EXPO_PUBLIC_MOMENT_MEDIA_API_URL=https://<ten-project>.vercel.app` vào file `.env` local / EAS build env rồi build **APK mới**. Không thêm path `/api` vào URL.
- Không cần Firebase Cloud Functions, không thêm Moment vào server Render, không đổi Firestore Rules hiện tại. API dùng Firebase Admin SDK để đọc/ghi các bản ghi vòng đời, không dùng Blaze-only functions.
- `/api/cron/cleanup` dùng `Authorization: Bearer $CRON_SECRET` (Vercel tự thêm khi chạy cron); không cho phép gọi công khai. Cron 20:00 UTC = 03:00 VN, gói Hobby có thể trễ đến gần 04:00.
- Có thể xem log theo route trong Vercel để xác nhận sau deploy. **Chưa deploy / không gọi Cloudinary-Firebase thật trong bản bàn giao**.

## Kiểm tra cần làm trên một điện thoại Android thật

- Chọn 10 ảnh: đủ 10 thumbnail và nút X mỗi ảnh; test 1,2,3,6,7,10 ảnh trên màn hẹp; xóa ảnh giữa rồi chọn lại.
- Chọn 10 hỗn hợp ảnh/video: lưới không mất mục; toast hiển thị media đang xử lý và % chung; phần thân toast bấm không có tác dụng.
- Hủy ở 0%, 10%, 50%, 95%; bảo đảm không thấy Moment mới trong feed, không retry khi hủy; kiểm tra log Firestore / Cloudinary.
- Chuyển tab trong lúc upload; sau khi đăng thành công toast biến mất. Tắt mạng, đóng app, mở lại; kiểm tra media_assets cleanup_pending và Cron.
- Bấm Hủy lúc một file đã tới Cloudinary nhưng chưa ghi Firestore metadata, sau đó kiểm tra signed publicId có bị xóa trong đợt Cron.
- Khi đã bắt đầu ghi bài lên Firestore, nút chuyển **Đang lưu** (không thể hủy quá trình commit). Đây là ranh giới chống xóa nhầm bài đã đăng.
- Kiểm thử đồng thời hai tài khoản và tải video lớn; kiểm tra quota Cloudinary/Vercel.

## Mức xác minh

- Kiểm thử cú pháp TypeScript/TSX tĩnh và Node syntax, test source contracts + kiểm tra CRC của gói ZIP.
- Không chạy Android Gradle / EAS build, chưa triển khai Vercel hay truy cập Cloudinary/Firebase thật trong môi trường này; chưa xác nhận runtime hoặc hiệu suất trên máy thật.
