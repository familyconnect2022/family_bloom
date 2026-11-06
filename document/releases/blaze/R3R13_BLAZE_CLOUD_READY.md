# Family Bloom R3R13 — Cloud Functions + FCM ready (opt-in)

## Trạng thái
- Bản mã nguồn chuẩn: **R3R12R1 FULL CODE**; giữ Chess, Xiangqi, dấu căn, Thư Ngỏ, tên giới thiệu nhà.
- **Mặc định tắt** hai cờ toàn hệ thống `cloudFunctionsEnabled` và `remotePushEnabled`. Trên Spark không deploy Cloud Functions.
- Đã có phần lớn mã backend ở `functions/`: xác thực Firebase Auth, phả hệ, thông báo xin vào nhà, đề xuất phả hệ, hoạt động gia đình, lời thì thầm và lịch nhắc FCM. R3R13 bổ sung readiness/auth, cổng bật/tắt và kiểm soát ở backend.
- Các lời nhắc cục bộ trên Android tiếp tục hoạt động độc lập; tùy chọn cá nhân `pushNotificationsEnabled` và quyền POST_NOTIFICATIONS vẫn có hiệu lực. Thông báo đẩy cần thiết bị thật + token FCM hợp lệ.

## Chuyển sang Blaze: thao tác duy nhất trên máy tính
1. Trong Firebase Console, nâng cấp chính xác dự án đang dùng từ Spark sang Blaze, thiết lập ngân sách/cảnh báo chi phí. **Nút trong app không thể tự nâng cấp hoặc triển khai mã backend.**
2. Dùng bản mã nguồn đã cập nhật trên máy Windows, đảm bảo `google-services.json` trỏ đúng Firebase project. Cài Node.js và `firebase-tools` (`npm install -g firebase-tools`), `firebase login` nếu chưa có.
3. Mở `scripts/android/Family_Bloom_MENU.bat`, chọn mục 8. Hoặc chạy `scripts/firebase/Family_Bloom_BLAZE_SETUP_ONCE.bat`. BAT chạy kiểm tra mã, in project ID, yêu cầu gõ `DEPLOY`, rồi triển khai firestore.rules và Cloud Functions; không thay đổi billing, không tự deploy khi build APK.
4. Trên điện thoại đã cài bản R3R13 (cần APK mới một lần), đăng nhập tài khoản developer xác minh; vào **Cài đặt → Kiểm thử & chẩn đoán → Cloud**, bấm **Kiểm tra kết nối**. Khi readiness thành công, bật từng tính năng Cloud Functions / FCM. Các tài khoản khác không thể mở công cụ này hoặc thay đổi cờ hệ thống.
5. Trên từng điện thoại, vào tùy chọn thông báo cho phép Android gửi thông báo, bật lời nhắc và đảm bảo thiết bị có token FCM. Kiểm tra thử nhận thông báo thật bằng sự kiện xin gia nhập từ tài khoản khác.

## Chú ý rất quan trọng về chi phí
- Cloud Functions dùng Blaze, việc deploy và thực thi có thể phát sinh phí, nhất là trigger và scheduler. **Công tắc TẮT chỉ vô hiệu hóa hành vi ứng dụng / việc gửi FCM, không gỡ các hàm đã triển khai hoặc vô hiệu Cloud Scheduler, không đảm bảo chi phí bằng 0.** Có thể `firebase functions:delete` có chủ đích hoặc gỡ các triggers/scheduler bằng bản triển khai riêng để giảm chi phí.
- FCM transport miễn phí, nhưng Cloud Functions gửi thông báo có thể phát sinh chi phí thực thi / đọc Firestore. Không gửi token, service account hoặc khóa bí mật trong ZIP.
- Firebase Functions chạy trên server, không có tác dụng trên ứng dụng đang cài trước khi cấu hình FCM native/Expo đã được build. Bản nguồn hiện dùng `expo-notifications` và native device FCM tokens, không dùng Expo Push Relay.

## Thiết kế không gây hồi quy
- Không sửa server Render Chess/Xiangqi, không thêm Firestore listener toàn cục: client tải 1 tài liệu cấu hình và kiểm tra lại khi app trở lại foreground (TTL 45s).
- Firestore `system/featureSwitches`: đọc được với tài khoản đăng nhập; chỉ Firebase ID token `email_verified` của huynh235@gmail.com được cập nhật, 5 trường schema cố định. Backend lặp lại kiểm tra trạng thái từ Firestore (không chỉ tin UI).
- Khi đọc cờ lỗi / chưa có doc, **mặc định OFF**. Không tự triển khai Firestore Cloud Rules có nguy cơ khóa chế độ Direct; `firestore.cloud.rules` đã được bổ sung quy tắc cho cờ, nhưng chỉ đổi khi có kế hoạch migration graph server và test rule đầy đủ.
- Thông báo FCM nhắc sự kiện khi bật trở lại chỉ bao gồm các job được tạo khi chế độ bật / sự kiện có cập nhật, không backfill toàn bộ lịch cũ.

## Kiểm thử trước build
`node scripts/tests/release/test-r3r13-blaze-ready.cjs`

Kiểm thử logic/kiến trúc không thay thế test Firebase Blaze thật, Build & Share APK trên Windows và nhận FCM trên Android thật.
