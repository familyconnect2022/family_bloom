# Family Bloom · Appearance 3.0 — A/B trên cùng một APK

## Phạm vi

Đây là tiện ích dành riêng cho tài khoản Developer đã xác minh. Không sửa Auth, Firebase Rules, dữ liệu gia đình, Web, server hay các màn hình sản phẩm khác. Mặc định A/B là sandbox, không lưu theme/font lên Firebase.

## Hai nhánh biên dịch

- **A / ON**: `src/appearance3/ab/CompiledScenario.tsx`, mọi function trong cây Text, Card, Input, Button, Modal, Scenario đều có directive `"use memo"`.
- **B / OFF**: `src/appearance3/ab/UncompiledScenario.tsx`, các function tương ứng có `"use no memo"`.
- Hai tệp được sinh từ một khuôn, khác tên, directive, nhãn hiển thị và ID Profiler. Bài `test-appearance3-ab.cjs` bắt buộc hai nhánh trùng nhau về hành vi.
- `app.json` vẫn bật `reactCompiler: true` ở mức toàn ứng dụng. Nút A/B trong Lab **không** bật/tắt Compiler của APK, mà chuyển giữa hai function đã biên dịch khác nhau.
- Tên ON/OFF dựa trên directive trong nguồn; **cần xác minh output của Babel/React DevTools** để khẳng định Compiler thực sự tối ưu nhánh ON và bỏ qua OFF. React Compiler có thể bỏ qua một function không đủ điều kiện tối ưu.

## Đường vào

Cài đặt → Dev Tools → Appearance 3.0 Lab → **Mở Appearance 3.0 A/B Lab**.

## Kiểm thử tay

Chọn A hoặc B; thử Rose, Garden, Heritage, Midnight, sáng/tối, 5 kiểu font, 90–160%, gõ vào Input, nhấn Button, bật Modal. Quan sát Card cha/con, màu, font và cỡ chữ cùng cập nhật. Lab không ghi thay đổi này vào Firebase.

## Benchmark tự động

Nhấn **Chạy 100 thao tác mỗi nhánh (A/B)**. Quy trình A → B → B → A, mỗi lượt 8 bước làm nóng và 50 bước đo, tổng 100 mẫu/nhánh. Mỗi bước thay đổi props/token (màu, mode, font, size, Input và Button; một số bước mở Modal). Không đếm bước làm nóng, không chạy interval nền. Có nút Dừng.

Số đo JS từ lúc lên lịch state update đến `useLayoutEffect` của nhánh; **không phải** tổng thời gian phản hồi native, FPS, GPU hay pin. React Profiler callback chỉ ghi số liệu khi bản React/build hỗ trợ; không có mẫu không đồng nghĩa 0ms. Vì UI và JS thread chia sẻ tài nguyên, kết quả một phiên ABBA không đủ kết luận hiệu năng toàn app. Nên thử nhiều vòng, đối chiếu trên cùng điện thoại và cùng kiểu APK.

## Báo cáo

Nút **Sao chép báo cáo A/B** xuất JSON gồm dữ liệu đếm, mean/P50/P95/max, chi tiết theo component, thời điểm, số reads/writes appearance tăng trong lúc đo. Không chứa UID, email hoặc chữ nhập Input. `compilerTransformVerifiedInThisEnvironment` được đánh dấu `false` thay vì khẳng định tùy tiện.

## Quy tắc hoàn nguyên

Addon không thay `app.json`, Rules hoặc các tệp Dev Lab 3.0 ngoại trừ thêm nút dẫn đường. Bộ cài addon có backup theo đường dẫn dự án, kiểm tra SHA-256 cả đầu vào và đầu ra; rollback addon **trước khi** dùng rollback của bộ Lab 3.0 trước đó. Không chạy FULL AUTO UPDATE để cài addon.

## Tình trạng kiểm chứng

Chỉ kiểm chứng cấu trúc/cú pháp/contract trên mã nguồn trong môi trường tạo gói. Không có `node_modules` của ứng dụng để chạy Metro, React Compiler transform, emulator hoặc build Android. Phải kiểm tra lại trên Windows + APK trước khi quyết định chuyển Appearance toàn app.
