# Family Bloom R8R3R2 — Sửa gate Auto Update, Clean Apply, Build & Share (Android)

Ngày: 31/10/2026. Nền FULL: R8R3R1 (versionCode 143044). Đây là FULL source, không phải chỉ hotfix.

## Nguyên nhân Auto Update báo FAIL 11/12

Gate `scripts/tests/history/test-phase-p2_37r2c_h6-decor-rail-isolation.js` vẫn chỉ nhận câu điều kiện cũ `verifiedFamily && !welcomeBlocking`, trong khi từ R8R1 `allowFamilyRoutes` bắt buộc còn có `welcomeReady` để chờ xác minh Thư Ngõ. KHÔNG bỏ `welcomeReady`: bỏ điều kiện này là tạo lỗ hổng Home xuất hiện trước Thư Ngõ.

Quét rộng các script thực được Clean Apply / EAS / Build & Share gọi còn phát hiện hai gate lỗi:

- H10R2: kiểm tra Thư Ngõ còn đòi `welcomeRequestedRef` cũ, thay vì `welcomeLedger` theo UID/family/joinedAt và `welcomeReady`.
- H22R6: modal lời mời Cờ tướng bị kiểm tra bằng mã màu hồng cố định, không còn phù hợp Theme Engine. Modal thực tế chuyển sang overlay theo `COLORS.overlay`, phần card dùng `COLORS.surface` để hỗ trợ Sáng/Tối và bốn bảng màu.

## Phương án sửa

1. Sửa H6, H10R2, H22R6 để xác minh các bảo vệ chức năng và màu theo theme hiện tại. H6 kiểm tra 12 biến đổi cố ý làm yếu quyền truy cập Home; nếu bất kỳ biến đổi nào bị chấp nhận, gate phải FAIL.
2. Bổ sung `test-r8r3r2-offline-updater-gates.cjs` — tự tìm và chạy các bài test nguồn thật từ Clean Apply, Verify, EAS, Build & Share và Auto Update TRƯỚC backup/overlay. Mọi script thiếu hoặc báo lỗi đều dừng cập nhật; test tách server chỉ được ghi DEFERRED, không được tính PASS.
3. Thêm danh tính R8R3R2 vào kiểm tra nguồn, giữ nhận diện R8R2/R8R3/R8R3R1 để nâng cấp từ bản đang dùng. Các tệp P0, Theme, avatar, Thư Ngõ, Native và các gate sửa đổi có hash bảo vệ.
4. Giữ nguyên chức năng Android, Firebase Rules, Web, Vercel, Render, native module Chess/Xiangqi và versionCode 143044.

## Hướng dẫn cập nhật

1. Giữ nguyên project cũ. **Không chạy Cleanup riêng; không xóa .env hay google-services.json**.
2. Giải nén FULL ZIP R8R3R2 ở thư mục MỚI, KHÁC và KHÔNG nằm trong project cũ.
3. Chạy file `Family_Bloom_AUTO_UPDATE_FULL.bat` trong thư mục R8R3R2. Chọn đúng thư mục project cũ khi được hỏi.
4. Nếu Auto Update báo PASS, tiến hành Build & Share. Nếu FAIL, gửi toàn bộ terminal log, không bấm bỏ qua gate.
5. Nếu lần trước dừng sau bước backup, project cũ có thể đang chứa R8R3R1: không cần khôi phục chỉ vì test bị lỗi; bản mới nhận đúng R8R3R1 đã được áp dụng.

## Giới hạn xác minh

Đã chạy gate nguồn offline bằng Node.js Linux và mô phỏng backup/overlay/verify trên bản sao. Chưa thực thi Windows BAT thực tế, `npm install`, Gradle/Metro APK build, Firebase live hoặc Render server. Chỉ gọi là PASS những bài kiểm tra thật sự chạy và đạt.
