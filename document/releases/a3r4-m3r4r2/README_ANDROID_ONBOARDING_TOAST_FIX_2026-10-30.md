# Family Bloom Android A3R4–M3R4R2 · onboarding & toast · 2026-10-30

## Nguồn

- ZIP gốc: `FAMILY_BLOOM_ANDROID_A3R4_M3R4R1_STRUCTURE_GATE_FIX_FULL_2026-10-29.zip`.
- SHA-256 **tính từ tệp được cung cấp**: `7d20c70ba7affe07a5215a0cdcc8d1b39fe4803851004c6e26ce7c841899ef51`.
- ZIP gốc: `unzip -t` thành công, 1.457 mục. Không có SHA độc lập được cung cấp để đối chiếu người phát hành.
- Đây là bản FULL nguồn Android kế thừa nguyên vẹn từ ZIP gốc, KHÔNG phải patch overlay.

## Các vấn đề đã sửa tại mức mã nguồn

1. **Avatar khi tạo profile:** dùng chung bộ hiển thị `expo-image` trong BloomAvatarButton (cả tạo lẫn sửa), xử lý URI ảnh trả về sau crop; lưu tạm URI avatar đã cắt theo **UID Firebase** bằng AsyncStorage và khôi phục khi màn hình bị tái tạo; không ghi file lên đám mây cho tới khi người dùng nhấn Lưu; xóa bản nháp sau khi hồ sơ lưu thành công. Không thay đổi quy trình Cloudinary signed upload, Vercel confirm, Firestore media-assets atomic attach hoặc xử lý cleanup.
2. **Welcome sau khi tạo gia đình:** trước đây hàm tạo gia đình tự bật `activeFamilyId`, cho phép Root Navigator đưa tới Tabs và bỏ qua màn xác nhận. Màn tạo nhà giờ tạo membership **không kích hoạt ngay**, AuthContext tạm giữ cơ chế auto-switch một nhà trong quá trình này; người dùng đọc thông tin nhà/mã nhà và bấm “Vào nhà của mình” để `switchFamily` kiểm chứng membership, rồi mới bật Welcome Thư Ngõ. Nếu app bị kết thúc, cờ Welcome một lần được lưu theo UID+familyId và khôi phục sau khi vào nhà; bấm tiếp tục sẽ dọn cờ.
3. **Hai nút dính khi gửi đơn:** nhóm nút create/join tách khoảng cách cố định 14px, toàn chiều ngang, nút phụ outline dễ phân biệt; guard chặn gửi lặp trong lúc loading. Loading overlay không thay đổi.
4. **Toast Info giống Error:** các trạng thái `success`, `warning`, `error`, `info`, `notification` dùng tông nền/viền/chữ/thanh tiến trình riêng biệt trong BloomToast toàn cục. Info xanh dương, Error đỏ hồng, Notification tím. Trạng thái duyệt/từ chối đơn gia nhập được đánh dấu success/warning đúng ngữ nghĩa. `MomentUploadToast` là overlay tiến trình riêng, giữ nguyên theo yêu cầu không làm ảnh hưởng upload hiện tại.

## Những gì không thay đổi

- Web: giữ nguyên từng byte so với ZIP nguồn.
- 36 BAT gốc, trong đó `Family_Bloom_AUTO_UPDATE_FULL.bat`, `Family_Bloom_BUILD_APK_TO_SHARE.bat`, các BAT nested phục hồi Google Services và build/share: giữ nguyên từng byte.
- Firebase Rules, Cloudinary signer/API/Vercel và cấu hình máy chủ Render: giữ nguyên từng byte; không deploy hoặc đưa bất cứ thông tin bí mật mới nào.
- Khả năng phát hành/phiên bản APK giữ cấu hình nguồn gốc. Không tự thay package ID, signing hay SHA của Firebase.

## Kiểm thử có thể thực hiện trong môi trường này

- Giải nén và kiểm tra CRC ZIP đầu vào: PASS.
- `node scripts/tests/release/test-a3r4-m3r4r2-onboarding-toasts.cjs`: **20/20 PASS** (18 kiểm tra luồng + bảng màu thực thi + phân tích cú pháp các tệp TSX thay đổi).
- `node scripts/tests/release/test-m3r4-avatar-picker-and-progress.cjs`: **PASS** (10 source guards + 5 MIME cases).
- `node scripts/tests/release/test-m3r2-avatar-contract.cjs`: **10/10 PASS**.
- `node scripts/tests/release/test-m3r3-graph-avatar-security.cjs`: **13/13 PASS**.
- `node scripts/tests/release/test-h25r2r7r2r3r4-firebase-recovery.cjs`: **23/23 PASS**.
- `node scripts/setup/check-build-entrypoints.js`: **PASS**, 36 BAT, không có unmanaged scripts.
- `node scripts/maintenance/check-project-structure.js`: **19/19 PASS**.
- `node scripts/setup/check-expo-route-uniqueness.cjs`: **PASS**.
- Biên dịch cú pháp TypeScript/TSX bằng TypeScript transpileModule trên mã nguồn và scripts: **không có lỗi cú pháp**. Đây không thay thế typecheck đầy đủ.

## Kiểm chứng còn bắt buộc trước khi coi là hoàn tất thực địa

- **Chưa build APK Android/Gradle hay chạy trên điện thoại thật**: môi trường không có native Android SDK/Windows BAT và các node_modules cần thiết cho project. Cũng không chạy được `npm run typecheck` dựa trên toàn bộ node_modules; không khẳng định build success.
- **Chưa thực hiện request live tới Firestore/Cloudinary/Vercel**: không có session Firebase Auth hoặc thông tin xác thực dự án; kiểm thử hiện mới ở mức mã nguồn/contract. Không khẳng định triển khai Rules hay upload live thành công.
- Cần kiểm tra các ca sau trong APK Android sau khi cập nhật:
  1. Tạo tài khoản mới, chọn ảnh từ Google Photos, crop 1:1, quay lại: avatar phải được preview trước Save.
  2. Tắt/chuyển app khi đang crop, quay lại; avatar đã chọn phải khôi phục. Lưu profile, mở sửa profile và kiểm tra ảnh vẫn tồn tại.
  3. Tạo nhà mới: thấy thông báo tạo nhà thành công và mã nhà; nhấn “Vào nhà của mình” -> Thư Ngõ -> bấm tiếp tục -> Home. Thoát app trước khi nhấn vào nhà rồi mở lại: Thư Ngõ phải xuất hiện khi được vào nhà.
  4. Nhập mã nhà xin gia nhập, cả khi loading lâu và bàn phím đang mở: 2 nút vẫn cách nhau; chặn gửi lặp.
  5. Kích hoạt đủ 5 toast, xác nhận Info xanh dương và Error đỏ hồng, các toast từ onboarding dùng tone phù hợp.
  6. Upload avatar mới/xóa avatar và upload Moment: kiểm tra Cloudinary user folder, Vercel /sign + /confirm, media_assets và quyền Rules; kiểm tra Build & Share local trên Windows với file google-services.json của dự án đã cài đặt.

## Tệp thay đổi so với ZIP cũ

- `package.json` (thêm script xác minh riêng, không thêm dependency)
- `src/app/(profile)/create-profile.tsx`
- `src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx`
- `src/app/(family)/(membership)/family-gateway.tsx`
- `src/context/AuthContext.tsx`
- `src/components/ui/BloomToast.tsx`

Tệp mới: `scripts/tests/release/test-a3r4-m3r4r2-onboarding-toasts.cjs` và báo cáo này.
