# Báo cáo R3R5 — Hạng mục được xác nhận

| Hạng mục | Phép kiểm thực hiện | Kết quả |
|---|---|---|
| Cấu trúc root/BAT | `check-project-structure.js` | 19/19 PASS |
| Danh mục BAT Windows | `check-build-entrypoints.js` | 33 BAT, 0 unmanaged, PASS |
| Kiểm thử layout mới | `test-h25r2r7r2r3r5-script-layout.cjs` | 14/14 PASS |
| Release regression nguồn | 39 bài kiểm tra offline phù hợp môi trường | 39/39 PASS |
| Lịch sử còn được gọi trong BAT | 33 bài | 33/33 PASS sau chỉnh hợp đồng đường dẫn |
| Firebase recovery | fixture sao lưu, kiểm tra Android/client | 23/23 PASS |
| Firebase build routing | project được cập nhật và nguồn FULL khác thư mục | 15/15 PASS |
| Firebase config đã có | nhận diện JSON trong project có dấu cách | 12/12 PASS |
| Thử copy-over từ nguồn sang mock project | check → backup → retire → overlay → verify → structure | PASS |
| .env/google-services.json | giữ bytes dữ liệu mock và backup cũ | PASS |
| ZIP integrity | thực hiện khi đóng gói | Xem báo cáo cuối cùng trong chat |

**Phạm vi chưa xác nhận:** Không có Windows + Android SDK/Gradle ở môi trường thử nghiệm; chưa có APK Release thực tế, chưa kiểm thử dữ liệu Firebase thật của người dùng, chưa đo RAM/FPS trên điện thoại. Không thể khẳng định mọi test lịch sử của các phiên bản đã nghỉ đều PASS: có bài chỉ phục vụ khảo cổ source cũ và có bài phụ thuộc môi trường/dependency không có sẵn.

**An toàn dữ liệu:** `backup` chạy trước `retire-legacy-script-paths.cjs`, không copy `android/`/`node_modules/` mới từ ZIP, không overwrite `.env` và `google-services.json`, kiểm tra hash sau overlay.
