# Family Bloom — Phase 8.2 Graph Performance Optimization

Status: IMPLEMENTED · AWAITING DEVICE RE-MEASUREMENT

## Input từ device report

User test trên Android thật RAM 12 GB bằng Phase 8.1 Automated Performance Test:

```text
50 Person   adapter 6ms     first paint 2242ms   full mount 1113ms*
100 Person  adapter 79ms    first paint 3194ms   full mount 2548ms*
200 Person  adapter 443ms   first paint 4482ms   full mount 3621ms*
300 Person  adapter 841–933ms   first paint 5368–5765ms   full mount 6875–7872ms
500 Person  adapter 2207–2281ms first paint 8513–9258ms   full mount 16701–18571ms
```

`*` Phase 8.1 instrumentation có race ở dataset nhỏ: callback progressive có thể báo total trước double-rAF first-paint metric. Phase 8.2 sửa benchmark ordering này; không coi các cặp first/full 50/100/200 cũ là timeline vật lý chính xác.

Các chỉ số khác:

```text
Active listeners: 5, ổn định
Tab switch thường ~150–220ms
Family switch ~2820ms tổng; bootstrap visual ~249ms
JS stall >=100ms: 28 lần trong phiên có Graph stress test
```

## Mục tiêu optimization

Không đổi persisted graph truth, không migration, không Rules/Functions/native dependency.

Tập trung ba bottleneck:

1. giảm layout adapter scaling 200–500 Person;
2. first useful frame không bị chặn bởi off-screen graph work;
3. tránh rebuild collision-routing cho connector mà viewport không render.

## Thay đổi

### A. Relationship layout index O(P + R)

`familyGraphLiveAdapter.ts` index parent/partner relationships một lần cho toàn adapter pass.

Trước đây:
- mỗi generation scan lại toàn `relationships`;
- mỗi visual row unit tìm parent anchor bằng cách scan toàn `relationships`.

Hiện tại:
- `parentIdsByChild` và `partnerIdsByPerson` được build một lần;
- row unit chỉ đọc local-degree adjacency;
- parent anchor chỉ duyệt parent IDs thật của Persons trong unit.

Không đổi generation semantics, couple atomicity hay branch ordering contract.

### B. Small pre-layout bootstrap mount

Trước `onLayout`, viewport chưa có width/height. Bản cũ coi toàn progressive batch là visible, nên initial Full Tree có thể mount ~96 Person trước first useful frame.

Phase 8.2:

```text
fullTreeInitialBatch = 64
fullTreeBatchSize = 48
preLayoutMountBudget = 24
```

Khi viewport có kích thước, spatial-grid culling hiện hành tiếp quản ngay. Không ẩn dữ liệu; chỉ trì hoãn mount off-screen.

### C. Viewport-bounded connector working set

Bản cũ build `buildFamilyGraphConnectorRoutingPlan()` cho toàn progressive batch rồi mới filter connector theo viewport.

Phase 8.2:
- semantic family-group/bottom-port ownership vẫn được tính từ full graph;
- collision route chỉ được giải cho endpoint nằm trong viewport + overscan working set;
- spatial grid obstacle nodes chỉ insert working-set Persons;
- partner occupancy semantics vẫn dựa trên full graph để không đổi Graph Truth khi pan.

Mục tiêu: work của connector gần với số node user đang nhìn thấy, không gần với 300/500 tổng Person.

### D. Progressive partner lookup

Progressive mount dùng `Set` membership thay vì `.some()` scan toàn people cho mỗi missing partner.

### E. Benchmark ordering fix

`performance-graph-test.tsx` giữ nguyên test workflow nhưng không còn cho phép `Graph full progressive mount` được finalize trước `Graph first painted frame`. Nếu dataset nhỏ reach total trong first commit, completion được queue tới sau first-paint marker.

## Test harness policy

Performance Test vẫn được giữ trong project và tiếp tục dùng cho regression:

```text
Góc chơi → Phòng đo hiệu năng
50 / 100 / 200 / 300 / 500 Person RAM-only
30-second interaction trace
listener counters
family/tab traces
```

Chỉ loại bỏ/disable quy trình test khi chuẩn bị official production/release build theo yêu cầu user.

## TODO polish vẫn giữ nguyên, chưa trộn vào optimization này

1. Mất mạng → retry pending Moment vẫn lỗi.
2. Spacing/gap giữa một số card/button chưa đều.
3. Family-switch splash cần xuất hiện ngay khi tap; user hiện thấy UI hitch trước splash.

## Validation trong môi trường build

```text
141 TS/TSX transpile: PASS
Dense graph layout/spatial routing: PASS
Phase 6.4 viewport/progressive: PASS
Query/Kinship/Focus: PASS
Synthetic benchmark 50/100/300/500: PASS
Phase 7 multi-family: PASS
Startup gate: PASS
Tab warmup: PASS
Phase 6.5 contract: PASS
```

Container-only adapter median (không thay thế device result) giảm rõ nhất ở large graph; 500 Person median khoảng 4.1ms → 2.2ms trên cùng môi trường Node/V8. Viewport-local connector routing 500 Person synthetic working set ~40 Person khoảng 6–7ms so với full-graph routing cũ ~88ms trong cùng container. Đây chỉ là directional synthetic evidence; Android/Hermes re-measurement là gate thật.

## Device re-test tối thiểu

Không cần test toàn app lại ngay. Chỉ chạy:

```text
Graph 100
Graph 300
Graph 500
30-second interaction trace (nếu còn thời gian)
```

Gửi report text mới để so trước/sau.

## Persistent TODO document

Deferred reliability/polish items are also recorded in:

```text
document/PHASE_8_TODO_POLISH_RELIABILITY.md
```

This file must remain in the project until the consolidated fix pass is completed.
