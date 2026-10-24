# Family Bloom H25R2R7R2R3R11 — chuẩn hóa bố cục công thức

Mốc nguồn: FULL CODE H25R2R7R2R3R10 ngày 24/10/2026. Đây là bản sửa parser và renderer Native, không đổi Firestore Rules, applicationId hoặc Kotlin Native.

## Các thay đổi
1. `StudyMathParser.ts`: thêm AST `limit` với `condition`, đọc `\\lim_{x\\to1}` và `\\lim\\limits_{x\\to1}`. Điều kiện nằm trong trường riêng, không còn ghép sau chữ lim. `\\displaystyle` không hiện thành chữ.
2. `StudyFormula.tsx`: khối limit theo chiều dọc, `alignItems:'center'`, điều kiện `x → 1` căn giữa ngay **dưới** `lim`, biểu thức tiếp theo ở bên phải.
3. `StudyMathParser.ts`: phân tích môi trường `bmatrix`, `pmatrix`, `matrix` thành dữ liệu hàng/cột có giới hạn, renderer hiển thị ma trận dạng Native thay vì TeX thô. Ma trận chưa khép đúng cú pháp hiển thị □, không âm thầm đoán dữ liệu.
4. Nét căn: thay các đoạn gấp góc quay riêng bằng một dấu căn glyph duy nhất và thanh ngang gối nhẹ trên phần thân căn. Số mũ và điện tích dùng khoảng cách compact, tránh tách dấu cộng/trừ khỏi điện tích.
5. Vectơ: đưa mũi tên gần ký hiệu hơn và hỗ trợ `\\overrightarrow` tương tự `\\vec`.
6. Toàn bộ đường hiển thị Preview, câu hỏi, lời giải và nội dung bài học dùng chung `NativeFormula`/`parseStudyMath`.

## Kiểm thử và an toàn phát hành
- Gate mới `scripts/tests/release/test-super-bloom-math-typesetting-r3r11.cjs` kiểm tra AST, ma trận, dấu căn, vectơ, chỉ số ion, vị trí điều kiện lim và dữ liệu cũ.
- Gate được gọi trong Auto Update trước sao lưu/overlay, CLEAN APPLY, Build & Share, APK Release, EAS Build và EAS OTA.
- Cập nhật fixture của gate Firebase/Build Routing để nhận diện đủ file kiểm thử mới, không vô hiệu hóa kiểm tra.
- Khôi phục mock dependency `StudySolutionModel` cho gate runtime Hỏi đáp cũ.
- Không tải WebView, không thêm listener Firestore, không thêm dependency npm hoặc thay đổi dữ liệu đang lưu.
- Gate mã nguồn không khẳng định đạt thẩm mỹ thực tế trên Android; cần build APK và thử các mẫu bên dưới.

## Kịch bản thử trên điện thoại
- `\\lim_{x\\to1}\\cos(2x)` — `x → 1` **chính giữa dưới** `lim`, không nằm bên cạnh.
- `\\lim\\limits_{x\\to1} x^2` — cú pháp nâng cao cũng đúng.
- `\\begin{bmatrix}2&7\\\\6&9\\end{bmatrix}` — 2 hàng, 2 cột, không hiện lệnh `begin`.
- `\\sqrt{x^3+1}` — dấu căn nối với gạch ngang và số mũ phía trên.
- `\\overrightarrow{AB}` — mũi tên sát chữ AB.
- `\\mathrm{O^{2-}}` — số 2 và dấu trừ điện tích là một cụm nhỏ, không có khoảng cách phép trừ.
- Màn ghép công thức, bài đã đăng và Kho bài học đều hiển thị đồng nhất.
- Kiểm tra Home, Phả hệ, Chess/Xiangqi, build APK trên Windows và tốc độ cuộn sau khi cập nhật.

## Cài đặt
Giải nén FULL CODE ngoài project cũ. Chạy `scripts/android/Family_Bloom_MENU.bat` chọn 1 để Auto Update, sau đó chọn 2 để Build APK & Share. Cấu hình riêng (`google-services.json`, `.env`) vẫn nằm ở project đã cài và không được đưa vào FULL ZIP. Không dùng APK LATEST cũ nếu build báo FAIL. Không cần deploy lại Firebase Rules.
