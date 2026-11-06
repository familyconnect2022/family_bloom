# FAMILY BLOOM A3R2 — SỬA LỖI 17/19 KIỂM TRA CẤU TRÚC

Ngày: 29/10/2026

## 1. Nguyên nhân đã xác minh trên ZIP A3R1

AUTO UPDATE dừng ở `scripts/maintenance/check-project-structure.js` với `17/19 PASS`.
Hai bài FAIL là:

- `FAIL 01 - Root has zero Markdown/TXT documentation files`
- `FAIL 02 - All Markdown/TXT documentation lives under document/`

Nguyên nhân chung: tài liệu `HUONG_DAN_SUA_LOI_AUTO_UPDATE_A3R1.md` bị đóng gói ở thư mục gốc ZIP, trong khi bộ kiểm tra cấu trúc yêu cầu mọi tài liệu `.md` / `.txt` phải nằm trong `document/`.

Đây là lỗi đóng gói ZIP, không phải lỗi Firebase, Render, Vercel, Gradle hoặc môi trường Windows của người dùng. AUTO UPDATE dừng tại preflight, chưa dọn dẹp hoặc chép mã nguồn mới.

## 2. Sửa trong A3R2

- Di chuyển tài liệu A3R1 vào `document/guides/HUONG_DAN_SUA_LOI_AUTO_UPDATE_A3R1.md`.
- Đặt tài liệu hướng dẫn A3R2 vào `document/guides/HUONG_DAN_SUA_LOI_AUTO_UPDATE_A3R2.md`.
- Không đặt bất kỳ file `.md` hoặc `.txt` nào ở thư mục gốc bản phát hành.
- Giữ nguyên các sửa lỗi CRLF và preflight trước đó (A3R1).
- Không thay đổi giao diện/logic Android hoặc mã nguồn của Render/Vercel.

## 3. Cập nhật an toàn bằng FULL ZIP A3R2

1. Giải nén `Family_Bloom_R3R14R3R8_A3R2_FIX_STRUCTURE_GATE_FULL_CODE_2026-10-29.zip` vào **thư mục mới riêng biệt**, không đặt trong thư mục dự án cũ.
2. Mở CMD tại thư mục đã giải nén, chạy: `node scripts\maintenance\check-project-structure.js`.
3. Đảm bảo màn hình hiện `Family Bloom project structure gate: 19/19 PASS`.
4. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` và chọn đúng thư mục Family Bloom cũ khi được hỏi.
5. Chỉ sau khi cập nhật báo PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`.

## 4. Giải pháp tạm nếu vẫn dùng A3R1

Trong thư mục **đã giải nén** của A3R1, di chuyển file `HUONG_DAN_SUA_LOI_AUTO_UPDATE_A3R1.md` từ thư mục gốc vào `document/guides/`, sau đó chạy lại `node scripts\maintenance\check-project-structure.js`. Không xóa hoặc sửa bài kiểm tra cấu trúc.

## 5. Địa chỉ kết nối giữ nguyên

- Render Chess/Xiangqi: `https://render-chess-xiangqi.onrender.com`
- Vercel Media: `https://vercelfamilybloommedia.vercel.app`

## 6. Phạm vi xác minh

Đây là bản sửa cấu trúc FULL ZIP. Kiểm tra mã nguồn, các preflight, sao lưu/cập nhật giả lập và hậu kiểm ZIP được thực hiện offline. Chưa thực hiện build Gradle/đăng nhập Firebase hoặc kiểm tra thực tế trên điện thoại Windows của bạn.
