# FAMILY BLOOM — MASTER HANDOFF PROMPT TOÀN DỰ ÁN
## Phase 6.4 CLOSED · BASECODE chính thức cho Phase 6.5

> Đây là tài liệu bàn giao **FULL APP** tại checkpoint **Phase 6.4 đã được user chốt**.  
> **BASECODE chính thức** là project hiện tại sau toàn bộ Phase 6.4 Large Tree / Progressive Interaction + Visual Compatibility + Focus Connector refinement.  
> Phase 6.3 và các patch 6.4 cũ chỉ là lịch sử reconstruct; không được ưu tiên hơn basecode Phase 6.4 CLOSED hiện hành.

---

## 0. Quy tắc sử dụng tài liệu này

Tài liệu này không phải changelog riêng của Phase 6.2. Nó là **Master Handoff Prompt FULL DỰ ÁN**, dùng để:

- tiếp tục phát triển Family Bloom trong chat/dev session mới;
- tránh mất kiến trúc, quyền, data contracts và quyết định đã chốt;
- xác định BASECODE hiện hành;
- xác định phần đã hoàn thành và phần chưa làm;
- giữ roadmap liên tục giữa các phase;
- làm authority trước mỗi lần build code tiếp theo.

Từ Phase 6.3 trở đi, mỗi gói build/patch lớn phải kèm:

```text
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
```

Nội dung phải là **full project snapshot**, không chỉ mô tả file vừa sửa.

Khi user nói **chốt phase**, phải tạo thêm:

```text
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_PHASE_<X>_CLOSED.md
```

và cập nhật `CURRENT` thành cùng checkpoint mới.

Mọi Markdown mới của project phải nằm trong `document/`, không tạo `.md` ở project root.

## 0.1. Governance rule — user confirmed for Phase 6.3+

Từ Phase 6.3 trở đi, mọi thay đổi phải tuân thủ **Data Safety / Decision Gate** sau:

1. **Không được làm thay đổi, rewrite, migrate hoặc phá dữ liệu chính/source-of-truth hiện có** chỉ để triển khai feature mới.
2. Mọi thay đổi liên quan đến schema, collection/path, persisted field, identity, relationship semantics, permission, mutation behavior, migration hoặc compatibility phải được **trình bày trước cho user xác nhận**.
3. Chỉ sau khi user xác nhận, quyết định đó mới trở thành contract được phép code.
4. Mọi quyết định đã xác nhận phải được ghi vào `document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md` và được mang sang các build/phase sau.
5. Không tự ý rename/remove field, đổi collection, rewrite persisted records, backfill/migrate dữ liệu, hay thay đổi meaning của dữ liệu hiện có nếu chưa có user approval rõ ràng.
6. Ưu tiên implementation additive/read-only/pure-domain trước; nếu feature có thể làm mà không đổi Firestore source-of-truth thì **không được đổi schema**.
7. Nếu phát hiện implementation buộc phải thay đổi dữ liệu chính, dừng coding ở decision gate và trình impact + migration + rollback plan cho user duyệt trước.

Rule này là authority cao hơn các proposal kỹ thuật cũ nếu có xung đột.

---

# 1. Sản phẩm

**Family Bloom** là ứng dụng gia đình mobile-first bằng Expo/React Native.

Các domain chính hiện có:

```text
Authentication
User Profile
Multi-family membership
Family Gateway / family state machine
Family member approval
Home Dashboard
Moments / Kỷ niệm
Comments / Reactions
Planner / Events / Calendar
Cloudinary + media_assets
Family Graph / Family Tree
Family Person Timeline
Family Person Album
```

Phong cách UI:

```text
Bloom pastel
ấm áp
nhẹ nhàng
mobile-first
cute nhưng không trẻ con hóa
ưu tiên UX rõ ràng hơn mật độ thông tin
```

---

# 2. Kiến trúc nền không được phá tùy tiện

Giữ nguyên nếu chưa có architecture review rõ ràng:

```text
Expo Router
Root Navigator / Auth / Profile / Family gating state machine
activeFamilyId
Firebase Auth
Firestore
users/{uid}
users/{uid}/memberships/{familyId}
families/{familyId}/members/{uid}
service / repository / hooks ownership
FamilyRealtimeProvider bounded realtime
centralized errorService
Cloudinary + media_assets lifecycle
keyboard/focus foundation
Bloom shared UI baseline
```

Screen không được tự mở kiến trúc Firestore song song nếu domain đã có service/repository sở hữu data flow.

Không tạo “service version 2” hoặc error system thứ hai chỉ để giải quyết local feature.

---

# 3. Phase 2 foundation — trạng thái đã khóa

Phase 2 đã ổn định và là nền navigation/auth/family của app.

Root state machine không render `(tabs)` tạm thời trước khi đủ:

```text
auth hợp lệ
profile hợp lệ
family membership hợp lệ
activeFamilyId hợp lệ
```

Các yêu cầu UI/UX đã được giữ xuyên suốt:

- keyboard không được che nội dung quan trọng;
- BloomButton không giả định luôn có icon;
- BloomDatePicker dùng phiên bản đã refactor hiện tại, không quay lại bản cũ;
- BloomToast thiếu `type` thì mặc định `info`;
- Google sign-in cancel phải được xử lý riêng, không báo nhầm lỗi server.

Không refactor lại Root Navigator/Auth/Family state machine chỉ vì Family Graph.

---

# 4. Multi-family identity

Ba identity tách biệt:

```text
User Account
Family Member
Family Person
```

Cụ thể:

```text
User Account  = users/{uid}
Family Member = families/{familyId}/members/{uid}
Family Person = một con người trong phả hệ
```

Invariant:

- `FamilyPerson.id` độc lập với Firebase UID;
- một Person có thể không có account;
- một user có thể map sang Person khác nhau ở các family khác nhau;
- trong một family, một UID chỉ link tối đa một Person;
- `activeFamilyId` chỉ chọn family đang active, không làm thay đổi identity của family khác.

Focus Person của current user được resolve qua:

```text
families/{familyId}/personLinks/{uid}
→ personId
→ persons/{personId}
```

Không scan toàn collection Persons để tìm linked user.

---

# 5. Media architecture

Source of truth lifecycle:

```text
media_assets/{mediaAssetId}
→ Cloudinary provider file
→ domain document chỉ giữ reference / resolved URL cần thiết
```

Không tạo media pipeline thứ hai cho Family Graph.

Person media namespace:

```text
family_bloom/families/{familyId}/persons/{personId}/{purpose}
```

Tách rõ:

```text
purpose=avatar
purpose=album
```

Avatar Person là optional.

---

# 6. Moments / Kỷ niệm

Tất cả family member hợp lệ được tạo Moment.

Ownership contract đã chốt:

```text
creator       → sửa caption bài của mình
creator       → xóa bài của mình
other member  → không sửa/xóa
admin/owner   → không sửa/xóa bài người khác
admin/owner   → chỉ moderation visible/hidden
```

Moderation fields:

```ts
moderationStatus: "visible" | "hidden"
moderatedByUid: string | null
moderatedAt: string | null
```

Legacy Moment thiếu moderation fields được normalize là `visible`.

Hidden Moment:

- không render trong feed chính;
- không render trong Home surfaces tương ứng;
- Admin/Owner có luồng kiểm duyệt để hide/unhide.

Comment ownership:

- comment author sở hữu comment của mình;
- admin không được xóa comment người khác chỉ vì là admin.

Realtime/performance:

- Moment feed dùng bounded realtime head + paging;
- comments listener lazy theo card đang visible/expanded;
- upload progress không được làm re-render toàn feed;
- progress state đã được coalesce/throttle và defer qua InteractionManager để giảm giật scroll khi upload media.

---

# 7. Planner / Events / Calendar

Tất cả family member hợp lệ được tạo Event.

Ownership semantic phải giống Moments:

```text
creator CRUD nội dung Event của chính mình
admin/owner khác creator không edit/delete
admin/owner chỉ hide/unhide bằng moderation metadata
```

Event canonical moderation fields:

```ts
moderationStatus: "visible" | "hidden"
moderatedByUid: string | null
moderatedAt: string | null
```

Legacy Event thiếu moderation fields được normalize `visible`.

Hidden Event:

- không render Calendar/list/upcoming/yearly feed;
- Admin/Owner có luồng kiểm duyệt để cho hiện lại.

Màn detail:

```text
creator → Sửa / Xóa
admin/owner không phải creator → Ẩn / Cho hiện
```

Birthday/Anniversary:

- `recurrence=yearly` có thể dùng ngày gốc trong quá khứ;
- one-off event quá khứ vẫn bị validation chặn.

Events phải tiếp tục bounded theo month/upcoming/yearly; không realtime toàn lịch sử.

---

# 8. Family Graph — domain authority

Firestore canonical paths:

```text
families/{familyId}/persons/{personId}
families/{familyId}/relationships/{relationshipId}
families/{familyId}/personLinks/{uid}
```

Structural relationship persist duy nhất:

```text
parent_child
partner
```

Không persist riêng các nhãn suy luận như:

```text
ông
bà
anh
chị
em
bác
chú
cô
cậu
dì
cháu
anh/chị/em họ
```

Các quan hệ đó thuộc **Graph Query Engine + Kinship Resolver**.

Family Graph là graph domain; UI chỉ render graph thành family tree.

---

# 9. FamilyPerson contract

Family Person hiện hỗ trợ các nhóm dữ liệu:

```text
id
familyId
linkedUid
displayName
gender
nickname
birthDate
birthYear
birthPlace
deathDate
deathYear
lifeStatus
birthOrder
avatarUrl
description
createdByUid
createdAt
updatedAt
```

Nguyên tắc:

- optional Firestore fields normalize về null, không ghi undefined;
- full date nếu có là nguồn để suy ra year;
- nếu chỉ biết năm thì date có thể null nhưng year vẫn có giá trị;
- death data chỉ hợp lệ theo lifeStatus;
- linkedUid phải là member hợp lệ cùng family;
- one UID ↔ one Person trong một family;
- Person có thể tồn tại lâu dài dù unlink account.

---

# 10. FamilyRelationship contract

Hai dạng edge canonical:

## parent_child

Ý nghĩa direction:

```text
personAId = parentId
personBId = childId
```

Relationship ID deterministic:

```text
pc_<parentId>_<childId>
```

Subtype:

```text
biological
adoptive
step
unknown
```

## partner

Partner pair được canonicalize theo ID order để tránh duplicate hai chiều.

Status hỗ trợ:

```text
partner
married
separated
divorced
widowed
```

Có thể có `startDate/endDate` nếu biết.

---

# 11. Family Graph permissions

Hiện tại:

```text
Owner/Admin → xây/chỉnh Family Graph
Member      → đọc graph mặc định
```

Member không mặc định được sửa tổ tiên/người khác.

Proposal system có thể làm sau, chưa thuộc Phase 6.3 core.

