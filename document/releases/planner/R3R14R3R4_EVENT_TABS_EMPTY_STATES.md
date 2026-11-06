# Family Bloom R3R14R3R4 — Sự kiện / Lịch — 27/10/2026

Nền: R3R14R3R3 FULL CODE 1.3.33 / 143043; giữ nguyên versionCode để không phá các kiểm tra nhận dạng native H25, đây là bản cập nhật mã JS/TSX. Muốn phát hành APK cập nhật hãy build lại, không nhầm phiên bản APK cũ.

## Đã sửa

- Tab Lịch: bỏ card "Thêm sự kiện", giữ lịch tháng, ngày đã chọn, danh sách sự kiện từng ngày.
- Tab Sự kiện: đưa một card "Thêm sự kiện" lên đầu SectionList, sử dụng composer có sẵn; không tạo service mới.
- Nếu "Sắp tới" rỗng: card hồng-trắng bo tròn, biểu tượng lịch, mô tả thân thiện và nút nhỏ "Thêm sự kiện đầu tiên".
- Nếu "Đã qua" rỗng: card hồng nhạt với biểu tượng trái tim và thông điệp lưu giữ kỷ niệm, không lặp CTA.
- Chờ snapshot Firebase: trạng thái "Bloom đang xếp lịch…", không nháy empty state trong lúc loading.
- Tạo xong: giữ tab Sự kiện thay vì tự chuyển về Lịch. Tạo mới từ tab Sự kiện đặt ngày mặc định hôm nay, không kế thừa ngày xem trước ở Lịch.
- Giữ nguyên phân trang, kiểm duyệt, thông báo sự kiện, Firebase, Render và Vercel; không cần migration hoặc deploy Rules.

## Các gate được cập nhật

- `test-h25r2r7-super-bloom-unified-ui.cjs`: giữ đầy đủ các assertion cũ nhưng kiểm tra CTA ở Events thay cho Calendar.
- `test-h25r2r7r1-bulletin-deferred.cjs`: bảo vệ CTA của Moments/Events và yêu cầu Events placement.
- `test-r3r14r3r4-planner-event-layout.cjs`: 8 hợp đồng tĩnh mới.
- Gate Planner được nối vào Auto Update **trước backup/copy** và CLEAN_APPLY_FULL; chạy độc lập: `npm run planner:events:check`.

## Giới hạn xác minh

Không có Windows/Android SDK/Firebase credentials trong môi trường phát hành này. Node/static/transpile không thay cho cài APK và kiểm thử layout trên màn hình nhỏ/lớn. Các ảnh thiết kế chưa phải ảnh chụp APK chạy thật.
