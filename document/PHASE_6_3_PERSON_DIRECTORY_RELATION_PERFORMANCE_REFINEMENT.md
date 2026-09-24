# FAMILY BLOOM — PHASE 6.3 PERSON DIRECTORY / RELATION PICKER / ALBUM REALTIME

## Mục tiêu

Sửa feedback device test mà không đổi dữ liệu chính:

- Album Person upload xong nhưng reopen chưa hiện media.
- Avatar 1 ký tự dùng tên thay vì họ.
- Person list cần sắp xếp A-Z theo tên và có tiêu đề chữ cái.
- Top-level Nối quan hệ không được tự chọn Person đầu tiên.
- Picker 20+ Person quá dày và có lag khi chọn.
- Cần hiển thị số nhánh trực tiếp của từng Person.
- Bỏ warning `InteractionManager` deprecated.

## Runtime changes

1. `familyPersonContentService.watchAlbum()`
   - listener album refs + listener media_assets theo `entityId=personId`;
   - intersect theo `mediaAssetId`;
   - bounded, lifecycle tied to Person Detail;
   - không đổi Firestore schema.

2. `family-graph-admin.tsx`
   - person directory group theo given-name initial;
   - avatar dùng given-name initial;
   - direct branch count badge;
   - relationship composer top-level starts empty;
   - virtualized alphabetic SectionList person picker;
   - search + branch count + selected state rõ ràng;
   - indexed relationship preview thay vì scan lặp.

3. `FamilyGraphPersonSheet.tsx`
   - avatar detail dùng given-name initial.

4. `FamilyGraphPrototype.tsx`
   - thay deprecated InteractionManager bằng requestIdleCallback/fallback.

5. `src/utils/personName.ts`
   - helper given name / initial / sort / alphabetical sections.

## Data safety

Không migration. Không rename collection/field. Không deploy Rules/Functions. DG-11 không đổi.
