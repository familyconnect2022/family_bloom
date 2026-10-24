# H25R2R7R1 — Ẩn Bảng tin Nhà Mình, giữ nguyên để phát triển sau

Nguồn phát hành: Family Bloom H25R2R7. Đây là bản FULL CODE dành cho Auto Update, không phải bản vá lẻ.

## Đã thực hiện

1. `src/constants/featureFlags.ts`: `ENABLE_FAMILY_BULLETIN = false`. Đây là công tắc duy nhất để mở lại khi tính năng hoàn thiện.
2. Android `src/app/(tabs)/play.tsx`: ẩn card Bảng tin và đường điều hướng của card; giữ Quỹ gia đình, Cùng quyết định, Trò chơi, Góc học tập, Thì thầm, Hộp thời gian, Bếp.
3. `src/app/(home)/(board)/home-board.tsx`: giữ toàn bộ nội dung, nhưng khi công tắc tắt, deep link cũ chuyển về tab Nhà Mình trước khi component dữ liệu được mount. Không truy vấn Firestore từ trang Bảng tin.
4. Web `src/web/pages/PlayWebPage.tsx`: ẩn mục Bảng tin và đặt Trò chơi làm trang mặc định. Code của chức năng Feed cũ vẫn được giữ.
5. Nút Thêm kỷ niệm và Thêm sự kiện dùng chung `BloomActionCard`: chiều cao tối thiểu từ 100 xuống 86; icon từ 57 xuống 48; font tiêu đề từ 17 xuống 15.5; margin dưới 14 để không dính card bên dưới.
6. Không tạo/xóa collection, không di chuyển dữ liệu, không thay đổi luật Chess/Xiangqi, không thay đổi Native/Kotlin, không thêm quyền Firebase.

## Hướng phát triển tiếp theo (CHƯA code)

Ưu tiên Góc học tập Super Bloom, bổ sung khu **Cả nhà cùng giải**: hỏi bài theo môn/lớp, lời giải từng bước, ảnh và soạn công thức Toán–Lý–Hóa bằng bàn phím trực quan. Không tự nhận phần này đã triển khai trong H25R2R7R1.

## Kiểm tra

- `node scripts/tests/release/test-h25r2r7r1-bulletin-deferred.cjs`
- `node scripts/tests/release/test-h25r2r7-super-bloom-unified-ui.cjs`
- `node scripts/setup/check-expo-route-uniqueness.cjs`
- `node scripts/maintenance/check-project-structure.js`

**Lưu ý:** Đây là mã nguồn đã kiểm tra tĩnh; cần chạy Auto Update và APK thực tế để xác nhận giao diện điện thoại. Bản sửa chỉ có JS/TS/UI, không cần build lại Kotlin; nếu muốn test bằng APK thì dùng BAT Build & Share như thường lệ.
