# Family Bloom — Phase 14G True Focus Overlay

Base: `Family_Bloom_Phase_14F_GRAPH_FOCUS_ISOLATION_DEFAULT3_FULL_2026-09-29`.

## Mục tiêu đã chốt

Focus View là một lớp xem phả hệ độc lập hoàn toàn với Canvas View bên dưới.

- Canvas View giữ nguyên mode 3/5/Toàn phả hệ, node, connector, pan, zoom và camera đã render.
- Mở Focus không đổi `viewMode`, không đổi anchor, không center lại Canvas, không dim node/line và không mở line trên Canvas.
- Focus View có kích thước đích đúng 80% chiều ngang và 80% chiều dọc của **viewport Canvas**, không phải 80% toàn màn hình.
- Animation mở bắt đầu tại tâm node Person vừa chọn, sau đó translate + scale mềm đến khung 80%.
- Duration được chuẩn hóa theo khoảng cách node nguồn → tâm Focus để node ở góc không “bay” nhanh hơn node gần giữa.
- Đóng Focus chạy animation ngược về điểm node nguồn đã chốt lúc mở.
- Khi Focus đang mở, 3 nút `3 thế hệ / 5 thế hệ / Toàn phả hệ` bị disabled và toàn bộ Canvas View chặn touch.
- Lớp Canvas được blur ở render layer trên Android 12+ (`filter: blur`) và có translucent shield làm fallback/tách lớp; không thêm native dependency.
- Focus có pan/pinch riêng.
- A → chọn B trong Focus dùng cùng một overlay, không stack overlay thứ hai.

## Dữ liệu nhánh Focus

Nhánh Focus không lấy từ tập Person đang visible của Canvas.

Nó luôn dựng từ `FamilyGraphQueryEngine` của snapshot phả hệ đầy đủ đã có trong RAM:

- ancestor depth = toàn bộ độ sâu có thể có trong snapshot;
- descendant depth = toàn bộ độ sâu có thể có trong snapshot;
- gồm partner;
- gồm sibling trực tiếp;
- không tự kéo cousin vào nếu không thuộc tuyến nhánh;
- maxPeople bằng số Person trong snapshot để không bị cắt theo mode Canvas 3/5.

Kết quả sau đó được `adaptFamilyGraphSnapshot()` layout lại riêng và cache theo `full:{personId}` trong vòng đời snapshot hiện tại.

## Loading và animation

Focus card được mount **trước** khi chạy branch extraction/layout. Animation nằm trên Reanimated UI thread; nhánh được chuẩn bị sau một nhịp JS ngắn.

Nếu graph nhánh chưa sẵn sàng, card hiển thị:

`Đang chuẩn bị nhánh của <Tên>…`

Sau khi layout hoàn tất, graph cross-fade vào trong cùng Focus View.

## Default Canvas

- Mặc định mở `3 thế hệ`.
- Person liên kết tài khoản chỉ là camera anchor + node highlight ban đầu.
- Không tự bật branch focus hoặc mở detail.

## UI cleanup

Nút cờ-lê/quản lý ở hero góc trên bên phải đã được bỏ. Nút `Thêm` trong hàng điều khiển Graph vẫn giữ nguyên.

## Performance contract

- Không Firestore query/listener mới khi mở Focus.
- Không native dependency mới.
- Không rebuild/layout Canvas View do logic Focus.
- Heavy node/connector components của Canvas vẫn memoized.
- Focus layout cache invalidates tự nhiên khi query-engine snapshot thay đổi.