Graph validation hiện có:

- same-family references;
- no self relationship;
- deterministic relationship IDs;
- duplicate relationship prevention;
- duplicate account-link prevention;
- Person ↔ personLinks atomic consistency;
- client parent-cycle detection trong Direct/Spark mode;
- backend transaction cycle detection trong future Cloud mode.

---

# 12. Family Graph mutation architecture

Stable facade:

```text
UI
→ familyGraphMutationService
→ adapter theo feature flag
```

Feature flag:

```ts
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
```

Hiện tại project Firebase Spark:

```text
UI
→ stable service facade
→ Direct Firestore transaction/batch
→ firestore.rules
```

Khi nâng Blaze sau này:

```text
UI
→ same stable service facade
→ familyGraphMutation Cloud Function
→ Admin SDK transaction
```

Không rewrite UI/domain khi chuyển mode.

Mọi thay đổi integrity Family Graph phải cập nhật song song:

```text
Direct Firestore adapter
Security Rules source
functions/ future backend path
```

---

# 13. Firestore Rules / Backend deploy policy

Hai Rules source:

```text
firestore.rules       = Direct/Spark development mode
firestore.cloud.rules = hardened Cloud Function mode
```

Từ checkpoint này:

**Không yêu cầu user deploy Rules/Functions từng phase.**

Quy trình mới:

```text
mỗi phase → cập nhật source rules + functions đầy đủ
không deploy giữa chừng nếu không thật sự cần
cuối dự án → tạo một deployment package + checklist duy nhất
```

Vì vậy Firebase deployed state thực tế có thể tạm thời chậm hơn source local.

Khi cần test write mà deployed Rules chưa hỗ trợ feature mới, phải nói rõ đây là giới hạn environment/deployment, không kết luận sai rằng client code hỏng.

Không được tự yêu cầu nâng Blaze giữa phase chỉ để test Family Graph.

---

# 14. Family Graph UI baseline tại Phase 6.2 CLOSED

Family Tree hiện có:

- live Firestore graph adapter;
- pan;
- stable pinch zoom;
- focus / tắt focus;
- Branch Mode;
- compact centered layout cho graph nhỏ;
- Person node Bloom pastel;
- tên dài hiển thị nhiều dòng hợp lý;
- Person Detail sheet;
- Owner/Admin sửa Person;
- icon thêm Person;
- navigation Graph/Admin không nhân stack;
- birth/death hiển thị full date khi có, year-only khi chỉ biết năm;
- Person Timeline tab thật;
- Person Album tab thật.

Graph listener chỉ sống khi Graph UI cần; không đưa full graph vào FamilyRealtimeProvider toàn app.

---

# 15. Phase 6.2 correction UX đã chốt

Form `Nối quan hệ` phải đọc theo flow:

```text
Người được chọn
→ Loại quan hệ
→ subtype/status nếu cần
→ Người tham chiếu
```

Semantic preview phải mô tả chính xác direction trước khi lưu.

Ví dụ:

```text
Huỳnh Nguyễn Gia Minh là con ruột của Huỳnh Thanh Nhân
```

Map bắt buộc:

```text
parentId = Huỳnh Thanh Nhân
childId  = Huỳnh Nguyễn Gia Minh
```

Không map theo vị trí UI một cách mơ hồ.

Action mode:

```text
mode active   → full color
mode inactive → outline
```

Áp dụng cho:

```text
Thêm người
Nối quan hệ
```

---

# 16. Delete Person / Node semantics

Có thao tác xóa node/Person trong admin graph flow.

Nguyên tắc an toàn:

- nếu chỉ nối sai quan hệ, ưu tiên xóa relationship sai rồi tạo lại đúng;
- delete Person dùng khi Person thật sự tạo nhầm;
- Person đang `linkedUid` bị chặn xóa trực tiếp;
- Person có Timeline/Album bị chặn để tránh mất nội dung;
- delete Person hợp lệ có thể cleanup structural relationship edges liên quan atomically/có kiểm soát;
- không để orphan `personLinks` hoặc dangling relationship.

Error domain liên quan:

```text
PERSON_HAS_CONTENT
```

---

# 17. Person Timeline

Path:

```text
families/{familyId}/persons/{personId}/timeline/{entryId}
```

UI:

```text
Con đường ký ức
```

Behavior:

- realtime;
- thêm mốc đời sống;
- xóa mốc thủ công theo permission hiện tại;
- birth/death derive trực tiếp từ Person, không duplicate thành timeline record;
- chỉ additional life events mới persist vào timeline collection.

Hiện tại quyền thêm/chỉnh nội dung Person Graph vẫn theo Owner/Admin policy của graph.

---

# 18. Person Album

Reference path:

```text
families/{familyId}/persons/{personId}/album/{mediaAssetId}
```

Actual asset:

```text
media_assets/{mediaAssetId}
→ Cloudinary
```

Behavior:

- chọn ảnh/video từ device library;
- upload bằng mediaService/Cloudinary pipeline hiện có;
- Graph chỉ lưu album reference;
- realtime album;
- fullscreen viewer;
- không duplicate raw media metadata vào Person document.

---

# 19. Error architecture

Tiếp tục dùng:

```text
AppError
centralized errorService
```

Không tạo error stack riêng cho Family Graph.

Các category/domain hiện có bao gồm:

```text
AUTH
PROFILE
FAMILY
EVENT
MOMENT
MEDIA
GRAPH
PERSON
RELATIONSHIP
```

Các ownership/moderation error đã có hoặc phải tiếp tục giữ semantic:

```text
EVENT_NOT_OWNER
EVENT_MODERATION_DENIED
MOMENT_NOT_OWNER
MOMENT_MODERATION_DENIED
PERSON_HAS_CONTENT
```

---

# 20. Performance / realtime contract

Không load toàn bộ historical app data realtime.

## Moments

```text
bounded realtime head
paging historical
lazy comments listeners
upload progress isolated khỏi scroll-critical state
```

## Events

```text
month/upcoming/yearly bounded queries
hidden events filtered ở service boundary
```

## Family Graph

```text
listener chỉ sống khi graph cần
không global realtime 500+ persons
focus subgraph là hướng production
Full Tree cần progressive/lazy expansion
```

Scale target cần test dần:

```text
50
100
300
500+
```

---

# 21. Documentation/build convention từ Phase 6.3 trở đi

Mỗi **build/patch lớn** phải có tối thiểu:

```text
source files thay đổi
Rules source nếu domain integrity/permission có liên quan
functions/ source nếu future Cloud path có liên quan
document/BUILD_CHECK_REPORT_*.txt hoặc tương đương
document/DANH_SACH_FILE_CAP_NHAT_*.txt
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
```

`FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md` phải luôn chứa:

1. full architecture hiện tại;
2. source-of-truth data contracts;
3. permission semantics;
4. media/realtime/error architecture;
5. toàn bộ feature lớn đã hoàn thành;
6. phase hiện tại và trạng thái test;
7. known issues/deferred work;
8. deployment state;
9. regression gate;
10. kế hoạch phase tiếp theo.

Không được giao patch lớn chỉ có changelog rời rạc mà không cập nhật full Master Handoff.

Quy tắc đóng gói đã được user xác nhận thêm:

```text
Sau MỖI lần sửa source/code, luôn tạo một ZIP patch chỉ chứa các file đã thay đổi,
giữ đúng cấu trúc thư mục project để user copy/merge trực tiếp.
Không chỉ gửi mô tả code.
```

---

# 22. Regression gate bắt buộc

Sau mỗi milestone/build quan trọng, phải regression ít nhất:

```text
Auth/login/logout/Google cancel
Create/update Profile
Family Gateway
Create Family
Join Family
Approve/Reject Member
activeFamilyId + switch family
member projection/profile avatar
Cloudinary/media_assets
Moments create/reaction/comment/edit/delete/moderation
Moment media upload + scroll smoothness
Events create/update/delete by creator
Events moderation by Admin/Owner
Calendar
Home Dashboard
realtime lifecycle
navigation/back stack
keyboard UX
Family Graph read/edit/link/unlink
create/delete relationship
cycle/duplicate prevention
create/edit/delete Person safety
Person Timeline
Person Album
multi-family graph isolation
```

Không tuyên bố phase PASS chỉ dựa trên static compile nếu user chưa test luồng runtime quan trọng.

---

# 23. BASECODE declaration — Phase 6.2 CLOSED

User đã xác nhận **chốt Phase 6.2**.

Từ đây:

```text
CURRENT PROJECT CODE = BASECODE PHASE 6.2 CLOSED
```

Basecode nghĩa là project của user sau khi đã áp dụng các thay đổi Phase 6.2 mới nhất, bao gồm correction patch về:

```text
relationship direction UX
semantic relationship preview
active/inactive action button state
safe delete Person/node
Moment upload scroll smoothness
Event ownership/moderation parity
Rules source sync
future Cloud Function source sync
```

Không lấy một zip cũ hơn làm full source authority nếu thiếu các thay đổi trên.

Nếu cần reconstruct trong môi trường mới, phải bắt đầu bằng:

1. Master Handoff này;
2. source project/basecode user hiện tại;
3. patch Phase 6.2 mới nhất nếu basecode chưa merge patch;
4. đối chiếu các file source thực tế trước khi sửa.

---

# 24. Phase 6.2 — CLOSED

Phase 6.2 đã hoàn tất checkpoint về:

```text
Graph Foundation integration
Interactive Family Tree baseline
Admin graph editing
Person form polish
Person link/unlink
Relationship create/delete
safe Person delete
Timeline
Album
ownership/moderation alignment
navigation/layout refinements
Spark direct mutation path + future Cloud path sync
```

Các phần **không tiếp tục nhồi vào Phase 6.2**:

```text
Kinship Resolver hoàn chỉnh
Graph Query Engine production
bounded focus subgraph production
cousins/extended kinship inference
large graph progressive loading production
proposal system
advanced birth-order inference
```

Những phần này chuyển sang roadmap sau.

---

# 25. PHASE 6.3 — GRAPH QUERY ENGINE + VIETNAMESE KINSHIP

## 25.1. Mục tiêu Phase 6.3

Biến Family Graph từ “lưu và vẽ đúng structural graph” thành domain có khả năng:

```text
truy vấn họ hàng
suy luận quan hệ
mô tả quan hệ tiếng Việt
trích bounded subgraph quanh một Person
scale tốt khi graph lớn dần
```

Phase 6.3 không được phá schema canonical `parent_child/partner` chỉ để dễ render UI.

---

## 25.1A. Phase 6.3 Decision Gate — CONFIRMED

User đã xác nhận **DG-1 → DG-11**. Đây là contract bắt buộc của Phase 6.3 và các build tiếp theo cho đến khi user chủ động sửa quyết định:

