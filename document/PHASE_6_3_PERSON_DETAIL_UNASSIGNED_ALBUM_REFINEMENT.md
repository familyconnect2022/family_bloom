# Family Bloom — Phase 6.3 Person Detail / Unassigned / Album Refinement

## Mục tiêu

- Person chưa có structural relationship không render trên cây.
- Admin list đánh dấu rõ `Chưa vào cây`.
- Person Detail full-screen có nút X quay lại tree.
- Person Album hiển thị ngay sau upload và ổn định khi đóng/mở lại.

## Data safety

Không đổi schema, Rules, Functions, permission hoặc persisted relationship semantics.

## Files runtime thay đổi

- `src/app/family-graph.tsx`
- `src/app/family-graph-admin.tsx`
- `src/components/familyGraph/familyGraphLiveAdapter.ts`
- `src/components/familyGraph/FamilyGraphPersonSheet.tsx`
- `src/hooks/useFamilyPersonContent.ts`
- `src/services/familyGraph/familyPersonContentService.ts`
- `scripts/test-familyGraphLayout.js`

## Album fix

Album upload dùng optimistic item để hiển thị ngay. Firestore realtime vẫn là source-of-truth và sẽ dedupe optimistic item. Resolver có bounded retry cho race giữa album reference và `media_assets` lifecycle.

## Visual truth

Unassigned Person vẫn tồn tại trong data/admin list nhưng không được đưa lên canvas cho tới khi có ít nhất một explicit `parent_child` hoặc `partner` edge.
