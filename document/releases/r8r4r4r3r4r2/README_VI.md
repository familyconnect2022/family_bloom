# FAMILY BLOOM R8R4R4R3R4R2 — WEBP / HEADER 35% / LIVE THEME / RETRY

## Gốc phát triển
- Tiếp tục trực tiếp từ FULL CODE R8R4R4R3R4R1, không thay đổi backend Render/Vercel, luật chơi hoặc Web.
- Cùng Android `versionCode=143044`; JS/asset có thể thử trên Development Build tương thích, Release APK cũ không tự cập nhật.

## Thay đổi
- 24 tranh hero bốn theme và 8 lớp sương: PNG -> WebP RGBA có Alpha, ảnh local qua static `require`, không tải từ Firebase hay Cloudinary. 24 thumbnail trong màn chọn theme vẫn là PNG.
- Không phóng thumbnail 192 px lên header. `expo-image` hiển thị nguồn đầy đủ, `transition=0`, cache `memory-disk`.
- Thêm nạp sẵn tuần tự chỉ sáu hero của theme hiện tại qua `Image.loadAsync`, sau lượt render đầu tiên; giải phóng tham chiếu theme cũ khi chuyển màu; thất bại nạp sẵn không chặn hiển thị.
- 8 PNG chuyển sắc nhỏ cho chữ trong header, không dùng khung kính mờ. Header chính và con dùng 35% chiều cao cửa sổ khả dụng, chữ nằm khoảng giữa bên trái; sương không chặn chạm.
- Sửa cached list callbacks/headers ở Khoảnh khắc, Gia phả theo `themeRevision` mà không remount Stack.
- Sửa module-level static `TONES` của `LessonRichView`: đọc token động bằng getter thay vì giữ màu Rose cho đến lần khởi động lại.
- Retry Firebase: không còn bỏ qua nút bấm khi lượt cũ ở loading. Lượt mới dùng requestId của hồ sơ, hủy listener cũ của membership theo effect; không dùng cache offline để qua gate UID/profile/membership. Tạo feedback loading trên nút bấm mới.
- Metro đăng ký WebP tĩnh. Preset Rose và đồng bộ `users/{uid}` appearance Firestore giữ nguyên cơ chế từ R8R4R4R3R4.

## Giới hạn quan trọng
- Các bài test mã nguồn và asset có thể đạt nhưng không chứng minh hoàn toàn lỗi trên điện thoại. Cần APK/Dev Client Android thật để thử nghiệm theme ngay, mở Thư Ngõ, ảnh offline và retry sau khi mất mạng.
- Trong Expo development mode, ảnh do Metro phục vụ cần Metro chạy; Release APK chứa sẵn asset. Không đánh đồng việc mất mạng/Metro trong dev với trạng thái Release offline.
- Không kiểm chứng Firestore Security Rules triển khai hoặc nội dung preference trên Firebase thật.
- Tệp PNG nguồn trước cập nhật có thể còn trong thư mục dự án cũ khi sử dụng overlay; các file này không còn được tham chiếu bởi bộ bundler.

## Kiểm tra cốt lõi
- `node scripts/tests/release/test-r8r4r4r3r4r2-webp-live-theme-retry.cjs`
- `node scripts/maintenance/check-project-structure.js`
- `node scripts/setup/check-expo-route-uniqueness.cjs`
- Chạy Auto Update preflight với bản gốc R8R4R4R3R4R1; bảo toàn .env.