### DG-1 — Zero schema/data migration
- Không thêm/đổi/xóa Firestore collection hoặc persisted field cho Query Engine/Kinship Resolver.
- Không backfill/migrate Person/Relationship hiện có.
- Không persist derived kinship labels/paths vào Firestore.

### DG-2 — Structural truth giữ nguyên
- `parent_child`: `personAId = parent`, `personBId = child`.
- `partner`: pair canonical theo ID như Phase 6.2.
- Extended kinship chỉ được suy luận từ structural graph; không tạo edge ông/bà/anh/chị/em/cô/chú/cậu/dì/cousin.

### DG-3 — Query Engine chỉ đọc snapshot/index
- Query core là pure-domain/in-memory trên snapshot đã load.
- Không write Firestore, không tạo listener theo từng node, không mutate Person/Relationship.
- UI không query Firestore trực tiếp để suy luận kinship.

### DG-4 — Direction của relationshipBetween
`getRelationshipBetween(A, B)` luôn có nghĩa: **A là gì của B**.
Ví dụ `getRelationshipBetween(Gia Minh, Thanh Nhân)` → `con` nếu Gia Minh là child của Thanh Nhân.

### DG-5 — Subtype semantics
Proposal mặc định:
- `biological`: tham gia blood-line inference.
- `adoptive`: là quan hệ gia đình hợp lệ nhưng phải giữ lineage=`adoptive`; không giả thành biological.
- `step`: là social/step-parent edge; không được dùng để suy ra huyết thống.
- `unknown`: cho phép structural traversal nhưng label phải unknown-safe, không tuyên bố biological.
Các API query phải trả subtype/evidence để UI không mất ngữ nghĩa.

### DG-6 — Vietnamese label phải conservative
- Có gender rõ: `cha/mẹ`, `con trai/con gái`, `ông/bà`, `vợ/chồng`.
- Gender `other/unknown`: dùng label trung tính, không đoán giới tính.
- Thiếu dữ liệu để phân biệt `anh/chị/em`, `bác/chú/cô/cậu/dì` thì trả fallback mô tả trung tính thay vì đoán.

### DG-7 — Thứ tự anh/chị/em
Proposal ưu tiên dữ liệu theo thứ tự:
1. `birthOrder` khi cùng sibling set và dữ liệu hợp lệ;
2. full `birthDate`;
3. `birthYear`;
4. nếu vẫn không đủ → label trung tính `anh/chị/em`/`anh chị em` thay vì đoán.

### DG-8 — Bác/chú/cô/cậu/dì
Proposal chuẩn an toàn:
- Chỉ dùng nhãn chi tiết khi xác định được **nhánh cha/mẹ + gender + older/younger** đủ chắc chắn.
- Nếu thiếu older/younger, trả dạng trung tính như `anh/chị/em của cha` hoặc `anh/chị/em của mẹ`.
- Không hard-code biến thể vùng miền trong core nếu chưa có user rule riêng.

### DG-9 — Default bounded focus subgraph
Default đã chốt:
- `ancestorDepth = 2`
- `descendantDepth = 2`
- `includePartners = true`
- `includeSiblings = true`
- `includeCousins = false` (expand khi user yêu cầu)
- `maxPeople = 80` như safety cap mặc định; **giá trị này phải lấy từ constants/config, không hard-code trong thuật toán**; Full Tree/progressive expansion xử lý ngoài default focus.

### DG-10 — Không đổi permission/deploy trong 6.3A
Query Engine/Kinship Resolver là read-only nên không cần đổi permission semantics. Không deploy Rules/Functions chỉ vì 6.3A. Nếu về sau 6.3 phát sinh write/schema/permission requirement thì quay lại decision gate trước.

### DG-11 — Batch Relationship Composer
- Không có automatic kinship inference/suggestion nào được biến thành sự thật phả hệ. Quan hệ structural chỉ tồn tại khi Admin xác nhận tạo edge thật.
- Form `Nối quan hệ` hỗ trợ multi-select cho `parent_child`: chọn N người ở một phía, M người tham chiếu ở phía còn lại và expand thành **N×M canonical `parent_child` documents**.
- Ví dụ đã chốt: `Thanh Nhân + Kim Duyên + Thanh Phước Hội` là `con ruột` của `Văn Long + Nguyễn Thị Bích` => tạo 6 edge explicit, không tạo document nhóm 5 người.
- `partner` vẫn pairwise 1↔1; không Cartesian multi-select partner.
- Anh/chị/em, ông/bà, cô/chú/bác/cậu/dì, cousin vẫn là derived query result, không persist.
- Batch validation là all-or-nothing cho self-reference, cycle, invalid/conflicting subtype; exact duplicate là idempotent và được báo `đã có`.
- UI bắt buộc preview câu tiếng Việt liền mạch và số `requested/new/existing` trước commit.
- DG-11 không yêu cầu đổi schema hoặc Firestore Rules vì mỗi write vẫn là canonical relationship document cũ. `functions/` phải giữ action tương ứng để Cloud mode tương lai không lệch contract, nhưng chưa deploy.

**Status:** `CONFIRMED BY USER`.

Bổ sung được user xác nhận cùng DG-1 → DG-11:

- `maxPeople`/`maxPerson` là **runtime-configurable default**, source hiện tại lấy từ constants/config; không rải magic number 80 trong engine.
- Tương lai Family Bloom sẽ có trang **Admin Configuration** để quản lý các cấu hình như limit, màu sắc, theme và các setting khác.
- Phase 6.3A **không tạo persisted config schema ngay**. Khi bắt đầu lưu Admin Configuration vào Firestore/remote config, phải quay lại Data Safety / Decision Gate để user duyệt path/schema/permission/default/fallback/migration trước.


### Visual correctness contract — Family Graph

Trong Family Bloom, **hiển thị phả hệ là functional correctness**, không phải cosmetic polish:

- một đường nối nhìn như quan hệ gia đình chỉ được xuất hiện khi structural edge tương ứng thật sự tồn tại;
- partner/spouse pair là atomic visual unit, không cho sibling/relative chen giữa;
- child phải anchor dưới đúng parent hoặc couple có explicit parent edges; không kéo child sang family unit lân cận chỉ vì cùng generation;
- sibling cùng parent cluster được giữ gần nhau hơn các family cluster khác;
- dense generation phải mở rộng/reflow canvas, không giảm spacing đến mức overlap;
- connector routing và spacing phải ưu tiên tránh tạo cảm giác sai rằng một Person là spouse/sibling/child của nhánh khác;
- performance optimization không được đổi visual truth để đổi lấy compactness.

Device regression case bắt buộc giữ:

```text
Nguyễn Hoàng Anh --child-of--> Huỳnh Kim Duyên
Huỳnh Nguyễn Gia Khôi --child-of--> Huỳnh Thanh Nhân + Nguyễn Thị Kim Hồng
Huỳnh Nguyễn Gia Minh --child-of--> Huỳnh Thanh Nhân + Nguyễn Thị Kim Hồng
```

Hoàng Anh phải nằm về nhánh Kim Duyên và không được nhìn như sibling của Gia Khôi/Gia Minh.

## 25.1B. Configuration defaults foundation

Phase 6.3A bắt đầu centralize các default có khả năng thay đổi trong tương lai tại:

```text
src/constants/appConfiguration.ts
```

Hiện tại có:

```text
APP_CONFIG_DEFAULTS.familyGraph.query.defaultTraversalDepth = 2
APP_CONFIG_DEFAULTS.familyGraph.query.maxPeople = 80
APP_CONFIG_DEFAULTS.familyGraph.focusSubgraph.*
APP_CONFIG_DEFAULTS.familyGraph.relationshipComposer.maxVisibleChoices = 48
```

Query Engine nhận optional runtime override nhưng bản thân engine không biết config đến từ đâu. Điều này cho phép sau này:

```text
constants default
→ resolved Admin config (future)
→ service/provider
→ Query Engine
```

mà không rewrite thuật toán.

**Chưa được làm trong 6.3A:** tự tạo Firestore collection/document cho theme/admin settings. Persisted configuration là data contract mới và phải được user xác nhận trước.

## 25.2. 6.3A — Graph Query Core

Tạo query engine thuần domain, ưu tiên pure functions trên snapshot/index đã load.

API mục tiêu:

```ts
getPerson(personId)
getParents(personId)
getChildren(personId)
getPartners(personId)
getSiblings(personId)
getGrandparents(personId)
getGrandchildren(personId)
getAuntsAndUncles(personId)
getCousins(personId)
getAncestors(personId, depth?)
getDescendants(personId, depth?)
```

Yêu cầu:

- không query Firestore trực tiếp từ UI;
- tránh O(N²) lặp lại bằng indexes/maps;
- deterministic result ordering khi có thể;
- không duplicate Person;
- xử lý half-sibling/step/adoptive rõ ràng theo subtype;
- partner không tự động đồng nghĩa biological parent.

### 25.2.1. Implementation checkpoint hiện tại

Phase 6.3A build đầu tiên đã triển khai additive/read-only:

```text
src/constants/appConfiguration.ts
src/types/familyGraphQuery.ts
src/services/familyGraph/familyGraphQueryEngine.ts
```

`familyGraphService.createQueryEngine(snapshot, overrides?)` là facade read-side để tạo engine từ snapshot đã load.

Query Core hiện có:

```text
getPerson
getParentLinks / getParents
getChildLinks / getChildren
getPartnerLinks / getPartners
getSiblingViews / getSiblings
getGrandparents
getGrandchildren
getAuntsAndUncles
getCousins (first cousin structural inference)
getAncestorViews / getAncestors
getDescendantViews / getDescendants
getDiagnostics
```

Semantic an toàn:

- direct `getParents/getChildren` vẫn trả relationship `step` vì đó là structural edge thật;
- derived ancestry/sibling/cousin traversal **không dùng step edge** làm blood/family-line evidence;
- adoptive được giữ evidence `adoptive`;
- unknown không bị nâng cấp thành biological;
- sibling view trả shared-parent evidence, **không tự gắn full/half** nếu dữ liệu parent còn thiếu;
- traversal có `depth` + `maxPeople` cap từ runtime config;
- dangling/cross-family relationship không được engine sử dụng và xuất hiện trong diagnostics;
- không Firestore write, không listener mới, không schema/rules/function change.

Test pure Query Engine đã cover direct parent/partner, sibling evidence, step exclusion, grandparent, aunt/uncle, cousin, traversal cap và diagnostics.


---

## 25.3. 6.3B — relationshipBetween() — IMPLEMENTED

API thật:

```ts
queryEngine.getRelationshipBetween(personAId, personBId)
```

Direction DG-4 được khóa cứng:

```text
getRelationshipBetween(A, B) = “A là gì của B”
```

Kết quả **không chỉ là string**. `FamilyGraphRelationshipBetweenResult` trả structured evidence:

```text
sourcePerson / targetPerson
kind
structural-or-derived evidence kind
lineage
signed generationDistance
pathPersonIds
pathRelationshipIds
direct subtype
partner status
sharedParentIds
viaPersonId
```

