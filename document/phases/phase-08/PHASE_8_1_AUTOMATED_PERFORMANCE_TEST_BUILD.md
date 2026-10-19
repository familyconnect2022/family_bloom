# Family Bloom — Phase 8.1 Automated Performance Test Build

Status: TEST BUILD ONLY · NOT PRODUCTION CLOSEOUT

## Mục tiêu

Bản này dành cho người dùng không có thời gian/thiết bị để làm profiling chuyên sâu. Người test chỉ cần thao tác app bình thường; build tự ghi các mốc JS/runtime hữu ích và cung cấp dữ liệu Family Graph giả trong RAM.

## Không thay đổi dữ liệu thật

- Không migration Firestore.
- Không ghi Person/Relationship giả lên Firebase.
- Không yêu cầu Blaze hoặc deploy Cloud Functions.
- Không thêm native dependency.
- `USE_CLOUD_FUNCTIONS` giữ nguyên trạng thái hiện tại.
- Synthetic Graph dùng family id nội bộ `__perf_test_family__` và chỉ tồn tại trong memory của màn test.

## Cách mở

`Góc chơi` → `Phòng đo hiệu năng`.

## Test thao tác 30 giây

Bấm `Đo thao tác 30 giây`, app tự quay về tabs. Trong 30 giây chỉ cần thao tác như người dùng thật:

- đổi tab;
- mở Home/Moments/Planner/Cây nhà;
- đổi family nếu có nhiều family;
- mở các button/list action thường dùng.

Sau 30 giây quay lại `Góc chơi` → `Phòng đo hiệu năng`.

Bản test ghi:

- tab switch trace;
- family switch trace (`transition_state_requested`, `bootstrap_frame`, `membership_verified`, `tabs_ready`);
- common Bloom button/quick/list press → next-frame latency;
- JS timer drift trong phiên 30 giây (`p95`, max, số stall >=100ms);
- các listener chính đã được instrument;
- JS session → app-ready (không được hiểu là native cold-start tuyệt đối).

## Test Graph 50/100/200/300/500 Person

Trong `Phòng đo hiệu năng`, chọn 50, 100, 200, 300 hoặc 500 Person.

Build tự:

1. sinh Person giả trong RAM;
2. sinh partner + parent_child deterministic;
3. chạy `adaptFamilyGraphSnapshot` thật;
4. mở `FamilyGraphPrototype` thật ở Full Tree progressive mode;
5. ghi thời gian synthetic generation;
6. ghi layout adapter;
7. ghi first painted frame;
8. ghi thời gian progressive mount đủ Person.

Người test chỉ cần pan/pinch khoảng 10 giây để cảm nhận interaction sau khi mount xong.

## Cách gửi kết quả

Cách đơn giản nhất: chụp màn `Kết quả gần nhất` và gửi ảnh. Hoặc bấm `Sao chép báo cáo` rồi dán text vào ChatGPT.

## Giới hạn phép đo

Bản này tự động hóa phép đo ở JS/app layer và đủ để phát hiện bottleneck lớn, listener leak cơ bản và regression Graph. Nó không thay thế Android Studio/Perfetto cho GPU, native frame timing hoặc RAM tuyệt đối. Không được diễn giải `JS stall` thành FPS/GPU chính xác.

## TODO đã giữ lại cho lượt polish sau

1. Mất mạng → retry pending Moment vẫn có thể lỗi.
2. Một số card/button cần spacing/gap tốt hơn.
3. Family switch splash/transition cần xuất hiện trực quan ngay khi tap; hiện user quan sát thấy trễ khoảng 1–2 giây.

Ba mục này chưa được sửa trong Performance Test Build để tránh trộn profiling với polish behavior.

---

## Phase 8.2 update — test harness retained

Performance Test infrastructure remains intentionally present after Phase 8.2 optimization. The 50/100/200/300/500 RAM-only tests and 30-second interaction diagnostics are the regression harness for comparing before/after performance. Remove/disable this workflow only when preparing the official production/release build.

Phase 8.2 also fixes the small-dataset benchmark ordering race so `full progressive mount` is not finalized before `first painted frame`.
