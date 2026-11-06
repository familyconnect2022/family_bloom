# R3R3D7R1 – Full bleed & vùng chữ an toàn

- Ảnh duy nhất: welcome-single-paper.webp, resizeMode=cover, phủ kín màn hình.
- Tọa độ chữ bám theo cùng phép scale/offset *cover* của ảnh.
- Khung chữ luôn được cắt tại hai viền trang trí in trên tờ giấy và mép thiết bị (>=17dp).
- Nếu khung hữu dụng quá hẹp/thấp thì dùng card giấy dễ đọc trên ảnh cover; không để chữ lấn ra hoa văn.
- Chữ viết tay mặc định trên Android dùng typeface hệ thống `casual` (không cần tải font qua mạng), có nút `Chữ rõ hơn` để đổi sang sans-serif.
- 14 đoạn Thư Ngõ, scroll, footer cố định, xác nhận đọc và guard Home giữ nguyên.
- Có thể bị crop nền gỗ/đồ trang trí theo tỷ lệ máy; việc crop nội dung giấy sẽ kích hoạt cắt vùng chữ an toàn hoặc fallback.
- Chưa xác nhận bằng APK trên máy Android thật.
