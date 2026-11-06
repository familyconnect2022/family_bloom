# Full source và patch báo chờ duyệt

Full: Family_Bloom_Phase_6_5_FULL_Review_Badges.zip — toàn bộ source, cài dependencies theo package lock; không kèm node_modules, .git, log emulator.

Patch: Family_Bloom_Phase_6_5_PATCH_Review_Badges.zip — tổng hợp thay đổi so với Family_Bloom_Phase_6_5_FULL_Latest.zip. Bao gồm sửa quyền member-only, không tự duyệt, vị trí Góp ý dưới Duyệt thành viên và badge mới. Dùng được cả khi đã áp dụng PATCH_Member_Proposals_v2, với điều kiện không có thay đổi local khác; nếu có, merge từng file. Giải nén vào gốc project.

Publish firestore.rules nếu chưa dùng Rules member-only của lượt trước. Riêng badge không đổi Rules. Giữ USE_CLOUD_FUNCTIONS=false; không deploy Functions. Không migration/dependency mới.

Prompt full app: document/FAMILY_BLOOM_NEW_ACCOUNT_FULL_PROMPT.md. Đọc checkpoint mới nhất trước các mục lịch sử.

Test: admin mở Cây nhà; tài khoản khác gửi yêu cầu vào nhà hoặc proposal → chuông Chờ duyệt xuất hiện trên đúng thẻ. Duyệt/từ chối toàn bộ → biến mất. Member không có badge quản trị. Kiểm tra đổi nhà/tài khoản, quay lại tab và background/resume.

Validation badge: 133 TS/TSX transpile PASS; diff check PASS. Chưa có device/native verification. Phase 6.5 OPEN.
