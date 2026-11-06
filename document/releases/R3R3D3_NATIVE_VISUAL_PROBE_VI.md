# Family Bloom — R3R3D3 · Điều tra màn hình trắng che Thư Ngõ

Ngày 01/11/2026 · Android only · Nguồn: R3R3D2 FULL CODE (không thay Web/Render/Vercel/Firebase Rules).

## Vì sao cần D3

Ảnh và video từ Android Metro cho thấy Thư Ngõ dường như vẫn ở phía sau màn trắng. Ở D1, Auth/Profile/Membership đều thành công; Welcome chỉ ghi nhận mount/layout, chưa chứng minh window thật đã hiển thị. D2 đưa Welcome vào session-gate nhưng điện thoại vẫn trắng. Back không biến mất do chính Welcome có BackHandler chặn Back. Biểu tượng bánh răng là Expo/Metro, không phải lớp che của Family Bloom.

## Những điểm được sửa hoặc bổ sung

1. `src/app/_layout.tsx`: ghi rõ `splash-prevent-resolved/rejected`, `splash-hide-request/resolved/rejected`; không nuốt lỗi ẩn splash. Khi native Stack đã layout và Welcome được xác minh, yêu cầu ẩn Splash không còn phụ thuộc vô hạn vào biến `navigationStable`. Nếu thất bại sẽ thử lại tối đa 1 lần, không làm thay đổi quyền.
2. `src/app/session-gate.tsx`: ghi rõ `session-gate-focused` / `session-gate-blurred`, và native screen `layout`.
3. **Ba đầu dò phân tầng chỉ cho Metro (`__DEV__`)**: nhãn **xanh lá D3 GATE** bên trong /session-gate; nhãn **hồng D3 ROOT** trong React root sau native stack; Alert Android thực sự sau 3,5 giây khi Welcome đang xác minh và /session-gate được focus. Alert chỉ xuất hiện cho tài khoản developer đã xác minh, có nút **Sao chép nhật ký**.
4. Giữ chặt `authStatus=signed-in`, UID/Profile/Membership/Family, và Welcome Ledger. Không thêm quyền mở Home, không làm truy vấn Firebase mới.
5. Kiểm thử 25 điểm mới được gắn vào Auto Update check trước khi sao chép và Build & Share.

## Cách kiểm thử bằng Metro (rất quan trọng)

1. Sao lưu dự án D2. Giải nén bản FULL ZIP D3 ra thư mục khác, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`; dừng nếu có FAIL.
2. Dùng máy thật và dev client, trên cùng Wi-Fi với máy tính: chạy `npx expo start --dev-client -c`. Nếu sử dụng ứng dụng kép, kiểm tra đúng bản D3 trên cả 2 biểu tượng.
3. Đăng nhập tài khoản developer đã xác minh, vào trường hợp phải xem Thư Ngõ, chụp ảnh màn hình.
4. Sau khoảng 3,5 giây khi Welcome được xác minh và session-gate focus, **hộp thoại Android** có tiêu đề `Family Bloom D3 · Kiểm tra lớp` sẽ xuất hiện (Metro/dev only). Chọn **Sao chép nhật ký** và gửi lại. Nếu không thấy hộp thoại, thu các dòng `[BloomVisualD3]` từ Metro.
5. Quan sát hai nhãn: **xanh D3 GATE** ở đầu màn hình, **hồng D3 ROOT** ở cuối màn hình. Đây là dấu hiệu test, không phải giao diện chính thức.

## Diễn giải các tình huống

- **Có Alert nhưng không có cả hai nhãn:** JavaScript đang chạy và Android tạo được native dialog; phải điều tra cửa sổ/lớp native che các React views (Splash, React Navigation native screen, dev-client overlay). Đọc `splash-hide-*` + `session-gate-focused`.
- **Có nhãn hồng ROOT, không có xanh GATE:** Root RN đang vẽ nhưng route native `/session-gate` không hiện đúng/lớp Stack bị phủ hoặc không focus.
- **Có xanh GATE, nền vẫn trắng:** Screen /session-gate đã vẽ foreground; điều tra riêng nội dung/ảnh/animation của Welcome.
- **Cả hai nhãn đều xuất hiện nhưng thư không hiển thị:** Kiểm tra layout ảnh, thứ tự view và cấu hình opacity/animation của Welcome.
- **Không Alert, không nhãn:** Không đủ cơ sở nói Splash. Trước hết kiểm tra log `[BloomVisualD3]`, cờ `__DEV__`, tài khoản developer emailVerified, route có phải `/session-gate`, và bản Metro/JS bundle có phải D3.
- **Splash hide rejected:** Kiểm tra log Android/Expo Splash. Đây là bằng chứng lỗi API, cần sửa vòng đời native; không tự mở Home để vượt qua.
- **Splash hide resolved:** Chỉ chứng minh hàm trả về, KHÔNG chứng minh Welcome nhìn thấy được.

## Kiểm thử bảo mật còn phải chạy trên APK

- Tài khoản chưa có Profile không vào Home.
- Profile có nhưng không có Membership không vào Home.
- Membership quyền bị từ chối không dùng cache để vào Home.
- Tài khoản có nhà phải xem Thư Ngõ khi ledger yêu cầu; sau khi đọc và xác nhận mới vào Home.
- Back không được bỏ qua Thư Ngõ.
- Khi logout/đổi UID không còn màn hình và dữ liệu của UID cũ.

## Giới hạn

- D3 là bản **điều tra + sửa quan sát Splash**, không thể khẳng định màn trắng đã hết trước khi chạy trên máy thật.
- Hộp thoại/nhãn phân tầng chỉ xuất hiện khi dùng Metro/Dev; xây APK Release với `__DEV__=false` sẽ không thấy chúng. Nhật ký chẩn đoán nguồn vẫn có nhưng không có bảng test tự động.
- Không chạy deploy Firestore Rules, không đổi Render/Vercel, không chép ZIP trực tiếp lên dự án cũ.
- Chưa có build Gradle APK trong môi trường tạo ZIP.
