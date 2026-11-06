# Family Bloom R8R4R4R3R4R3R2 — FULL CODE sửa xác minh Firebase
Ngày 01/11/2026. Chỉ Android app; giữ nguyên Web/Render/Vercel, rules và dữ liệu đám mây.

## Nguồn và cách cập nhật
Nguồn gốc: FAMILY_BLOOM_R8R4R4R3R4R3_AUTH_CONNECTIVITY_WELCOME_P0_FULL_CODE_2026-11-01.zip.
SHA-256 nguồn: ff9ecde617cf9153d2802d2ba16a55340860615dcf9188403d684e174d497551.
Không cần áp dụng từng hotfix trung gian. Bản R3R2 chứa nguyên mã nguồn R3 cùng các sửa lỗi tiếp theo. Đã đăng ký fingerprint của R3 cho cập nhật trực tiếp.

**Quan trọng:** Để nguyên dự án đang có; giải nén FULL ZIP mới vào MỘT THƯ MỤC RIÊNG, không giải nén đè vào dự án cũ. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trong ZIP mới. Chọn thư mục dự án cũ đang sử dụng. Nếu bất kỳ bước preflight/backup/overlay/verify/clean apply báo FAIL, dừng ngay và không build; lấy log để đối chiếu. BAT phải bảo toàn `.env`, `google-services.json` và mã nguồn trong bản backup.

## Sửa P0 Firebase
- Gỡ chặn xác minh thành viên trên `getDocsFromServer()`: listener `onSnapshot()` có `fromCache=false` và `hasPendingWrites=false` cũng là xác nhận từ server. Kết quả đến trước được chấp nhận; kết quả đọc cũ không ghi đè dữ liệu mới hơn từ listener.
- Một watcher lỗi tạm thời sẽ để parallel server read tiếp tục. Khi quyền bị từ chối vẫn thu hồi, không mở Home trên cache.
- Thử lại có giới hạn khi tình trạng kết nối từ probe bên thứ ba là `unknown` (ví dụ VPN chặn Google/Cloudflare), không đồng nhất lỗi probe với lỗi Firebase. Tối đa 2 lần tự thử lại theo UID epoch, không lặp vô hạn.
- Ràng buộc phiên theo UID/epoch, cleanup watcher cũ và ngăn phản hồi muộn của phiên trước ghi đè.
- Kiểm tra chuyển nhà từ server cho cả reverse index và member document; không dùng cache để chứng minh quyền chuyển.
- Màn session-gate hiển thị bước kiểm tra (`AUTH`, `PROFILE`, `MEMBERSHIP`) và loại lỗi, không chứa UID/dữ liệu riêng tư.
- Các bài test P0 mới được gắn vào Auto Update, CLEAN APPLY, Android Build & Share và EAS BAT.

## Không thay đổi
UI Theme, ảnh WebP, Welcome root sibling, CV/Profile, chess/xiangqi, media và server. Không đổi versionCode vì không thay đổi Native code (1.3.34 / 143044). Cần build lại Release APK để JavaScript mới được đóng gói vào APK. **Không** sử dụng Metro Development để đánh giá kết quả Release.

## Giới hạn bắt buộc
- Source-only tests không chứng minh APK Release hoạt động trên máy thật.
- Không thể truy cập Firebase dự án hay kiểm tra Firestore Rules đã triển khai trên mạng trong môi trường kiểm thử này.
- Không chạy được Windows BAT trên Windows hoặc Android Gradle build trong môi trường này.
- Bộ preflight tổng hợp rất dài trên Linux; không xác nhận kết quả hoàn chỉnh trong thời gian thử, nhưng các P0/theme/Welcome/Windows BAT gates riêng đã PASS.

## Thử trên máy Android
1. Cập nhật nguồn thành công, chạy BAT Build & Share / Android Release theo dự án.
2. Test tài khoản có Profile+nhà. Sau khi Firebase phản hồi, Thư Ngõ phải xuất hiện khi cần, sau đó mới Home.
3. Kill app/force stop rồi mở lại, thử có VPN và tắt VPN, có Wi-Fi/4G.
4. Tắt mạng khi mở, thử Retry, bật lại mạng; bảo đảm tự thử lại giới hạn và không thoát đăng nhập.
5. Test tài khoản không có Profile; phải tới màn tạo Profile, không vào Home.
6. Test permission-denied: phải báo lỗi và không mở Home.
7. Khi vẫn bị treo, chụp rõ 'Bước xác minh' và thời điểm; thu adb logcat/Metro chỉ từ DEV nếu cần, che UID, token và dữ liệu tài khoản.
