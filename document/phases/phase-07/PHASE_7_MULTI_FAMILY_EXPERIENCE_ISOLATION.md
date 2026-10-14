# Family Bloom — Phase 7 Multi-Family Experience & Isolation

## Status

```text
PHASE 7.1 → 7.4 = IMPLEMENTED
STATUS = OPEN · AWAITING USER DEVICE TEST
BASECODE = PHASE 6.5 CLOSED
```

## Mục tiêu

Một account có thể thuộc nhiều family và chuyển qua lại mà không lẫn runtime state, listener, role, Person identity hoặc dữ liệu content giữa các family. Hiệu năng là constraint số 1.

## Decision contracts implemented

```text
DG-7-1  Một uid có thể thuộc nhiều family.
DG-7-2  Role thuộc membership của từng family.
DG-7-3  Person link vẫn family-scoped; cùng uid có Person khác nhau theo family.
DG-7-4  activeFamilyId chỉ là workspace preference, không phải authorization.
DG-7-5  uid + activeFamilyId tạo Family Scope Boundary mới.
DG-7-6  Ongoing Moment upload giữ immutable familyId từ lúc enqueue.
DG-7-7  Join family mới không tự rời/switch current family.
DG-7-8  Create family mới từ multi-family flow không tự switch current family.
DG-7-9  User chủ động switch sẽ quay về Home của target family.
DG-7-10 Inactive family không mở full realtime listeners.
DG-7-11 Active không hợp lệ: 1 family còn lại → auto recover; >1 → Chọn nhà.
DG-7-12 Không migration dữ liệu hiện hữu.
```

## 7.1 — Family Scope / isolation

Root provider hierarchy:

```text
AuthProvider
  MomentPublishProvider                 # sống qua family switch
    FamilyRealtimeProvider key=uid:familyId
      TabStartupProvider
        Router/screens
```

Khi `activeFamilyId` đổi, toàn bộ read-cache + tab state dưới Family Scope bị remount. Không cần rải `setState([])` thủ công ở từng feature.

Family transition có overlay Bloom. Root route reset về Home khi switch chủ động; không giữ Person/Event route của family trước.

## 7.2 — Family Switcher UX

`FamilySwitcherModal` được mở từ Home card và Cây nhà card.

- hiển thị family name + role;
- active family có nhãn `Đang xem`;
- list dùng `FlatList`, bounded batches;
- không query family detail / members / moments / events cho inactive family;
- có action `Tham gia nhà khác`, `Tạo nhà mới`, `Quản lý những ngôi nhà của tôi`.

Profile có entry `Những ngôi nhà của tôi`.

## 7.3 — Multi-family membership

Screen mới: `/family-memberships`.

### Join additional family

- request flow reuse `familyJoinService`;
- current family vẫn active trong lúc pending;
- approval tạo member + reverse membership như contract hiện tại;
- approval KHÔNG auto-switch;
- user bấm `Vào nhà vừa được duyệt` khi muốn.

### Create additional family

`familyService.createFamilyForUser(..., { activateAfterCreate: false })`.

Transaction giữ nguyên active family cũ. Sau create user có hai lựa chọn:

```text
Vào nhà mới
Ở lại nhà hiện tại
```

Initial no-family Gateway vẫn dùng behavior cũ: create first family và activate ngay.

## 7.4 — Hardening / performance

### Membership listener budget

Chỉ thêm một realtime listener nhỏ:

```text
users/{uid}/memberships
```

Listener này dừng khi app background. Không tạo `N families × N domain listeners`.

Active family tiếp tục có bounded listeners hiện hành:

- members;
- latest Moments head;
- upcoming Events;
- yearly Events.

Graph/Person listeners vẫn theo lifecycle screen hiện tại.

### Authorization

Switch family kiểm tra cả:

```text
users/{uid}/memberships/{familyId}
families/{familyId}/members/{uid}
```

`firestore.rules` và `firestore.cloud.rules` cũng yêu cầu authoritative member doc khi đổi `activeFamilyId`.

### Upload isolation

`MomentPublishProvider` ở ngoài Family Scope. `PendingMoment` capture `familyId` khi enqueue; upload/publish luôn dùng `task.familyId`, không đọc `activeFamilyId` về sau.

### Performance validation trong môi trường bàn giao

- 136 TS/TSX transpile: PASS.
- 482 relative imports: 0 missing.
- Phase 7 contract test: PASS.
- Synthetic sort 10,000 memberships: ~10–20 ms trong các run Node container.
- Phase 6.5 contract: PASS.
- Phase 6.4 viewport/progressive: PASS.
- Query/Kinship/Focus: PASS.
- DG-11: PASS.
- Dense layout/routing: PASS.
- Phase 6.3 synthetic benchmark 50/100/300/500: PASS.
- Functions core/syntax: PASS.

Synthetic benchmark không thay thế React Native device profiling.

## Device acceptance checklist

1. User A thuộc Family A + B + C; switch A → B → C → A.
2. Sau switch: Home/Moments/Event/Members/Graph/Person đều chỉ hiện target family.
3. Role khác nhau theo family: Admin ở A, Member ở B.
4. Switch từ Cây nhà/route con phải về Home target family, không giữ Person/Event cũ.
5. Join Family D khi đang ở A: pending không đổi active A; approved vẫn ở A; chỉ đổi khi user bấm vào D.
6. Create Family E khi đang ở A: tạo xong vẫn ở A; chọn `Vào nhà mới` mới chuyển E.
7. Đang upload Moment ở A → switch B: upload A hoàn tất vào A; B không thấy pending card A.
8. Background/resume: membership list refresh; active family listeners resume đúng nhà.
9. Logout/login: mở lại active family cuối hợp lệ.
10. Nếu active không hợp lệ và có >1 membership: hiện `Chọn nhà`; nếu chỉ còn 1: auto recover.
11. Switch liên tục 10–20 lần: không tăng listener/memory rõ rệt, không crash, không lẫn cache.
12. Test dev build và nếu chuẩn bị release thì profile thêm release build/frame/memory.

## Deploy/build impact

- Dependency: NONE.
- Native rebuild riêng cho Phase 7: không bắt buộc nếu dùng dev-client hiện tại và không đổi native config.
- Firestore schema migration: NONE.
- Firestore Rules: CHANGED — publish `firestore.rules` để test defense-in-depth mới.
- Functions: NO deploy required cho Direct Mode.
