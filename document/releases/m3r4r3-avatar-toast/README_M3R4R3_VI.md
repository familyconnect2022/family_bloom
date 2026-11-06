# Family Bloom Android — M3R4R3 (bản tích hợp dựa trên R1)

**Nguồn gốc:** `FAMILY_BLOOM_ANDROID_A3R4_M3R4R1_STRUCTURE_GATE_FIX_FULL_2026-10-29.zip`.

**Quan trọng:** Bản R2 `FAMILY_BLOOM_ANDROID_A3R4_M3R4R2_ONBOARDING_TOAST_FIX_FULL_CODE_2026-10-30.zip` có tên trong thư viện nhưng công cụ không được quyền lấy dữ liệu ZIP gốc. Do đó bản FULL này **không phải** bản R2 đã hợp nhất và **không được tự động ghi đè** dự án R2 đang sử dụng. Muốn phát hành tiếp từ R2, cần cung cấp lại ZIP R2 dưới dạng tệp đính kèm truy cập được, rồi merge và chạy lại regression.

## Sửa lần này

1. Chọn/cắt avatar 1:1 vẫn sử dụng expo-image-picker. Khi kết quả picker trả về, state cập nhật ngay; mỗi ảnh có `previewRevision` mới để `expo-image` tạo image view mới, không dùng cache ảnh khi preview. Không phải đợi upload trước khi xem ảnh. Sửa cả màn tạo/sửa profile và BloomInputAvatar dùng trong cây gia đình.
2. Android cropper recovery được chặn bằng một intent có thời hạn và ticket; **hủy chọn ảnh không bao giờ lấy lại ảnh cũ qua getPendingResultAsync**. Kết quả chọn cũ bị bỏ nếu đã có lần chọn mới.
3. Tạo/sửa hồ sơ Firebase xong thì rời loading. Avatar được enqueue (AsyncStorage, UID-scoped), upload Cloudinary/Vercel/Firestore async trong JS khi app còn hoạt động. Nếu quá trình bị gián đoạn, thử đồng bộ lại khi app trở lại foreground, nếu đường dẫn ảnh địa phương vẫn tồn tại. Khi thất bại hồ sơ đã lưu vẫn được giữ và toast cảnh báo hiện ra. Không tuyên bố upload hoàn tất trước khi máy chủ xác nhận.
4. Chống avatar A ghi đè avatar B bằng last-request-id, kiểm tra ngay sau upload và ngay trước Firestore batch commit. Ảnh đã upload nhưng không còn được chọn chuyển sang cơ chế `cleanup_pending` + Vercel cleanup. Xóa avatar sẽ hủy pending request và chỉ dọn ảnh cũ sau khi hồ sơ đã được cập nhật.
5. Cập nhật màu toast chung: success xanh, info xanh dương, warning vàng, error đỏ, notification tím. Rà soát static 191 lời gọi `showToast` toàn `src` và gán kiểu trực tiếp cho các trường hợp thiếu khai báo; các trường hợp `parseAppError` giữ phân loại động từ errorService.
6. Không thay đổi mã Web, Firebase Rules, Vercel, Render, package ID hoặc scripts Build & Share cũ.

## Cách kiểm thử / lệnh

- `npm run avatar:check` — 15 static/contract guards, 5 MIME cases, dynamic background queue và audit 191 toast calls.
- `node scripts/maintenance/check-project-structure.js`
- `node scripts/setup/check-expo-route-uniqueness.cjs`
- `node scripts/tests/release/test-m3r2-avatar-contract.cjs`
- `node scripts/tests/release/test-m3r3-graph-avatar-security.cjs`
- `node scripts/tests/release/test-h25r2r1-build-share-regression.cjs`
- `node scripts/tests/release/test-a3r4m3r1-media-security.cjs`

## Kịch bản thử thủ công APK Android

1. Tạo hồ sơ, lần lượt chọn/cắt A→B→C thật nhanh. Khung phải hiển thị ảnh mới ngay và không lùi về ảnh cũ; hủy chọn không thay ảnh hiện có.
2. Lưu hồ sơ bằng mạng chậm: dữ liệu tên/phân nhóm được lưu trước, điều hướng vẫn hoàn tất; avatar cập nhật khi Cloudinary/Vercel xác nhận.
3. Thay avatar ở hồ sơ cũ, đổi B ngay khi A upload; đảm bảo chỉ B trở thành avatar cuối cùng và record A được dọn.
4. Bỏ avatar khi đang upload để đảm bảo request cũ không tái gắn.
5. Đóng/mở ứng dụng khi ảnh đang upload: hệ thống thử tiếp tục nếu crop URI còn truy cập được; nếu bộ nhớ đệm Android đã xóa, cần chọn lại ảnh.
6. Thử toast info (xanh dương), success (xanh lá), warning (cam), error (đỏ), notification (tím) ở nhiều màn; không dùng nền hồng cho thông báo thành công.
7. Kiểm tra regression trước đó ở tạo nhà, màn Welcome, đơn xin gia nhập, album, Firebase Rules và Build & Share trên *bản R2 đã hợp nhất*, không thay bằng bản R1-based này.

## Giới hạn xác thực

- Đã chạy test mã tĩnh, parser TS/TSX và mô phỏng bất đồng bộ; **chưa** build APK thật, chưa có Firebase/Cloudinary thực để upload E2E trên điện thoại.
- Chưa thể đối chiếu/diff với R2; không được gọi đây là R2 đã sửa xong.
- Upload async chạy trong tiến trình JavaScript: Android có thể tạm dừng/kill khi app chuyển nền. AsyncStorage chỉ giữ intent, không bảo đảm ảnh tạm của ImagePicker sẽ sống qua khởi động lại; tính năng retry là best effort.
