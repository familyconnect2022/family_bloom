# Family Bloom — Bắt đầu tại đây (H25R2R7R2R3R4)

Tài liệu này dành cho người sử dụng Windows muốn duy trì Family Bloom mà **không cần đọc hết TypeScript trước**. Bản này là đợt bảo trì/ghi chép: không thay đổi vòng đời Chess/Xiangqi, Phả hệ hay giao diện Super Bloom.

## Nếu bạn chỉ muốn cập nhật và tạo APK

1. Giải nén **toàn bộ** FULL CODE ra thư mục riêng (không giải nén đè vào project cũ).
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trong FULL CODE; chọn đúng project **Family_bloom_V2** đã sử dụng trước đó, kiểm tra đường dẫn trong màn xác nhận.
3. Sau khi thấy `PASS: ... CLEAN APPLY passed`, chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` (từ project đã cập nhật hoặc FULL CODE).
4. Nếu BAT báo không thấy `google-services.json` dù bạn **đã có file**, hãy xem đường dẫn project và đường dẫn JSON mà BAT in ra. Nếu nó khác `Family_bloom_V2` vừa cập nhật, chọn lại đúng project; **không tải JSON mới hoặc chép thêm vào FULL ZIP**. Nếu project đúng thật sự thiếu file root, khi đó mới chọn file **Firebase Android** cũ đúng ứng dụng. BAT có thể gợi ý từ `android/app` hoặc bản sao lưu cùng project; nếu không có hãy tải lại từ Firebase Console. BAT sẽ xác minh ứng dụng + Firebase project và **hỏi trước khi sao chép**. KHÔNG chọn file `firebase-adminsdk-*.json`.
5. Chỉ dùng APK mới sau thông báo `[PASS] APK ... SHA256 ...`. Mặc định ở `C:\FamilyBloomShare\apk`. Nếu build lỗi, `LATEST` trước đó KHÔNG phải APK vừa build.

## Cần biết trước khi chạy

- Project nguồn: thư mục có `package.json`, `app.config.js`, `src/`, `scripts/`, `server/`.
- File riêng tại root project cần build: `google-services.json` cho Android client `com.familybloom.android` thuộc Firebase project `family-connect-4184f`. FULL ZIP **cố ý không chứa file này**.
- Auto Update **không build APK**. Nó sao lưu project trước, dọn tệp lỗi thời, overlay FULL source, kiểm tra và CLEAN APPLY; chỉ ghi nhớ đích mới sau khi hoàn tất.
- Cấu hình `.env`, Admin SDK, dữ liệu ứng dụng và thư mục generated Android không nằm trong FULL CODE. Phải tự giữ an toàn, không tải lên chat/Git/ZIP công khai.
- Chạy công cụ triển khai Firestore Rules riêng khi có thay đổi Rules. Không tự deploy Functions khi đang dùng Firebase Spark.

## Xem tài liệu theo thứ tự

1. `01-KIEN-TRUC.md`: bức tranh tổng thể, điều gì được cô lập để bảo vệ hiệu năng.
2. `02-BAT-VA-QUY-TRINH.md`: 6 BAT root, luồng cập nhật/build/Firebase.
3. `03-LUONG-HAM-QUAN-TRONG.md`: các hàm và nơi nên bắt đầu sửa.
4. `07-DU-LIEU-VA-BAO-MAT.md`: đường dẫn Firestore, Render, dữ liệu riêng.
5. `08-TEST-PERFORMANCE-VA-SUA-LOI.md`: kiểm thử/điều tra lỗi.
6. `09-HUONG-DAN-SUA-CODE.md`: cách thêm chức năng mà không phá kiến trúc.
7. `04-DANH-MUC-SCRIPTS-TU-DONG.md`, `05-DANH-MUC-HAM-TU-DONG.md`, `06-DANH-MUC-ROUTE.md`: tra cứu theo file/tên.
8. `10-PROMPT-GIAO-DU-AN-CHO-AI.md`: prompt chuẩn khi trao đổi với AI khác.

## Giới hạn đã xác minh

Các kiểm thử `node`/tiền kiểm có thể chạy trực tiếp trên FULL CODE sạch. Chúng **không tương đương** với việc Gradle build thành công trên Windows, APK mở thật, ghi Firestore thành công, hay FPS đạt mục tiêu. Những việc đó phải thử sau khi cài cấu hình và build APK trên máy người dùng.
