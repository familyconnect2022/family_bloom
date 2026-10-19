# Video review — 6451, 6452, 6453

- `6451.mp4`: lần đầu vào Chess, asset/piece có giai đoạn khởi tạo sai kích thước, những lần sau ổn hơn. Giả thuyết phù hợp: decor rail hidden bắt đầu 1×1 hoặc partial first layout, cần gate đúng kích thước và asset.
- `6452.mp4`: màn hình thay đổi theo diễn tiến Chess, chưa đủ để kết luận server vi phạm lượt. Kiểm tra đường authoritative delta và client optimistic/premove.
- `6453.mp4`: trong khi đồng hồ bên người chơi tiếp tục chạy, người dùng thấy quân thay đổi bất thường. Đây là tín hiệu cảnh báo lệch bàn; so sánh PGN/revision và bot server log là bước cần để phân biệt Bot đi trái lượt với client vẽ premove giả định.

Kết luận kỹ thuật: phát hiện premove speculative FEN đã làm việc hiển thị không tuân theo một nguồn authoritative duy nhất. Đổi về chỉ vẽ authoritative FEN + một nước in-flight optimistic của chính người chơi, queued premove chỉ highlight. Server vẫn kiểm tra thứ tự/lượt/UID/revision trên mỗi nước đi và Bot timer được tăng kiểm tra. Video **chưa đủ** để khẳng định server từng chấp nhận Bot move không hợp lệ.
