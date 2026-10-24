# FAMILY BLOOM H25R2R7R2R3 — GÓC HỌC TẬP: NHẬP CÔNG THỨC TRỰC QUAN

Ngày: 23/10/2026. Nền: H25R2R7R2R2. FULL CODE / Copy-over update.

## Mục tiêu

Thay trải nghiệm nhấn mẫu rồi tự sửa chuỗi TeX bằng các mẫu có ô nhập riêng: với phân số, tử số ở trên, mẫu số ở dưới; với lũy thừa, căn, vectơ, phương trình và công thức Lý/Hóa, mỗi thành phần có nhãn và ô riêng. TeX vẫn có thể nhập trong chế độ Nâng cao tùy chọn.

## Thay đổi

1. `src/features/study/StudyFormulaTemplates.ts`: 33 mẫu chuyên biệt cho Toán (15), Vật lý (10), Hóa học (8), gồm phân số, hỗn số, lũy thừa, căn, ma trận, bất phương trình, tích phân, gia tốc, lực, Ôm, động năng, áp suất, nồng độ mol, ion, phương trình phản ứng, đồng vị và các mẫu khác.
2. `src/features/study/StudyFormulaEditor.tsx`: trình soạn Native với ô nhập theo từng thành phần, xem trước, lựa chọn môn, chú thích tiếng Việt, kiểm tra ô chưa điền, nút Chèn và nút TeX nâng cao. Lắp trên Modal với KeyboardAvoidingView và ScrollView.
3. `src/features/study/StudyComposer.tsx`: chỉ dynamic-import trình soạn khi người dùng nhấn ƒx. Khi lưu, ghi cả TeX và cấu trúc các ô vào StudyBlock; mở lại để sửa từng ô.
4. `src/features/study/studyRepository.ts`: thêm hai trường tùy chọn tương thích ngược `formulaTemplate`, `formulaFields` trong StudyBlock; không thay collection, cấu trúc Firestore đường dẫn hay quyền.
5. `src/features/study/StudyFormula.tsx`: chỉ chứa renderer Native nhẹ cho màn danh sách/chi tiết. Không bắt render feed tải module biên tập.
6. Mã TeX cũ cho phân số, căn, số mũ, chỉ số dưới có nỗ lực chuyển sang form có ô nhập khi chỉnh sửa. Mã TeX khác vẫn sửa bằng chế độ Nâng cao.
7. `scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs`: kiểm tra công thức thuần, tính độc lập module và cấu trúc lưu; chạy được trước khi npm install; kiểm tra sâu hơn khi TypeScript có sẵn.
8. Gắn kiểm tra mới vào Auto Update (giai đoạn không ghi đè) và CLEAN APPLY (sau khi cài dependencies). Không thay đổi Kotlin, Chess/Xiangqi, Phả hệ, cấu hình Firebase Rules, app version/versionCode, bí mật hoặc cơ chế Build & Share.

## Kết quả đã chạy trong môi trường xây dựng gói

- Kiểm tra mẫu mới: 15/15 PASS.
- Kiểm tra Study QA trước đó: 14/14 PASS.
- Study UX Toast/keyboard: 15/15 PASS.
- Mock repository/renderer Study: PASS.
- Release readiness: 11/11 PASS.
- H25 source package: PASS.
- Source preflight: 10/10 PASS.
- Cú pháp 342 tệp JS/TS/TSX trong `src` + `server/src`: 0 lỗi.
- Auto Update kiểm tra trên target giả lập đường dẫn có khoảng trắng: PASS, không sao lưu hay ghi đè trong chế độ check.
- ZIP sẽ được giải nén/kiểm tra CRC trước khi phân phối.

## Hạn chế / chưa được chứng minh

- Chưa chạy APK Release/Gradle Windows hoặc thử bàn phím màn hình thật, RAM/FPS trên thiết bị.
- Renderer Native nhẹ hỗ trợ ký hiệu thường gặp, không có bộ dàn trang LaTeX/MathLive hoàn chỉnh. Mẫu ma trận, hệ thức có ký hiệu nâng cao có thể hiển thị dạng văn bản đơn giản ở danh sách. Bản sao TeX vẫn được giữ để phát triển renderer chuyên sâu sau.
- Không thể cam kết hiệu năng tuyệt đối trước khi so sánh APK trên máy thật. Chỉ có bằng chứng rằng không thêm WebView/native dependency và module soạn ƒx được lazy-load.

## Kiểm thử khuyến nghị trên Android

1. Từ Cả nhà cùng giải → Đặt câu hỏi → ƒx → Toán → Phân số. Chạm ô Tử số, gõ 3; chạm ô Mẫu số, gõ 4; xem trước rồi Chèn.
2. Chạm lại công thức đã chèn. Kiểm tra hai ô vẫn có 3 và 4; sửa tử số thành 7, chèn lại.
3. Lần lượt thử mẫu căn, lũy thừa, vectơ, phương trình, Định luật Ôm, phương trình hóa học; xem trên bài sau khi đăng.
4. Tắt bàn phím, cuộn danh sách dài. Không có WebView khởi tạo khi chưa bấm ƒx; kiểm tra tốc độ chuyển tab Home/Phả hệ/Chess như trước.
5. Đăng một câu hỏi bằng tài khoản A và mở bằng tài khoản B. Nếu gặp `permission-denied`, triển khai đúng `firestore.rules` của bản H25R2R7R2R2 như hướng dẫn trước; gói này không sửa Rules.

## Cập nhật

Giải nén gói FULL CODE vào thư mục riêng; chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, kiểm tra PASS rồi dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Đảm bảo project đích là Family Bloom; updater sẽ bảo vệ các file cấu hình riêng và thực hiện backup trước overlay.
