# Family Bloom A3R4M3R1 — Android FULL CODE (29/10/2026)

Nền gốc: file người dùng tải lên `Family_Bloom_R3R14R3R8_A3R4_CLOUDINARY_403_DETAIL_FULL_CODE_2026-10-29(1).zip`. Giữ nguyên 2 BAT tại root, `scripts/android`, chess/xiangqi và cấu hình Render hiện tại. ZIP này KHÔNG chứa mã nguồn server Vercel và Render.

## Thay đổi quan trọng

- `firestore.rules` gốc và `scripts/firestore.rules` được đồng bộ thành một bộ quy tắc M3R1. Yêu cầu `momentMediaUploads/{assetId}` có trạng thái CONFIRMED, **đúng cả publicId và secureUrl** trước khi cho phép chuyển media sang uploaded/attached.
- Người dùng không thể tự thay publicId/secureUrl/thumbnailUrl của Moment đã tải/đăng. Không được tự khẳng định trạng thái `deleted`; backend xác nhận xóa. Hai collection nội bộ `momentMediaUploads`/`momentMediaRateLimits` chỉ Firebase Admin được ghi.
- Đối với kết quả delete-token ở client, Android chỉ giữ trạng thái `cleanup_pending`; Vercel vẫn được phép kiểm tra lại, xử lý upload hoàn tất trễ.
- Chữ ký tải ảnh từ API phải có cấu trúc hợp lệ. Luồng UI, toast, các trình xem ảnh, Chess/Xiangqi và cơ chế cập nhật/build Android không thay đổi.
- Cấu trúc Cloudinary đã thống nhất được giữ nguyên: `family_bloom/families/{familyId}/moments`; không chuyển/xóa 17 ảnh hiện có.

## Để chạy

1. Lưu 2 ZIP Android và Vercel vào **2 thư mục khác nhau**. Sao lưu dự án đang sử dụng; chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` từ ZIP Android FULL vào project Android cũ. Không dùng BAT Vercel cho project Android.
2. Deploy Firestore Rules ở root đúng Firebase project, ví dụ dùng `scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat`. Đọc Rules và xác định project trước khi deploy.
3. **Vercel Media M3R1 phải Ready** và API key Cloudinary có quyền create/read/delete. App đã mặc định dùng `https://vercelfamilybloommedia.vercel.app` nhưng nếu env/EAS khác cần trùng với Vercel production đang dùng.
4. Build APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` hoặc helper EAS như trước. Nguồn này chỉ sửa JS/Rules, giữ versionName/Code 1.3.33 / 143043 để không làm sai các bài test identity native; APK mới cần xác thực theo log/đường dẫn build trước khi cài.
5. Kiểm tra ảnh mới bằng một tài khoản thành viên, thử người ngoài gia đình, đăng/xóa, hủy upload, giả lập mất mạng. Không xóa dữ liệu production cũ để thử.

## Giới hạn còn lại

- Bảo mật upload, metadata, owner và delete; **không có nghĩa ảnh Cloudinary URL công khai chỉ người nhà mới xem được**. Chưa kích hoạt delivery `authenticated` cho ảnh cũ vì Android đang đọc URL `/upload` và sẽ mất ảnh nếu đổi ngay.
- Không thể chứng minh APK Gradle / deploy Firestore / POST Cloudinary thành công khi chưa chạy trên môi trường Android/Cloud thực tế. Lỗi 403 `missing permissions (actions=[create])` của Cloudinary là role/API key và cần cấp quyền thật trên dashboard.
- Vì ZIP Vercel Media M1 không có các hồ sơ mới `momentMediaUploads`, job Cron M3R1 **không tự ý dọn các ảnh M1 cũ** chỉ dựa vào tên thư mục. Bảo toàn dữ liệu được ưu tiên.
