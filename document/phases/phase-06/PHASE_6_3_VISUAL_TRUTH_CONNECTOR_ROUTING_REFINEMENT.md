# Phase 6.3 — Visual Truth Connector Routing Refinement

## Mục tiêu
Ngăn connector của hai family group khác nhau chồng lên nhau và tạo cảm giác sai về sibling/parent grouping.

## Implementation
- Thêm pure routing planner `familyGraphConnectorRouting.ts`.
- Tạo exact parent signature cho từng child từ các `parent_child` explicit.
- Gom route theo family group + generation corridor.
- Dùng collision-aware interval lane assignment; unrelated groups có overlap phải đi lane khác.
- Single-parent route lệch ngang lớn/có collision ưu tiên side port trái/phải của parent node.
- Union child route nhận truth-aware lane offset theo parent signature.
- Không thay đổi persisted graph truth.

## Data safety
Không đổi Firestore schema, relationship semantics, Rules, Functions, migration, permission hoặc DG-11.

## Test status
- Query + Kinship + Focus: PASS
- DG-11 Batch Composer: PASS
- Dense Layout + connector visual truth: PASS
- Synthetic benchmark 50/100/300/500: PASS
- TS/TSX syntax: PASS (121 files)
- Relative imports: PASS (402 checked, 0 missing)

**Phase 6.3 vẫn mở, chờ user test trên cây thật.**
