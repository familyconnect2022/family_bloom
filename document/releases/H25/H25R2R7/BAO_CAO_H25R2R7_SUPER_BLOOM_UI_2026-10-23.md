# FAMILY BLOOM H25R2R7 — BÁO CÁO ĐỢT NÂNG CẤP UI/UX ĐỒNG BỘ

Ngày mã nguồn: 23/10/2026 · Mã ứng dụng: **1.3.32** · Android versionCode: **143042** · Native identity: **P2.37R2C-H25-native-3**

## Mục tiêu và phạm vi

Một bản FULL CODE duy nhất kế thừa H25R2R6R3R1. Thay đổi các màn Thông báo, Home, Kỷ niệm, Lịch nhà, Cây nhà, Nhà Mình, Bảng tin Nhà Mình, và thử hiệu ứng Mini Edge Peek cho Chess/Xiangqi. Không cắt bỏ tính năng Chat; chỉ ẩn liên kết từ Đi nhanh trên Home. Không thay đổi luật chơi, protocol Socket.IO, Firebase Auth, Firebase Rules, thời gian ván, hoặc logic phân màu quân đã sửa ở bản trước.

## Checklist theo từng phần

| Mục | Yêu cầu | Thực hiện / nơi sửa | Kiểm tra |
|---|---|---|---|
| A1 | Mini quăng ra cạnh, ẩn 60%, còn 40% | `FamilyBloomOverlayModule.kt`: mỗi game giữ `MiniPeeked` riêng, dock trái/phải, 260ms Decelerate, chạm phục hồi Full, kéo chậm lấy lại Mini | Kiểm tra nguồn PASS; **cần test APK trên máy thật** |
| B1 | Thông báo có padding hai bên | `notifications.tsx`: sửa xung đột tên style `body` → `listBody`, ngang 18dp | PASS |
| B2 | Tiêu đề hôm nay gom thành một | `buildActivitySections()`: “Hôm nay · N câu chuyện” | PASS |
| B3 | Thông báo trước đó theo ngày và nguồn/sự kiện | Gom cùng `familyId/sourceType/sourceId` trong từng ngày; hôm qua/ngày cụ thể; mới trước cũ sau; hiển thị `+N cập nhật cùng sự kiện` | PASS phần nguồn; cần test nội dung thật |
| B4 | Settings bằng Back | `headerAction` 56×56dp, như Back | PASS |
| C1 | “Mái nhà hôm nay” cùng hàng Bell, bên trái | `BloomHeroHeader.topLeft`, co chiều rộng theo `screenWidth` | PASS nguồn; cần thử màn 320dp |
| C2 | Spacing Home đều; CTA Mở nhà/Lịch/Tường dùng icon | Padding và `BloomSectionHeader.actionIcon` | PASS |
| C3 | Sự kiện sắp tới nổi bật, giờ bên phải | Dòng đầu có style nổi bật, hiển thị giờ nếu `allDay=false` | PASS nguồn |
| C4 | Thành viên 2 dòng, không trôi ra hai mép; xem thành viên trong card | Grid `flex-start` + `gap` nhất quán, nút trong card; bỏ “Xem cả nhà” ngoài card | PASS |
| C5 | Ẩn Trò chuyện, thay Góc học tập | Ẩn entry trên Home, giữ route/code, thêm `learning-library` | PASS |
| D1 | Thêm 6 icon trong composer, không gắn bài | Composer-only: Niềm vui, Sum vầy, Chuyến đi, Sinh nhật, Yêu thương, Dấu mốc. Gợi ý khởi đầu nội dung nếu caption trống | PASS |
| D2 | Comment có số >0 được highlight; 0 bình thường | `MomentCard.tsx`: active style chỉ khi `commentCount > 0` | PASS |
| D3 | CTA Thêm kỷ niệm dưới card gia đình, nổi bật | `BloomActionCard`, được đặt dưới family selector | PASS |
| E1 | **Ngày đang chọn phải hình tròn, không vuông** | `planner.tsx` `dayCircle` và `daySelected`: width=height=38, `borderRadius:999`, `overflow:'hidden'` | PASS nguồn; **cần xác nhận trên Android** |
| E2 | Thêm sự kiện dưới lịch, cùng thiết kế Kỷ niệm | `BloomActionCard` ngay sau `CalendarMonthGrid` | PASS |
| F1 | Bỏ “Nhà đang xem” trùng lặp | `family.tsx`: bỏ thông tin lặp trong phần nội dung | PASS |
| F2 | Quản lý nhà trước danh sách thành viên | Thứ tự lại sections | PASS |
| F3 | Danh sách nhà dài, scroll/performance | FamilySwitcherModal tiếp tục dùng `FlatList` (`windowSize=5`); danh sách thành viên tải hiển thị 18 mỗi đợt, tăng 18 bằng nút Xem thêm | PASS nguồn; benchmark thiết bị cần thêm |
| G1 | Gom 5 nhóm Nhà Mình, bỏ “Góc Nhà Mình” | Nhóm: **Chung một mái nhà** (Bảng tin, Quỹ, Cùng quyết định); **Giờ vui của cả nhà** (Game); **Vườn tri thức nở hoa** (Góc học tập); **Lời thương cất giữ** (Thì thầm, Hộp thời gian); **Bếp ấm thơm nhà** (Bếp) | PASS |
| G2 | Logic Bảng tin Nhà Mình rõ, không trùng thông báo | `home-board.tsx` thay card demo bằng tổng hợp sự kiện nổi bật và các kỷ niệm dành cho gia đình. Cache 90 giây, truy vấn giới hạn, không listener riêng. Chuyện trong nhà vẫn là inbox cá nhân/chưa đọc. | PASS nguồn, kiểm chứng dữ liệu Firebase thực tế cần thêm |
| H1 | Tinh chỉnh phong cách Super Bloom | CTA chung pastel/ánh sáng mềm, bo 26dp, card nổi bật, icon 57dp; nhóm Nhà Mình có accent riêng; spacing và icon hóa | PASS nguồn; nhận xét thẩm mỹ tùy trải nghiệm thiết bị |