Kinds hiện hỗ trợ:

```text
self
partner
parent / child
sibling
grandparent / grandchild
ancestor / descendant
aunt_uncle / niece_nephew
cousin
unrelated
```

Nguyên tắc an toàn:

- direct `step` vẫn resolve parent/child trực tiếp;
- `step` không đi vào ancestry/sibling/cousin inference;
- adoptive/unknown giữ evidence thật, không đổi thành biological;
- path/evidence là derived object, không persist.

---

## 25.4. 6.3C — Vietnamese Kinship Resolver — IMPLEMENTED

File:

```text
src/services/familyGraph/familyKinshipResolver.ts
```

Resolver nhận structured evidence từ Query Engine và tạo:

```ts
FamilyGraphVietnameseRelationship {
  label
  sentence
  detail
  lineage
  relativeAge
  path...
}
```

Ví dụ UI/semantic:

```text
“Huỳnh Nguyễn Gia Minh là con trai ruột của Huỳnh Thanh Nhân.”
```

Rules DG-5 → DG-8 được áp dụng:

- biological / adoptive / step / unknown không bị trộn nghĩa;
- sibling ưu tiên `birthOrder → full birthDate → birthYear`;
- cousin không dùng `birthOrder` giữa hai sibling group khác nhau;
- `bác/chú/cô/cậu/dì` chỉ dùng khi đủ branch + gender + older/younger evidence;
- thiếu evidence trả dạng an toàn như `anh/chị/em của cha`, `anh/chị/em của mẹ`;
- grandparent dùng `nội/ngoại` chỉ khi intermediate parent gender xác định;
- dữ liệu thiếu không bị đoán thành nhãn cụ thể.

---

## 25.5. 6.3D — Bounded Focus Subgraph — IMPLEMENTED AT DERIVED/RENDER LAYER

API thật:

```ts
queryEngine.getFocusSubgraph(focusPersonId, options?)
```

Options:

```text
ancestorDepth
descendantDepth
includePartners
includeSiblings
includeCousins
maxPeople
```

Config centralized:

```text
src/constants/appConfiguration.ts
```

Default 5-generation focus view:

```text
ancestors = 2
 descendants = 2
partners = true
siblings = true
cousins = false
maxPeople = FAMILY_GRAPH_MAX_PEOPLE_DEFAULT = 80
```

3-generation view dùng `1 ancestor + 1 descendant`, cùng safety cap.

**Rất quan trọng:** do DG-1 cấm tự ý đổi schema/query transport, Phase 6.3 hiện **không tuyên bố Firestore bounded read**. `useFamilyGraph` vẫn subscribe full Graph khi màn Graph mở; Query Engine tạo bounded **derived/render snapshot in-memory**. Việc đổi sang Firestore progressive/bounded transport cần Decision Gate riêng nếu đòi index/schema/query architecture mới.

UI thật đã dùng bounded subgraph cho `3 thế hệ` và `5 thế hệ`; `Toàn phả hệ` vẫn cho xem source snapshot đầy đủ. Khi cap bị chạm, UI có notice và không mutate dữ liệu.

---

## 25.6. 6.3E — Performance + UI Integration — IMPLEMENTED FOR THIS CHECKPOINT

Integration thật:

- Family Graph screen tạo một Query Engine bằng `useMemo` trên live snapshot;
- relation badge quanh focus ưu tiên Kinship Resolver thật thay prototype heuristic;
- Person Detail → tab `Quan hệ` hiển thị câu **“A là gì của Focus”** + evidence path khi có;
- user có thể bấm **Mở nhánh** để đổi Focus rồi chạm Person khác để test pair relationship;
- `3 thế hệ` = bounded 1+1 view;
- `5 thế hệ` = bounded 2+2 default;
- relation badge trong Full Tree vẫn chỉ resolve trong bounded 5-generation scope để tránh O(full-tree × traversal) ở 300/500+ Person;
- existing Graph edit, Timeline, Album, Event/Moments architecture không bị thay source-of-truth.

Synthetic benchmark script:

```text
scripts/benchmark-familyGraphPhase63.js
```

Dataset đã chạy:

```text
50
100
300
500 persons
```

Gate kiểm tra:

```text
engine indexing
bounded focus extraction
relationshipBetween
Vietnamese resolver
live render adapter
maxPeople cap
```

Benchmark là development signal, không phải SLA thiết bị production. Device runtime test của user vẫn là release gate cuối.

---

## 25.7. Phase 6.3 implementation file map

### New / expanded domain

```text
src/constants/appConfiguration.ts
src/types/familyGraphQuery.ts
src/services/familyGraph/familyGraphQueryEngine.ts
src/services/familyGraph/familyKinshipResolver.ts
src/services/familyGraph/familyGraphService.ts
```

### UI integration

```text
src/app/family-graph.tsx
src/app/family-graph-admin.tsx
src/components/familyGraph/FamilyGraphPrototype.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
src/components/familyGraph/familyGraphLiveAdapter.ts
src/components/ui/BloomConfirmDialog.tsx
src/services/familyGraph/familyGraphMutationService.ts   # reuse latest safe delete contracts
```

### Tests

```text
scripts/test-familyGraphQueryEngine.js
scripts/test-familyGraphLayout.js
scripts/benchmark-familyGraphPhase63.js
```

### Explicitly unchanged data boundary

```text
firestore.rules
firestore.cloud.rules
functions/
FamilyPerson persisted schema
FamilyRelationship persisted schema
personLinks
Moments/Event/Timeline/Album persisted schemas
```

No Firebase deploy is required for this Phase 6.3 build.

---


## 25.8. Device Refinement Contracts — CONFIRMED BY USER

Sau device test Phase 6.3, user xác nhận thêm các contract bắt buộc sau. Đây là **quy tắc nền**, không phải detail UI tạm thời:

### DR-1 — Xóa đường quan hệ ≠ xóa Person

```text
Delete Relationship / Xóa đường nối
→ chỉ xóa FamilyRelationship
→ giữ nguyên cả hai FamilyPerson
→ dùng khi nối sai để có thể tạo lại đúng
```

```text
Delete Person / Xóa người khỏi phả hệ
→ chỉ chạy khi user bấm hành động Xóa người rõ ràng
→ có confirmation Bloom-style riêng
→ có thể gỡ các structural edge trực tiếp bằng deletePersonCascade
→ linked account + Timeline/Album vẫn dùng safety protection hiện có
```

UI không dùng wording **“Xóa node”** cho thao tác xóa Person nữa vì dễ nhầm với sửa đường quan hệ.

### DR-2 — Partner/Spouse là atomic visual unit

Trong một generation row, mọi component liên kết bằng `partner` phải được layout như **một visual unit liên tục**. Anh/chị/em hoặc Person cùng thế hệ khác **không được chen vào giữa hai partner**.

Ví dụ đã phát hiện trên device:

```text
Nguyễn Thị Bích ↔ Huỳnh Văn Long
Nguyễn Thị Liên = chị ruột của Nguyễn Thị Bích
```

Nguyễn Thị Liên có thể nằm trước hoặc sau couple unit, nhưng không được nằm giữa Bích và Long.

Quy tắc này chỉ là render/layout; **không thay persisted relationship semantics**.

### DR-3 — Dense generation phải mở rộng canvas, không ép chồng node

Khi cùng thế hệ có nhiều Person:

```text
không giảm node spacing xuống dưới safe minimum
không chồng card lên nhau để cố nhét vào canvas 1020px cố định
logical canvas width phải tăng theo row requirement
pan/pinch chịu trách nhiệm navigation trên mobile
```

Full Tree dùng progressive mount theo batch cấu hình tập trung để giảm blocking render; không được âm thầm bỏ Person.

### DR-4 — Confirmation UI phải theo Bloom visual language

Family Graph editing không dùng native Android `Alert.alert` cho các destructive/correction flow chính.

Dùng Bloom-styled confirmation dialog cho:

```text
unlink account
xóa Person
xóa relationship/đường nối
xóa Timeline entry
```

Permission notice có thể dùng Bloom Toast khi không cần lựa chọn destructive.

**Status DR-1 → DR-4:** `CONFIRMED BY USER`.

## 25.9. Device Refinement Implementation — IMPLEMENTED, AWAITING RETEST

Runtime refinement sau device feedback:

- `familyGraphLiveAdapter` group partner-connected Persons thành atomic row units;
- dense row tính width theo actual visual units và mở rộng `canvasWidth` thay vì co step;
- live visual adapter trả `canvasWidth/canvasHeight`; Graph canvas dùng kích thước động trong center/pinch/pan calculations;
- Full Tree progressive mount dùng centralized defaults:

```text
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeInitialBatch = 96
APP_CONFIG_DEFAULTS.familyGraph.render.fullTreeBatchSize = 64
```

Các giá trị này là default có thể được future Admin Configuration override sau Decision Gate, không hard-code rải trong renderer.

Render optimization thêm:

```text
PersonNode = React.memo
GraphConnectors = React.memo
pan/pinch vẫn chạy Reanimated UI thread
bounded 3/5-generation behavior giữ nguyên
Full Tree mount theo batch sau InteractionManager
```

Correction UX:

- Person Detail → tab `Quan hệ` có khu **Sửa đường nối** và trash riêng cho từng relationship;
- xóa relationship giữ nguyên Person;
- action destructive riêng đổi tên rõ thành **Xóa người khỏi phả hệ**;
- Admin Graph screen cũng phân biệt **Xóa người** và **Xóa đường nối**;
- native confirmation dialog trong các Graph correction flow được thay bằng `BloomConfirmDialog`.

Data safety của refinement:

```text
NO schema change
NO migration
NO persisted field rename
NO Firestore Rules change
NO new Functions contract
NO auto data rewrite
```

Existing `deleteRelationship` + `deletePersonCascade` mutation contracts được reuse; không tạo mutation architecture mới.

Validation hiện tại:

```text
Phase 2 static check: PASS — 116 TS/TSX
TS/TSX transpile: PASS — 116 files, 0 syntax errors
relative imports: PASS — 375 imports, 0 missing
Query/Kinship/Focus tests: PASS
dense layout test: PASS
- spouse pair adjacent
- sibling not inserted between couple
- dense generation no node overlap
- dynamic canvas expands beyond 1020 when needed
500 Person adapter synthetic check: PASS
```

Device runtime test của user vẫn là gate cuối.


## 25.10. Person Detail + Unassigned Person + Album refinement — IMPLEMENTED, AWAITING DEVICE TEST

User device test xác nhận thêm ba UX/data-presentation contract quan trọng:

### A. Unassigned Person không được xuất hiện trên cây

