# FAMILY BLOOM A3R1 — HƯỚNG DẪN SỬA LỖI AUTO UPDATE
Ngày: 28/10/2026

## 1. Nguyên nhân lỗi trên ảnh chụp

Lỗi `AssertionError [ERR_ASSERTION]: Windows Build, Clean Apply and EAS run connectivity VM after dependencies` phát sinh trong `scripts/tests/release/test-h25r2r5-internet-connectivity.cjs`, tại bài kiểm tra kiểm chứng lệnh BAT.

Bản A3 trước đó có ba file BAT ở dạng xuống dòng LF (thay vì Windows CRLF):

- `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat`
- `scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat`
- `scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat`

Bài test kết nối Internet so sánh trực tiếp lệnh BAT có `\r\n`, nên trả FAIL dù lời gọi test thực sự vẫn có trong Build & Share. Một bài preflight khác cũng kiểm tra CRLF và có thể thất bại tiếp theo.

Lỗi này thuộc quy trình kiểm thử/đóng gói, KHÔNG phải bằng chứng Render, Vercel, Firebase hay Gradle bị lỗi.

## 2. Những gì A3R1 sửa

1. Đổi **ba BAT** nói trên về CRLF chuẩn Windows.
2. `test-h25r2r5-internet-connectivity.cjs` so khớp lệnh BAT sau khi chuẩn hóa dấu xuống dòng, vẫn yêu cầu lời gọi test và `if errorlevel 1 goto :fail` ngay sau đó. Không vô hiệu hóa kiểm thử.
3. Không sửa giao diện hoặc logic Chess/Xiangqi/Moment, không động chạm mã nguồn repository Render hay Vercel.
4. Giữ nguyên cấu hình URL: `https://render-chess-xiangqi.onrender.com` và `https://vercelfamilybloommedia.vercel.app`.

## 3. Cập nhật an toàn trên Windows

1. Giữ lại ZIP A3 cũ nếu muốn đối chiếu. **Không sửa trực tiếp file ZIP A3**.
2. Tải **FULL ZIP A3R1**, giải nén ra một thư mục mới, khác thư mục dự án Family Bloom đang dùng. Không giải nén đè lên dự án đang làm việc.
3. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` tại thư mục FULL ZIP mới. Chọn/nhập đúng thư mục Family Bloom hiện tại và xem lại trước khi xác nhận. BAT sẽ tự sao lưu, kiểm tra, cập nhật và thực hiện CLEAN APPLY.
4. Sau khi AUTO UPDATE báo PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` để build APK.
5. Nếu phát hiện lỗi mới, dừng lại và gửi ảnh/log đầy đủ. **Không bỏ qua gate bằng cách xóa test, không dùng bản A3 lỗi để Build & Share.**

Lần AUTO UPDATE từ A3 bị FAIL trong ảnh dừng **trước khi sao lưu/cleanup/overlay**, theo đúng thông báo, vì vậy thư mục dự án cũ không bị sửa bởi lần chạy đó.

## 4. Kết quả kiểm tra tại môi trường tạo ZIP

- Kiểm thử nguồn kết nối Internet: **10/10 PASS**.
- Preflight phát hành phụ thuộc tối thiểu: **10/10 PASS**.
- Kiểm thử cấu trúc Windows Build & Share: **7/7 PASS**.
- Kiểm tra xuống dòng của **38/38 BAT**: PASS.
- Auto-update source `check`: PASS trên thư mục dự án giả lập riêng.
- Auto-update `backup`, `detach-backends`, `overlay`, `verify`: PASS trên thư mục giả lập; `.env` vẫn được bảo toàn.
- Kiểm thử hồi quy: lời gọi hợp lệ với LF/CRLF; nếu thật sự xóa lệnh gate, test vẫn FAIL.
- Kiểm tra API Render/Vercel theo cấu hình A3 (offline): PASS.

**Chưa build APK/Gradle trên Windows hoặc deploy thực tế**, nên không được xem các kết quả kiểm tra nguồn này là xác nhận build APK thành công.

## 5. Nếu muốn tự chạy kiểm tra lỗi trước khi cập nhật

Trong thư mục FULL ZIP mới, mở CMD:

```bat
node scripts\tests\release\test-h25r2r5-internet-connectivity.cjs --source-only
node scripts\tests\release\test-h25r2r2-release-preflight.cjs
node scripts\tests\release\test-h22r3-windows-build-preflight.cjs
```

Nếu cả ba hoàn tất PASS, có thể chạy AUTO UPDATE. Nếu có lỗi mới, gửi toàn bộ lỗi thay vì cố build APK.
