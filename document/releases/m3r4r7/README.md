# Family Bloom M3R4R7 — Family CV / Avatar Sources / P0 Auth & Welcome

Nguồn gốc: FULL source M3R4R6R1 ngày 30/10/2026; chỉ Android. Web không chỉnh sửa.

## Các thay đổi đã đưa vào mã

- Family CV: nút **Chỉnh sửa hồ sơ** nằm bên trong card Chân dung thành viên, không nằm trong banner.
- Card Profile đổi nền trắng, dùng border nhẹ, giữ banner màu hồng, các ô sửa Họ tên/Tên thân mật nằm *bên dưới* hàng chân dung.
- Avatar Profile trong chế độ sửa chỉ chiếm 124dp ngang (compact), tránh ảnh + chữ hướng dẫn + tên chen lên nhau ở màn hẹp.
- Component BloomInputAvatar dùng chung cho tạo profile, sửa CV, và ảnh person của phả hệ. Có bottom sheet chọn **Chụp ảnh mới / Chọn từ thư viện / Chọn ảnh có sẵn**; 6 ảnh avatar PNG 512 x 512 đóng gói nội bộ. Ảnh có sẵn được chuyển thành JPEG 512 px trước khi chuyển cho luồng upload. Ảnh chụp và thư viện đi qua màn căn chỉnh riêng, không dùng trình crop Android bên ngoài.
- Vòng trạng thái upload không vẽ dải hồng khi `idle`; giữ hiển thị tiến độ thực hoặc vòng xoay nếu chưa đo được.
- Profile lưu thông tin trước, avatar bất đồng bộ qua hàng đợi có chống ghi đè; avatar phả hệ sử dụng luồng media riêng của người trong cây và quyền quản lý hiện có.
- P0 Auth: UID mới xóa ngay toàn bộ state UI từ UID cũ, profile mới phải được Firestore trả kết quả (không cho cache mở Home); các route private chỉ mount khi đủ UID + profile.uid khớp + profileStatus ready + membershipStatus ready + activeFamily membership hợp lệ.
- Create Profile không cần chờ membership; lỗi mạng trong lần đọc Profile dẫn đến màn retry, **không** chuyển vào Home.
- Welcome hiện TRƯỚC khi mở Home; khi Welcome đang chờ, route Home bị khóa ở Stack.Protected.
- R7 gate mới chạy trước backup/overlay và trước Build & Share, không bỏ qua các gate cũ.

## Đối tượng kiểm thử trên máy thật (chưa kiểm chứng trong môi trường đóng gói)

1. Xóa dữ liệu app, đăng nhập UID hoàn toàn mới: phải vào create-profile, không render Home.
2. UID đã có profile và membership: Thư Ngõ phải hiện trước Home khi đến phiên Welcome, không giật Home trước.
3. Tạo nhà mới: Thư Ngõ trước Home; đổi qua nhà cũ: không hiển thị Thư Ngõ sai nhà.
4. Chọn ảnh bằng 3 cách, căn chỉnh mặt và lưu; chọn liên tiếp A → B → C, ảnh C luôn chiếm ưu tiên.
5. Thử permissions Camera denied, quay lại sau khi cấp quyền; Android kill activity trong image picker.
6. Mở Family CV, chỉnh sửa, bàn phím, Hủy, Lưu, cuộn với màn hình nhỏ; không vỡ hàng chân dung.
7. Chỉnh sửa avatar người phả hệ; nếu là linked person không tự sửa ảnh tài khoản trái quyền.
8. Mất mạng lúc upload, thử lại, đăng xuất/đăng nhập lại; không mất avatar đã lưu trước đó trên Firebase.
9. Build & Share trên Windows, xác minh Gradle, Metro và APK thực tế trước khi phân phối.

## Hạn chế xác thực

Đã chạy các gate nguồn, thực thi giả lập Auto Update trên bản sao nguyên bản, kiểm tra import, cú pháp, cấu trúc. **Chưa build APK thật trên Windows hoặc kiểm thử Firebase/Cloudinary thực tế.** Những kiểm tra tĩnh không chứng minh 100% UI hay API hoạt động trên máy.

Không chạy Auto Update nếu `check-r1r4-source-lineage.cjs` từ chối mã nguồn đích; giữ nguyên `.env`, `google-services.json` và dữ liệu Firestore/Cloudinary.