- `FamilyPerson` chưa có bất kỳ structural edge explicit nào vẫn tồn tại nguyên vẹn trong Firestore/admin list.
- Person đó **không render trên genealogy canvas** vì vị trí fallback có thể tạo cảm giác sai rằng họ là sibling/spouse/child của một family unit khác.
- Khi toàn bộ Persons đều chưa có relationship, viewer hiển thị empty state `Chưa có nhánh nào được nối` thay vì rải các node rời trên canvas.
- Admin screen đánh dấu Person chưa nối bằng background riêng + badge `Chưa vào cây` để biết cần nối quan hệ.
- Đây chỉ là render/filter contract; **không xóa, migrate hay sửa persisted Person data**.

### B. Person Detail chuyển sang full-screen

- `FamilyGraphPersonSheet` vẫn là modal UX cùng component/service hiện tại nhưng render **full-screen** thay vì bottom sheet 91%.
- Header cố định có nút `X` để đóng và quay lại cây.
- Full-screen dành thêm diện tích cho Thông tin / Quan hệ / Dòng thời gian / Album.
- Không tạo route/data architecture mới chỉ để mở Person Detail.

### C. Person Album reliability fix

- Upload xong phải hiện ảnh/video ngay bằng optimistic album item trong Person Detail.
- Listener vẫn là source-of-truth; optimistic item được dedupe khi Firestore realtime trả asset thật.
- Album resolver chấp nhận media lifecycle `uploaded | attached` khi album reference đã tồn tại và asset đúng family/person/purpose.
- Bounded retry xử lý race khi local album-ref snapshot đến trước `media_assets` lifecycle update; không mở listener riêng cho từng media asset.
- Timeline/Album listener errors được tách riêng để một stream lỗi không làm stream còn lại dừng loading sai.
- Nếu album vẫn không đọc được, UI hiện error state thay vì im lặng render vùng trắng.

### Data safety

```text
NO schema change
NO Firestore Rules change
NO Functions change
NO migration/backfill
NO automatic relationship inference
NO persisted Person mutation chỉ để ẩn unassigned Person
```

### Device test cần làm

1. Tạo 2–3 Person chưa nối → viewer không được hiển thị họ; Admin list phải có badge `Chưa vào cây`.
2. Nối một Person vào relationship → node xuất hiện realtime trên tree.
3. Tap Person → detail chiếm full màn hình; `X` quay lại đúng tree/focus trước đó.
4. Upload 1 ảnh Person Album → ảnh xuất hiện ngay; đóng/mở detail → ảnh vẫn còn sau realtime resolve.
5. Upload nhiều ảnh/video → grid hiển thị, tap mở MediaViewer.

Validation artifact của refinement:

```text
Phase 2 static check: PASS — 117 TS/TSX
relative imports: PASS — 373 checked, 0 missing
Query/Kinship/Focus tests: PASS
DG-11 tests: PASS
Family Graph layout tests: PASS
- unassigned Person hidden from visual tree
- spouse adjacency
- dense generation no overlap
- 500 connected Person adapter PASS
50/100/300/500 synthetic benchmark: PASS
```

# 26. Phase 6.3 — non-goals

Không tự mở rộng sang các hạng mục này nếu chưa xong query/kinship core:

```text
member proposal workflow hoàn chỉnh
auto-merge duplicate Persons
AI family history generation
public genealogy sharing
cross-family genealogy merge
full migration sang Cloud Functions
full graph virtualization engine riêng
```

---

# 27. Roadmap sau Phase 6.3

Không khóa cứng số phase nếu implementation thực tế cần chia nhỏ, nhưng hướng dự kiến:

## Phase 6.4 — Large Tree / Progressive Interaction

Có thể gồm:

```text
progressive branch expansion
Full Tree scaling
viewport-aware rendering
large graph layout refinement
better union/remarriage visualization
performance hardening 500+
```

## Phase 6.5 — Deeper Integration / Person Experience

Có thể gồm:

```text
profile bridge refinement
Person ↔ Moments/Event integration có chủ đích
member/person UX
relationship-aware Person Detail
proposal workflow review
```

Trước khi chốt tên/phạm vi cuối cùng phải đối chiếu code thực tế sau Phase 6.3, không giữ roadmap cũ một cách máy móc nếu architecture đã thay đổi.

---

# 28. Quy trình test Phase 6.3 hiện tại

Phase 6.3 đã được implementation trên **BASECODE Phase 6.2 CLOSED**. Device test đề nghị:

1. Mở Family Graph với current user đã link Person.
2. Kiểm tra `3 thế hệ / 5 thế hệ / Toàn phả hệ`.
3. Tap một Person → `Quan hệ` → đọc câu quan hệ với Focus.
4. Bấm `Mở nhánh` trên Person A → tap Person B → kiểm tra `A/B` theo direction hiển thị.
5. Test cha/mẹ-con, anh/chị/em, ông/bà, cô/chú/bác/cậu/dì và cousin nếu graph đủ dữ liệu.
6. Re-test xóa đường quan hệ (hai Person phải còn), Xóa người riêng, Timeline, Album, Moment scroll, Event permission.
7. Không Publish Rules/Functions chỉ vì 6.3.

Source cần ưu tiên đọc khi debug:

```text
src/types/familyGraph.ts
src/utils/familyGraph.ts
src/services/familyGraph/**
src/hooks/useFamilyGraph*
src/components/familyGraph/**
src/app/family-graph.tsx
src/app/family-graph-admin.tsx
functions/familyGraphCore.js
functions/index.js
firestore.rules
firestore.cloud.rules
```


---

# 29. Definition of Done sơ bộ cho Phase 6.3

Phase 6.3 chỉ nên được đề nghị chốt khi tối thiểu:

```text
parents/children/partners/siblings query PASS
grandparents/grandchildren PASS
aunts/uncles/cousins baseline PASS
ancestors/descendants depth-bounded PASS
relationshipBetween() PASS các case chính
Vietnamese kinship label không đoán sai khi thiếu dữ liệu
half/step/adoptive cases có test
bounded focus subgraph hoạt động
partner pair luôn adjacent, không bị sibling chen giữa
dense generation không overlap và canvas tự mở rộng
Full Tree progressive mount không bỏ dữ liệu
xóa relationship giữ cả hai Person; Xóa người là action riêng
Bloom confirmation thay native destructive Alert trong Graph flow
50/100/300/500+ synthetic graph tests có kết quả
UI focus dùng query engine thật ở ít nhất một integration path
DG-11 batch parent-child N×M tạo đúng canonical edges, duplicate idempotent, conflict/cycle bị chặn
composer không mount toàn bộ hàng trăm Person cùng lúc; có search + bounded visible choices
visual regression Hoàng Anh/Kim Duyên vs Thanh Nhân–Kim Hồng PASS
không regression graph edit/moments/events/timeline/album
```

User runtime test vẫn là gate cuối trước khi nói **chốt Phase 6.3**.

---

# 30. Trạng thái cuối tài liệu

```text
PHASE 6.2: CLOSED
BASECODE: LOCKED TO CURRENT USER PROJECT
CURRENT PHASE: 6.3 — DG-11 + VISUAL TRUTH + PERSON DIRECTORY / RELATION PICKER / ALBUM REALTIME REFINEMENT IMPLEMENTED, AWAITING USER RETEST
PRIMARY GOAL: RETEST DG-11 + VISUAL TRUTH + ALBUM REALTIME + A-Z PERSON DIRECTORY + RELATION PICKER PERFORMANCE
RULES/FUNCTIONS DEPLOY: DEFERRED UNTIL FINAL DEPLOY PACKAGE
MASTER HANDOFF POLICY: FULL PROJECT PROMPT REQUIRED ON EVERY MAJOR BUILD
```


---

# 31. Phase 6.3 — Person Directory + Relationship Picker + Album Realtime Refinement

Thiết bị thực tế xác nhận thêm các vấn đề UX/performance ở màn **Xây phả hệ / Nối quan hệ / Person Album**. Bản refinement hiện tại chốt các rule runtime sau mà **không đổi persisted schema**:

## 31.1 Person directory

- Avatar 1 ký tự trong Family Graph admin/detail dùng **ký tự đầu của tên gọi (given name / token cuối)**, không dùng ký tự đầu của họ.
- Danh sách Person sắp xếp theo **tên gọi**, group theo chữ cái A/B/C… với section header rõ ràng.
- Mỗi Person hiển thị số **nhánh trực tiếp** (incident structural relationships) cạnh tên để Admin nhìn nhanh mức độ đã kết nối.
- Person chưa có relationship vẫn được giữ trong danh sách Admin với trạng thái `Chưa vào cây`; không render trên Family Tree chính.

## 31.2 Relationship Composer performance/UX

- Top-level `Nối quan hệ` luôn mở với hai phía **trống**, không tự chọn Person đầu tiên hay Person đang highlight trước đó.
- Chỉ action mở từ một Person cụ thể mới preselect Person đó.
- Danh sách chọn Person chuyển sang **SectionList virtualized** riêng, có search, chữ cái, avatar tên gọi và số nhánh.
- Composer chính chỉ render những Person đã chọn + nút mở picker; không mount hàng chục chip tên cùng lúc.
- Batch-stat dùng relationship index map thay vì `.find()` lặp trong N×M preview.
- Partner vẫn pairwise; parent-child vẫn DG-11 N×M canonical edges.

## 31.3 Person Album realtime

- Album vẫn giữ source-of-truth: `persons/{personId}/album/{mediaAssetId}` + `media_assets/{mediaAssetId}`.
- Không đổi schema/rules trong refinement này.
- `watchAlbum()` không còn `getDoc()` tuần tự cho từng album ref. Khi Person Detail mở, chỉ có 2 bounded realtime listeners: album refs + media lifecycle records của đúng Person; UI lấy intersection giữa hai nguồn.
- Cách này loại race `album ref đã tới nhưng media_assets chưa phản ánh attached`, đồng thời tự cập nhật khi asset chuyển `uploaded -> attached`.
- Listener chỉ sống khi Person Detail đang mở và unsubscribe khi đóng.

## 31.4 InteractionManager warning

- `InteractionManager.runAfterInteractions()` trong Family Graph progressive full-tree mount đã được bỏ vì React Native cảnh báo deprecated.
- Runtime dùng `requestIdleCallback` khi có, fallback `setTimeout(16ms)` nếu môi trường chưa hỗ trợ.
- Đây là targeted refactor, **không phải lý do để nâng toàn bộ dependencies lên latest**.

## 31.5 Dependency policy

Không chạy `npm update` / nâng toàn bộ package tùy ý giữa Phase 6.3. React Native packages cần bám đúng compatibility của Expo SDK hiện hành.

Validation workflow khi cần:

```text
npx expo install --check
npx expo-doctor
```

Chỉ dùng `npx expo install --fix` sau khi review diff và có regression test/native rebuild khi package native thay đổi.

## 31.6 Files runtime thay đổi trong refinement này

```text
src/app/family-graph-admin.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
src/components/familyGraph/FamilyGraphPrototype.tsx
src/services/familyGraph/familyPersonContentService.ts
src/utils/personName.ts                       NEW
```

