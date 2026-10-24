# Family Bloom H25R2R7R2R3R3 — CÔNG THỨC GHÉP NHIỀU THÀNH PHẦN

**Ngày 23/10/2026 — Bản kế tiếp H25R2R7R2R3R2.**

## 1. Lỗi gốc

Trong R3R2 `StudyFormulaEditor.tsx` chỉ giữ một `selected` template và bộ `fields` duy nhất. Mỗi khi chọn mẫu khác, `pick()` thay mẫu đang nhập; nút Chèn luôn chỉ phát ra TeX của đúng một template. Vì vậy `√25` có thể chèn, nhưng không thể tiếp tục nhập `+ 3` trong cùng một công thức. Video 8875.mp4 cho thấy giới hạn này.

## 2. Giải pháp

- Tạo **StudyFormulaExpression.ts**: mô hình biểu thức theo danh sách tối đa 32 thành phần, có thể là một mẫu (căn, phân số, số mũ, Hóa/Lý…) hoặc đoạn ký tự/ phép toán.
- Chọn mẫu để chèn thêm vào biểu thức hiện có, không thay thế phần trước. Có các phím nhanh `+ − × ÷ = ( ) ± < >` và nút thêm số/chữ.
- Hiển thị các phần dưới dạng chip đánh số; chạm để sửa lại giá trị, di chuyển trái/phải hoặc xóa đúng phần.
- Phía trên hiển thị xem trước toàn biểu thức bằng `NativeFormula`. Chỉ bật **Chèn** khi đủ các ô và công thức không kết thúc ở dấu phép toán.
- Lưu `value` (TeX đã ghép) cùng `formulaParts` (các mẫu và ô nhập), vẫn tương thích `formulaTemplate` + `formulaFields` cũ. Chỉnh sửa lại không mất các phần khác. Công thức TeX cũ phức tạp được mở ở chế độ nâng cao, không cố chuyển và làm hỏng nội dung.
- Không thay đổi cấu trúc thư mục Firestore, quyền Rules, Kotlin, môi trường Firebase hoặc dependency. Trình soạn ƒx vẫn chỉ dynamic import khi được mở; danh sách Hỏi đáp vẫn dùng renderer Native nhẹ.

## 3. Hướng dẫn thao tác

**Ví dụ √25 + 3:**
1. Vào **Cả nhà cùng giải → Đặt câu hỏi → ƒx Công thức**.
2. Chạm mẫu **Căn bậc hai**, điền `25` vào ô dưới căn.
3. Ở vùng **Thêm số, chữ và phép toán**, chạm **+**.
4. Chạm **123 / abc**, nhập `3` vào ô đang được chọn.
5. Kiểm tra khu vực **XEM TRƯỚC CẢ BIỂU THỨC** → **Chèn**.

**Ví dụ 1/2 + √9 − x²:**
1. Chạm **Phân số**, nhập tử `1`, mẫu `2`.
2. Thêm `+` → chèn **Căn bậc hai** và nhập `9`.
3. Thêm `−` → chèn **Lũy thừa**, nhập cơ số `x`, số mũ `2` → Chèn.

**Đổi thứ tự/sửa sau khi chèn:** Bấm vào công thức ở nội dung câu hỏi → chọn chip thành phần → sửa ô tương ứng hoặc dùng **Dời trái/Dời phải/Xóa phần**.

## 4. Kiểm thử

- Bộ kiểm thử ghép công thức mới: **18/18 PASS** (có TypeScript), **8/8 PASS** ở nhánh tiền kiểm trước npm install.
- Bộ công thức cũ: **16/16 PASS**.
- Bộ Hỏi đáp: **14/14 PASS**.
- Toast/bàn phím: **15/15 PASS**.
- Chuyển hướng Build & Share về project đã cấu hình Firebase: **15/15 PASS**.
- Release readiness: **11/11 PASS**.
- Rà cú pháp TS/TSX cả `src` và `server/src`: **343 tệp, không phát hiện lỗi cú pháp**.
- Auto Update `check` với đường dẫn nguồn/đích khác nhau: **PASS**, thử nhánh có/không có TypeScript, không sao lưu/ghi đè trong chế độ check.

**Giới hạn:** Chưa build Gradle/Android trực tiếp và chưa benchmark FPS/RAM trên điện thoại. Đây là trình ghép theo nhiều khối Native, chưa phải trình soạn biểu thức tự do/định dạng Toán đầy đủ như MathLive. Với các biểu thức phức tạp hơn cần kiểm tra hiển thị trước khi đăng.

## 5. Phạm vi ảnh hưởng

Tệp mới: `src/features/study/StudyFormulaExpression.ts`, `scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs`.
Tệp sửa: `StudyFormulaEditor.tsx`, `StudyComposer.tsx`, `StudyFormula.tsx`, `studyRepository.ts`, script Auto Update, CLEAN APPLY, Build/Share, EAS test, script kiểm tra đồng nhất build target.

**Đường phát hành:** vẫn Android `1.3.32 / versionCode 143042` vì thay đổi JavaScript/TypeScript, không sửa Kotlin. Build & Share phải dùng project đã có `google-services.json`, hoặc root BAT sẽ chuyển tới project đã cập nhật.

**Không bao giờ chép hoặc upload** `google-services.json`, Admin SDK JSON, khóa riêng hoặc `.env` vào ZIP FULL CODE.
