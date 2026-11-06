# Family Bloom R11R3 Motion Recovery — từ R11R2, không ghi đè R10 backup

## Đã sửa trong app thực
- Khôi phục chính xác mã dựng BloomCard và BloomQuickAction từ R10; không bọc animated Pressable quanh card root.
- Home sự kiện: từng ticket riêng (tối đa 3), không có card lớn bao ngoài; tiêu đề 2 dòng.
- Home Hero + số liệu giới thiệu: chỉ phát một lần khi Home thực sự được focus (không chạy ở tab đang ẩn).
- Thư Ngõ: khi ảnh giấy offline load xong, hiệu ứng hiện giấy và tiêu đề; không thay đổi hình nền, lề chữ, vùng chạm, CTA, session/welcome gate.
- Trang đồ thị Gia phả: Hero giới thiệu nhẹ, KHÔNG bọc graph canvas hay cử chỉ pan/zoom.
- Bloom Magic: chỉ một cụm cánh hoa nhỏ trong success toast khi việc cập nhật gia phả đã hoàn thành; không phát lúc đang xử lý/thất bại.
- Developer Tools Motion Lab giữ nguyên 3 demo; bản demo cây nảy mầm toàn phần chưa đưa lên canvas thực, các animation Moment/Books/Games vẫn chưa triển khai.

## Điểm test ưu tiên trên Android
1. Chọn theme Rose / Heritage / Garden / Midnight và light/dark, vào Home, Cây nhà, Nhà Mình: mọi card có nền, viền, bóng, vùng chạm như R10.
2. Trên Home, một/tối đa ba event xuất hiện dưới dạng ticket riêng, không có card lồng nhau.
3. Force close mở lại app khi tài khoản được phép vào Home: Hero và các số liệu xuất hiện một lần, không nháy trắng; vuốt và chuyển tab bình thường.
4. Tài khoản thật sự cần Thư Ngõ: sau hình giấy sẵn sàng, tiêu đề hiện nhẹ; vẫn đọc/cuộn được và bấm Bước vào mái nhà bình thường. Tài khoản đã xác nhận Thư Ngõ sẽ không bị ép xem lại.
5. Cây gia phả: quay lại trang, pan/zoom nhanh, mở node/detail; không thêm hiệu ứng vào canvas.
6. Tạo/sửa người trong quản lý gia phả thành công: toast có hiệu ứng nhỏ; nếu lỗi thì không có.
7. Sống động / Dịu nhẹ / Tĩnh, giảm chuyển động Android; Tĩnh tắt hiệu ứng trang trí.
8. Login, no-profile, multi-family, Firebase, upload Moments, chess/xiangqi không bị ảnh hưởng.

**Giới hạn kiểm chứng:** Chỉ có kiểm tra mã nguồn và mô phỏng trình cập nhật. APK Release và hành vi thực tế trên điện thoại vẫn phải test.
