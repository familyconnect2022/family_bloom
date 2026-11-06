# Family Bloom R3R3D7R2 — Android · Thư Ngõ, Tabbar và kiểm tra gia phả

Nguồn đối chiếu: R8R4R4R3R4R3R3D7R1 ngày 02/11/2026. Đây là FULL CODE Android, không phải patch rời.

## Thay đổi
1. **Thư Ngõ**: tiêu đề và nội dung cùng nằm trong `Animated.ScrollView` (Native Driver), Lora hỗ trợ tiếng Việt từ gói `@expo-google-fonts/lora@0.4.2` (được tải qua npm install; không đính kèm font riêng); tiêu đề 29sp (25sp màn nhỏ); chỉ báo cuộn mảnh có màu nhấn theme; giữ ảnh nền cover, vùng giấy an toàn và nút tiếp tục cố định. Giữ lựa chọn “Chữ rõ hơn”.
2. **Cờ vua**: icon nhận diện 3 nơi từ `wp.png` sang `bp.png`; không thay quy tắc màu quân trong ván đấu.
3. **Tabbar**: khung ngoài trong suốt (không nền/viền). **Viên thuốc bên trong đổi nền theo theme**: Rose sáng `#FFFFFF`/tối `#FFF1F5` (trắng hồng); Garden sáng `#F6FFF8`/tối `#F0FCF3` (trắng xanh); Heritage sáng `#FFFBF4`/tối `#FFF5EA` (kem); Midnight sáng `#FAF8FF`/tối `#F5F1FF` (trắng tím). Dark Mode icon đen `#211B20`, bóng chọn màu pastel theo theme, không thay tab navigation/gesture. Chỉ dùng bảng màu này cho tabbar; card Rose vẫn trắng.
4. **Gia phả**: `familyGraphIntegrity.ts` là bộ phân tích thuần dữ liệu, chỉ chạy khi chọn thực hiện tại Dev hoặc lúc chủ động tạo quan hệ. Phân loại lỗi cấu trúc (chặn) và dấu hiệu cần xác minh (cảnh báo). Nút xác nhận ngoại lệ có mặt trong các màn nối quan hệ; không xóa/sửa dữ liệu cũ.
5. **Lưu gia phả**: kiểm tra chắc chắn cha/mẹ ruột phải có năm sinh trước năm sinh con *ngay trong transaction* đã có, không tăng lượt đọc cho trường hợp này. Loại trừ liên kết cha/mẹ kế khỏi đồ thị vòng lặp ancestry để tránh chặn sai. Các quy tắc graph đa tài liệu vẫn cần máy chủ tin cậy khi mở Web; Firebase Rules hiện tại **không được thay đổi**.
6. **Developer Tools**: `Kiểm tra quan hệ và hiệu năng gia phả`: thử dữ liệu giả 100/300/500 người, ca lỗi mẫu và quét gia phả thật **chỉ đọc** khi bấm. Không chạy khi khởi động app. Báo cáo JSON sao chép đã ẩn tên, UID, personId và familyId. Chỉ tài khoản developer đã xác minh mới xem được (kể cả Release).
7. BAT CLEAN_APPLY/ENSURE_DEPENDENCIES kiểm tra sự tồn tại `@expo-google-fonts/lora`, tự `npm install` nếu thiếu.

## Giới hạn an toàn
- Kiểm tra tại thiết bị + kiểm tra transaction của một số trường **không thay thế** xác minh authoritative toàn đồ thị trên server. Nhiều thay đổi đồng thời từ Android/Web vẫn cần Graph API/Cloud Functions để chống race toàn cây.
- Bộ quét Dev **chỉ báo cáo**, không sửa dữ liệu và không ghi ngoại lệ lên Firebase. Bấm “Xác nhận ngoại lệ” hiện là xác nhận thao tác trong phiên, không phải lưu hồ sơ kiểm duyệt riêng.
- Chưa xây lại Next.js Web, chưa xóa mã Web cũ trong bản Android gốc; phần Web mới triển khai trong repo/ZIP riêng sau khi chốt kiến trúc.
- Không thể xác nhận chạy APK thật khi chưa `npm install`, chạy build Android và kiểm thử thiết bị.