Không thay đổi:

```text
firestore.rules
firestore.cloud.rules
functions/**
Firestore schema
DG-11 semantics
Auth/Root gating
activeFamilyId
```

## 31.7 Current gate

Phase 6.3 vẫn **OPEN**. User device test cần xác nhận:

```text
Person Album upload -> ảnh hiện ngay -> đóng/mở Detail -> ảnh vẫn hiện
Person list avatar dùng tên gọi, alphabetical sections đúng
Nối quan hệ top-level không preselect Person
Relationship picker mượt ở 20+ Person, chọn/bỏ chọn không lag rõ rệt
Số nhánh hiển thị đúng direct relationship count
CMD không còn InteractionManager deprecation warning từ FamilyGraphPrototype
```


---

## Phase 6.3 — Relationship Composer performance + Person Album rendering hotfix

Checkpoint này giữ nguyên toàn bộ data contracts đã chốt. Không đổi schema, Rules, Functions hoặc DG-11 semantics.

### Relationship Composer performance

Thiết bị thật cho thấy mở `Nối quan hệ` và chọn Person còn giật dù danh sách chỉ khoảng 20 người. Nguyên nhân chính trong UI cũ là state của composer (`mode`, subtype, partner status, selected ids) nằm ở `FamilyGraphAdminScreen`. Mỗi lần chọn/bỏ chọn một Person làm rerender toàn màn Admin phía sau modal, bao gồm directory Person và relationship list.

Hotfix mới:

- state chọn Person được cô lập bên trong `RelationshipModal`;
- parent Admin chỉ rerender lúc mở/đóng composer, không rerender sau mỗi tap;
- Person picker row dùng `React.memo`;
- toggle callback dùng functional state update để giữ reference ổn định;
- danh sách Person được sort/index search một lần theo snapshot thay vì sort lại mỗi lần mở picker;
- Android dùng modal fade nhẹ hơn thay vì slide cho composer;
- `SectionList` vẫn bounded/virtualized.

### Person Album

Hai vạch hồng quan sát trên thiết bị là media tile bị co chiều cao trong layout % + aspectRatio, trong khi dữ liệu album thực tế đã tồn tại.

Hotfix mới:

- album media tile dùng kích thước pixel tính từ `useWindowDimensions`, không phụ thuộc `% + aspectRatio`;
- grid có width 100% + `space-between`;
- `expo-image` dùng `StyleSheet.absoluteFillObject` và `recyclingKey`;
- media_assets listener thêm điều kiện `familyId == active family` cùng `entityId == personId`; Firestore Rules không phải filter nên global query chỉ theo entityId có thể bị từ chối dù document hợp lệ;
- Timeline và Album có error state độc lập trong `useFamilyPersonContent`, lỗi một listener không kéo loading/error của listener còn lại.

### Upgrade policy

Không chạy `npm update` hoặc nâng đồng loạt dependency chỉ để xử lý warning/performance. Family Bloom phải giữ package versions tương thích Expo SDK hiện hành. Chỉ nâng theo một phase dependency riêng sau khi `expo install --check` / `expo-doctor` và regression plan được duyệt.

---

## Phase 6.3 refinement — Admin performance + adaptive connector anchors

Device feedback with ~26 Person / ~40 structural relationships showed remaining jank when opening the DG-11 composer and opening the Person picker. This refinement keeps all persisted data contracts unchanged and focuses on render cost.

Runtime decisions now in code:

- `family-graph-admin.tsx` uses a virtualized `SectionList` for the main Person directory instead of mounting every Person card inside one large `ScrollView`.
- Relationship history is bounded to 10 rows by default and expands only on demand. This reduces the number of mounted background views while editing.
- Opening DG-11 no longer causes the entire Person directory to be rebuilt; expensive header/footer blocks use stable memoized inputs and handlers.
- Android relationship modal uses hardware acceleration and the heavy Person picker list is mounted two animation frames after the picker shell, reducing transition hitching without `InteractionManager`.
- Picker remains virtualized and bounded by small render batches.
- These changes are render-only. No Firestore schema, Rules, Functions, relationship semantics, DG-11 contract, identity, or persisted data changed.

Connector visual refinement:

- Partner connectors continue to attach side-to-side.
- A single-parent parent→child connector may now leave from the left/right body edge when the child is significantly offset horizontally.
- Vertically aligned children still use the bottom anchor.
- Child endpoint remains at the top edge so parent→child direction is still visually clear.
- This is render geometry only and never changes relationship truth.

Performance note:

Synthetic core/query/layout benchmarks are not equivalent to on-device React Native render cost. Development builds also carry Metro/dev overhead. Phase 6.3 remains open until device testing confirms the interaction is acceptable; release-mode verification should be done before concluding the remaining cost is structural.

---

## Phase 6.3 refinement — Full-screen Graph editors + focus-bounded listeners + album delivery fallback

Device testing with ~26 Person / ~40 structural relationships confirmed that modal-based editing still leaves too much Graph UI mounted/composited behind the interaction. User approved a navigation/lifecycle refinement without any persisted-data change.

### Full-screen editor architecture

`Xây phả hệ` is now a dedicated overview/directory screen. The two expensive edit flows are separate native-stack screens:

```text
/family-graph-admin                 # overview / Person directory / relationship review
/family-graph-person-editor         # full-screen create/edit Person
/family-graph-relationship-editor   # full-screen DG-11 relationship composer
```

Rules:

- Person create/edit is no longer opened as a React Native modal from the admin directory.
- DG-11 relationship composition is no longer opened as a React Native modal from the admin directory.
- The relationship Person picker is not another modal. It replaces the composer body inside the same full-screen route and uses a virtualized `SectionList`.
- Opening relationship composer from the top-level admin button starts with **zero selected people**. A Person is preselected only when the route is opened from that Person's explicit `Cha/Mẹ`, `Con`, or `Vợ/Chồng` action.
- Existing DG-11 semantics remain unchanged: parent-child multi-select expands to canonical N×M edges; partner remains 1↔1; no derived kinship is persisted.
- `/family-graph-admin` itself now uses normal screen presentation instead of modal presentation.

### Performance lifecycle rule

`useFamilyGraph(familyId, uid, enabled)` now accepts a third `enabled` argument. Hidden Family Graph screens disable their realtime snapshot/default-focus work while another full-screen graph route has focus.

The tree screen and admin overview use `useFocusEffect` to release graph listeners while blurred. This prevents the tree + admin + relationship editor from all processing the same Firestore snapshot at the same time during navigation.

This is a runtime/listener lifecycle refinement only. Firestore schema, Rules, Functions, Person identity, relationship identity, permissions and mutation semantics are unchanged.

### Full-screen Bloom UX

Person editor:

- Bloom hero surface, warm guidance and full-screen keyboard-safe form;
- avatar, full name, nickname, gender, life status, year/full date, birthplace and description;
- optional account link on create;
- save returns to Graph overview and existing realtime snapshot refreshes the directory;
- editing preserves existing relationships and linked account semantics.

Relationship editor:

- full-screen Bloom hero and clear 3-step visual hierarchy;
- relation type + subtype/status;
- separate selected Person cards with branch counts;
- A–Z virtualized Person picker with search and given-name initial avatars;
- preview sentence + requested/new/existing/conflict counts before commit;
- picker selection state is local to this route, so the admin directory does not rerender on each selection.

### Person Album rendering hotfix

Device showed correctly-sized Album tiles but only pink backgrounds. The Album preview now uses a delivery fallback chain:

- image: original `secureUrl` first, then stored thumbnail, then optional Cloudinary transformed thumbnail;
- video: stored thumbnail first, then generated Cloudinary frame candidates;
- `expo-image` advances to the next candidate on `onError`;
- if every candidate fails, the tile shows an explicit image/video fallback instead of a blank pink box;
- fullscreen media viewer continues to use the original `secureUrl`.

The original secure URL is deliberately preferred for images because some Cloudinary delivery configurations can reject dynamic transformation URLs even though the uploaded original is valid.

### Data Safety / Deploy status

No schema migration. No field rename. No collection/path change. No permission change. No Firestore Rules deploy. No Functions deploy. No native dependency added. Phase 6.3 remains OPEN pending real-device validation of editor smoothness and Album previews.

---

## Phase 6.3 refinement — DG-11 three-tier composer + reliable Person Album thumbnails

Device feedback approved returning the full-screen relationship editor to the clearer DG-11 composition order while preserving the performance benefits of separate full-screen routes.

### Relationship editor UX

The full-screen `/family-graph-relationship-editor` now uses this fixed hierarchy:

```text
1. Người được chọn
2. Loại quan hệ
3. Người tham chiếu
4. Preview + commit
```

Rules:

- Parent/child relationships support multi-select on both Person sides and preserve N×M canonical edge creation.
- Person picker rows use a square Bloom checkbox with a visible checkmark instead of radio-style circles, so multi-select is visually explicit.
- Existing selected Person cards still show given-name avatar + direct branch count.
- Partner/spouse remains pairwise 1↔1 per DG-11; changing to partner mode trims each side to at most one Person and the UI explains the pairwise constraint.
- No automatic kinship inference becomes genealogy truth.
- No Firestore schema, relationship document shape, deterministic ID rule, permission rule, or Functions contract changes.

### Person Album thumbnail fix

Real-device testing showed that full media could open successfully while grid thumbnails remained blank pink tiles. The grid preview now uses React Native's native `Image` renderer with explicit width/height instead of relying on an absolutely-positioned `expo-image` thumbnail in this screen.

Delivery fallback remains:

```text
image: secureUrl -> stored thumbnailUrl -> derived Cloudinary image thumbnail
video: stored thumbnailUrl -> derived Cloudinary frame candidates
```

Additional behavior:

- the tile keeps a visible image/video placeholder until the remote image reports `onLoad`;
- `onError` advances to the next candidate;
- if all candidates fail, an explicit media fallback remains visible;
- fullscreen media viewer is unchanged and continues to use the original secure URL.

### Validation

At this checkpoint:

- Phase 2 static TS/TSX transpile check: PASS (119 files)
- DG-11 Batch Relationship Composer tests: PASS
- Query/Kinship/Focus Subgraph tests: PASS
- dense layout test: PASS (500 Person synthetic adapter)
- Phase 6.3 synthetic benchmark 50/100/300/500 Person: PASS

Phase 6.3 remains OPEN pending on-device confirmation of the relationship composer UX and Album thumbnail rendering.

---

# Phase 6.3 — Visual Truth Connector Routing Refinement

**Status:** IMPLEMENTED · chờ user test thực tế · Phase 6.3 CHƯA đóng.

## Vấn đề thực tế

Trong cây đông nhánh, hai `parent_child` thuộc hai family group khác nhau có thể tình cờ có cùng `turnY` và chồng một đoạn line ngang. Dù dữ liệu quan hệ hoàn toàn đúng, hình học đó có thể khiến người xem hiểu nhầm hai Person là anh/chị/em cùng cha mẹ.

