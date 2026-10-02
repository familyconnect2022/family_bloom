# Family Bloom — Phase 14E Music Card + Graph Focus Overlay

Base: **Family_Bloom_Phase_14D_NHA_MINH_MUSIC_TODO_FULL_2026-09-29**.

## Nhạc Nhà Mình: một Bloom Supper card thống nhất

Toàn bộ trải nghiệm nhạc hiện nằm trong một card duy nhất: hero, ô tìm kiếm, 3 tab `Playlist / Yêu thích / Bài hát Nhà Mình`, ghi chú playlist, danh sách bài, mini player và note nguồn nhạc. Section header rời phía ngoài đã được bỏ để không còn cảm giác nhiều block tách nhau.

Danh sách bài hát có viewport cố định **350px**, cuộn riêng bằng nested scroll. Mỗi trang chỉ mount tối đa **20 bài**, nên Favorites/Bài hát Nhà Mình có thể tăng lên hàng trăm bài mà không làm trang Nhà Mình kéo dài và không giữ toàn bộ row trong React tree. Search giữ debounce 360ms, hủy request cũ và cache/provider architecture từ Phase 14D.

Lỗi backend kỹ thuật như `[firestore/permission-denied]` không còn được in nguyên văn ra UI. Người dùng thấy lời nhắc Bloom thân thiện; raw error vẫn được ghi `console.warn` cho diagnostics.

## Phả hệ: Focus Branch Overlay

Focus View là thao tác độc lập với mode graph nền. Người dùng đang ở **3 thế hệ, 5 thế hệ hoặc Toàn phả hệ** đều có thể bật `Nhánh` và chọn một Person.

Khi mở, graph nền không đổi `focusPersonId`, camera, pan, zoom hay layout. Query engine đang có trong RAM lấy bounded subgraph của Person đó; `adaptFamilyGraphSnapshot()` chạy riêng trên snapshot nhỏ để tạo layout mới cho overlay. Không mở Firestore listener/query mới.

Overlay chiếm **80% x 80%** vùng graph và mở bằng opacity + scale từ khoảng 0.2 lên 1. Một interaction shield phủ toàn graph phía dưới, vì vậy pan/pinch chỉ đi vào Focus View. Để bảo vệ GPU Android, bản này dùng **static frosted/dim veil** thay cho live blur liên tục; cảm giác nền được làm mờ/tách lớp vẫn giữ nhưng không có blur intensity chạy theo frame.

Focus View dùng lại gesture architecture Reanimated hiện có nên có pan/pinch riêng và auto-fit toàn bounded branch ở frame đầu. Đóng overlay chỉ bỏ lớp trên; base graph trở lại đúng camera trước đó.

Nếu đang focus A và bấm Person B trong Focus View, app **không tạo overlay thứ hai**. Nội dung graph nhỏ fade/zoom rồi thay bằng bounded branch của B trong chính overlay hiện tại.

Mode focus được chọn theo graph nền: nền `3 thế hệ` -> overlay 3 thế hệ; nền `5 thế hệ` -> overlay 5 thế hệ; nền `Toàn phả hệ` -> overlay bounded 5 thế hệ để giữ hiệu năng và khả năng đọc.

## Performance invariants

- Không tạo listener mới.
- Không thay Firestore schema/Rules/indexes.
- Không thêm npm/native dependency.
- Background Person nodes và connectors đã memoized; mở overlay không recompute layout của cây tổng vì dependency graph không đổi.
- Bounded branch re-layout dùng query engine snapshot đang có.
- Focus child render toàn bounded branch nhưng không dùng progressive full-tree background pipeline.
- Music mount tối đa 20 row/page trong fixed viewport.

## Validation

Static + synthetic validation hiện PASS; xem `document/PHASE_14E_VALIDATION_REPORT.txt`.

Device runtime vẫn cần test theo `PHASE_14E_DEVICE_CHECKLIST.txt` trước khi coi Phase 14E là PASS/CLOSED.
