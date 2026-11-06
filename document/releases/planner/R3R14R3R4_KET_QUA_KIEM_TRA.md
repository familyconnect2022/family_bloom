# KIỂM TRA FAMILY BLOOM R3R14R3R4 — 27/10/2026

Bản nền: R3R14R3R3 FULL CODE (1.443 tệp). Đầu ra: FULL ZIP không xóa bất kỳ tệp nền nào. Giữ app 1.3.33 / versionCode 143043 để tránh làm sai cấu hình/bộ nhận diện native H25. Đây là sửa JS/TSX ở tab Planner, nên vẫn phải tạo/cài APK mới để nhìn thấy thay đổi nếu không dùng OTA.

## Những phép thử đã chạy thành công (source/mock, không phải APK thật)

| Kiểm tra | Kết quả |
| --- | --- |
| Planner Events layout mới, các callback và empty states | 8/8 PASS |
| Cố ý sửa sai testID của nút Events trong bản đích giả lập | Gate từ chối đúng |
| Super Bloom UI gate cũ được cập nhật theo UI đã duyệt | 24/24 PASS |
| Bulletin deferred gate cũ không mâu thuẫn với vị trí CTA mới | 13/13 PASS |
| H25 release preflight | 10/10 PASS |
| Release readiness, Cloud Functions Spark-safe | 11/11 PASS |
| Android dev menu test | 10/10 PASS |
| BAT layout | 14/14 PASS |
| BAT audit | 34 file được nhận diện, 0 ngoài manifest |
| Project structure | 19/19 PASS |
| Moment media upload/cancel | 13/13 PASS (tĩnh) |
| Study Q&A source gate | 14/14 PASS |
| Expo Router unique routes | PASS |
| Import integrity | 333 file, 1.977 import đều resolve đến file/dependency khai báo |
| TypeScript / TSX syntax transpile | 333/333 PASS |
| Ghi đè tự động mô phỏng trên project giải nén riêng | check PASS, backup 1.443 file, overlay/verify 1.445 file theo SHA-256 |

## Phạm vi thay đổi

1. `src/app/(tabs)/planner.tsx`: chuyển CTA và thiết kế 2 empty state, không thay đổi backend.
2. Hai gate lịch sử trong `scripts/tests/release/` được cập nhật để tiếp tục kiểm tra đúng UX mới; không gỡ bỏ assertion.
3. Thêm `test-r3r14r3r4-planner-event-layout.cjs`, đăng ký trong preflight Auto Update trước sao lưu/ghi đè và trong CLEAN APPLY.
4. `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` giữ chuẩn xuống dòng CRLF của Windows, quan trọng với gate connectivity.
5. `package.json`: thêm lệnh `npm run planner:events:check`.

## Giới hạn

- **Chưa chạy BAT trên máy Windows thật**, chưa thực thi Gradle tạo APK, chưa cài/test trên điện thoại Android.
- Không có `node_modules` của dự án trong môi trường này, do đó không thể coi đây là kết quả `npm run typecheck` semantic với đúng dependencies. Đã dùng TypeScript toàn cục để kiểm tra transpile/cú pháp.
- Không thử Firebase thật hay E2E điều hướng trên thiết bị. Người dùng cần chạy Auto Update -> Build & Share và thử hai tab ở trạng thái trống và có dữ liệu.
