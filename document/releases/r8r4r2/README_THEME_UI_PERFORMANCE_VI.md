# FAMILY BLOOM R8R4R2 — Theme Controls + Thư Ngõ + Tab UX (Android)

Nguồn: FULL SOURCE R8R4R1. Đây là bản vá có kiểm thử cho các vấn đề người dùng báo qua video ngày 31/10/2026; không phải bản giao diện Living Storybook 92/92 hoàn tất.

## Mã nguồn đã sửa
- `BloomInputComponents/shared.ts` và `BloomButtonComponents/shared.ts`: loại bỏ hai bảng màu hồng cố định; dùng semantic `COLORS` chung.
- `BloomTextInput.tsx`: border/outline/placeholder/background đổi theo theme ở cả trạng thái thường, focus, error; input tự theo dõi revision để đổi theme không cần reload.
- `BloomButton.tsx`: nút nhấn, nút outline, disabled, loading và màu chữ/icon nhận token theme và đăng ký cập nhật local.
- `BloomHeroHeader.tsx`: header đăng ký theme riêng để cập nhật nền/viền/chữ/icon đồng bộ.
- `src/app/_layout.tsx`: chuyển theme subscription khỏi `RootLayout` xuống `RootNavigator`, tránh render lại các provider auth/upload/game root khi chỉ đổi màu.
- `src/app/(tabs)/_layout.tsx`: giữ lại cơ chế handoff và tab indicator trên UI thread, nhưng giảm thời gian chờ chuyển màn theo mức hiệu ứng: Gentle ~98–167 ms; Vivid ~136–231 ms; Still = 0 ms. Tất cả chỉ thay việc trình diễn, không gọi ghi theme hoặc Firebase khi tab nhấn.
- `WelcomeModal.tsx`: giữ 3 ảnh phong bì + nội dung Thư Ngõ; bỏ pill trắng, thay bằng chữ và vòng gợn trong suốt nằm trên vùng Pressable phủ màn. Chạm vào phong bì ở bất kỳ điểm nào; tôn trọng Android Reduce Motion.
- `scripts/maintenance/auto-update-full.cjs`: bổ sung gate phiên bản R8R4R2 trước backup/overlay.
- `known-source-lineages.json` và checker: đăng ký R8R4R2 kế thừa chuẩn bảo vệ nguồn; chấp nhận bản R8R4R1 gốc làm target.

## Test đã chạy ở môi trường mã nguồn
- R8R4R2 theme/input/tab/welcome: 13/13 PASS
- R8R3 theme colors/contrast: 22/22 PASS
- R8R4R1 approved baseline: 8/8 PASS
- R3R14 envelope motion: 11/11 PASS
- R3R14R1 welcome touch static: 8/8 PASS
- R3R14R1 welcome touch runtime mock: 6/6 PASS
- Offline updater on original R8R4R1 clone: CHECK, BACKUP, OVERLAY, VERIFY PASS
- TypeScript/TSX syntax: 339 Android/non-web source files, 0 syntax diagnostics.

## Chưa đạt/không khẳng định
- Chưa đo FPS, JS renders, tap-to-content bằng Android release APK trên thiết bị thật; kết quả tăng tốc chỉ là tính theo mã định thời.
- Chưa build APK trên Windows; chưa triển khai Rules; chưa kiểm thử Firebase/Render thật.
- Chưa hoàn tất tái thiết kế 92/92 màn; nhiều hình nền minh họa riêng, card theo chức năng, header tự viết và widget Native cần rà soát tiếp bằng ảnh Android.
- Các test lịch sử liên quan Gia phả/P2.7 đã thất bại ở bản nguồn hiện tại nhưng nằm ngoài các phần vừa sửa; không tuyên bố `0 FAIL` trên mọi test lịch sử.
- Không sửa Web, server Render, Vercel, dữ liệu/secret Firebase, game logic hay Full/Mini Board.

## Cài đặt
Giải nén ZIP ngoài thư mục nguồn hiện tại. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` để sao lưu và cập nhật; sau khi báo thành công mới chạy Build & Share. Không chạy trực tiếp BAT trên máy của người dùng từ môi trường này.
