# Family Bloom · Living Storybook 2.0 · R8R4R1 (Android FULL SOURCE)
**Ngày:** 31/10/2026 · **Phiên bản ứng dụng:** 1.3.34 · **Android versionCode:** 143044 (giữ định danh APK gốc do chưa build Native mới)
**Nguồn:** R8R3R3 (SHA256 `782e9958ece66bda7231c17dee49f9f55dc543395bfd7530d1e131d3f2992bb3`)

## Đã triển khai trong mã nguồn
- Giữ hệ bốn theme Rose/Garden/Heritage/Midnight, Sáng/Tối/Theo hệ thống, các thành phần đã sử dụng token động. Sửa thêm bảng màu sảnh Cờ vua/Cờ tướng vốn bị khóa hồng/vàng.
- Thêm cấu hình Living Appearance: 5 **phong cách font hệ thống Android** (hỗ trợ dấu tiếng Việt, không phải 5 file font Be Vietnam/Nunito/Quicksand/Lexend/Baloo), cỡ 90–160%, ba chế độ chuyển động. Cài đặt có nút chỉnh và thử thay đổi trực tiếp. Chữ dùng `createBloomStyles` tăng theo font scale; chữ quá nhỏ được giới hạn để tránh vỡ giao diện.
- Tách cache giao diện theo UID; lúc đầu đăng nhập trên một lần cài đặt mới sẽ thử đọc `users/{uid}/preferences/appearance` từ Firebase. Nếu có local cache thì không đọc lại; chỉnh tại Cài đặt lưu local và đồng bộ Firestore, cache hỗ trợ pendingSync khi mất mạng. Không tham gia quyền truy cập Home.
- Hai file `firestore.rules` và `firestore.cloud.rules` thêm subcollection `preferences/appearance`, giới hạn UID tự đọc/ghi và validate schema. **CHƯA DEPLOY LÊN FIREBASE**.
- `AuthContext`: sau đăng nhập tương tác mới (signed-out → uid), Thư Ngõ hiện trước Home cho UID/membership đã xác minh; tiếp tục giữ quy tắc show cho thành viên mới và giữ gate ở `session-gate`. Mở app từ nền không hiện lại thư. Màn Thư Ngõ giữ nguyên 14 đoạn và 3 ảnh gốc; mềm hóa hiệu ứng, nút phủ trên bì thư.
- Card chung nhận tùy chọn hình dạng `storybook/ticket/polaroid` và artwork. Home đã dùng những dạng mới ở nhóm chức năng, sự kiện, kỷ niệm; hai card sảnh cờ có họa tiết theme. Chưa hoàn tất phần ảnh nền chuyên biệt của mọi màn.
- Cờ vua: asset icon quân tốt `assets/images/chess/pieces-png-default/wp.png` (Home Games/sảnh/lời mời). Cờ tướng: quân tướng `assets/xiangqi/red_general.png`. Giữ native Full/Mini controller và luật, không sửa module game.
- Kèm bản chuẩn đối chiếu 92 màn/26 nhận xét và 8 kiểm tra tích hợp mới.

## Chưa hoàn tất / không được gọi là đạt 90%
- Chưa dựng lại toàn bộ 92 màn theo concept 3D Living Storybook; nhiều màn con và card nội dung vẫn theo UI cũ. Chưa có các bộ ảnh nền riêng bốn theme cho từng card.
- Font hiện dùng **các family hệ thống Android** để không đính kèm font chưa kiểm duyệt; chưa có chính xác 5 font thương hiệu được yêu cầu.
- Ba mức chuyển động mới đã áp dụng màn Welcome/stack; các chuyển động khác hiện không phải màn nào cũng được cấu hình.
- Chưa đo WCAG AA hoặc thử 90–160% trên máy màn nhỏ; không khẳng định không vỡ UI.
- Chưa thử APK/Android/Windows BAT hoặc đọc Firebase trực tiếp, chưa xác minh Theme cloud sync với tài khoản thật.
- Không thay mã Web, Render Chess/Xiangqi hoặc Vercel Media.

## Kiểm thử nguồn (Linux Node, KHÔNG có node_modules)
- Test base R8R3: 22/22 PASS; H10R2: 22/22 PASS; Welcome R3R14: 11/11 PASS; touch runtime: 6/6 PASS.
- Offline updater sweep: **80 PASS, 25 DEFERRED-RENDER, 0 FAIL / 105**.
- Test bổ sung R8R4R1: 8/8 PASS.
- Syntax transpile TypeScript/TSX bằng compiler bundled: **363/363 file PASS**.
- Kiểm tra Auto Update từ bản R8R3R3 gốc: **PREFLIGHT PASS**; bản sao thử nghiệm: **BACKUP PASS, OVERLAY PASS, VERIFY PASS**; tệp `.env` thử nghiệm được giữ nguyên.
- Giữ nguyên versionCode 143044 / app version 1.3.34 vì chưa biên dịch APK Native mới; R8R4R1 là mã phát hành FULL SOURCE, không phải định danh APK mới.

## Khi cài đặt
1. Giải nén FULL ZIP ở thư mục riêng, KHÔNG chép trực tiếp vào project gốc.
2. **Quan trọng**: Cần đưa quy tắc Firestore lên Firebase trước khi thử đồng bộ cloud appearance. Có thể dùng BAT trong `scripts/firebase/` nếu đã cấu hình, hoặc dùng CLI Firebase với project đúng và kiểm duyệt diff rules.
3. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` trên Windows. Nếu preflight FAIL thì DỪNG, không build; gửi log. Sau PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`.
4. Test hai tài khoản UID bằng dual app; xác nhận truy cập hồ sơ, Welcome trước Home, chuyển theme/font, app thoát vào lại, mất mạng, cài lại app, đổi tài khoản; test avatar/Moment và cả hai bàn cờ.
5. Không thay thế file `.env`/`google-services.json`, không làm sạch Android hoặc Node cache trước khi xác minh backup.

**Bản R8R4R1 là giai đoạn nền tảng mã nguồn của thiết kế đã phê duyệt, không phải bản giao diện hoàn tất 92/92.**
