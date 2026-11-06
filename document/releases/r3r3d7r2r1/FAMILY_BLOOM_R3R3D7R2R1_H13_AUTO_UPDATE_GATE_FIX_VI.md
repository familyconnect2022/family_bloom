# Family Bloom R3R3D7R2R1 — Sửa lỗi Auto Update FAIL H13 (19/20)

**Nguồn:** FULL CODE R3R3D7R2, app `1.3.35`, Android `versionCode=143045`.

## Nguyên nhân lỗi người dùng gặp

`Family_Bloom_AUTO_UPDATE_FULL.bat` dừng trước khi backup/overlay vì bài test lịch sử H13 vẫn cố định `versionCode=143044`, trong khi FULL CODE R3R3D7R2 đã tăng `143045`. Vì vậy 19/20 bài kiểm tra H13 đạt, 1 mục `new native binary id matches H13 APK` sai kỳ vọng và khiến preflight trả lỗi.

## Sửa chữa

- Giữ `1.3.35 / 143045`, không hạ versionCode và không vô hiệu hóa preflight.
- Đồng bộ mọi bài kiểm tra và công cụ chứng minh APK liên quan đến nhận dạng phiên bản hiện tại: H13, package proof, APK proof, EAS, Build & Share, màn thử native và các hồi quy lịch sử đang thực thi trong preflight.
- Nâng bài test `H23R3 TypeScript bootstrap` để chấp nhận danh sách dependency gồm font Lora nhưng vẫn buộc npm cài đầy đủ và kiểm tra lại.
- Nâng bài test Thư Ngõ R3R12 để nhận `Animated.ScrollView` thay vì chỉ nhận `<ScrollView` cũ; vẫn yêu cầu ScrollView thật và nút CTA cố định.
- Nâng bài test Theme R8R3 cho màu tabbar lấy theo bảng màu đã duyệt (không còn buộc màu `COLORS.primary` cũ); giữ kiểm tra về capture trong worklet.
- Nâng bài test Living Storybook để yêu cầu icon Tốt đen (`bp.png`) theo thiết kế mới của người dùng.
- Thêm test hồi quy `test-r3r3d7r2r1-preflight-binary.cjs` vào Auto Update **trước mọi thao tác với dự án đích**; kiểm tra chính xác binary `143045`, toàn bộ cầu nối build và H13 20/20 trên nguồn thực.

## Kết quả kiểm tra trong môi trường này

- H13 gameplay/UI controller test: **20/20 PASS**.
- Offline TypeScript/H13 gate: **4/4 PASS**.
- Toàn bộ sweep preflight: **103 PASS, 25 DEFERRED-RENDER, 0 FAIL (128 gate)**. Các mục DEFERRED cần Render/server để kiểm chứng liên repo; không được xem là đã đạt.
- Expo route uniqueness, 36 BAT entrypoints, 378 tệp TS/TSX qua transpile, 2.517 import được kiểm tra trước đó đều PASS.
- Không thay Firestore Rules, Render, Vercel Media, game runtime, đồ họa mới, hoặc cấu trúc dữ liệu.
- Chưa kiểm thử Windows CMD/BAT hoặc APK Gradle thực tế trên máy người dùng. Không coi gate nguồn đạt đồng nghĩa APK đã build thành công.

## Cách áp dụng

1. Giữ bản R3R3D7R1 và R3R3D7R2 để có thể đối chiếu/khôi phục; giải nén R3R3D7R2R1 vào thư mục riêng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`. Chương trình tự kiểm tra nguồn và bảo vệ thư mục dự án cũ; chỉ tiến hành backup/overlay nếu gate đạt.
3. Khi Auto Update báo thành công, chạy công cụ build APK; kiểm tra thực tế 4 theme, Thư Ngõ, icon Tốt đen và Developer Tools gia phả.
4. Nếu còn lỗi, chụp nguyên nội dung console (không chỉ dòng cuối), không bỏ test hoặc tự đồng bộ Rules.
