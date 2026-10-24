# FAMILY BLOOM H25R2R7R2 — CẢ NHÀ CÙNG GIẢI (23/10/2026)

## 1. Chức năng đã tạo

- **Góc học tập → Cả nhà cùng giải**: lối vào riêng, vẫn giữ Kho bài học Bloom Content Studio.
- **Danh sách**: đọc theo trang 15 câu, `FlatList` ảo hóa, tìm/lọc trên dữ liệu đã tải, cache nhẹ riêng theo gia đình, không tạo realtime listener ở root.
- **Câu hỏi**: tiêu đề, môn, lớp 1–12, văn bản, các khối công thức, tối đa 3 ảnh. Ghi Firestore theo gia đình.
- **Bài giải**: nhiều khối văn bản/công thức, ảnh, lời giải của nhiều người, bình luận theo từng lời giải, thả tim theo UID, người hỏi chọn lời giải hữu ích.
- **Bản nháp**: lưu riêng trên máy theo UID + familyId + câu hỏi/bài giải; ghi trễ 900 ms khi đang soạn. Không ghi Firestore theo mỗi ký tự.
- **Công thức**: trình nhập Native với 12 mẫu (phân số, căn, lũy thừa, chỉ số, tổng, tích phân, vectơ, Hóa học). Lưu **TeX gốc**. Trình hiển thị Native gọn, dựng phân số theo tử/mẫu và chuyển ký hiệu phổ biến sang Unicode. Có thể sửa khối công thức trước khi đăng.
- **Ảnh**: dùng dịch vụ Cloudinary hiện có; chỉ gọi picker khi bấm thêm ảnh và chỉ tải lên khi đăng; tối đa 3 ảnh và 8 MB mỗi ảnh trước upload.
- **Quyền**: Firestore `families/{familyId}/studyQuestions/{id}` và các subcollection `answers`, `comments`, `reactions`. Chỉ thành viên nhà đọc, viết; chỉ tác giả câu hỏi có thể chọn lời giải.

## 2. Bảo vệ hiệu năng

- Không sửa root global listeners, không sửa Chess, Xiangqi, Phả hệ hay Tab lifecycle.
- Không có WebView/MathLive/KaTeX tải lúc khởi động; không thêm dependency native.
- Không load ảnh/công thức trong feed; các đoạn dài hiển thị ngắn; 15 bản ghi một trang.
- Bình luận chỉ truy vấn khi mở từng lời giải; không tải toàn bộ khi vào danh sách.
- Là tính năng opt-in ở màn học tập; rời màn không duy trì realtime listener.

## 3. Giới hạn đã biết — chưa khẳng định hoàn thành

- Trình soạn **Native nhẹ là bản đầu**, KHÔNG phải MathLive đầy đủ: chưa có chế độ soạn thảo ký hiệu kéo-thả chuyên nghiệp hoặc cân bằng phương trình cấu trúc phức tạp. Các công thức TeX có cấu trúc phức tạp hơn tập hỗ trợ sẽ hiện qua fallback dễ đọc, có thể chưa đẹp tuyệt đối.
- Chưa có chỉnh sửa/xóa bài đã đăng, chưa có tìm kiếm toàn bộ Firestore phía máy chủ, chưa có bảng thống kê lượng tim/bình luận. Có phân trang và lọc dữ liệu đã tải.
- Chưa chạy benchmark RAM/FPS trên thiết bị Android hoặc thử kết nối Firebase thật từ hai tài khoản. Các kết quả source/VM test không thay thế thiết bị.
- Chưa build APK Gradle ở môi trường này; phải chạy Build & Share Windows để xác nhận bản phát hành.

## 4. Firestore Rules — BẮT BUỘC TRIỂN KHAI

Bản này thêm collection mới. **Nếu không deploy Rules trước, Family Bloom sẽ nhận `permission-denied`.** Sau Auto Update, đăng nhập Firebase CLI trên máy tính rồi chạy:

`scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat`

Script hiện có trỏ Firebase project `family-connect-4184f`; xác minh đó là dự án bạn muốn cập nhật trước khi xác nhận. Script deploy toàn bộ `firestore.rules` mới, không xóa dữ liệu. Không yêu cầu Blaze. Các câu hỏi/bài giải không tự động lấy nội dung từ Bloom Content Studio.

## 5. Cập nhật dự án

1. Giải nén FULL ZIP ra **thư mục riêng** ngoài project cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`. Script preflight mới kiểm tra Hỏi đáp trước khi sao lưu/overlay và không cần TypeScript cài sẵn.
3. Chạy deploy Firestore Rules như mục 4 (một lần cho collection mới).
4. Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`, cài APK mới. Android versionCode vẫn `143042` vì không đổi phần Native; tên release mã nguồn là **H25R2R7R2**.
5. Nếu sử dụng EAS Update, có thể xuất OTA phần JavaScript sau khi Rules đã deploy, nhưng cần đúng runtime/channel hiện tại.

## 6. Checklist kiểm thử thực tế 2 tài khoản

- [ ] Mở Home, 5 tab, Phả hệ và 2 trò chơi; so sánh thời gian khởi động/chuyển tab/FPS/RAM với bản R7R1.
- [ ] Mở Góc học tập → Kho bài học vẫn hoạt động, nút “Cả nhà cùng giải” xuất hiện.
- [ ] Tài khoản A tạo câu hỏi Toán 9 có `x²`, phân số, ảnh; tài khoản B nhìn thấy.
- [ ] Tài khoản B tạo bài giải, viết công thức Hóa, bình luận; tài khoản A nhìn thấy và đánh dấu lời giải.
- [ ] Mỗi tài khoản thả/bỏ tim riêng, refresh vẫn đồng bộ.
- [ ] Tạo câu hỏi chờ, thoát và quay lại thấy bản nháp; sau khi đăng không còn bản nháp.
- [ ] Chuyển sang gia đình khác: không xem được bài gia đình trước.
- [ ] Mở 100–200 câu dữ liệu thử bằng phân trang; cuộn/chuyển tab, quan sát RAM và độ mượt.
- [ ] Thử mạng yếu, ảnh trên 8MB, mất kết nối, Rules chưa deploy: giao diện hiện lỗi chứ không treo app.

## 7. Bộ kiểm thử nguồn

- `node scripts/tests/release/test-h25r2r7r2-study-qa.cjs` — source-only, không cần npm install.
- `node scripts/tests/release/test-h25r2r7r2-study-runtime.cjs` — mock Firestore và công thức, cần TypeScript từ node_modules.
- Các bài kiểm thử cũ cho Chess/Native/Auto Update phải giữ nguyên.
