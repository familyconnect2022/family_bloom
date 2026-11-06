# FAMILY BLOOM H25R2R7R2R3R1 — SỬA AUTO UPDATE DỪNG NHẦM KHI KIỂM TRA CÔNG THỨC

**Ngày:** 23/10/2026  
**Nền:** H25R2R7R2R3 (FULL CODE 33 mẫu công thức Toán / Lý / Hóa)  
**Phạm vi thay đổi:** Một bài kiểm thử tiền kiểm, tài liệu báo cáo. Không đổi code chạy của ứng dụng.

## Nguyên nhân đã tái hiện

Trong bản H25R2R7R2R3, `scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs` có điều kiện:

```js
assert(!/from ['"]react|WebView|https?:\/\//.test(src))
```

Điều kiện tìm từ `WebView` trên **toàn bộ nội dung văn bản** của `src/features/study/StudyFormulaTemplates.ts`. Nhưng dòng chú thích đầu file chứa chữ `no HTML or WebView involved`. Trên máy Windows chưa cài `typescript` trong đường dẫn mà Node có thể tìm thấy, bài test chạy nhánh *source-only* và báo sai `ERR_ASSERTION`. Auto Update từ chối cập nhật **trước bước backup/cleanup/overlay**. Lỗi không phải do đường dẫn có khoảng trắng, thiếu quyền hay WebView thực sự được tải.

## Cách sửa

1. Kiểm thử tách chú thích ra khỏi phần mã trước khi dò phụ thuộc runtime, nên không bắt nhầm từ ngữ mô tả như `WebView`.
2. Giữ kiểm tra chặn import/require/fetch/WebView thật và bổ sung kiểm thử cho cả tình huống "chỉ là chú thích" và "import thật".
3. Giữ hai cấp kiểm thử: `source-only` trước khi sao lưu/chép đè nếu chưa có TypeScript và kiểm thử 33 mẫu công thức đầy đủ khi TypeScript sẵn sàng.
4. Không bỏ qua thất bại thật, không tắt Auto Update preflight, không thay đổi lệnh Windows BAT.

## Kết quả kiểm thử nguồn

| Hạng mục | Kết quả |
|---|---|
| Visual Formula (đã có TypeScript) | **16/16 PASS** |
| Visual Formula (giả lập không có TypeScript) | **6/6 PASS** |
| Auto Update `check`, giả lập không có TypeScript | **PASS** |
| Auto Update `check`, có TypeScript | **PASS** |
| Study Q&A source check | **14/14 PASS** |
| Study UX/Toast/keyboard | **15/15 PASS** |
| Feature flag regression | **10/10 PASS** |
| Bulletin deferred | **13/13 PASS** |
| Release readiness | **11/11 PASS** |
| TS/TSX transpile syntax | **323/323 PASS** |

`Auto Update check` được thử trên thư mục Family Bloom giả lập có khoảng trắng trong đường dẫn, và không tạo sao lưu/ghi đè trong giai đoạn chỉ kiểm tra. Đây **không phải** xác nhận Auto Update chạy xong đầy đủ trên Windows của bạn; các bước backup/copy/CLEAN APPLY/Gradle vẫn cần kiểm thử bằng BAT thật.

## Tệp thay đổi

- `scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs`: sửa điều kiện kiểm tra gây dương tính giả, thêm tự kiểm tra.
- `document/phase-h25r2r7r2r3r1/BAO_CAO_AUTO_COPY_FALSE_POSITIVE.md`: tài liệu này.

Toàn bộ mã nguồn chạy của Study Formula, Hỏi đáp, Firestore, Kotlin, Chess, Xiangqi, các BAT giữ nguyên so với R2R3.

## Hướng dẫn cập nhật

1. Giải nén bản **H25R2R7R2R3R1 FULL CODE** vào thư mục mới, bên ngoài project đang dùng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trong bản mới. Chọn/thẩm định đúng project cũ nếu được hỏi.
3. Chỉ khi xuất hiện **PASS: Family Bloom FULL source is updated and CLEAN APPLY passed** mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` từ project đã cập nhật.
4. Không cần deploy lại Firebase Rules hay nâng versionCode cho lỗi tiền kiểm này. Nếu gặp một lỗi khác, giữ nguyên log, không chạy chép đè thủ công để bỏ qua kiểm tra.

## Giới hạn

Chưa chạy Windows BAT hay Gradle trên máy người dùng; kiểm tra chưa chứng minh quá trình build APK thực tế. Không cần đụng vào dữ liệu Firestore hoặc trên điện thoại để khắc phục vấn đề Auto Copy tiền kiểm này.
