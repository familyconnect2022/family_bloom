# Family Bloom R3R14 — Thư Ngỏ Hộp Thời Gian (24/10/2026)

## Nền mã nguồn
- Xuất phát từ bản **R3R13 BLAZE CLOUD FCM READY FULL CODE**, không chuyển sang một bản R3R11/R3R12 cũ.
- Giữ nguyên cấu hình Firebase, Phả hệ, Chess, Xiangqi, Super Bloom, các công tắc Blaze/FCM, đường dẫn Android và bốn BAT root.
- `app.json` vẫn giữ Android `com.familybloom.android`, `version=1.3.32`, `versionCode=143042` để tránh làm sai các gate native-identity hiện hữu. Đây là thay đổi giao diện và asset JavaScript, không phải thay đổi native.

## Thư Ngỏ đã được triển khai
- **Đóng kín**: hiển thị phong bì hồng vàng hồng, con dấu trái tim. Tệp `assets/images/onboarding/time-letter/sealed.jpg`.
- **Mở thư**: nhấn vào phong bì, trạng thái nắp mở/lá thư trồi lên. Tệp `opening.jpg`.
- **Lá thư xuất hiện**: chuyển sang khung thư bay cao hơn. Tệp `revealed.jpg`.
- **Đọc thư**: native React Native card chuyển động lên, tăng kích thước và ngừng nghiêng; thư chứa **14 đoạn lời Thư Ngỏ được chủ dự án duyệt**, không dùng chữ đã vẽ vào ảnh làm nội dung thật.
- Diễn tiến: 550 ms (mở) + 680 ms (thư lên) + 630 ms (bày giấy đọc). Dùng `Animated` với native driver. Không gọi network.
- Trang đọc có header cố định, footer có nút tiếp tục cố định. Chỉ thân thư `ScrollView` có thể cuộn. Có giao diện nén gọn cho màn hình thấp.
- Double tap không khởi động nhiều animation; không gọi tiếp tục hai lần. Hủy hoạt ảnh khi unmount/đổi gia đình hoặc phiên đăng nhập.
- Android Back không bỏ qua thư; người dùng đi vào nhà bằng nút chính thức.
- Tôn trọng chế độ Reduced Motion. Nếu asset tải lỗi, vẫn có nội dung native để đọc.

## Vị trí tệp
- `src/components/onboarding/WelcomeModal.tsx`: UI/animation/ScrollView.
- `assets/images/onboarding/time-letter/{sealed,opening,revealed}.jpg`: 3 ảnh đã được duyệt, nén JPEG chất lượng cao (~0.93 MB tất cả).
- `document/releases/r3r14/approved-letter-paragraphs.snapshot.json`: snapshot 14 đoạn nội dung để regression test.
- `scripts/tests/release/test-r3r14-welcome-envelope-motion.cjs`: gate R3R14.
- `scripts/tests/release/test-r3r12-family-intro-letter-radical.cjs`: cập nhật mốc chiều cao cho thiết kế responsive; những gate khác vẫn giữ nguyên.
- `scripts/maintenance/auto-update-full.cjs`: gate R3R14 trước khi chạm project cũ.
- `scripts/android/{build/Family_Bloom_Android_Release_Build_APK_And_Share.bat,eas/Family_Bloom_EAS_BUILD_TEST.bat,eas/Family_Bloom_EAS_UPDATE_TEST.bat}`: kiểm thử R3R14 trước build/OTA.

## Kiểm tra đã thực hiện trong môi trường hiện tại
- R3R14: 11/11 source/static checks.
- R3R12: 7/7 checks (case-sensitive family intro, radical, letter, BAT).
- R3R13: 13/13 Blaze/FCM readiness checks.
- Cấu trúc thư mục: 19/19 checks.
- TypeScript/TSX transpile: 330/330 file có cú pháp hợp lệ.
- Auto Update thử nghiệm trên thư mục giả lập: 21/21 checks, bao gồm backup, bảo vệ bí mật, verify hash.
- Mã nguồn R3R13: không có tệp gốc nào bị bỏ khỏi gói mới.
- Kiểm tra archive/manifest và SHA256: xem báo cáo đính kèm khi đóng gói.

## Giới hạn / việc cần xác nhận trên điện thoại
- Chưa compile Gradle APK, chưa chạy Android/emulator nên KHÔNG khẳng định animation thực tế đạt 90% hoặc không có lỗi render. Tỉ lệ tương đồng do người dùng đánh giá sau khi xem ứng dụng.
- Kiểm tra APK tại màn hình 6–7 inch, màn hình thấp, font hệ thống lớn, dark theme; thử nhấn nhanh 3 lần, Back, cuộn hết 14 đoạn, chuyển app background khi đang mở thư và vào lại.
- Tính năng Firebase/Blaze không tự bật; không thay Firestore Rules trong bản R3R14.

## Cập nhật
1. Giải nén FULL CODE R3R14 ra thư mục riêng **không nằm trong** project cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trong FULL CODE, chọn đúng folder dự án hiện tại, xác nhận sao lưu/overlay.
3. Build bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` ở folder dự án đã cập nhật. Nếu chỉ dùng JS assets và runtime tương thích, có thể xuất OTA theo hướng dẫn EAS hiện có.
4. Kiểm tra visual thực tế trên điện thoại. Không cần thay Firebase chỉ vì Thư Ngỏ.