## Phân biệt “Bảng tin Nhà Mình” và “Chuyện trong nhà”

- **Chuyện trong nhà**: hộp thông báo cá nhân: lời nhắc, cập nhật, hoạt động theo thành viên, trạng thái đã xem; nhóm theo ngày/sự kiện.
- **Bảng tin Nhà Mình**: không dùng để nhắc cá nhân; trình bày tổng quan sự kiện quan trọng sắp đến trong khoảng 30 ngày và một số kỷ niệm chia sẻ công khai trong gia đình. Không tạo Firestore listener gốc mới.
- **Kỷ niệm** vẫn là trang viết/xem bài, **Lịch nhà** vẫn là lịch chi tiết có ngày và chế độ danh sách.

## Báo cáo kiểm tra mã nguồn (tại gói nguồn trước khi đóng gói)

| Bài kiểm tra | Kết quả |
|---|---|
| H25R2R7 UI + Mini Edge Peek source contracts | 24/24 PASS |
| H25 Firebase Invitation + hai giai đoạn READY + source contracts | PASS |
| H25 source package bắt buộc (109 đường dẫn) | PASS |
| Auto Update pre-install TypeScript-free | 8/8 PASS |
| Chess H14 phân màu/Mini | 20/20 PASS |
| Mini lifecycle/performance H9A | 17/17 PASS |
| Hero UI và responsiveness H9B | 24/24 PASS |
| Release preflight | 10/10 PASS |
| Kiểm tra cú pháp TypeScript/TSX/JS từ nguồn | Đã chạy, không có lỗi cú pháp |