Ví dụ đã được user phát hiện: một đường cha → con của Nguyễn Vũ Quang → Nguyễn Vũ Minh chồng/nhập thị giác với connector thuộc nhánh Đinh Xuân Trường, tạo cảm giác sai rằng hai Person ở hàng dưới thuộc cùng sibling group.

## Visual Truth rule mới

Connector không còn được quyết định chỉ từ tọa độ. Thứ tự render bắt buộc:

```text
explicit relationships
→ exact parent signature của từng child
→ family route groups
→ collision-aware connector lanes
→ side/bottom ports
→ SVG/View path geometry
```

Quy tắc:
- `parentSignature` của child = tập `parent_child.personAId` explicit, canonical sort.
- Chỉ child có cùng exact parent signature mới được phép dùng cùng family routing lane một cách có chủ đích.
- Family groups khác nhau trong cùng parent→child corridor được interval-coloring để tránh dùng chung lane khi horizontal spans overlap.
- Single-parent route lệch ngang lớn hoặc phải tách lane do collision được phép xuất phát từ cạnh trái/phải thân node thay vì luôn từ đáy.
- Couple/partner union vẫn giữ semantic connector riêng; lane offset của child được lấy từ exact parent signature để không nhập nhầm với family group khác.
- Đây hoàn toàn là render-only; không persist derived kinship, không đổi schema, Rules, Functions hay DG-11.

## Files chính

```text
src/components/familyGraph/familyGraphConnectorRouting.ts   NEW
src/components/familyGraph/FamilyGraphPrototype.tsx         MODIFY
scripts/test-familyGraphLayout.js                            MODIFY
```

## Regression gate

Bổ sung test synthetic đảm bảo:
- hai family route khác nhau có horizontal span overlap không nhận cùng connector lane;
- lateral single-parent route được đánh dấu side-anchor;
- dense layout vẫn pass tới 500 Person;
- Query/Kinship/Focus và DG-11 không regression.

Phase 6.3 chỉ đóng sau khi user test lại visual tree thật và xác nhận không còn connector gây quan hệ giả.

---

# PHASE 6.3 — FINAL CONNECTOR POLISH & CLOSED CHECKPOINT

**Trạng thái authoritative:** `PHASE 6.3 CLOSED`  
**Thời điểm chốt:** sau refinement connector cuối cùng theo feedback thiết bị thực tế của user.  
**Lưu ý:** trạng thái CLOSED ở mục này **ghi đè** mọi dòng "Phase 6.3 OPEN / chờ test" ở các phần lịch sử phía trên.

## Vấn đề cuối cùng được xử lý

Sau Visual Truth Connector Routing, thiết bị thật cho thấy hai điểm hình học vẫn chưa đạt chuẩn Bloom/Genealogy:

1. Connector dùng side port còn đi dọc theo thân node rồi mới rẽ ngang, tạo cảm giác gấp khúc và có thể bị đọc như một family trunk phụ.
2. Quan hệ cha → con gần thẳng phía dưới đôi khi vẫn bị route thành nhiều đoạn chỉ vì lane/collision logic, trong khi một đường dọc duy nhất rõ và đẹp hơn.

## Quy tắc connector cuối cùng đã chốt

### Direct vertical first

Với single-parent link, nếu child vẫn nằm trong vùng chiếu dọc hợp lý dưới thân parent thì ưu tiên:

```text
parent
  │
  │
child
```

- một connector dọc duy nhất;
- không tạo elbow chỉ để bám parent center;
- bottom anchor có thể theo `child.x` để child hơi lệch vẫn giữ một line sạch;
- direct vertical có precedence cao hơn side-routing/lane separation vì bản thân nó không tạo sibling trunk giả.

### Side port = horizontal-first

Nếu child lệch ngang đủ xa và cần side port:

```text
[parent] ─────────┐
                  │
                  │
                child
```

- line phải rời thân node theo phương ngang ngay lập tức;
- không đi dọc cạnh node rồi mới rẽ;
- chỉ một corner chính trước vertical drop;
- lane offset chỉ dịch vị trí side port theo trục Y trong giới hạn an toàn, không tạo đoạn gấp quanh node.

### Visual Truth invariant

Thứ tự vẫn giữ:

```text
explicit graph truth
→ exact parent signature
→ family group / collision lane
→ direct-bottom hoặc side port
→ final geometry
```

Không được để geometry tạo cảm giác quan hệ không tồn tại trong graph.

## Data / permission / deploy

Refinement cuối Phase 6.3 là render-only:

- không đổi Firestore schema;
- không migration;
- không đổi `FamilyPerson` / `FamilyRelationship` contract;
- không đổi DG-11 N×M semantics;
- không đổi deterministic relationship IDs;
- không đổi Rules;
- không đổi Functions;
- không cần deploy backend;
- không thêm native dependency.

## Regression gate tại checkpoint CLOSED

Đã chạy trên source merged hiện tại sau toàn bộ patch Phase 6.3:

```text
Family Graph dense layout + connector routing: PASS
DG-11 Batch Relationship Composer: PASS
Family Graph Query + Kinship + Focus Subgraph: PASS
Synthetic benchmark 50/100/300/500 Person: PASS
Phase 2 static TS/TSX transpile check: PASS (121 files)
```

Test connector bổ sung bảo đảm:

- overlapping unrelated family groups không dùng cùng lane;
- far lateral single-parent route có thể dùng side anchor;
- near-under single-parent child được ưu tiên direct vertical;
- direct vertical không đồng thời bị đánh dấu side anchor.

## BASECODE cho phase kế tiếp

Từ checkpoint này, BASECODE tiếp theo phải là:

```text
Phase 6.3 CLOSED
+ full-screen Person editor
+ full-screen DG-11 relationship editor
+ Person directory / unassigned handling
+ Person Detail full-screen
+ Person Timeline + Album integration
+ Query/Kinship/Focus Engine
+ Visual Truth dense layout
+ final connector routing: direct-bottom + horizontal-first side ports
```

Không quay lại connector routing cũ nếu không có regression được chứng minh rõ ràng.

**Phase 6.3 tạm REOPENED cho final visual acceptance của connector center-port. File CLOSED trước đó là checkpoint lịch sử và chưa phải authority cuối sau regression trên thiết bị này.**


---

# PHASE 6.3 — FINAL CENTER-PORT CONNECTOR INVARIANT (2026-09-24)

## Lý do reopen

Device test sau checkpoint CLOSED trước phát hiện một regression visual-truth:

- một parent-child edge có thể bị đánh dấu `direct` chỉ vì child còn nằm trong bề rộng thân parent;
- implementation direct cũ lấy `child center X` làm cả `startX`, nên đầu line có thể xuất hiện lệch khỏi trung tâm parent;
- routing plan còn dùng `NODE_CARD_WIDTH = 112` để tính center trong khi `person.x` là origin của node slot `FAMILY_GRAPH_CANVAS.nodeWidth = 128`, tạo sai lệch center 8px trong routing calculations.

## Invariant mới — bắt buộc cho mọi connector

Mỗi node chỉ có 4 connector port hợp lệ:

```text
               TOP_CENTER
                   │
LEFT_CENTER ─── [ NODE ] ─── RIGHT_CENTER
                   │
              BOTTOM_CENTER
```

Quy tắc:

1. Anchor của line **không bao giờ** được dịch khỏi midpoint của cạnh node bởi lane offset, collision avoidance hay compact layout.
2. Parent-child gần thẳng trục dùng một line thẳng duy nhất từ `BOTTOM_CENTER(parent)` → `TOP_CENTER(child)`.
3. Parent-child lệch ngang dùng `LEFT_CENTER/RIGHT_CENTER(parent)` → corridor → `TOP_CENTER(child)`.
4. Side route phải rời node theo phương ngang ngay từ midpoint cạnh; không chạy dọc cạnh node trước khi rẽ.
5. Lane offset chỉ được tác động phần corridor ở không gian trống; không được thay đổi port.
6. Partner line dùng `RIGHT_CENTER(leftPartner)` ↔ `LEFT_CENTER(rightPartner)`; shared-child branch bắt đầu từ semantic union center.
7. Routing center phải tính theo **node slot width 128**, còn collision/tolerance theo **visible card width 112**. Không được trộn hai hệ tọa độ.

## Direct-vs-side classification

`direct` chỉ khi center-axis thật sự gần nhau, tolerance hiện tại:

```text
max(8px, NODE_CARD_WIDTH * 0.18)
```

Không còn dùng điều kiện “child vẫn nằm dưới phần thân parent” như trước, vì điều đó có thể tạo stem lệch center và gây hiểu nhầm.

## Data safety

Refinement này chỉ thay render geometry + regression tests:

- không đổi Firestore schema;
- không migration;
- không đổi FamilyPerson/FamilyRelationship;
- không đổi DG-11;
- không đổi Rules/Functions;
- không thêm native dependency.

## Status

```text
PHASE 6.3 = REOPENED FOR FINAL DEVICE VISUAL ACCEPTANCE
```

Khi user xác nhận connector trên thiết bị đã đúng theo center-port invariant, tạo lại `FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_PHASE_6_3_CLOSED.md` và chốt Phase 6.3 từ checkpoint này.

---

# PHASE 6.3 — SPATIAL GRID + SEMANTIC PORT OCCUPANCY + COLLISION-AWARE ROUTING (2026-09-24)

## Supersedes final center-port-only routing

Device test chứng minh center-port invariant là cần nhưng chưa đủ: case một parent có nhiều family-group khác nhau vẫn có thể bị nhập/chồng bottom trunk và gây hiểu nhầm genealogy.

Authority mới cho connector routing:

```text
explicit relationships
→ exact parentSignature/familyKey
→ fixed edge-center ports
→ semantic port occupancy
→ spatial-grid obstacle index
→ collision-aware candidate scoring
→ final polyline
```

### Quy tắc bắt buộc

- Anchor chỉ ở TOP/BOTTOM/LEFT/RIGHT center của visible node card.
- Bottom port của một parent không được share giữa hai family-group khác nhau.
- Same exact parent set mới được phép share trunk/segment có chủ đích.
- Nếu bottom đã thuộc family-group khác, thử left/right side-center.
- Side route phải rời node theo phương ngang trước khi đổi hướng.
- Trước khi chọn side, route phải kiểm tra spatial grid để tránh node và line đã tồn tại.
- Partner-facing side port được reserve cho partner connector.
- Renderer không còn tự quyết định route từ geometry; route được planner tính trước.

### Module mới

```text
src/components/familyGraph/familyGraphSpatialGrid.ts
```

Đây là spatial hash/index nền tảng cho connector routing. Nó không thay đổi node layout và không persist dữ liệu.

### Performance / lifecycle

