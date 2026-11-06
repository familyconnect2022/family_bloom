# Family Bloom · M3R4R4 · Family CV + avatar vuông (Android)

BẢN NỀN: M3R4R3 **R1_BASE** (không được gọi là R2 đã hợp nhất). Dữ liệu gốc của ZIP R2 trong thư viện chưa đọc được.
Nếu máy của bạn đang có mã nguồn R2 riêng, KHÔNG chạy Auto Update đè lên R2 bằng bản này nếu chưa so sánh/hợp nhất.

## Đã triển khai
1. Avatar vuông bo góc dùng cùng một bộ chọn cho Create Profile và Family CV. Chọn ảnh qua Android với allowsEditing=false; hiển thị ngay URI mới, sau đó căn trong modal nội bộ. Có kéo và phóng to 2 ngón / nút +/-.
2. Cắt từ ảnh gốc theo tọa độ của người dùng và lưu JPEG 512x512 lên thiết bị; sau khi xác nhận, màn hình dùng ảnh JPEG đã cắt thật, không lưu tọa độ ảo. Không lấy lại ảnh cũ từ getPendingResultAsync.
3. Profile text lưu trước, avatar upload sau (best-effort khi app ở foreground; Android có thể tạm dừng JS khi app nền). Ảnh JPEG được copy vào document directory, lưu hàng đợi theo Firebase UID để tiếp tục khi mở lại; chọn mới chặn kết quả cũ ghi đè. Ảnh cũ Cloudinary chỉ dọn sau khi thay thành công.
4. Vòng tiến trình theo viền vuông: phần trăm dựa vào upload bytes thực của Cloudinary, khi chưa có số liệu thì spinner; thành công xanh lá và lỗi có nút thử lại.
5. Family CV trình bày mới, header cố định; avatar 112dp cách header 32dp; chỉnh sửa từng trường trên cùng trang với thanh Lưu/Hủy; quê quán và nghề nghiệp tự chọn, cùng dữ liệu profile Firebase. Quyền chỉnh quan hệ vẫn theo cây gia đình.
6. Toast kế thừa bảng màu đã chuẩn hoá trong M3R4R3.

## Cài đặt / Build
Cần cài 2 phụ thuộc mới (SDK 57): expo-image-manipulator ~57.0.21, expo-file-system ~57.0.7.
Sau khi áp dụng SOURCE, chạy `npm install` (hoặc Clean Apply sẽ tự phát hiện thiếu dependencies) rồi thực hiện Build & Share.
Hai BAT gốc vẫn có trong ZIP: Family_Bloom_AUTO_UPDATE_FULL.bat và Family_Bloom_BUILD_APK_TO_SHARE.bat.

## Đã kiểm tra
- 345 file TS/TSX transpile cú pháp thành công, không có lỗi parser (chạy lại tại thời điểm đóng gói).
- Cổng cấu trúc 19/19; route không trùng; kiểm tra crop và UI mới 15/15 + các ca test geometry.
- M3R4 15/15, M3R2 10/10, M3R3 security 13/13; mô phỏng hàng đợi avatar 3/3.
- Build & Share native source preflight PASS; CHƯA build APK thật (không có node_modules/Android prebuild/Gradle tại môi trường hiện tại).
- CHƯA kiểm thử trực tiếp UI cảm ứng, upload Cloudinary/Vercel/Firebase trên thiết bị Android.
- Web giữ nguyên từ ZIP nền.

## Kiểm thử trên điện thoại
Tạo hồ sơ: chọn A -> xem A -> căn/cắt -> B -> B hiện, không hiện lại A; Hủy giữ ảnh trước.
Lưu -> Profile CV hiển thị ảnh B; quan sát vòng tiến độ; mở lại app -> avatar đúng vị trí đã lưu.
Trong khi upload ảnh A, chọn B và lưu, A không được liên kết vào profile; thử mất mạng, xem biểu tượng retry.
Sửa CV và Hủy không ghi đè dữ liệu; Lưu xong mở lại vẫn giữ thông tin.