**Giới hạn xác minh:** Đây là kiểm thử nguồn và hợp đồng, không đồng nghĩa APK đã build, render Android thật đã xác nhận hay Firebase trên máy người dùng đã thử. **Chưa có thử nghiệm GPU/performance trên thiết bị thật.** Hiệu ứng Mini Kotlin và vòng tròn ngày chọn cần được thử trực tiếp bằng APK cài mới. Không khẳng định mọi thiết bị/mọi tỷ lệ font đều đẹp cho đến khi thử.

## Các trường hợp cần test sau khi cài APK mới

1. Mở Chuyện trong nhà với 10+ thông báo: padding đều; mở cùng sự kiện nhiều lần: nhóm đúng; phân Hôm nay/Hôm qua/ngày khác; settings bằng Back.
2. Home trên máy Android chính, phóng cỡ chữ và nếu có màn nhỏ: Mái nhà không đè bell; các CTA icon điều hướng đúng; 5 người có 2 hàng (3+2), không giãn hàng 2.
3. Có sự kiện gần giờ và không có giờ: mục sắp nhất khác màu, giờ phải xuất hiện bên phải chỉ khi có giờ.
4. Kỷ niệm: nút thêm to nổi bật dưới card gia đình; mở composer thấy đúng 6 biểu tượng; không thấy 6 icon này trên bài; bình luận 0 thường / >0 highlight.
5. Lịch nhà: ngày đang chọn là **hình tròn**; ngày hôm nay và ngày được chọn khác nhau; chuyển tháng rồi chọn ngày vẫn tròn; nút Thêm sự kiện dưới calendar.
6. Cây nhà: Quản lý nhà ở trên thành viên; chuyển nhà bằng FlatList; 50–500 thành viên cuộn/mở từng 18; trở lại tab không làm lag.
7. Nhà Mình: năm nhóm theo thứ tự, đầy đủ 8 chức năng, mọi nút điều hướng đúng; Góc học tập mở `learning-library`.
8. Bảng tin: có/không có sự kiện; có/không có kỷ niệm; khi mất mạng không crash; chuyển family không lẫn dữ liệu.
9. Chess: mời 2 tài khoản, đảo màu, Mini -> Full, không xoay sai; khi quăng Mini sang trái/phải còn 40%, chạm mở Full, kéo chậm đưa ra hoàn toàn; đồng hồ không reset.
10. Xiangqi: kiểm tra Edge Peek riêng, không ảnh hưởng Chess; cả hai game không chia sẻ session/surface nội bộ.
11. Auto Update: chạy BAT ở gói đã giải nén trước, không trực tiếp chạy trong ZIP; xác nhận bản cũ đã backup rồi mới copy; Build & Share tạo APK đúng versionCode 143042.

## Cập nhật và đường dẫn chạy

- Giải nén FULL CODE H25R2R7 ra thư mục riêng.
- Chạy **`Family_Bloom_AUTO_UPDATE_FULL.bat`** để sao lưu rồi cập nhật project hiện tại; không tự build APK.
- Chạy **`Family_Bloom_BUILD_APK_TO_SHARE.bat`** trong project đã cập nhật.
- Cài APK mới Android **1.3.32 / versionCode 143042**. Vì Kotlin Mini được thay đổi, **OTA đơn thuần không đủ**.
- Các `.md/.txt` đi kèm được giữ trong `document/`, theo quy tắc dự án.

## Không thay đổi / rủi ro cần theo dõi

- Không bỏ hoặc xóa Trò chuyện, chỉ ẩn lối vào tại Home.
- Không xoá code game hay thay đổi backend, Firestore Rules, tài khoản hoặc dữ liệu gia đình.
- Một số bài kiểm tra hiện tại chỉ phân tích nguồn; build Gradle cuối cùng phụ thuộc môi trường Windows/Android SDK/dependencies trên máy bạn. Khi Build & Share báo lỗi, lưu lại log để chẩn đoán đúng nguyên nhân.
- Trên thiết bị Android tùy hãng, góc bo/overflow và Native kéo/quăng có thể có khác biệt; cần video xác nhận thực tế.
