# Family Bloom H25R2R7R2R3R7 – Công thức và cảm xúc

Ngày lập: 24/10/2026. Nền: H25R2R7R2R3R6. Phiên bản Native Android không thay đổi: 1.3.32, versionCode 143042.

## 1. Thay đổi có thể truy vết trong mã nguồn

- `src/features/study/StudyFormula.tsx`: thay cách ghép dấu căn bằng cấu trúc Native có dấu móc và đường ngang chung một cụm; thêm khoảng cách ngang cho các toán tử hai ngôi `+`, `-`, `×`, `÷`, `=`, `<`, `>` và các biến thể. Không tạo WebView.
- `src/features/study/StudyMathParser.ts`: chuyển `\\square`, `\\Box`, `\\placeholder` thành ô trống □; không hiện tên lệnh TeX trong các mẫu căn chưa điền.
- `src/features/study/studyRepository.ts`: thêm `StudyReaction` với 6 loại (heart, like, laugh, wow, clap, flower); thao tác theo tài liệu UID riêng dưới mỗi lời giải. Đọc được bản ghi cũ không có `reaction` như heart. Dùng tham chiếu Firestore tuyệt đối và giữ `createdAt` khi đổi emoji.
- `src/app/(home)/(learning)/study-question-detail.tsx`: bộ chọn 6 emoji cho thẻ lời giải, chọn lại để bỏ, khóa khi đang lưu, cập nhật giao diện trước và khôi phục khi ghi thất bại. Lỗi hiện bằng Bloom Toast sẵn có.
- `firestore.rules` và `firestore.cloud.rules`: cho phép tạo/đổi/xóa reaction **chỉ với tài khoản hợp lệ và UID của chính mình**, chỉ chấp nhận 6 mã emoji, không cho đọc danh sách reaction. Không mở quyền công khai.
- `scripts/tests/release/test-super-bloom-math-reactions-r3r7.cjs`: gate mô phỏng Firestore, kiểm tra renderer, dữ liệu cũ, đổi/xóa emoji, trường hợp từ chối quyền, giới hạn quyền.
- Nối gate mới vào tiền kiểm Auto Update, CLEAN APPLY, Build & Share và các script EAS/test APK.

## 2. Giới hạn còn lại cần kiểm chứng thực tế

- Chưa chạy build Gradle/APK hoặc kiểm tra trực quan dấu căn trên Android thật. Hình dáng dấu căn cần thử trên nhiều cỡ chữ và màn hình.
- Chưa chứng minh được nguyên nhân thực tế gây lỗi `undefined is not a function` trên thiết bị; đã giảm rủi ro bằng cách dùng đường dẫn Firestore tuyệt đối, kiểm thử thao tác và điều kiện quyền. Nếu lỗi còn, cần log stack thực tế.
- Bộ chọn emoji được bổ sung cho **lời giải** nơi người dùng báo lỗi. Cảm xúc ở cấp câu hỏi/bình luận chưa được thêm trong bản này; không mô tả là đã hoàn tất phần chưa làm.
- Không có bộ đếm tổng cảm xúc vì Firestore Rules cố ý không cho liệt kê reaction của thành viên khác. Muốn đếm chính xác cần thiết kế bộ tổng hợp an toàn riêng, không mở quyền chỉ để đếm.
- **Cần deploy Firestore Rules từ bản này** trước khi kiểm thử emoji mới. Cập nhật APK hoặc Auto Update không tự deploy Rules.

## 3. Các quy tắc không được phá vỡ

- Mỗi `families/{familyId}/studyQuestions/{questionId}/answers/{answerId}/reactions/{uid}` chỉ thuộc UID đã xác thực.
- Không được thay đổi, xóa hay di chuyển dữ liệu câu hỏi/lời giải cũ trong lần cập nhật.
- Không thêm listener ở root, không import WebView hay thư viện nặng vào màn Home; renderer Native chỉ sử dụng tại Study.
- Không thay đổi hành vi Chess/Xiangqi/Phả hệ và không thay đổi cấu hình Firebase riêng.
- Chỉ build tại đúng project cũ đã được cập nhật và có `google-services.json`, không copy JSON vào FULL ZIP.

## 4. Kiểm thử nguồn đã chạy

- Math lesson gate 15/15 PASS.
- Compound expression 18/18 PASS.
- Study Q&A 14/14 PASS.
- Study UX 15/15 PASS.
- Firebase Recovery 23/23 PASS.
- Build Routing 15/15 PASS.
- Script Layout 14/14 PASS.
- Project Structure 19/19 PASS.
- New math/reaction gate 10/10 PASS (bao gồm Firebase mô phỏng).
- Auto Update preflight trên project giả lập, không ghi đè: PASS.
- 344 tệp TS/TSX `transpileModule`: không có lỗi cú pháp; không thay thế `tsc --noEmit` đầy đủ hoặc Android Gradle.

## 5. Hướng dẫn sử dụng và test

1. Giải nén FULL ZIP vào thư mục mới, chạy `scripts/android/Family_Bloom_MENU.bat`, chọn cập nhật project đã cấu hình. Không chạy build từ thư mục ZIP chưa cập nhật.
2. Deploy `firestore.rules` của bản này bằng `scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat` sau khi đối chiếu đúng Firebase project và sao lưu Rules hiện hành. Đây là thao tác riêng, không nằm trong Auto Update.
3. Build APK từ project đã cập nhật: menu mục Build & Share. Nếu thất bại, chụp **lỗi đầu tiên** trong CMD thay vì chỉ dòng cuối.
4. Thử các công thức: `\\sqrt{x^3+2}`, `\\int_0^1(x^3+2)\\,dx+\\sqrt{x^3+2}\\times\\frac{20}{x}`, phân số lồng căn, vectơ và phương trình hóa học.
5. Thử lời giải: chọn ❤️, đổi sang 😂, chạm 😂 lần nữa để bỏ; đổi tài khoản; thử offline và quyền không hợp lệ; xác nhận Bloom Toast và không mất trạng thái cũ khi ghi thất bại.

**Lưu ý:** Kết quả kiểm tra nguồn chưa đồng nghĩa bản APK chạy thực tế đã đạt. Chỉ đánh dấu hoàn thành trên thiết bị khi các bước 4–5 được thử bằng APK Release.
