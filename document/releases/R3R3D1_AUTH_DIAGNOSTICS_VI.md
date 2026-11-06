# Family Bloom — R3R3D1 · Chẩn đoán đăng nhập / Membership / Welcome
Ngày: 01/11/2026 · Phạm vi: **Android only** · Nguồn gốc: R8R4R4R3R4R3R3 (SHA-256 `3958cf354e951da71549bc0e3620376c6403362670f6a271d0039817154d7b0a`).

## Bản chất của bản phát hành

Đây là **bản FULL CODE R3R3 bổ sung chẩn đoán**, KHÔNG phải bản tuyên bố sửa xong mọi lỗi treo. Giữ nguyên server-proof, metadata watcher và membership watchdog của R3R3; không thay đổi Firestore Rules, Render, Vercel, Web, quyết định bảo mật hoặc đường đi của retry. Không có kết quả kiểm thử Android/Firebase trực tiếp trong môi trường đóng gói.

## Điểm thu thập bằng chứng

- `AUTH-001` không có callback Auth đúng hạn; UID mới và UID giữ nguyên được phân biệt (không ghi UID).
- `PRO-101/103` thời gian đọc Profile từ server, error Firebase theo allowlist. Profile không có trên server (trường hợp tài khoản mới) chỉ được đánh dấu `profileExists=false`, không báo lỗi.
- `MEM-201/202` theo dõi độc lập listener-first-result, server-read và Membership watchdog. Mỗi kênh ghi thời điểm bắt đầu, trả kết quả, mã lỗi; listener metadata đã được xác minh server mới cho phép `membershipStatus=ready`.
- `MEM-204` là tình huống nguồn dữ liệu có dấu hiệu không thống nhất. R3R3D1 chỉ ghi nhận **khác số lượng** như một dấu hiệu (`counts-differ`), không kết luận sai lệch dữ liệu vì hai lần đọc có thể thuộc hai revision khác nhau.
- `FAM-301/302/303` cấu trúc mã lỗi, cùng các sự kiện tự chọn/chuyển nhà và trạng thái có tìm thấy active membership trong reverse-index. **Không có truy vấn chứng minh family member doc mới** (phạm vi kiểm toán, chưa mở Home bằng dữ liệu chưa xác minh).
- `WEL-401/403` theo dõi đọc/sao lưu Welcome ledger và thời điểm xuất hiện root sibling. Ghi nhận `onLayout` chỉ là bằng chứng bố cục, **không chứng minh native screen đã vẽ ra mắt người dùng**.
- `NAV-501/SYS-601` khi transition shield không kết thúc theo thời gian chẩn đoán; không tự tháo overlay hoặc mở Home. Log route đã ẩn tham số động, không lưu mã nhà.

## Sử dụng trên điện thoại

1. Sao lưu thư mục dự án Android đang dùng; giải nén FULL ZIP **vào thư mục mới**, không đặt bên trong dự án cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`; chỉ build tiếp khi báo **PASS**. BAT vẫn sao lưu rồi kiểm tra và cập nhật đúng dự án; các giá trị `.env` và `google-services.json` cục bộ phải được giữ lại.
3. Build **APK Release** từ dự án đã được cập nhật bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` (nếu máy có Android SDK / Gradle). Không dùng Expo Go hoặc kết nối Metro làm bằng chứng cho lỗi Release.
4. Mở app với tài khoản có gia đình, tài khoản chưa có Profile và tài khoản chưa có nhà; quay video 20–30 giây khi chờ. Sau 12 giây, Session Gate hiển thị **mã chẩn đoán**, bên dưới có **Sao chép mã hỗ trợ**; tài khoản phát triển Gmail đã xác minh sẽ có **Sao chép báo cáo chi tiết**.
5. Dán báo cáo vào cuộc trò chuyện, đặc biệt mục `steps`: trạng thái `MEMBERSHIP/listener-first-result` và `MEMBERSHIP/server-read`, cùng `NAVIGATION/foreground` nếu màn hình trắng.
6. Không tự chỉnh Firestore Rules, Render, Vercel hoặc xóa dữ liệu. Nếu có trường hợp lỗi cả trước khi React render (crash native/JS), ghi thêm `adb logcat -v time ReactNativeJS:V ReactNative:V AndroidRuntime:E *:S` từ máy tính, vì JavaScript UI không thể sao chép báo cáo khi thread đã chết.

## Bảo mật và thu hồi sau thử nghiệm

- Báo cáo chỉ chứa tên bước, trạng thái, mã lỗi Firebase allowlist, độ trễ, route tĩnh đã ẩn ID. **Không** xuất UID, email, token, mật khẩu, familyId, document path, stack trace hoặc nội dung Profile.
- Nhật ký ở bộ nhớ (tối đa 120 sự kiện), **không gửi tự động** đến bất kỳ server, Vercel, Render hay Firestore. Chỉ sao chép khi người dùng bấm.
- Tạm tắt observer bằng `.env`: `EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS=0` rồi **build lại APK**; không thay đổi cơ chế xác minh Auth/Profile/Membership hoặc watchdog. Sau khi ổn định có thể bỏ `src/diagnostics/` và các lời gọi observer theo quy trình test đầy đủ.
- Chỉ tài khoản phát triển `huynh235@gmail.com` với `emailVerified=true` xem timeline đầy đủ. Tài khoản khác chỉ xem mã hỗ trợ đã rút gọn.

## Các điểm chưa chứng minh đã sửa

- Khác biệt reverse-index và `families/{id}/members/{uid}` trong lần boot: vẫn cần điều tra nếu app vào Home rồi gặp permission-denied.
- Overlay phụ thuộc tab bar chromeReady: bản chẩn đoán **ghi lại** nếu shield không kết thúc; không mở bỏ qua.
- Lỗi trắng Welcome trước đây: đã có root sibling của R3R3, nhưng `onLayout` không đảm bảo native painting trên mọi thiết bị.
- Đã kiểm thử source/VM, chưa chạy Gradle Release, Windows BAT hoặc Firebase production.
