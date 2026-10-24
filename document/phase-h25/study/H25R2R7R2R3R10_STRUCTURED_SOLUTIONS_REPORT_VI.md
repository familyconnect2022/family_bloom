# Family Bloom H25R2R7R2R3R10 — Bài giải theo nhiều khối nội dung

## Mục tiêu

Cho phép viết bài giải có đoạn chữ – công thức – suy ra (`⇒`) – công thức – tương đương (`⇔`) – công thức – kết luận theo đúng trật tự của người viết. Mỗi bước nằm riêng trong mảng `blocks`, không gộp cả bài vào chuỗi TeX dài khó chỉnh sửa.

## Thay đổi mã nguồn

- `src/features/study/StudySolutionModel.ts`: từ vựng ký hiệu thuần, không phụ thuộc Firebase/WebView.
- `src/features/study/studyRepository.ts`: mở rộng `StudyBlock` với trường **không bắt buộc** `relationBefore`, kiểm tra kiểu dữ liệu khi tạo bài.
- `src/features/study/StudyComposer.tsx`: có nút thêm/lưu đoạn chữ, chọn dấu trước công thức, đổi dấu từng công thức đã thêm, sửa đoạn chữ và chuyển thứ tự khối.
- `src/features/study/StudyFormula.tsx`: cột `⇒/⇔/=` cố định phía trước công thức, công thức dài vẫn cuộn ngang độc lập.
- `document/phase-h25/study/study-solution-example-v1.json`: dữ liệu mẫu.
- `document/phase-h25/study/study-solution-blocks-v1.schema.json`: JSON Schema kiểm tra các loại khối.
- `scripts/tests/release/test-super-bloom-solution-blocks-r3r10.cjs`: kiểm thử độc lập, không cần TypeScript hay Firebase.

## Bảo toàn dữ liệu và hiệu năng

- Giữ nguyên đường dẫn Firestore, trường root tài liệu, `imageUrls` và quy tắc quyền. Không cần deploy Rules mới.
- `relationBefore` vắng mặt trong bài cũ được hiểu là `none`; không cần migration.
- Bảng tin vẫn ẩn, Chess/Xiangqi và Phả hệ không thay đổi.
- Không thêm WebView, listener hay thư viện; trình biên tập công thức vẫn nạp khi cần.
- Dấu `⇒`, `⇔`, `=` do người viết chọn, ứng dụng không tự xác minh tính tương đương/toán học.

## Giới hạn

- Ảnh vẫn là `imageUrls` của bài, chưa được chèn chính xác vào giữa đoạn chữ và công thức.
- Chưa kiểm thử hiển thị trên APK Android, chưa chạy Gradle Release trên Windows.
- Các bài giải cũ chỉ có công thức đơn vẫn hiển thị như trước.

## Kiểm thử cần thực hiện trên điện thoại

1. Nhập đoạn chữ mở đầu; chèn công thức A; chọn `⇒`; chèn công thức B; chọn `⇔`; chèn công thức C; thêm kết luận.
2. Lưu và mở lại trên tài khoản khác, kiểm tra đúng thứ tự các khối.
3. Sửa nội dung một đoạn chữ, sửa công thức, đổi `⇒` sang `⇔`, kiểm tra mũi tên không lọt vào TeX.
4. Hoán đổi hai khối, xóa một khối; kéo ngang công thức dài; kiểm tra cuộn màn hình và bộ nhớ.
5. Mở câu hỏi/bài giải cũ và kiểm tra không mất chữ hoặc ký hiệu.
6. Build & Share trên máy Windows từ project đã có Firebase JSON hợp lệ.
