# Family Bloom R3R14R1 — sửa lỗi chạm mở Thư Ngỏ

Ngày: 24/10/2026. Nền chính xác: R3R14 Time Capsule Animation FULL CODE.

## Triệu chứng trên điện thoại (video `9141.mp4`)

Màn Thư Ngỏ hiển thị phong bì đóng kín, khi nhấn vẫn hiển thị cùng ảnh, không có dấu hiệu chuyển qua cảnh `opening`/`reading`. Video dài ~11 giây. Điều này không phải do animation mất ~1,9 giây mà là nguy cơ mất sự kiện nhấn hoặc trạng thái chuyển cảnh.

## Phân tích mã gốc

Màn R3R14 đặt một vùng `Pressable` rỗng phủ màn hình **trước** một khung đọc thư đã mount sẵn nhưng ẩn bằng opacity=0. Khung đọc có elevation cao trên Android, và ảnh nền có pointer events mặc định. Đây là một lỗi hit-testing/z-order khả dĩ: nhìn thấy đúng ảnh nhưng vùng chạm có thể không được ưu tiên. Không có log native từ thiết bị, do đó không thể xác nhận duy nhất nguyên nhân runtime.

## Sửa đổi

1. **Chỉ mount khung đọc sau khi chạm**. Giai đoạn `sealed` không chứa một tấm giấy/tương tác vô hình phủ trên vùng chạm.
2. Vùng nhấn `Pressable` thực thụ nằm **cuối lớp vẽ**, có `collapsable={false}`, `zIndex/elevation` riêng, phủ toàn màn, dễ chạm cả phong bì và nút “Mở Thư Ngỏ”. Nút hiển thị thật (không chỉ chữ vẽ trong ảnh).
3. Dùng `onPressIn` để phản hồi ngay khi ngón tay chạm; `onPress` là dự phòng. Guard đồng bộ `openingLock.current` chặn việc chạy hai lần.
4. Các ảnh `sealed/opening/revealed` đều `pointerEvents="none"` để không chắn thao tác.
5. Có phản hồi “Đang mở lá thư yêu thương…” và watchdog tối đa 2,6 giây để kết thúc vào trạng thái đọc nếu animation bị hủy/treo khi app bị gián đoạn.
6. Xóa watchdog trên reset/unmount; hủy callback cũ theo `animationRun` khi chuyển gia đình/đăng xuất.
7. Giữ nguyên 14 đoạn Thư Ngỏ và ScrollView riêng; các tính năng khác không bị chỉnh sửa.

## Kiểm thử thực hiện

- R3R14 gốc: 11/11 PASS.
- R3R14R1 hit-test no-deps static: 8/8 PASS.
- R3R14R1 JS mocked-runtime callback/transitions: 6/6 PASS (chạm, chống double tap, animation -> ScrollView, Continue, reset).
- R3R12 family name/radical: 7/7 PASS.
- R3R13 Blaze/FCM: 13/13 PASS.
- R3R11 math: 12 PASS.
- Project structure: 19/19 PASS.
- Auto Update giả lập: 21/21 PASS.
- TypeScript transpile: 349/349 file `src` + `server/src` không có lỗi cú pháp.
- Sẽ kiểm tra ZIP phát hành độc lập bằng `zipfile.testzip()` và đối chiếu từng file nền R3R14.

### Giới hạn

Chưa chạy Android runtime, chưa biên dịch Gradle APK, chưa có log tương tác native nên đây là bản sửa theo chẩn đoán mã nguồn và kiểm thử logic; không cam kết 100% sẽ hết lỗi trên thiết bị cho đến khi APK được thử.

## Build/Update

1. Dùng **FULL CODE R3R14R1**, giải nén ra thư mục riêng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để backup, cập nhật overlay, bảo vệ `.env`, `google-services.json` và dữ liệu cũ.
3. Dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat` để build bản APK thử; hoặc EAS theo script hiện có.
4. Trên điện thoại: chạm vào phong bì hoặc nút “Mở Thư Ngỏ”, quan sát phản hồi ngay. Thư mở, nổi lên, nội dung cuộn; nút “Bước vào mái nhà Family Bloom” phải hoạt động. Thử chạm 3 lần liên tục và thoát app giữa animation rồi mở lại.
5. Nếu vẫn không phản hồi, thu video kèm `adb logcat`/log ứng dụng tại thời điểm chạm để phân biệt overlay-native và lỗi JS.

Không cần sửa lại Firebase hay Firestore Rules chỉ để cập nhật hiệu ứng Thư Ngỏ.
