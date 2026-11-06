# Family Bloom · R3R3D2 · Sửa Welcome hiển thị trong Session Gate
Ngày: 01/11/2026 · Android only · nguồn: R3R3D1 Auth Diagnostics

## Bằng chứng từ điện thoại

- PROFILE server success 908 ms, Membership server success 752 ms, listener success 757 ms, Welcome ledger check success 27 ms.
- `WELCOME root-sibling-mounted`, `root-plane-layout`; người dùng vẫn nhìn thấy Session Gate hơn 12 giây.
- Do đó không có bằng chứng server Firebase đang treo trong phiên này. Native Stack có thể hiển thị ở lớp khác với React View root sibling.

## Sửa có chủ đích

1. `src/app/session-gate.tsx`: khi `canEnterFamilyHome` xác minh UID + Profile + Membership + Family và `welcomeReady && showWelcome`, hiển thị **WelcomeModal ngay bên trong native screen `/session-gate`**. Màn chờ không render cùng lúc; sử dụng chính màn hình native đã hiện được trước đây.
2. `src/app/_layout.tsx`: bỏ root sibling Welcome có `zIndex/elevation`, chặn overlay bootstrap khi đang hiển thị Welcome; vẫn cấm route `/welcome` độc lập, vẫn `Stack.Protected guard={allowFamilyRoutes}` chặn Home đến khi xác nhận Thư Ngõ.
3. `src/services/navigation/sessionGateDisplayState.ts`: phân biệt AUTH, PROFILE, MEMBERSHIP, WELCOME, NAVIGATION; hoàn tất Membership nhưng còn ở anchor không còn bị gán nhầm `MEM-201`.
4. `src/components/onboarding/WelcomeModal.tsx`: ghi nhật ký an toàn cho giải mã ảnh, chạm mở thư, nội dung thư tương tác được, nút tiếp tục. Không thay đổi 14 đoạn nội dung, hoạt ảnh hoặc dữ liệu người dùng.
5. `src/context/TabStartupContext.tsx`: nếu nội dung tab đã thực sự báo ready nhưng chrome tab không báo, sau 4.5 giây chỉ nhả lớp che hình ảnh; không thay đổi Auth/Firestore/Welcome gate.
6. Bảo toàn `dismissWelcome`: chỉ đóng Thư Ngõ SAU `welcomeLedger.markSeen` thành công; lỗi lưu vẫn ở thư.

Không cập nhật Firebase Rules, server Render, Vercel hoặc Web. Không thêm truy vấn Firestore. Không thay đổi nguồn R3R3D1 trên máy người dùng trước Auto Update.

## Test cần chạy trên APK Release

1. Tài khoản đã có nhà nhưng cần đọc Thư Ngõ: đăng nhập -> mở thư -> đọc -> Tiếp tục -> Home; không được hiện Session Gate 12 giây.
2. Tài khoản đã đọc thư: vào Home không lặp lại thư.
3. UID mới chưa có Profile: đến Create Profile, không crash/Home.
4. Có Profile, chưa có nhà: đến Family Gateway; không hiển thị Thư Ngõ sai.
5. Mất mạng khi kiểm tra Membership: Session Gate báo lỗi đúng, vẫn chặn Home.
6. Xác nhận Thư Ngõ lưu thất bại: vẫn ở thư; không mở Home.
7. Thử chuyển gia đình / đổi tài khoản ứng dụng kép / force stop và mở lại.

Nếu vẫn thấy trắng hoặc treo, thu `[BloomGate]`, `[BloomWelcomePaint]` và báo cáo chẩn đoán; mã mới chỉ chứng minh bằng kiểm thử mã nguồn, chưa xác nhận Android runtime.
