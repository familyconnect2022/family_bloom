# FAMILY BLOOM R8R4R4R3R3 — THỬ NGHIỆM SỬA AUTH / THƯ NGÕ / HERO / THEME

## Xuất phát
Nguồn: R8R4R4R3R2, Android-only, không sửa Web, Render Chess/Xiangqi hoặc Vercel Media.

## Phát hiện từ video 68868.mp4
Sau Google Sign-In hiển thị trang xác minh khoảng 1–2 giây, rồi nền trắng; chưa có logcat nên không thể xác định lỗi Native window ở mức runtime. Mã cũ mở Thư Ngõ bằng Modal transparent=false khi Root Stack đang chuyển; đây là nghi vấn nguyên nhân chính.

## Đã sửa trong source
- Thư Ngõ có route `/welcome` riêng trong Stack.Protected, kiểm tra UID/hồ sơ/tư cách gia đình trước khi hiển thị; không spawn một cửa sổ Modal Native thứ hai. Auth chưa xác minh vẫn chỉ ở session-gate; Home không mount trước khi Thư Ngõ hoàn thành. Thoát từ Thư Ngõ dẫn tới Tabs qua RootRoutePolicy; route chuyển tiếp có màn chờ hữu hình.
- Giữ 14 đoạn Thư Ngõ, ba ảnh thư, animation và vùng chạm toàn thư.
- Header ảnh `cover` tràn ngang (không còn dải nền hai bên do `contain`); tăng chiều cao vùng hình, lớp fog bất đối xứng từ 23% lên 30% chân ảnh (thử nghiệm) để mờ tự nhiên hơn.
- Header Moment và Calendar useMemo phụ thuộc theme revision, tránh giữ màu icon/card cũ sau đổi theme.
- Giữ nguyên 24 ảnh hero đang duyệt, 8 fog theme-mode và mã Native Chess/Xiangqi.
- Các gate phát hành đang kiểm tra Modal cũ được thay bằng kiểm tra kiến trúc Stack mới, không xóa kiểm tra UID/hồ sơ/Welcome.

## Đã chạy
- Node TypeScript transpile syntax: 365/365.
- Project structure: 19/19.
- Test mới R8R4R4R3R3: 11 PASS.
- Full updater preflight: PASS trên bản sao R8R4R4R3R2 (Linux Node).
- Backup/Overlay/Verify thử nghiệm: PASS, .env được giữ.

## Chưa thể xác nhận
- Không có APK Build & Share / thử touch thật sau đăng nhập; màn trắng cần test thiết bị thực và logcat nếu còn.
- Chưa rà soát mỹ thuật và cập nhật theme 100% tất cả 92 màn; hai điểm memo là các trường hợp có bằng chứng rõ nhất trong source.
- Độ rộng ảnh/độ cao sương cần duyệt lại trên nhiều kích thước máy.
- BAT chưa thực thi trên Windows thật.

## Khi kiểm tra trên thiết bị
1. Đăng nhập Google một tài khoản xác thực có gia đình, xác nhận tới Thư Ngõ; chạm mở và đọc nội dung; chọn bước vào Home.
2. Thử tài khoản chưa có hồ sơ, đảm bảo không vào Home.
3. Đổi Rose→Garden→Heritage→Midnight ngay tại Moments và Calendar, xác nhận giao diện cập nhật không cần khởi động lại.
4. Xem header có tràn mép và sương hòa nền cả chế độ tối.
5. Nếu vẫn còn màn trắng, ghi logcat `ReactNativeJS`, `AndroidRuntime`, `ReactNative`, `ActivityTaskManager` gần thời điểm đăng nhập, loại bỏ token và dữ liệu cá nhân trước khi chia sẻ.
