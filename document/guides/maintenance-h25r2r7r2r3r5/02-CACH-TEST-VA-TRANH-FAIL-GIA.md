# Hệ thống kiểm thử mới — phân tầng, không chặn build nhầm

## Nhóm 1: Preflight chỉ cần Node.js (trước backup)

- `scripts/tests/release/test-h25r2r7r2r3r5-script-layout.cjs` — 14 hợp đồng thư mục/BAT/chuyển đường dẫn.
- Kiểm tra cấu trúc và mã nguồn bắt buộc: `scripts/maintenance/check-project-structure.js`, `scripts/tests/release/test-h25-source-package.cjs`.
- Các bài H25 về Firebase, cập nhật, người dùng, công thức, quyền Spark chạy trên fixture và **không yêu cầu project thực thiếu Google JSON**.
- Cần PASS trước thao tác sao lưu/chỉnh sửa. Đường dẫn có dấu cách và `last-target.txt` được kiểm tra.

## Nhóm 2: Sau khi dependencies sẵn sàng

- Kiểm tra TypeScript VM, import và các hồi quy Chess/Xiangqi/Góc học tập.
- `CLEAN APPLY` và `Build & Share` kiểm tra các điều kiện bắt buộc trước Gradle.
- Các bài test lịch sử **vẫn giữ trong `scripts/tests/history`** để tra cứu và chạy khi cần; không được mặc định mọi bài từ giai đoạn cũ đều là hợp đồng hiện hành. Một số bài kiểm tra snapshot/identity của các phiên bản đã nghỉ có thể thất bại khi chạy độc lập vì mong đợi code của thời điểm đó.

## Nhóm 3: APK thực tế

- Chạy Windows CMD, Gradle Release, kiểm tra chữ ký và cài lên thiết bị Android thật.
- Đo RAM/FPS/số lần đọc Firestore và thử trò chơi, Phả hệ, Góc học tập.
- Không được đánh dấu `PASS` bước này nếu chưa có log hoặc thử nghiệm từ điện thoại.

## Vì sao R3R4 Build & Share báo lỗi khi có Google JSON?

Bài kiểm tra Firebase cũ kiểm tra `!exists(google-services.json)` **ngay trên source project**. Điều này sai khi chạy tại thư mục cập nhật đã có cấu hình hợp lệ; ngoài ra đường dẫn target đôi lúc là thư mục cũ do `last-target.txt`. R3R5 dùng fixture JSON riêng để kiểm thử, in rõ thư mục đang build và không chạm vào cấu hình thật.

Mã nguồn/runtime vẫn giữ cơ chế kiểm tra `com.familybloom.android` và đúng Firebase project, không tắt xác minh an toàn.
