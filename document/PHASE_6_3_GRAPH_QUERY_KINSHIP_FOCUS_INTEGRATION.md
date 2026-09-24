# FAMILY BLOOM — PHASE 6.3
## Graph Query Engine + Vietnamese Kinship + Bounded Focus Integration

**Baseline:** Phase 6.2 CLOSED = basecode chính thức.  
**Status:** implementation complete for device test; chưa chốt Phase 6.3 cho đến khi user test runtime.  
**Data safety:** DG-1 → DG-10 CONFIRMED.

## 1. Không thay dữ liệu chính

Build này additive/read-only trên Family Graph source-of-truth hiện tại.

Không thay:

- Firestore collection/path;
- `FamilyPerson` persisted schema;
- `FamilyRelationship` persisted schema;
- `personLinks`;
- Rules/Functions;
- Moments/Event/Timeline/Album schema;
- permission semantics.

Không cần Firebase deploy cho Phase 6.3.

## 2. Query Engine

`FamilyGraphQueryEngine` index snapshot in-memory và hỗ trợ parents, children, partners, siblings, grandparents, grandchildren, aunts/uncles, cousins, ancestors, descendants, diagnostics.

`step` chỉ là direct relationship; không được dùng để suy ra ancestry/sibling/cousin. Adoptive/unknown giữ đúng evidence.

## 3. relationshipBetween(A, B)

Direction cố định: **A là gì của B**.

Result structured gồm kind, lineage, generation distance, path Person/Relationship, direct subtype, partner status, shared-parent evidence và via person.

## 4. Vietnamese Kinship Resolver

Resolver tách khỏi structural query. Nó tạo label/sentence an toàn, ví dụ:

`Huỳnh Nguyễn Gia Minh là con trai ruột của Huỳnh Thanh Nhân.`

Không đủ dữ liệu thì trả label trung tính, không đoán.

## 5. Bounded focus subgraph

Default `maxPeople` nằm ở `src/constants/appConfiguration.ts` qua `FAMILY_GRAPH_MAX_PEOPLE_DEFAULT`.

- 3 thế hệ: ancestor 1 + descendant 1;
- 5 thế hệ: ancestor 2 + descendant 2;
- partner + sibling: true;
- cousin mặc định: false;
- cap mặc định: 80.

Đây là **derived/render bound**, chưa phải Firestore bounded-read migration. Full Graph listener hiện tại được giữ nguyên để không đổi data/query architecture khi chưa có Decision Gate mới.

## 6. UI test path

1. Mở `Phả hệ gia đình`.
2. Chọn `3 thế hệ`, `5 thế hệ`, `Toàn phả hệ`.
3. Tap một Person → tab `Quan hệ`.
4. Đọc card `Quan hệ với tâm cây`.
5. Bấm `Mở nhánh` trên Person A để A thành Focus.
6. Tap Person B → tab `Quan hệ` để kiểm tra câu `B là gì của A`.
7. Nếu graph đủ dữ liệu, test cha/mẹ-con, sibling, ông/bà, bác/chú/cô/cậu/dì, cousin, adoptive, step.

Relation badge quanh focus cũng dùng resolver thật khi live graph cung cấp Query Engine.

## 7. Performance integration

- Query Engine được memo hóa theo live snapshot tại screen.
- 3/5-generation render dùng bounded person IDs.
- Full Tree hiển thị toàn source snapshot nhưng relation-badge resolution vẫn chỉ chạy trong bounded 5-generation scope.
- Không thêm listener per node.

Synthetic test đã chạy 50/100/300/500 Person.

## 8. Gate trước khi chốt Phase 6.3

User device test phải xác nhận:

- label quan hệ đúng trên dữ liệu thật;
- đổi Focus / Mở nhánh đúng;
- 3/5/Full Tree không mất node bất thường;
- scroll/pan/pinch vẫn mượt;
- Graph edit/delete vẫn hoạt động;
- Timeline/Album không regression;
- Moments upload scroll và Event ownership/moderation không regression.

Sau khi user xác nhận, mới tạo `FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_PHASE_6_3_CLOSED.md` và xem code đó là basecode cho Phase 6.4.
