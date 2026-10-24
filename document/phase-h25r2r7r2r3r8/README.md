# FAMILY BLOOM H25R2R7R2R3R8 — NHẬP HÓA HỌC AN TOÀN

## 1. Tại sao có bản này
Bộ nhập cũ biến *mọi chữ cái + chữ số* thành chỉ số dưới, có thể lẫn chữ O và số 0, nguyên tố `Co` và `CO`, hệ số, điện tích hoặc dấu cộng. Bản này thay cách thay chuỗi bằng bộ phân tích offline có quy tắc.

## 2. Chức năng đã bổ sung
- Ô **Chèn tiếp sau phần đang chọn** có viền nét đứt, màu mờ, hai chế độ: `Văn bản/Toán` và `Ký hiệu Hóa`.
- Chọn `Văn bản/Toán`: giữ nguyên `O2` dạng chữ; không phán đoán nội dung.
- Chọn `Ký hiệu Hóa`: chỉ nhận dạng khi cú pháp rõ, lưu cả giá trị người dùng nhập và chế độ `syntax:'chemistry'`; ví dụ sau phân số `1/2` chèn `O2` thành `\\frac{1}{2}\\,\\mathrm{O_{2}}`.
- Hỗ trợ các nguyên tố trong bảng tuần hoàn, nhóm ngoặc, chỉ số, hệ số số nguyên và phân số, trạng thái `(s),(l),(g),(aq)`, điện tích rõ `^2+`, `^-`.
- Mẫu phương trình phản ứng hỗ trợ mũi tên `->`, `⇌`, hệ số; phương trình chưa cân bằng có cảnh báo **nhưng được phép lưu làm câu hỏi**.
- Đồng vị kiểm tra nguyên tố, Z và A.
- Không tự biến đổi dữ liệu khó hiểu: `02`, `Xx2`, `Ca2+` bị từ chối khi chọn chế độ Hóa; nội dung nhập vẫn giữ trong ô chờ sửa.
- Renderer chỉnh chỉ số dưới để không căn giữa quá cao; không đổi lưu trữ các công thức cũ.

## 3. Luồng dữ liệu
`FormulaEditor` (tải khi bấm ƒx) → `StudyFormulaExpression` → `StudyChemistry` → TeX có cấu trúc và `formulaParts` với `syntax` tùy chọn → `StudyComposer` → `studyRepository` → Firestore.

Các bản cũ không có `syntax` mặc định vẫn được đọc là văn bản thường, không tự đổi thành Hóa học. Không thêm collection, listener root, WebView, phụ thuộc Native hoặc thay đổi Firebase Rules.

## 4. Giới hạn kiến thức và an toàn
- Kiểm tra cú pháp nguyên tố / số nguyên tử không chứng minh chất hoặc phản ứng tồn tại trong thực tế; không tự suy ra điều kiện phản ứng, hóa trị, tên chất hoặc sản phẩm.
- Kiểm tra cân bằng chỉ đếm nguyên tử hai vế, không thay thế kiểm tra điện tích, electron hoặc điều kiện hóa học.
- Điện tích kiểu `Ca2+` **mơ hồ**: nhập `Ca^2+`. Không tự đoán.
- Chưa hỗ trợ hình cấu trúc hữu cơ, đồng phân hình học, mũi tên có điều kiện trên/dưới hoặc phương trình hạt nhân phức tạp. Với các trường hợp này, chèn ảnh minh họa hoặc dùng TeX nâng cao.
- React Native đã sửa vị trí chỉ số theo cấu trúc. Hiệu quả thị giác cần được xác nhận trong APK thật.

## 5. Kiểm tra đã thực hiện
- `node scripts/tests/release/test-super-bloom-chemistry-safe-r3r8.cjs`
- `node scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs`
- `node scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs`
- `node scripts/tests/release/test-super-bloom-native-math-lessons.cjs`
- Auto Update preflight (trước khi sửa project); backup/overlay/verify với project mô phỏng, giữ `.env` và `google-services.json`.
- Build & Share, CLEAN APPLY, EAS được nối vào gate Hóa học mới. Build Gradle APK thực trên Windows/Android chưa được thực hiện trong môi trường tạo bản.

## 6. Cách dùng
1. Trong hỏi đáp → ƒx, chọn phân số, nhập 1 và 2.
2. Trong ô **Chèn tiếp sau phần đang chọn** chọn `Ký hiệu Hóa`, nhập `O2`, bấm **Chèn sau phần này**.
3. Xem trước `½O₂` dưới dạng một biểu thức; có khoảng cách toán học nhỏ giữa hệ số và chất.
4. Để nhập `H2 + 1/2 O2 -> H2O`, chọn mẫu `Phương trình phản ứng` rồi nhập hai vế. Nếu chưa cân bằng, hệ thống đưa cảnh báo nhưng không tự sửa sản phẩm.
5. Đổi lại phần bất kỳ ở hàng `Các phần` để chỉnh sửa, sau đó chọn `Chèn` ở góc trên.