## Kiểm thử tự động (source-only)
```
node scripts/setup/check-expo-route-uniqueness.cjs
node scripts/tests/release/test-family-graph-integrity.cjs
node scripts/tests/release/test-r3r3d7r2-themed-dock.cjs
node scripts/tests/release/test-r3r3d7r1-cover-safe-font.cjs
node scripts/tests/release/test-r3r3d7-welcome-single-paper.cjs
node scripts/tests/release/test-r8r4r2-theme-perf-welcome.cjs
npm run typecheck
```
Ghi chú: `npm run typecheck` yêu cầu cài dependency trước, chưa được xác minh trong môi trường đóng gói này.

## Triển khai Android Windows
1. Giải nén ZIP đầy đủ ra thư mục mới; giữ nguyên ZIP R3R3D7R1 để rollback.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` và chỉ tiếp tục khi toàn bộ gate báo PASS.
3. Nếu cài thủ công: `npm install --no-audit --no-fund` rồi `npm run typecheck`.
4. Chạy Build APK thông qua `Family_Bloom_BUILD_APK_TO_SHARE.bat` hoặc `npx expo run:android --variant release` (máy đã cấu hình Android SDK).
5. Test: Thư Ngõ màn hẹp/điện thoại; chuyển Rose/Garden/Heritage/Midnight/Dark; tabbar gesture; 3 icon cờ vua; tạo con ruột hợp lệ, đảo năm sinh bị chặn, cha mẹ nuôi/kế hợp lệ; Dev quét mẫu và quét dữ liệu thật; tài khoản thường không thấy Dev.
6. Chưa triển khai Firestore Rules hay server nào theo gói này.

### Lưu ý việc chuyển quyền
Thay đổi này mới là giao diện Android, chưa triển khai server Render hay Web mới; mã nguồn Web cũ vẫn nguyên trong ZIP vì cần tách sang repo Next.js riêng.

## Kết quả kiểm tra nguồn (đã chạy)
- `check-ts-syntax-transpile.js`: 378/378 tệp TS/TSX đạt cú pháp.
- `check-source-import-integrity.js`: 2.517 import literal được đối chiếu.
- `check-expo-route-uniqueness.cjs`: đạt, không trùng route.
- `check-build-entrypoints.js`: 36/36 BAT đạt; hai BAT có thay đổi đã được chuẩn hóa CRLF.
- `test-r3r3d7-welcome-single-paper.cjs`: 21/21 đạt.
- `test-r3r3d7r1-cover-safe-font.cjs`: 12/12 đạt.
- `test-r8r4r2-theme-perf-welcome.cjs`: 13/13 đạt.
- `test-r3r3d7r2-themed-dock.cjs`: 8 tổ hợp palette x mode đạt; bao ngoài transparent.
- `test-family-graph-integrity.cjs`: đạt; có vòng lặp, năm sinh, cảnh báo, ngoại lệ kế.
- `test-familyGraphBatchRelationships.js`, `test-familyGraphQueryEngine.js`: đạt.
- **Test cũ M3R3 Graph Avatar Security không đạt** ở hạng mục so sánh `firestore.rules` và `scripts/firestore.rules`. Hai file này *đã khác nhau ngay ở bản ZIP gốc R3R3D7R1*. Không thay đổi, đồng bộ hay deploy Rules vì người dùng vừa sửa Rules thật và đã hoạt động. Cần kiểm tra thủ công trước lần deploy Rules tiếp theo.
- **Chưa xác nhận `npm run typecheck`, Gradle/Android Release APK hoặc kiểm thử thiết bị thật** trong môi trường hiện tại do chưa cài đầy đủ dependencies/native toolchain. Test pass nói trên là kiểm tra nguồn, không có nghĩa build APK đã pass.
