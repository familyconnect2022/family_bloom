# Family Bloom — Phase 6.3 Relationship Composer Performance + Album Hotfix

## Mục tiêu

1. Loại bỏ rerender toàn màn Admin khi chọn Person trong DG-11 composer.
2. Giảm giật khi mở danh sách Person và chọn/bỏ chọn.
3. Sửa Album Person đã có media nhưng tile co thành hai vạch hồng.
4. Sửa query media_assets để phù hợp Firestore authorization semantics.

## Không thay đổi

- Firestore schema
- Firestore Rules
- Cloud Functions deploy state
- DG-11 semantics
- Person / Relationship persisted model
- Auth / activeFamilyId / Root gating

## File runtime thay đổi

- `src/app/family-graph-admin.tsx`
- `src/components/familyGraph/FamilyGraphPersonSheet.tsx`
- `src/services/familyGraph/familyPersonContentService.ts`
- `src/hooks/useFamilyPersonContent.ts`

## Test thiết bị đề nghị

- Mở `Nối quan hệ` với 20+ Person: animation không khựng rõ như trước.
- Mở `Chọn người`, chọn/bỏ chọn liên tục 5-10 Person: directory phía sau không rerender theo từng tap.
- Search Person và scroll A-Z.
- Upload 1 ảnh rồi 2 ảnh vào Person Album: tile phải có diện tích vuông rõ ràng, không còn vạch hồng.
- Đóng Person Detail rồi mở lại Album: ảnh vẫn render từ persisted media_assets + album refs.
- Timeline lỗi/Album lỗi phải độc lập nhau.
