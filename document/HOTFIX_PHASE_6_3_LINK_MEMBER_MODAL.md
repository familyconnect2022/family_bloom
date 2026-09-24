# Family Bloom Phase 6.3 — LinkMemberModal hotfix

## Lỗi
`family-graph-admin.tsx` vẫn render `<LinkMemberModal />` nhưng patch Person Directory/Relation/Album/Perf đã vô tình bỏ phần khai báo component `LinkMemberModal` khỏi cùng file.

Đây không phải thiếu một file component riêng. `LinkMemberModal` vốn là local component nằm trong `src/app/family-graph-admin.tsx`.

## Sửa
Khôi phục nguyên component `LinkMemberModal` vào `family-graph-admin.tsx` và giữ nguyên toàn bộ thay đổi mới về Person Directory, Relationship picker, Album và performance.

## File thay đổi
- `src/app/family-graph-admin.tsx`

Không đổi schema, Rules, Functions, package hay native config.
