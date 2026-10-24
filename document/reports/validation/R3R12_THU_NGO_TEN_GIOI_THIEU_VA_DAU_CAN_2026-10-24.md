# Family Bloom R3R12 — THƯ NGỎ · TÊN GIỚI THIỆU · DẤU CĂN

Bản nền: H25R2R7R2R3R11 (24/10/2026). Không thay đổi familyId, danh sách thành viên, dữ liệu phả hệ, Chess hoặc Xiangqi.

## 1. Thư Ngỏ

- Hiển thị phong bì Hộp Thời Gian; chạm để mở, nội dung xuất hiện bằng Animated.spring.
- Nội dung đúng bản THƯ NGỎ đã được người dùng biên tập/phê duyệt.
- Thư giữ phần tiêu đề và nút vào nhà cố định; nội dung ScrollView cuộn độc lập trong chiều cao màn hình.
- Tiếp tục dùng in-tree overlay để tránh regression Android native Modal / route/tabbar.

## 2. Tên giới thiệu nhà để xin gia nhập

- Tên mặc định mới tự sinh: `Nhà-` cộng 10 ký tự đầu familyId, được đặt trong giao dịch tạo gia đình.
- Gia đình cũ tự tạo tên tương tự khi admin vào trang profile, sau khi Firestore rules mới được triển khai.
- Chỉ admin / owner được đổi tên. Tên có 1–20 ký tự, cho dấu Việt, khoảng trắng, ký hiệu đặc biệt; giữ nguyên hoa/thường, NFC để nhất quán Unicode.
- Registry `family_intro_names/v1_<encodeURIComponent(name)>` chống trùng bằng Firestore transaction; admin đổi tên trong transaction, registry cũ được giải phóng.
- Tìm tên mới theo đúng chữ hoa / chữ thường. Còn nhận mã nhà cũ (`family_codes`) và familyId cũ để không làm hỏng lời mời đã chia sẻ.
- Các yêu cầu gia nhập vẫn cần admin duyệt; không tạo member/membership tự động.
- Đã bổ sung luật cho **cả** `firestore.rules` và `firestore.cloud.rules`. **BẮT BUỘC triển khai Firestore Rules trước khi dùng tính năng đặt/đổi tên giới thiệu**; bản APK mới một mình không đủ.
- Không thay mã nội bộ hoặc đụng dữ liệu cá nhân/secret Firebase.

## 3. Dấu căn toán học

- Thay Glyph `√` có thể bị tách khỏi roof bằng nhóm RootInk có nét móc + hai nét chân liền đường gạch ngang trên cùng một hệ tọa độ.
- RootInk đo chiều cao biểu thức thông qua onLayout: căn phân số, căn lồng nhau và căn bậc n.
- Cùng NativeFormula dùng lại cho soạn, xem trước, lời giải công bố và bài học; không sửa TeX đã lưu.
- Không thêm WebView, react-native-svg hoặc thư viện mới.

## 4. BAT / build

- Thêm bốn BAT entrypoint dễ bấm tại thư mục gốc: AUTO_UPDATE_FULL, BUILD_APK_TO_SHARE, EAS_BUILD_TEST, EAS_UPDATE_TEST; logic chính tiếp tục nằm theo nhóm `scripts/android/`.
- BAT mới là wrapper mỏng, có guard đường dẫn, return lỗi đúng `errorlevel`.
- Synchronize manifest và layout checker để root BAT đúng danh sách, chặn BAT lạ.
- Sửa lỗi kiểm thử R3R11 bị lồng vào nhánh FAIL của R3R10 trong BAT OTA.
- Bổ sung test R3R12 trong CLEAN APPLY, EAS build/OTA và Build & Share.
- Auto Update vẫn sao lưu, validate target, overlay, verify hash, giữ `.env` và `google-services.json` của project cũ.

## 5. Kiểm thử đã thực hiện tại môi trường này

- Source import: 328 files, 1.948 imports — PASS.
- TypeScript/TSX transpilation: 347 files — 0 lỗi cú pháp.
- Project structure: 19/19 PASS.
- Windows BAT manifest: 37/37 file có mặt, 0 unmanaged, PASS.
- Auto update mocked backup/copy/hash: 21/21 PASS.
- Firebase configuration recovery: 23/23 PASS.
- Build location routing: 15/15 PASS.
- Super Bloom native math R3R11: 12/12 PASS.
- Chemistry-safe, inline follow, structured solutions, vector/matrix, formula preview, reactions: PASS.
- R3R12 dedicated suite: 7/7 PASS.

**Giới hạn kiểm thử**: không build Gradle Android APK trong môi trường hiện tại, không có Firebase Emulator cấu hình/đăng nhập và không chạy thử hiển thị thiết bị thật. Bản ZIP là FULL SOURCE, không phải APK. Cần test Android bằng tài khoản admin và tài khoản xin gia nhập sau khi triển khai rules mới. Mã nguồn hiện giữ versionCode/Native identity gốc R3R11 vì không thay module native.

## 6. Quy trình áp dụng

1. Giải nén FULL ZIP vào thư mục riêng, không giải nén đè trực tiếp project cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` ở thư mục giải nén; chọn project Family Bloom đang dùng. Chờ backup, verification và CLEAN APPLY thành công. Không tự build APK trong bước này.
3. Triển khai Firestore Rules mới qua `scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat` theo Firebase project đang dùng.
4. Build APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` ở project đã cập nhật; kiểm tra đường dẫn project và Firebase JSON trước khi tiếp tục.
5. Kiểm tra root 3 nơi: profile admin, modal xin vào nhà tài khoản mới, Thư Ngỏ và căn/phân số trong Super Bloom.
