# Family Bloom — Phase 6.3 DG-11 Composer + Album Thumbnail Refinement

## Mục tiêu

- Giữ màn Nối quan hệ full-screen để tránh quay lại modal nặng.
- Khôi phục bố cục dễ hiểu: Người được chọn → Loại quan hệ → Người tham chiếu.
- Hai phía cha/mẹ–con đều multi-select bằng checkbox dấu ✓.
- Vợ/chồng vẫn pairwise 1↔1 theo DG-11 đã chốt.
- Sửa trường hợp Album mở fullscreen được nhưng thumbnail ngoài grid chỉ hiện ô hồng.

## File thay đổi

```text
src/app/family-graph-relationship-editor.tsx
src/components/familyGraph/FamilyGraphPersonSheet.tsx
document/FAMILY_BLOOM_MASTER_HANDOFF_PROMPT_CURRENT.md
document/PHASE_6_3_DG11_COMPOSER_ALBUM_THUMBNAIL_REFINEMENT.md
```

## Data Safety

Không đổi schema, Firestore Rules, Functions, Person identity, relationship semantics hay migration dữ liệu.

## Test

- TS/TSX static transpile: PASS
- DG-11: PASS
- Query/Kinship/Focus: PASS
- Dense layout 500 Person: PASS
- Synthetic benchmark 50/100/300/500: PASS
