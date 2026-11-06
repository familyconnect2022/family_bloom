# BÁO CÁO FAMILY BLOOM H25R2R7R2R3R8

**Ngày:** 24/10/2026  
**Nền:** FULL CODE H25R2R7R2R3R7  
**Phạm vi:** Super Bloom – trình soạn công thức, nhận diện Hóa học an toàn, ô chèn phụ và gate phát hành.

## 1. Vấn đề và hướng sửa

Bộ Hóa học cũ chuyển `chữ + số` thành chỉ số dưới bằng regex; không đủ khả năng phân biệt hệ số, chỉ số nguyên tử, ký hiệu nguyên tố, ion, trạng thái chất và phương trình. Điều này có nguy cơ hiển thị sai mà không cảnh báo. Bộ ghép cũng chưa có ô phụ mờ, dễ nhập nhầm ký hiệu Hóa vào chế độ văn bản.

Bản R3R8 có parser Hóa học offline thuần TypeScript (`StudyChemistry.ts`) với 118 ký hiệu nguyên tố và các quy tắc xác thực. Công thức mơ hồ bị từ chối trong **chế độ Hóa**; dữ liệu người dùng nhập không bị tự sửa.

## 2. Những thay đổi đã code

| Thành phần | Sửa đổi |
|---|---|
| `StudyChemistry.ts` | Phân tích ký hiệu nguyên tố, nhóm ngoặc, chỉ số, hệ số nguyên/phân số, điện tích rõ `^`, trạng thái `(s)/(l)/(g)/(aq)`; đếm nguyên tử cho phương trình |
| `StudyFormulaTemplates.ts` | Mẫu chất, ion, phản ứng, cân bằng, đồng vị gọi parser xác thực thay cho regex; lỗi có thông báo tiếng Việt |
| `StudyFormulaExpression.ts` | Bổ sung `syntax:'chemistry'` cho phần văn bản được chọn rõ; giữ nội dung thô để sửa; biên dịch `1/2 + O2` thành một biểu thức TeX có cấu trúc |
| `StudyFormulaEditor.tsx` | Thêm ô nét đứt mờ “Chèn tiếp sau phần đang chọn”, 2 chế độ Văn bản/Toán và Ký hiệu Hóa; phản hồi cú pháp, giữ chữ người dùng nhập khi sai; cảnh báo phản ứng chưa cân bằng |
| `StudyFormula.tsx` | Điều chỉnh vị trí của chỉ số dưới trong renderer Native để không căn quá cao |
| `studyRepository.ts` | Thêm thuộc tính `syntax?` tùy chọn cho metadata phần công thức, tương thích dữ liệu cũ |
| Gate Test | Thêm `test-super-bloom-chemistry-safe-r3r8.cjs` vào Auto Update, CLEAN APPLY, Build & Share, EAS Build, EAS OTA và `eas-build-post-install` |
| Build router | Thêm module Hóa học và gate mới vào danh sách kiểm tra đồng nhất bản FULL đã cài |
| Legacy build tests | Cập nhật marker file mới để không báo FAIL giả khi project FULL đúng phiên bản |

Không có cấu trúc Firestore mới, không đổi Rules, không thêm WebView hoặc dependency Native; không đổi applicationId / versionCode `143042`. Các tính năng Chess, Xiangqi, Phả hệ không được sửa.

## 3. Ví dụ hành vi

- `O2` → `O₂` **chỉ khi chọn chế độ Hóa học**. Văn bản bình thường `O2` được giữ nguyên.
- `1/2 O2` → hệ số phân số đứng trước O₂.
- Mẫu phân số `1/2`, sau đó ô bổ sung chọn Hóa `O2` → biên dịch `\\frac{1}{2}\\,\\mathrm{O_{2}}` và lưu cùng dữ liệu các ô chỉnh sửa.
- `CO` và `Co` được nhận dạng khác nhau.
- `Ca^2+` nhận diện điện tích; `Ca2+` bị báo mơ hồ, không tự đoán.
- `02` bị từ chối vì ký tự `0` khác chữ `O`.
- `H2 + O2 -> H2O` có cảnh báo chưa cân bằng nhưng vẫn cho phép dùng trong đề bài.
- `2H2+O2->2H2O` được đếm nguyên tử cân bằng.
- `C, A=14, Z=6` hợp lệ; Z không đúng nguyên tố sẽ từ chối.

**Ranh giới quan trọng:** Kiểm tra cấu trúc không xác nhận phản ứng là khả thi ngoài thực tế, cũng không tự điều chỉnh sản phẩm hay hoá trị. Hóa hữu cơ dạng cấu trúc đồ thị hoặc phản ứng phức tạp cần ảnh minh họa/chế độ nâng cao.

## 4. Kiểm thử thực hiện

- Chemistry gate: **16/16 PASS** với TypeScript, **5/5 PASS** khi chưa cài TypeScript.
- Visual formulas: **16/16 PASS**; source-only **6/6 PASS**.
- Compound formulas: **18/18 PASS**; source-only **8/8 PASS**.
- Native math lessons: **15/15 PASS**.
- Study Q&A: **14/14 PASS**; Study UX: **15/15 PASS**.
- Build routing: **15/15 PASS**; Firebase recovery **23/23 PASS**.
- Script layout: **14/14 PASS**.
- Static TS/TSX transpilation: **346 file, 0 lỗi cú pháp**.
- Auto Update giả lập: tiền kiểm PASS; sao lưu → chép → xác minh PASS; `.env` và `google-services.json` được bảo vệ.

**Giới hạn kiểm chứng:** Chưa build Gradle APK bằng Windows, chưa thử nhận diện và vị trí chỉ số dưới trên Android thật, chưa kiểm thử Firestore production với dữ liệu người dùng thật. Đây là kết quả kiểm thử nguồn/logic/gate, không phải cam kết build hoặc UX thực tế đã hoàn hảo.

## 5. Cách cập nhật / test

1. Giải nén FULL ZIP R3R8 ra thư mục riêng, không chép thủ công vào project.
2. Chạy `scripts\\android\\Family_Bloom_MENU.bat`, chọn Auto Update, xác nhận project đích đã cấu hình Firebase.
3. Auto Update phải PASS trước khi chạy Build & Share từ **project đã cập nhật**.
4. Test Hỏi đáp → ƒx → phân số `1/2` → ô nét đứt → chọn Ký hiệu Hóa → `O2` → Chèn sau phần này → xem trước và mở lại sửa.
5. Thử `Ca2+` (phải được nhắc không rõ nghĩa), `Ca^2+`, `CO`, `Co`, `H2 + O2 -> H2O` và `Fe2(SO4)3`.
6. Đối chiếu hiệu năng Home/Phả hệ/Chess trước–sau; bộ nhận diện chỉ được tải khi mở ƒx.

**Lưu ý:** Lần này không cần deploy lại Firestore Rules. Không đưa file `google-services.json` riêng vào FULL ZIP.
