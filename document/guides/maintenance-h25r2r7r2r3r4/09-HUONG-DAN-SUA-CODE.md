# Quy chuẩn sửa Family Bloom ít rủi ro

## Nếu muốn thêm chức năng mới

1. Viết một trang mô tả luồng/permission/schema dưới `document/phases/...`.
2. Chọn route thuộc feature thay vì chèn component tại root.
3. Tạo repository và store phạm vi feature; chỉ fetch khi active, dừng listener khi rời màn.
4. Dùng `FIRESTORE_PATHS` thay vì tự gõ collection ở nhiều file (riêng module cũ chưa chuyển đổi thì ghi rõ nơi tham chiếu).
5. Thêm Rules/indexes và test đọc/ghi với hai UID, trước khi coi tính năng hoàn thành.
6. Viết test regressions gọn và thêm vào gate tương ứng, phân biệt gate không dependencies với gate cần TypeScript.
7. Khi sửa Android Native, tăng versionCode đúng quy trình và bắt buộc build APK; JS-only có thể không cần native build nếu channel OTA hợp lệ.
8. Sinh lại chỉ mục file/hàm: `node scripts/maintenance/generate-vietnamese-code-map.cjs`.
9. Gửi **FULL ZIP** gồm BAT updater/build, `.gitignore` và toàn bộ `document` theo chuẩn.

## Nếu muốn sửa một UI

- Xác định file route từ `06-DANH-MUC-ROUTE.md`, tìm component, rồi xem repository liên quan.
- Dùng khoảng cách/màu trong theme đang có; đo cả màn hình nhỏ, keyboard, safe-area và dark mode.
- Đừng tăng khối lượng công việc ở splash, root tab, hidden tab hoặc thêm WebView vào list để sửa UI nhỏ.
- Lỗi Hỏi đáp: xem `StudyComposer`, `studyRepository`, `StudyFormulaEditor` và Rules; bảo toàn dữ liệu khi lưu thất bại.

## Nếu muốn sửa game

- Chess: controller/Native Chess/server Chess; Xiangqi: riêng controller/Native Xiangqi/server Xiangqi.
- Không đưa clock authority về client; giữ server kiểm lượt và winner; kiểm ready, invites, reconnection, mini, away timeout, nạn session cũ.
- Test bot và human/dual app; các test JavaScript chưa đảm bảo Kotlin render thực tế.

## Nếu muốn chỉnh BAT

- Giữ root là launcher tương thích, logic ở `scripts/android/{build,maintenance,eas,...}`.
- Không xóa hoặc đổi tên file đang được `scripts/setup/bat-entrypoints-manifest.json` tham chiếu.
- Không làm Auto Update sửa project trước khi test source và backup thành công.
- Mọi thông báo lỗi phải chỉ rõ đang chạy tại project hay FULL ZIP, file cần kiểm tra, hành động tiếp theo; không in secret.
- Trước khi gửi hãy mô phỏng Windows paths có dấu cách, không có dependencies, thiếu config, config sai, target đã di chuyển.

## Những việc KHÔNG làm trong lần bảo trì này

- Không di chuyển các script/test lịch sử vì import relative và những gate cũ còn phụ thuộc đường dẫn.
- Không đổi tên TypeScript exports, đổi schema Firestore hoặc xóa routes/feature bị ẩn.
- Không tự tạo `google-services.json`, không deploy Rules/Functions thay người dùng, không coi build giả lập là build APK thật.
