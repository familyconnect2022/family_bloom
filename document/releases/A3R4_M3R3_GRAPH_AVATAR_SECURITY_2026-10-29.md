# Family Bloom Android M3R3 — Đồng bộ avatar tài khoản + phả hệ

Nguồn: Android A3R4–M3R2 FULL CODE. Phạm vi chỉ Android và Firestore Rules. Không chỉnh Web hoặc Render Chess/Xiangqi.

## Thay đổi

- Khôi phục bước cắt ảnh avatar bằng Expo ImagePicker (`allowsEditing:true`, tỷ lệ 1:1). Cùng `BloomInputAvatar` ở hồ sơ cá nhân và biểu mẫu người trong phả hệ; hủy cắt không làm mất ảnh cũ. Kiểm tra lại trên Google Photos / thiết bị thật là bắt buộc.
- Ảnh người phả hệ từ nay **bắt buộc ký qua Vercel**, không dùng unsigned preset. Sau upload, `/api/media/confirm` xác minh metadata Cloudinary trước khi ghi Firestore.
- Mỗi avatar phả hệ có `media_assets/{assetId}` sở hữu bởi người upload và trỏ đúng `families/{familyId}/persons/{personId}`. `setPersonAvatar()` cập nhật đồng thời `person.avatarUrl`, `person.avatarAssetId` và `media_assets.status=attached` trong transaction, tránh ảnh bị mồ côi do ghi rời rạc.
- Firestore Rules kiểm tra người sửa là graph admin, ảnh đã được Vercel xác minh, `publicId` và URL không bị tráo. Những avatar phả hệ cũ được giữ nguyên URL và vẫn có thể chỉnh sửa các thông tin khác; chỉ avatar mới hoặc khi thay avatar mới bắt buộc signed.
- Ảnh cũ có asset id được yêu cầu cleanup **sau khi** giao dịch lưu avatar mới thành công. Vercel vẫn kiểm tra tham chiếu trước khi xóa; nếu uploader ảnh cũ là người khác thì sẽ bị từ chối, Cron mới được phép dọn ảnh không còn tham chiếu sau kiểm tra.
- Lệnh gắn avatar phả hệ luôn sử dụng Firestore transaction được Rules kiểm soát, kể cả khi Cloud Functions cho các thao tác graph khác đang bật; cho đến khi gateway graph được bổ sung hợp đồng `avatarAssetId`.

## Thứ tự production

1. Backup dữ liệu và triển khai `firestore.rules` từ mã Android M3R3. **Không** thay toàn bộ rules bằng đoạn ngắn rời rạc.
2. Cập nhật mã Vercel Media M3R3 độc lập, quyền API key tối thiểu theo README_M3R3_SECURITY_VI.md phía Vercel. Kiểm tra sign/confirm/cleanup/Cron với ảnh thử.
3. Cập nhật Android bằng `Family_Bloom_AUTO_UPDATE_FULL.bat`, xác minh thành công rồi `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Cấu hình `EXPO_PUBLIC_MOMENT_MEDIA_API_URL` đúng base URL server đang chạy.
4. Trên APK mới, thử: crop, chọn ảnh; avatar cá nhân tạo mới & sửa; avatar người phả hệ tạo mới & sửa; bỏ avatar; đăng Moment, hủy Moment; chuyển tài khoản/gia đình; xóa ảnh cũ sau thay.
5. Đảm bảo người không phải admin không thể thay ảnh người trong gia đình; admin gia đình A không thể thay avatar của gia đình B.

## Giới hạn

- Static tests và transpilation không tương đương Gradle build hay test end-to-end.
- Cloudinary đang phân phối URL `upload` công khai; ngăn thay/xóa là một phần của bảo mật, **chưa phải bảo mật quyền xem**. Muốn giới hạn xem theo gia đình cần signed delivery `authenticated` và cập nhật tất cả màn hình dùng URL.
- Đừng đưa service account, `.env`, API Secret hay password vào ZIP chia sẻ/GitHub.
