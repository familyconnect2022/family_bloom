# Kiểm thử, hiệu năng và chẩn đoán — checklist

## Mức độ bằng chứng

- **Kiểm thử source**: kiểm tra cú pháp/đường dẫn/contract, có thể chạy ở môi trường Linux/container.
- **BAT trên Windows**: cần xác nhận trong CMD Windows, đường dẫn chứa dấu cách, PowerShell picker hoạt động.
- **APK Android Release thật**: cần Gradle/SDK/keystore và Firebase config tại project đã cài. Kiểm thử source PASS KHÔNG chứng minh đã build APK.
- **Hai tài khoản và Firestore thật**: cần Rules đã deploy và tài khoản thuộc cùng family; test giả không thay thế được.

## Lệnh kiểm thử nhanh (không cần cấu hình Firebase)

```bat
node scripts\tests\release\test-h25r2r7r2r3r4-firebase-recovery.cjs
node scripts\tests\release\test-h25r2r7r2r3r2-build-config-routing.cjs
node scripts\tests\release\test-h25r2r7r2r3r3-compound-formulas.cjs
node scripts\maintenance\check-project-structure.js
node scripts\maintenance\generate-vietnamese-code-map.cjs
```

Các bài kiểm thử có từ lâu nằm trong `scripts/test-*`; không chạy toàn bộ hàng trăm test vô điều kiện vì một số cần môi trường Native/network/mock đặc biệt.

## Test trường hợp thiếu Google config

- Chạy BAT trong FULL ZIP sạch: phải chuyển về project đã cập nhật, không build source rỗng config.
- Project có config hợp lệ: đi qua ngay, không sao chép/sửa file.
- Project thiếu config nhưng còn `android/app/google-services.json`: hỏi xác nhận trước khi copy.
- Project thiếu config nhưng có bản backup Auto Update cùng đích: hỏi xác nhận, chặn backup khác project.
- Không có candidate: hộp thoại file picker; fallback nhập path; kiểm đúng package/ID, từ chối JSON hỏng.
- Bấm hủy: dừng trước Gradle, không tạo APK, không đụng `LATEST`.
- Project có JSON hiện hữu nhưng sai: từ chối ghi đè tự động, yêu cầu sửa thủ công an toàn.

## Bảo vệ hiệu năng app

- Trước/sau sửa: đo startup đến first usable frame, chuyển tab, scroll Kỷ niệm, Focus Phả hệ 300–500 người, Chess/Xiangqi khi chơi và Mini.
- Khi chỉ ở Home hoặc tab khác, module study không được tạo listener/WebView hay upload ảnh.
- Test 2 tài khoản bằng dual apps: đăng Hỏi đáp, phân quyền, lời giải, nhận Firestore read; không dùng dữ liệu thật để stress test.
- Kiểm số lần fetch Firestore, số listener, bộ nhớ, FPS và dropped frames. Không suy luận “không lag” chỉ từ `node` test PASS.

## Lỗi đã từng xảy ra và cách phòng ngừa

| Lỗi | Nguyên nhân gốc | Gate cần giữ |
|---|---|---|
| `google-services.json missing` | chạy từ thư mục sạch hoặc cấu hình local chưa tồn tại | trình khôi phục trong project, kiểm trước test nặng |
| `MODULE_NOT_FOUND typescript` | test dùng TS trước cài dependencies | chia gate no-deps và after-install |
| `WebView` false positive | test grep từ xuất hiện trong comment | test kiểm import thực, không grep tùy tiện |
| `Cloud Functions remains Spark-safe` | ghi đè mất feature flag | test Feature Flags + release:check |
| Chess hướng bàn cờ cũ | state mong muốn khác layout 64 ô thực tế | Native orientation regression |
| `firestore/permission-denied` | Rules chưa deploy hoặc UID/familyId không có quyền | Rules + real-account test, không mở public |

## Báo cáo bắt buộc trước gửi FULL ZIP

1. SHA-256 ZIP + CRC test và danh sách số tệp.
2. So sánh với FULL nền, nêu rõ file thêm/sửa/xóa.
3. Test cấu trúc, source gates, auto-update check no mutation.
4. Nêu rõ test thực sự đã chạy trên Windows/Android hay chưa; không cam kết APK đã build nếu chưa thực thi.
5. Tuyệt đối không đính kèm `google-services.json`, `.env`, credentials, APK chứa signing key cá nhân trong FULL ZIP.
