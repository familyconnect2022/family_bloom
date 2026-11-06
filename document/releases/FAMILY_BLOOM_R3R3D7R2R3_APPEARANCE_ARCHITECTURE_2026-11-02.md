# Family Bloom R3R3D7R2R3 – Android Appearance Architecture

## Phạm vi
Chỉ Android. Giữ nguyên Firebase Security Rules, dữ liệu Firebase, Render, Vercel Media, và Web cũ. Không remount Auth/navigation để đổi theme.

## Vấn đề gốc
1. Nhiều component `Text` dùng inline `fontSize`, nằm ngoài bộ scale `createBloomStyles`.
2. `useSyncExternalStore` phân tán; component đã memo hóa/frozen cần nhận tín hiệu thay đổi theme trực tiếp.
3. Lựa chọn font phụ thuộc font dựng sẵn Android, có thể khác biệt ở máy khác nhau.
4. Đồng bộ appearance chỉ đọc Firebase một lần khi chưa có cache; thiết bị thứ hai không cập nhật khi ở cùng UID.
5. Avatar gia phả và dải nền tabbar đã được xử lý trong baseline R3R3D7R2R2, cần thử APK xác nhận.

## Thay đổi
- BloomThemeProvider đưa revision của theme + font vào một React context, chỉ một cặp subscription ngoài cùng. Không dùng key/remount Root/Stack.
- BloomText sử dụng revision context; chuẩn hóa font, cỡ chữ, màu mực mặc định và inline style; được dùng trong 102 module UI Android.
- BloomScaledInput điều chỉnh native TextInput trong 16 module, vẫn forward native ref và không reset nội dung nhập.
- WeakSet đánh dấu style đã scale trong createBloomStyles, tránh tăng font-size hai lần khi render bằng BloomText.
- Hệ số cơ sở được tăng từ 1.10 lên 1.15. Chế độ 90–160% giữ nguyên. Các nhãn rất nhỏ có giới hạn để bảo vệ bố cục.
- Thêm letterSpacing mặc định rất nhẹ cho Rounded/Cute/Clear trong trường hợp font alias bị Android thay thế. Không ghi đè khoảng cách chữ đã chỉ định.
- Firestore preference có listener sau khi đăng nhập; so sánh updatedAt với cache, bảo vệ pendingSync và UID trước khi áp dụng. Khi đăng xuất, theme giao diện công khai về Rose mặc định.
- Không chạm Welcome Lora, các renderer công thức và bàn cờ bởi đây là bề mặt typography được thiết kế riêng.
- 100% file firestore.rules giữ nguyên.

## Test đã chạy trong môi trường này
- 381 file TS/TSX transpile không có lỗi cú pháp.
- 1766 relative module imports hợp lệ.
- test-r3r3d7r2r3-appearance-root.cjs: PASS.
- Các gate cho theme, Hero, tabbar, graph avatars, graph integrity, H13/binary, offline theme, Welcome: PASS.

## Chưa xác nhận trên thiết bị
- APK Android thực tế chưa build trong môi trường này.
- Cần kiểm tra trực quan Dark Mode, mọi màn có chữ dài, các trạng thái loading/overlay, kích cỡ chữ 90/100/130/160%, đổi theme nhiều lần, đổi giữa 2 UID, cùng một UID trên hai thiết bị.
- Các kiểu font chưa được đóng gói thành bộ font thương hiệu riêng đầy đủ. Android/OEM có thể dùng font thay thế. Không tuyên bố 5 kiểu font có nét giống hệt nhau ở mọi điện thoại.
- Các thành phần đặc biệt (công thức, bàn cờ, thư và một số màn riêng) giữ typography theo thiết kế đặc thù; cần review thủ công nếu muốn cùng tuân cỡ chữ người dùng.

## Hướng dẫn
1. Lưu bản ZIP hiện tại đang chạy của bạn.
2. Giải nén FULL CODE mới vào thư mục riêng.
3. Chạy Family_Bloom_AUTO_UPDATE_FULL.bat để backup và cập nhật nguồn.
4. Chỉ sau khi BAT PASS mới Build & Share APK, kiểm thử trên thiết bị.
5. Nếu lỗi, gửi ảnh/video và log; không chạy Clean/Apply thủ công trước khi xác định nguyên nhân.
