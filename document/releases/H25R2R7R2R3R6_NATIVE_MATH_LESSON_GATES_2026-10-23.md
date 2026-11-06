# Báo cáo H25R2R7R2R3R6 — Super Bloom Native Math & Lesson Gates

**Nền:** Family Bloom H25R2R7R2R3R5 (không thay đổi mã Android versionCode 143042).  
**Ngày:** 23/10/2026.  
**Phạm vi:** Sửa hiển thị công thức Native và các bài kiểm thử liên quan; không thay đổi Firestore Rules, Chess, Xiangqi hoặc Kotlin Native.

## 1. Điểm được sửa

- `src/features/study/StudyMathParser.ts`: bộ parser công thức TeX giới hạn độ sâu/kích thước, giữ AST gồm phân số, căn, số mũ/chỉ số, toán tử tích phân/tổng, vectơ và các ký hiệu Hóa–Lý thông dụng. Không chạy HTML hoặc truy cập mạng.
- `src/features/study/StudyFormula.tsx`: bố cục React Native có phân số với gạch ngang, thanh căn, cận tích phân/tổng, chỉ số và cuộn ngang khi biểu thức dài; xử lý khoảng cách `\,` mà không in ký hiệu kỹ thuật ra màn hình. Giữ nguyên TeX gốc làm nguồn dữ liệu.
- `src/features/learning/richLesson.ts` & `LessonRichView.tsx`: hỗ trợ công thức TeX có phân định `$$...$$`, `\[...\]`, `$...$`, `\(...\)` trong nội dung bài học, tiêu đề, list, bảng và callout.
- `src/app/(home)/(learning)/learning-lesson.tsx`: dùng NativeFormula cho danh sách công thức, nội dung bài học, câu hỏi và đáp án.
- Test `scripts/tests/release/test-super-bloom-native-math-lessons.cjs` đã thêm vào Auto Update, CLEAN APPLY, Build & Share, EAS.
- Hai bài test Hỏi đáp cũ đã cập nhật để kiểm tra **đúng hợp đồng renderer cấu trúc mới**, không còn đòi `splitNativeMath` đã bị thay thế.

## 2. Kiểm tra mã nguồn, công cụ, build gate

| Mục | Kết quả tại môi trường kiểm tra |
|---|---|
| Native Math & bài học | 15/15 PASS |
| Study Q&A preflight & runtime mock | PASS |
| Công thức trực quan cũ | 16/16 PASS |
| Ghép công thức | 18/18 PASS |
| Study Toast / bàn phím | 15/15 PASS |
| Firebase recovery | 23/23 PASS |
| Firebase JSON project đã có | 12/12 PASS |
| Build route | 15/15 PASS |
| Cấu trúc script | 14/14 PASS |
| Cấu trúc project | 19/19 PASS |
| Release readiness | 11/11 PASS |
| Biên dịch cú pháp JS/TS/TSX, không phải typecheck đầy đủ | 345 tệp, 0 lỗi cú pháp |
| Auto Update chế độ `check`, source và target ở 2 thư mục riêng | PASS |
| Gradle APK Release, layout trên Android thật, FPS/RAM | **Chưa xác nhận** |

## 3. Kiểm kê bộ 312 bài học nháp do người dùng cung cấp

Bộ khảo sát: `BLOOM_312_BAI_GIANG_6_MON_LOP_1_12_JSON_10_BAI_TAP_ANH_MINH_HOA_2026-10-22.zip`.
Đây là **bản nháp xuất từ Studio**, không phải chứng nhận nội dung đang được publish trong Firestore và chưa xác minh chính xác với SGK.

- Tổng: **312 bài**, theo môn math: 65, vietnamese: 25, literature: 42, english: 60, physics: 60, chemistry: 60.
- Đếm dấu theo nội dung và câu hỏi (một dấu có thể lặp ở nhiều trường): TeX commands: 0, Inline TeX: 0, Superscripts ²³⁴: 96, Radicals √: 10, Integrals/sums: 5, Subscripts ₀–₉: 87.
- Các trường `formulas` của bài nháp hầu hết dùng ký hiệu Unicode thường (ví dụ `√49 = 7`, `y = x²`), **không sử dụng TeX có dấu phân định**. Renderer mới bảo toàn và hiển thị văn bản đó; nó KHÔNG tự biến toàn bộ văn bản Unicode thành bố cục phân số/tích phân chuyên dụng.
- Với các bài học muốn trình bày công thức như sách giáo khoa, nên biên soạn theo `$$\int_0^1 x^2\,\mathrm{d}x$$`, `$$\frac{a}{b}$$` hoặc `$\sqrt{25}+3$` trong **Bloom Content Studio**, duyệt và publish lại theo luồng hiện có. Không tự ý sửa dữ liệu cloud.

## 4. Các quy tắc không được phá vỡ

1. Không đưa WebView/MathLive vào Home hay feed câu hỏi. Công thức Native tải theo màn học tập.
2. Không thay đổi tính xác thực UID/gia đình, Firestore Rules, kiến trúc Chess/Xiangqi.
3. Không đánh mất mã TeX hoặc block cấu trúc gốc; nội dung chưa hỗ trợ phải hiển thị rõ, không âm thầm xóa.
4. Không dùng cờ bật tính năng để vượt kiểm tra quyền dữ liệu; không sửa `google-services.json` của người dùng.
5. Không phân phối APK khi Auto Update, CLEAN APPLY hoặc gate phát hành FAIL.

## 5. Hướng dẫn test trên điện thoại

- Trong **Cả nhà cùng giải**: nhập `\int_0^1 x^2\,dx`, `\frac{1}{2}+\sqrt{9}-x^2`, vectơ Vật lý, phương trình Hóa học; mở lại từng biểu thức để sửa.
- Trong **Kho bài học**: thử bài có công thức nằm trong body, bảng, callout, phần công thức riêng, câu hỏi và đáp án; xác nhận không hiện `\,` hoặc `\frac` thô.
- Kiểm tra các màn khác (Home, Phả hệ, Chess/Xiangqi) và thời gian chuyển tab không bị tăng đáng kể trên APK Release.
- Nếu ký hiệu TeX mới không nằm trong nhóm được parser hỗ trợ, ghi lại ví dụ; **không tự nhận đã hỗ trợ toàn bộ LaTeX**.

## 6. Kiểm soát thay đổi

Từ R3R5, 11 file có nội dung thay đổi trước khi thêm báo cáo này; toàn bộ 1378 file của bản nền vẫn có mặt, không mất file.
Các file đổi: scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat, scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat, scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat, scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat, scripts/maintenance/auto-update-full.cjs, scripts/tests/release/test-h25r2r7r2-study-qa.cjs, scripts/tests/release/test-h25r2r7r2-study-runtime.cjs, src/app/(home)/(learning)/learning-lesson.tsx, src/features/learning/LessonRichView.tsx, src/features/learning/richLesson.ts, src/features/study/StudyFormula.tsx.

**Lưu ý:** Chỉ có kiểm thử nguồn và gate giả lập trong container Linux; chưa chạy Gradle/Build & Share trên Windows hoặc xác nhận hình ảnh Android thực tế.
