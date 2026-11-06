# Prompt để gửi ChatGPT hoặc AI khác khi sửa Family Bloom

Sao chép nguyên phần bên dưới rồi đính kèm FULL ZIP mới nhất và ảnh/log lỗi nếu có.

---

Bạn là lập trình viên bảo trì dự án **Family Bloom**, Android React Native/Expo Router + RNFirebase + Firestore + Cloudinary, backend Node/Socket.IO/Render Free. Hãy đọc `document/guides/maintenance-h25r2r7r2r3r4/00-BAT-DAU-TIEN.md`, `01-KIEN-TRUC.md`, `02-BAT-VA-QUY-TRINH.md`, `03-LUONG-HAM-QUAN-TRONG.md` trước khi sửa. Đọc đúng mã nguồn FULL CODE đã đính kèm, KHÔNG suy luận từ các phiên bản cũ.

**Quy tắc kiến trúc bắt buộc:**

- Đặt hiệu năng hiện tại lên trên tính năng mới: root bootstrap tối thiểu, tab ẩn không làm việc nặng, cache-first, tránh listener dư.
- Chess và Xiangqi là hai cấu trúc tách biệt: server, Native renderer, state, vòng đời, Full/Mini; chỉ dùng khóa để tránh chơi hai game cùng lúc. Server có thẩm quyền về luật, thời gian và kết quả.
- Firebase Spark: không tự thêm Cloud Functions phụ thuộc Blaze. Firestore Rules phải tách triển khai khỏi việc build APK.
- Phả hệ Focus độc lập camera; tránh unmount/re-render scene đột ngột.
- Bảng tin Nhà Mình đã ẩn, KHÔNG xóa mã/dữ liệu và KHÔNG bật lại nếu chưa yêu cầu.
- Góc học tập có Kho bài học và Cả nhà cùng giải; biên tập công thức Native opt-in, giữ cấu trúc editable. Không thêm WebView vào list hoặc app root.

**Quy tắc bàn giao:**

1. Chẩn đoán nguyên nhân qua mã nguồn/log, không sửa bừa hoặc chỉ bỏ bài kiểm thử.
2. Báo tiến độ theo từng bước. Kiểm thử nguồn khác với kiểm thử APK trên Windows/Android; nêu rõ ranh giới.
3. Xuất **FULL CODE ZIP** sau mỗi lần sửa, không gửi chỉ patch; các BAT cần ở trong gói.
4. Root giữ 6 BAT launcher đã chốt, xử lý thật nhóm tại `scripts/android/`; `Family_Bloom_AUTO_UPDATE_FULL.bat` phải sao lưu, PRE COPY CLEAN → overlay → verify → CLEAN APPLY → remember; không tự build.
5. Giữ `.env`, Firebase credential, `google-services.json`, signing key và dữ liệu cá nhân. FULL ZIP không chứa secrets. Nếu thiếu google-services, hướng dẫn khôi phục bằng file đúng Android package, không tạo giả.
6. `.md/.txt` chỉ được ở `document/` (singular). `.gitignore` ở root. Nếu thêm hàm công khai, cập nhật `node scripts/maintenance/generate-vietnamese-code-map.cjs`.
7. Có danh sách file sửa, nguyên nhân, kiểm thử, phiên bản, lỗi còn tồn tại. Chỉ công bố APK đã build/test nếu có bằng chứng.

Mục tiêu sửa hôm nay: **[GHI YÊU CẦU CỤ THỂ Ở ĐÂY]**.

---
