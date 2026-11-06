# Family Bloom R11R1 — sửa lỗi chọn lại thư mục liên tục

Đây là **R11 Motion Lab gốc + bản sửa riêng bộ cập nhật**. Không thay đổi thành phần animation, Firebase, dữ liệu, Android native hay versionCode so với R11.

## Nguyên nhân
File `Family_Bloom_AUTO_UPDATE_FULL.bat` cũ tự xoá đường dẫn và mở lại hộp thoại mỗi khi kiểm tra R10 không đạt, khiến người dùng tưởng chọn sai dù thực tế có thể là dự án đã thay đổi một tệp SHA.

## Đã sửa
1. Chọn đúng thư mục R10: kiểm tra xong thì tiếp tục, không hỏi lại.
2. Chọn thư mục ngoài: tự tìm một dự án Family Bloom trong phạm vi **2 cấp**. Nếu phát hiện nhiều, dừng yêu cầu chọn một dự án cụ thể.
3. Nếu thất bại: báo cụ thể loại lỗi, đường dẫn, tên tệp bị lệch SHA; **không tự hiện lại hộp thoại**. Người dùng được chọn R (chọn thư mục khác) hoặc Q (thoát).
4. Cho phép tiếp tục từ R11 Motion Lab trước đó (nếu đã cài một phần hoặc đầy đủ và tất cả tệp được theo dõi vẫn khớp SHA dự kiến).
5. Giữ nguyên quy tắc bảo vệ: SHA kiểm tra trước ghi; backup nguồn; khôi phục tệp đã cập nhật nếu bước ghi/kiểm tra gặp sự cố.

## Cách dùng
1. **Giữ nguyên ZIP R10 đã lưu**. Dừng mọi Metro/terminal build đang dùng thư mục project trước khi cập nhật.
2. Giải nén R11R1 FULL CODE vào một thư mục **khác thư mục dự án đang chạy**.
3. Chạy `R11_MOTION_SAFE_UPDATE.cmd` trong thư mục R11R1; chọn **thư mục mã nguồn R10 đang chạy** (có `package.json`, `app.json`, `src\app\_layout.tsx`). Nếu chọn thư mục cha có một dự án bên trong, chương trình tự tìm được.
4. Nếu thấy **[CHECK PASS]** thì nhấn Y để sao lưu và cập nhật. Nếu **[STOP]**, chụp nguyên cửa sổ lỗi, đừng tiếp tục chọn lại nhiều lần.
5. Sau khi PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` từ **dự án đã cập nhật**.

## Cách kiểm tra không mở hộp thoại
Tại thư mục R11R1 FULL CODE, mở CMD và chạy:

```
node scripts\maintenance\fb-r11-motion-safe-update.cjs check "D:\Duong dan\Den\Family_Bloom"
```

`check` chỉ đọc, **không sửa tệp nào**. Khi PASS, có thể chạy:

```
node scripts\maintenance\fb-r11-motion-safe-update.cjs install "D:\Duong dan\Den\Family_Bloom"
```

`install` tự sao lưu, kiểm tra SHA, cập nhật và xác minh lại. Nếu sai SHA thì dừng trước khi ghi.

## Nếu báo SHA khác R10
Đây không phải vấn đề chọn thư mục, mà là khác biệt mã nguồn. Tuyệt đối **không ép cập nhật**, không xoá các tệp của bạn. Hãy gửi đường dẫn và tên tệp trong thông báo `[STOP]` (không gửi mật khẩu hay `.env`).

## Kiểm thử
Thử nghiệm trong môi trường Linux giả lập với Node.js; chưa kiểm thử Windows FolderBrowserDialog, BAT trực tiếp hoặc APK trên Android.
