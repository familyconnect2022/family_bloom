# Family Bloom: bài giải theo nhiều khối (Structured Solution Blocks v1)

## Lý do

Một bài giải không chỉ có một công thức. Có thể xen kẽ diễn giải → công thức → tương đương → công thức → giải thích → suy ra → kết luận.

## Dữ liệu đang dùng trong app

- Firestore: `families/{familyId}/studyQuestions/{questionId}/answers/{answerId}`; trường `blocks` là **mảng có thứ tự**.
- `kind: "text"`: đoạn diễn giải, `value` là chữ Unicode; không cố tự phát hiện TeX.
- `kind: "formula"`: công thức; `value` là TeX gốc, kèm `formulaParts`, `formulaTemplate`, `formulaFields` nếu có để có thể chỉnh sửa lại.
- `relationBefore`: `"none"`, `"implies"` (⇒, suy ra), `"iff"` (⇔, tương đương), `"equals"` (=). Đây là quan hệ **trước khối công thức hiện tại**. Không nhét dấu suy luận vào phần văn bản của công thức.
- Không có `relationBefore` (bài cũ) tương đương `"none"`.
- `imageUrls` tiếp tục được giữ nguyên ở mức answer/question, chưa phải block ảnh xen kẽ trong bài.

## Cách nhập trên Android

1. Viết diễn giải → bấm **Thêm đoạn chữ vào bài giải** để tạo khối văn bản.
2. Chọn `Không dấu / ⇒ / ⇔ / =` cho công thức tiếp theo.
3. Bấm `ƒx Công thức` để nhập, xem trước, rồi chèn.
4. Lặp lại từ bước 1; có thể dùng mũi tên để đổi thứ tự khối. Với công thức đã chèn, có thể thay đổi dấu quan hệ mà không sửa TeX.
5. Kết luận thêm dưới dạng văn bản, sau đó mới đăng bài giải.

## Nguyên tắc quan trọng

- **⇒** không đồng nghĩa **⇔**: `iff` chỉ dùng khi phép biến đổi có tính tương đương theo điều kiện đang xét. UI không tự suy đoán quan hệ.
- Không xóa hoặc di chuyển kết quả cũ khi thêm đoạn mới. Các khối là tuần tự, giữ đúng thứ tự mảng JSON.
- Không tự động ép `=>` hoặc `<=>` trong text thành quan hệ logic; quan hệ được chọn rõ ràng.
- Không đổi Firestore root document fields, collection paths, quyền truy cập, number of images or pagination. Firestore Rules hiện tại kiểm tra `blocks is list` và số lượng, không kiểm sâu từng item; client kiểm tiếp loại/nội dung các item.
- Chuẩn JSON `study-solution-blocks-v1.schema.json` và mẫu `study-solution-example-v1.json` là tài liệu trao đổi/làm việc, không tự deploy Firestore.
- Giới hạn: 24 khối, tối đa 6000 ký tự mỗi khối (ràng buộc client), tối đa 3 ảnh HTTPS ở `imageUrls`.

## Những điều chưa thực hiện trong bản v1

- Ảnh nằm giữa hai khối diễn giải (hiện đính kèm trong `imageUrls`).
- Một trình soạn văn bản phong phú như Word; ưu tiên dữ liệu sạch và hiệu năng trên Android.
- Xác minh tính đúng đắn các bước biến đổi bằng AI: `⇔` do người viết quyết định, không phải xác thực tự động.

## Ví dụ hiển thị mong muốn

> Xét phương trình: \(x^2-5x+6=0\).
>
> Phân tích thành nhân tử.
>
> \(\Leftrightarrow (x-2)(x-3)=0\).
>
> Theo tính chất tích bằng không.
>
> \(\Leftrightarrow x=2 \text{ hoặc } x=3\).
>
> Kết luận: tập nghiệm là {2;3}.
