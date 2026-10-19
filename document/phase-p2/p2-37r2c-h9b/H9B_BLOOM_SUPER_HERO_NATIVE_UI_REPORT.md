# Family Bloom P2.37R2C-H9B — Bloom Super Hero Native UI

## Nguồn

Xuất phát từ P2.37R2C-H9A FULL ngày 17/10/2026. Sửa vào mã Kotlin thật được Android `Activity.window.decorView` hiển thị; không thêm lớp overlay React/Yoga.

## Những gì đã triển khai

- Full native rail: 90% x 90% viewport, canh giữa. Hai game stage vẫn độc lập và chiếm 90% kích thước Full.
- Chess Native: nền gradient berry/rose, header Bloom Super Hero, hai thẻ người chơi với avatar và đồng hồ riêng, chip lượt, nút Ready, viền bàn cờ vàng nhạt, hướng dẫn thao tác.
- Board size được tính sau khi trừ chiều cao header/thẻ/trạng thái/footer, rồi căn giữa **cả cụm** theo trục dọc. Khắc phục phần trống rất lớn dưới bàn cờ H9A.
- Tap-to-move, hints, selected/last move/check, trạng thái authoritative FEN, Ready server-authoritative tiếp tục lấy từ phần điều khiển H8/H9A.
- Mini giữ nguyên kích thước rail 118x72 dp, kéo và snap, thêm hai điều khiển trực tiếp: mở rộng và đóng.
- Idle/background: rail parked off-screen 1x1, không có overlay chặn Home.
- Xiangqi: phối màu vàng đồng và giao diện preview được làm mới. **Không phải native Xiangqi gameplay đã hoàn thiện**; vẫn preview/probe trên baseline H9A.

## Binary identity

- App version: `1.3.9`
- Android versionCode: `143019`
- Native identity: `P2.37R2C-H9B-native-1`
- Native module: `family-bloom-overlay@1.3.8`

**Quan trọng:** Các thay đổi trên nằm trong Kotlin, do đó cần build/cài APK hoặc EAS development-client **mới**. `eas update`/Metro OTA không thể cập nhật mã Kotlin của bản H9A.

## Cài đè an toàn trên Windows

1. Giải nén FULL ZIP H9B thành một thư mục riêng; chạy `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` từ thư mục bản mới, nhập đường dẫn dự án cũ.
2. Copy **toàn bộ** nội dung bản H9B đè vào thư mục project cũ, không chỉ `src`.
3. Chạy `Family_Bloom_CLEAN_APPLY_FULL.bat` trong project đã cập nhật, để kiểm tra source/dependencies và loại bỏ cache.
4. Để tạo APK Release độc lập, chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` (không cần cắm USB hay Metro), mặc định ra `C:\FamilyBloomShare\apk`.
5. Hoặc chạy `Family_Bloom_EAS_BUILD_TEST.bat` để build EAS profile `family-bloom-test` (bản development-client). Cài đúng file APK mới, không dùng APK cũ.
6. `Family_Bloom_EAS_UPDATE_TEST.bat` có prompt nhập message; chỉ dùng cho cập nhật JS sau khi đã cài native binary H9B và đã thiết lập EAS Update.

## Kết quả xác thực tại môi trường tạo source

- H9B Bloom Super Hero source/layout gate: 24/24 PASS.
- H6 Decor Rail gate: 12/12 PASS.
- H7 Tabs gate: 9/9 PASS.
- H8 Native Chess input gate: 18/18 PASS.
- H9A Mini lifecycle gate: 17/17 PASS.
- Root source structure gate: 19/19 PASS.
- Release readiness: 11/11 PASS.

**Chưa xác thực:** Compile Android Gradle/Kotlin và trải nghiệm trên thiết bị. Môi trường đóng gói không có Android SDK, nên kết quả PASS ở trên chỉ là kiểm tra nguồn và các bất biến chương trình, không phải xác nhận APK build thành công.

## Test trên máy thật sau khi cài

1. Kiểm tra `EXPECTED: 143019 / P2.37R2C-H9B-native-1` trong màn developer Game Foundation.
2. Mời Bloom Bot: Full mở với header `BLOOM SUPER HERO`, bàn cờ nằm giữa hai thẻ người chơi, không còn mảng hồng trống lớn.
3. Chọn quân và đi theo tap-to-move, đồng hồ phải cập nhật với trạng thái server.
4. Thu nhỏ, kéo Mini qua tab Home/Moments, chạm nút mở rộng, rồi đóng; Home không bị phủ một khối trắng.
5. Chạy lại một ván mới để xác nhận session cũ đã dọn và không xuất hiện thông báo `already in game` vô cớ.
6. Thử Cờ tướng để kiểm tra lớp vàng đồng, lưu ý chưa có native Xiangqi gameplay trong bản này.
