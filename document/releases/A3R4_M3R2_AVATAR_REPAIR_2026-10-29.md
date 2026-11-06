# Family Bloom Android A3R4/M3R2 — avatar sửa lưu hồ sơ

Mốc gốc: FAMILY_BLOOM_ANDROID_A3R4_M3R1_FULL_2026-10-29.zip. Phần Render Chess/Xiangqi và Web không bị sửa.

## Lỗi từ video
Google Photos chọn và crop rồi đóng; tại create-profile avatar vẫn chữ FC. Clip chỉ chứng minh triệu chứng trước khi bấm Lưu, không chứng minh riêng HTTP/Firebase.

## Sửa
- `useMediaUpload`: Google Photos Android chọn trực tiếp một ảnh, bỏ màn hình chỉnh/crop từ nhà cung cấp (tránh kết quả canceled sau crop); báo Bloom khi không nhận được URI. Ảnh tròn dùng center-crop trên UI.
- `cloudinaryService`: cả Moment và avatar tài khoản được signed bằng Vercel; folder user `family_bloom/users/{uid}/avatar`. Person avatars thuộc phả hệ chưa nằm trong đợt này.
- `mediaService.uploadManaged`: xác minh Cloudinary trước khi ghi trạng thái uploaded cho avatar.
- `profileService`: `avatarUrl`, `avatarPublicId`, `avatarAssetId` được lưu cùng Firestore batch với status attached. Có cơ chế cleanup đối với upload lỗi/thay ảnh.
- `create-profile`: nêu lỗi có thể hiểu được; hồ sơ không bỏ qua lỗi ảnh âm thầm. Có thể chọn 'bỏ ảnh' để lưu các trường hồ sơ khác.
- `profile`: thêm chọn/đổi/bỏ avatar trong chỉnh sửa hồ sơ.
- `firestore.rules`: user avatar mới phải tham chiếu Cloudinary asset đã confirm; khóa danh tính asset sau confirm, hạn chế người dùng sửa publicId. Một dấu đóng ngoặc thiếu từ bản quy tắc gốc ở `/families/{familyId}/joinRequests/{uid}` cũng được bổ sung.

## Thứ tự bắt buộc
1. Sao lưu rules, nguồn Android, Vercel và ENV. Deploy rules mới, xác nhận console/CLI báo thành công.
2. Cập nhật Vercel Media M3R2 bằng BAT riêng, commit/push repo Vercel Media, xác nhận deployment Ready.
3. Cập nhật Android M3R2 bằng Family_Bloom_AUTO_UPDATE_FULL.bat, kiểm tra ENV EXPO_PUBLIC_MOMENT_MEDIA_API_URL, build và cài APK mới.
4. Test chọn ảnh Google Photos, vào hồ sơ mới, đổi avatar, bỏ avatar, tạo/hủy Moment, truy cập không đúng UID, đối chiếu Cloudinary/Firestore.

Không chuyển ảnh cũ, không sửa Render. Cloudinary URLs vẫn có thể công khai; chưa triển khai bảo mật delivery.

## Kiểm tra offline
- Vercel: 29/29 unit, npm run check.
- Android: A3R3 Moment 11/11, A3R4 Cloudinary 10/10, Source structure 19/19, H25 preflight 10/10.
- Transpile TS/TSX syntax 9/9.
- Firestore Rules đã kiểm tra dấu ngoặc; chưa có Firebase emulator/Rules compiler hay kiểm thử mạng.
- Chưa build APK/Gradle, chưa triển khai production. Version native không tăng vì khóa identity trong nhiều script build H25 hiện tại; mọi APK mới phải được build lại đúng mã đã cập nhật.
