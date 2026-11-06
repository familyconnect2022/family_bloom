# Family Bloom A3R3 — Sửa lỗi lưu Moment và báo rõ nguyên nhân

## Những điều quan sát được từ video 68654.mp4

- Khi tạo Moment nhiều ảnh, tiến trình hiện 1%, sau đó báo “Khoảnh khắc chưa đăng được”.
- Ở bản A3R2, nhiều lỗi upload bị quy về MEDIA_UPLOAD_FAILED và Toast mặc định nhắc thử lại mạng, nên không xác định được dịch vụ thực sự bị lỗi.
- Chưa có Firebase/Cloudinary/Vercel production logs; không tuyên bố đã chứng minh một nguyên nhân duy nhất.

## Điều chỉnh trong A3R3

1. Signed Moment upload dùng **đúng cloudName do Vercel Media ký** thay vì cloudName cũ tích hợp trong APK.
2. Luồng ký ảnh từ Vercel trả HTTP 401/403/404/409/500 nay có chẩn đoán tách biệt, không che lỗi backend.
3. Phân biệt lỗi Cloudinary HTTP 400/401/413/429 với lỗi mạng, và Firestore `permission-denied` trong quá trình tạo `media_assets` hoặc publish.
4. Thẻ Moment thất bại hiện nguyên nhân an toàn, không lộ token, secret hoặc nội dung phản hồi HTML.
5. Chỉ còn hai BAT root: `Family_Bloom_AUTO_UPDATE_FULL.bat` và `Family_Bloom_BUILD_APK_TO_SHARE.bat`. EAS Build/OTA đặt trong `scripts/android/eas/`.
6. Không thay đổi Render, Vercel server, Web hay Firestore Rules. Không tự xóa ảnh đã upload hoặc bài đang chờ khi lỗi.

## Triển khai

- Sao lưu dự án trên máy trước, giải nén ZIP mới vào thư mục **mới**.
- Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`. Bộ cập nhật sao lưu, dọn hai BAT EAS root cũ, copy, verify và chạy preflight theo quy trình.
- Khi AUTO UPDATE đạt, chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`, sau đó cài APK mới để kiểm thử. Không cần deploy lại Render/Vercel chỉ để hiển thị chẩn đoán Android.
- Hai URL hiện dùng: `https://render-chess-xiangqi.onrender.com` và `https://vercelfamilybloommedia.vercel.app`.
- EAS riêng: `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat` và `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`.

## Kiểm tra lỗi lưu Moment

1. Cài **APK mới** (các bản trước vẫn sẽ báo chung).
2. Đăng một Moment **chỉ 1 ảnh nhỏ**, đợi trạng thái xong. Nếu vẫn thất bại, đọc **dòng lỗi màu đỏ trên thẻ bài chờ**.
3. Đăng thử 2 ảnh, rồi thử nhiều ảnh sau khi một ảnh đã thành công.
4. Nếu báo **Vercel HTTP 500**, vào Vercel project Media → Logs, kiểm tra Firebase Service Account JSON và Cloudinary ENV. Không gửi bí mật vào chat.
5. Nếu báo **Vercel HTTP 404**, kiểm tra đã deploy file `api/media/sign.js` trong Vercel Media, project Root Directory và quyền document `media_assets`.
6. Nếu báo **Cloudinary HTTP 400/401**, kiểm tra Cloudinary Cloud Name/API Key/API Secret cùng một Cloudinary cloud trên Vercel; xem Logs hoặc Cloudinary Console để xác nhận upload signature.
7. Nếu báo **Firestore permission-denied**, kiểm tra collection `media_assets`, Rules đang deploy, quyền thành viên gia đình và user UID. Đừng nới lỏng Rules chỉ để thử.
8. Nếu bài đã có ảnh upload xong, chọn **Thử lại** để nối tiếp; đừng chọn “Bỏ bài chờ” nếu muốn giữ các ảnh đã hoàn tất.

## Kiểm thử an toàn / dữ liệu

- Thử bằng ảnh nhỏ không nhạy cảm, tránh album thật khi chưa kiểm chứng.
- Đừng dán ID token Firebase, Service Account JSON, Cloudinary API Secret, CRON_SECRET hoặc URL chứa chữ ký vào chat.
- Chỉ đánh dấu hoạt động hoàn chỉnh khi APK đã đăng Moment lên Firestore, URL media Cloudinary hiển thị đúng, hủy và retry đều an toàn. Static preflight không thay thế kiểm thử production.
