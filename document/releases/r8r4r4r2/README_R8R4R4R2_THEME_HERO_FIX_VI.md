# Family Bloom R8R4R4R2 · Sửa cập nhật theme & ảnh hero

Mã nguồn kế thừa FULL CODE R8R4R4R1 (đã tích hợp R8R4R2/R8R4R3/R8R4R4), chỉ cho Android. Không thay đổi Web, server Render/Vercel, dữ liệu Firebase, logic bàn cờ, đường upload Moment hoặc phiên bản Android Native (`versionCode=143044`).

## Căn cứ thực tế

Video người dùng `68804.mp4` cho thấy khi đổi theme phần ảnh Home có thể đổi xanh, nhưng một số thành phần con giữ màu của theme trước; tranh ở các màn con cũng thiếu rõ nét vào lúc điều hướng. Đây là phát hiện giao diện, không phải số liệu profiler về thời gian tải.

## Đã cập nhật

- Thêm `useBloomThemeRevision()` cho các component chức năng dùng chung đã thiếu cơ chế đăng ký đổi theme (39 tệp, xem `SHARED_THEME_SUBSCRIBERS.json`), gồm card, nút, ô chọn, modal, toast, header chung, một số thành phần gia đình, Moment và sự kiện. Chỉ phát tín hiệu re-render khi **cấu hình giao diện thay đổi**, không khi người dùng chỉ bấm tab/card.
- Chuyển thêm các lớp màu hồng/trắng cố định trên Family, Planner, Moment, Home và BloomPageComponents sang `COLORS` semantic. Giữ nguyên màu media, ảnh người dùng và màu có ý nghĩa cảnh báo.
- 24 ảnh hero giữ **mỗi khu vực × bốn theme**, giảm kích thước từ 1080×700 xuống 900×583 RGBA PNG, giữ alpha chuyển tiếp. Không lấy ảnh Rose dùng cho Garden.
- Thêm 24 hình thumbnail nhỏ 300×194 được sinh từ từng ảnh hero, dùng làm placeholder ngay khi mở màn, tránh vùng ảnh trắng/nhạt khi chờ giải mã ảnh chính.
- Hero dùng đúng tỷ lệ nguồn bằng `contain` thay cho `cover` theo chiều cao cứng; tránh phóng to/cắt mất bối cảnh. Thêm `priority=high`, `cachePolicy=memory-disk`, `recyclingKey` theo scene + theme và `transition=0` để tránh ảnh theme cũ còn hiện khi đổi.
- Trang chọn theme dùng thumbnail **cùng nội dung tranh tương ứng** và ảnh chính giống registry của màn hình thật.
- Điều chỉnh test lịch sử vốn yêu cầu `cover` thành tiêu chí hợp lệ mới `contain` + giữ tỷ lệ; không bỏ qua check về bảo toàn fade, ảnh thực, bốn theme.
- Bổ sung test riêng 36/36 và bắt buộc chạy ngay trong preflight Auto Update.
- Thêm định danh nguồn R8R4R4R2 vào source-lineage allowlist, vẫn chấp nhận các baseline đã được xác thực trước đó; không bỏ qua gate.

## Phần cần kiểm chứng trên APK và chưa tuyên bố đã xong

- Chưa có kết quả profiler Android về First Image Paint, bộ nhớ ảnh hay tốc độ chuyển tab/card. Giảm byte ảnh không chứng minh tốc độ Android chắc chắn tăng tương ứng.
- Vẫn còn những module có màu trang trí cố định (nhất là giao diện game và các chi tiết chức năng hiếm gặp). Không tuyên bố 92/92 màn đã đạt Living Storybook.
- Chưa thử trên Windows thật, chưa build APK, chưa deploy Rules. Không build bằng ZIP R8R4R4R1 cũ nếu bạn muốn nhận bản vá này.

## Cập nhật từ R8R4R4R1

1. Giải nén FULL ZIP mới ở một thư mục riêng bên ngoài project đang dùng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, để chương trình backup và chép đè sau khi preflight PASS.
3. Chỉ build APK sau khi Auto Update báo PASS. Kiểm tra đổi các theme ngay trong Home, trang Gia đình, Moment, Sự kiện và Cài đặt; bật/tắt dark mode và mở lại các trang con.
4. Nếu còn thành phần giữ màu cũ, ghi lại màn, theme trước/sau và gửi video. Những lỗi đó cần được đối chiếu trên APK, không suy diễn rằng mọi component đã được sửa.
