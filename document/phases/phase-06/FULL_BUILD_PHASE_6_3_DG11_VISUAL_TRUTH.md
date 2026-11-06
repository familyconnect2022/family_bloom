# FAMILY BLOOM — FULL BUILD PHASE 6.3 DG-11 + VISUAL TRUTH

## Loại gói
Đây là **FULL SOURCE CODE**, không phải patch.

Baseline được ghép theo đúng thứ tự:
1. Phase 6.2 RELATION / UPLOAD / EVENT HOTFIX FULL (BASECODE Phase 6.2 CLOSED)
2. Phase 6.3 Query + Kinship + Focus UI
3. Phase 6.3 Dense Layout + Safe Delete + Bloom Confirm
4. Phase 6.3 DG-11 Batch Relationship + Visual Truth

Không cần copy các patch Phase 6.3 cũ trước khi dùng gói này.

## DG-11
- Parent-child hỗ trợ N người được chọn × M người tham chiếu.
- UI mở rộng thành các canonical `parent_child` edge hiện hữu; không tạo schema group mới.
- Partner/spouse vẫn pairwise 1↔1.
- Không tự suy luận cha/mẹ để ghi vào gia phả.
- Preview số edge mới/đã tồn tại trước commit.

## Visual truth
- Partner/spouse pair là một visual unit, không để người cùng thế hệ chen vào giữa.
- Child phải neo theo explicit parent edge thực tế.
- Dense generation mở rộng/reflow, không ép node chồng lên nhau.
- Layout không được làm người không liên quan trông như cùng cha mẹ/vợ chồng.

## Delete semantics
- Xóa đường nối/quan hệ: chỉ xóa relationship, giữ cả hai Person.
- Xóa người khỏi phả hệ: mới xóa Person theo integrity protections hiện tại.

## Firebase
Phase 6.3 này không yêu cầu publish Firestore Rules hoặc deploy Functions mới.
`functions/` vẫn được giữ đồng bộ source cho tương lai.

## Cài đặt
Nếu project local có cấu hình riêng ngoài source (ví dụ `.env` không được commit), hãy sao lưu nó trước khi thay thư mục project.
Sau đó dùng gói FULL này như project source chính, chạy dependency install theo lockfile hiện có nếu cần, rồi clear Expo cache trước khi test.