Routing plan được memoize từ `people + connections + canvasWidth`; pan/zoom gesture không làm rebuild route nếu graph/layout không đổi.

Synthetic regression hiện bao gồm 440 Person / 418 parent-child route và spatial routing hoàn tất khoảng 52ms trong container test run.

### Data safety

Không đổi schema, migration, Rules, Functions, DG-11 hoặc native dependency.

### Status

```text
PHASE 6.3 = REOPENED · PENDING DEVICE VISUAL ACCEPTANCE
```

Chỉ tạo checkpoint CLOSED mới sau khi user test các case Quang/Minh + Anh/Trung + couple/shared-child và xác nhận visual truth đạt.

---

# CHECKPOINT — PHASE 6.3 CLOSED BY USER (2026-09-24)

User đã chốt Phase 6.3 và yêu cầu xem code hiện tại sau **Spatial Grid + semantic port occupancy + collision-aware routing** là BASECODE mới.

```text
PHASE 6.3: CLOSED
BASECODE: CURRENT USER PROJECT + PHASE 6.3 SPATIAL GRID SEMANTIC ROUTING
KNOWN DEFERRED: một số connector edge-case hình học còn có thể cần polish sau
DATA CONTRACT: unchanged
RULES/FUNCTIONS DEPLOY: deferred
```

Việc chốt Phase 6.3 không có nghĩa mọi connector edge-case đã hoàn hảo. Các lỗi visual còn lại được đưa vào backlog và chỉ được sửa theo nguyên tắc Graph Truth; không được thay đổi persisted relationship semantics để dễ vẽ.


---

# PHASE 6.4 — LARGE TREE / PROGRESSIVE INTERACTION — TEST BUILD (2026-09-24)

## Mục tiêu

Phase 6.4 gom các thay đổi có liên quan để user test trong một lần:

```text
viewport-aware rendering
progressive Full Tree mount theo khoảng cách graph từ focus
spatial-grid viewport query
connector render culling
large-tree performance hardening
generation spacing ~2x
connector spatial-grid cell recalculation
```

## 6.4A — Viewport-aware rendering

- Toàn bộ graph snapshot/layout vẫn là source of truth trong memory.
- React chỉ mount Person node nằm trong viewport + overscan.
- Một `FamilyGraphSpatialGrid` riêng cho viewport dùng cell 256px để query node gần camera.
- Camera chạy trên UI thread; JS chỉ nhận coarse update khi vượt cell camera 128px hoặc đổi zoom bucket đáng kể.
- Focus/selected/detail Person luôn được pin để không biến mất trong transition.
- Connector routing plan vẫn memoized từ mounted graph; renderer chỉ vẽ union/single-parent connector có geometry giao viewport + overscan.

## 6.4B — Progressive Full Tree

- Full Tree không còn phụ thuộc thứ tự Firestore/source array.
- `buildProgressiveFamilyGraphOrder()` BFS trên structural graph, ưu tiên Person gần focus trước.
- Initial/batch mount giữ config tập trung trong `APP_CONFIG_DEFAULTS.familyGraph.render`.
- Có action `Mở thêm` để user chủ động tăng batch; idle scheduling vẫn mở tiếp khi app rảnh.
- Search tới Person ngoài bounded 3/5 generation scope sẽ chuyển focus để Person thật sự xuất hiện thay vì center vào node đang bị ẩn.

## 6.4C — Generation spacing + grid recalculation

Old live generation pitch xấp xỉ 146px. Phase 6.4 dùng:

```text
generationTop = 24
generationStep = 216
nodeHeight = 124
canvasBottomPadding = 120
```

Như vậy khoảng cách tâm giữa hai thế hệ gần gấp 2 baseline cũ, tạo corridor đủ rộng cho connector routing.

Spatial grid:

```text
connectorGridCellSize = 128
viewportGridCellSize = 256
viewportCameraCellSize = 128
viewportOverscanScreens = 0.85
```

Đây chỉ là render/runtime config; không persist Firestore.

## 6.4D — Performance characteristics

Synthetic Phase 6.4 test với 500 Person:

- progressive order bắt đầu từ focus;
- 120 viewport queries dùng spatial hash;
- trung bình ~65 node nằm trong viewport+overscan, max ~110 ở fixture synthetic;
- query loop vài ms trong container test;
- existing Query/Kinship/DG-11/layout regression vẫn PASS.

Con số synthetic không thay cho device profiling. User runtime test vẫn là gate chính.

## 6.4E — Data safety

Không đổi:

```text
FamilyPerson schema
FamilyRelationship schema
parent_child / partner semantics
DG-11
Firestore paths
Rules
Functions
media_assets
Auth/Profile/Family root state machine
```

Không migration, không deploy Firebase, không thêm native dependency.

## Device test ưu tiên

1. 3 thế hệ / 5 thế hệ / Toàn phả hệ.
2. Pan ngang/dọc dài và pinch khi cây có 26+ Person / 40+ relationship.
3. Full Tree: quan sát `Mở thêm` và progressive branch order.
4. Search một Person xa focus.
5. Kiểm tra generation spacing mới có đủ thoáng nhưng không quá rời rạc.
6. Re-test connector Quang/Minh, Anh/Trung, couple/shared-child vì spacing/grid mới có thể thay geometry.
7. Test 100+ synthetic/device data trước khi CLOSED Phase 6.4.

## Status

```text
PHASE 6.3: CLOSED
BASECODE: PHASE 6.3 SPATIAL GRID SEMANTIC ROUTING
PHASE 6.4: IMPLEMENTED / AWAITING DEVICE TEST
RULES/FUNCTIONS: NO DEPLOY REQUIRED
```



---

# 36. PHASE 6.4 VISUAL-COMPAT HOTFIX — DEVICE FEEDBACK

**Status:** implemented, awaiting device retest.

Device test showed that the first Phase 6.4 spacing/culling pass regressed the Phase 6.3 visual language: generation corridors became too large, planned collision routes rendered as hard 90-degree joints, and viewport culling could leave a spouse connector/heart visible while its partner card was unmounted. This made partner semantics hard to read and created the impression of chaotic crossing lines.

This hotfix keeps the Phase 6.4 performance architecture (progressive ordering, viewport-aware mount, spatial query, coarse camera updates) but restores visual invariants:

```text
Generation pitch: 216px (wider than 6.3, smaller than the rejected 288px pass)
Connector routing grid: 128px
Collision-router waypoints remain authoritative
Rendered elbows are rounded using Bloom quarter-corners
Partner components are atomic for viewport mounting
Progressive Full Tree batch also expands partner components atomically
No partner line/heart is rendered unless both partner cards are mounted
Shared-child union branches are rendered only for mounted children
Single-parent connectors are rendered only when both endpoint cards are mounted
```

No Firestore schema, Rules, Functions, DG-11 semantics, kinship inference, or persisted graph data changes.

**Phase 6.4 remains OPEN / AWAITING DEVICE TEST.**

---

# 37. PHASE 6.4 FOCUS CONNECTOR + PERSON RELATION ORDER REFINEMENT

**Status:** implemented, awaiting device retest.

Device feedback in focus mode showed a connector could look alternately darker/lighter where an active route and a faded route shared the same geometric segment. The visual cause was render ordering: focused and faded connector components could paint over one another in different order. This refinement adds a two-pass connector presentation layer without changing routing truth:

```text
pass 1: paint all faded/inactive connector geometry
pass 2: paint all focused/active connector geometry on top
```

Union/shared-child connectors are split by active/inactive child path for rendering so a faded branch cannot cover a focused shared segment. The same rule is applied across union and single-parent connectors.

Focus emphasis is also increased by exactly 1 display unit for parent-child line thickness:

```text
normal active line: 1.7
focused active line: 2.7
faded line: 1.05
```

Partner dashed connectors follow the same focus emphasis principle while keeping the Bloom heart marker.

Person Detail > Quan hệ now uses the stable display order:

```text
1. Cha / Mẹ / Cha-Mẹ
2. Vợ / Chồng
3. Anh / Chị / Em
4. Con cái
5. Other relationship labels
```

The edit/delete direct-relationship list follows the same applicable order. This is presentation-only; no relationship is reclassified or persisted differently.

No Firestore schema, Rules, Functions, DG-11 semantics, Query/Kinship inference, viewport architecture, spatial grid, or persisted data changes.

**Phase 6.4 remains OPEN / AWAITING DEVICE TEST.**


---

# 38. CHECKPOINT AUTHORITY — PHASE 6.4 CLOSED BY USER (2026-09-24)

Phần này là **authority cuối cùng** cho trạng thái Phase 6.4 và supersede các dòng `OPEN / AWAITING DEVICE TEST` nằm trong lịch sử build ở các section trước.

User đã xác nhận chốt Phase 6.4 và lấy source hiện tại làm basecode mới.

```text
PHASE 6.4: CLOSED
BASECODE: CURRENT PROJECT AFTER PHASE 6.4 FOCUS CONNECTOR + RELATION ORDER PATCH
NEXT PHASE: 6.5 — PERSON EXPERIENCE & FAMILY INTEGRATION
```

## 38.1. Nội dung đã khóa trong basecode Phase 6.4

```text
Phase 6.3 Graph Query + Vietnamese Kinship + DG-11
Spatial Grid semantic/collision-aware connector routing
Viewport-aware node/connector rendering
Progressive Full Tree expansion
Partner pair viewport atomicity
Generation/grid visual-compat tuning
Bloom rounded connector rendering
Focus connector two-pass render
Focused connector +1 display-unit thickness
Person Detail relationship order: Cha/Mẹ → Vợ/Chồng → Anh/Chị/Em → Con
Full-screen Person/Relationship editors
Person Timeline + Person Album baseline
```

## 38.2. Known deferred polish

Các edge-case connector nhỏ còn sót được chuyển backlog. Không được đổi persisted relationship truth chỉ để sửa hình vẽ.

User đồng ý ở phase sau bỏ `+ / −` khỏi canvas vì pinch-to-zoom đã đủ, chỉ giữ nút recenter về Person focus.

## 38.3. Data/deploy state tại lúc CLOSED

Phase 6.4 không đổi Firestore schema, relationship semantics, Rules hoặc Functions. Không migration dữ liệu.

```text
FEATURE_FLAGS.USE_CLOUD_FUNCTIONS = false
Current runtime graph mutation = Direct Firestore + Rules
Functions source vẫn được giữ để có thể chuyển Cloud mode sau này
```

## 38.4. Roadmap kế tiếp đã thảo luận

Phase 6.5 chuyển trọng tâm từ tree mechanics sang Person Experience / cross-domain integration:

```text
Person ↔ Member/Profile bridge
Person ↔ Moments
Person ↔ Events
Person Detail integration
Timeline contribution ownership/moderation
Canvas control cleanup
Structural proposal workflow để phase sau nếu chưa qua Decision Gate
```

**END OF PHASE 6.4 CLOSED CHECKPOINT.**
