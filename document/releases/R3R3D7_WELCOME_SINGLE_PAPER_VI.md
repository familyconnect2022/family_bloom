# Family Bloom R3R3D7 — Thư Ngõ một ảnh / Chữ trong khung giấy

## Thiết kế chốt
- Chỉ một ảnh hiển thị: `assets/images/onboarding/time-letter/welcome-single-paper.webp` (ảnh nguồn bạn duyệt, tối ưu WebP).
- Không còn giao diện / animation / giai đoạn sealed, opening, revealed. Mở app -> Thư Ngõ hiển thị trực tiếp sau khi xác minh đủ điều kiện.
- 14 đoạn nội dung gốc là chữ React Native, không in chết trên ảnh; có thể cuộn và chọn sao chép.
- Nút **Bước vào mái nhà Family Bloom** được đặt ở chân khung giấy, bên ngoài phần ScrollView.
- Không tạo Android Modal window mới để tránh xung đột Native Stack trong các bản D1–D4.

## Căn chữ bằng tọa độ của ảnh, không theo màn hình
Ảnh nguồn 941×1672px, dùng `resizeMode="contain"`; hình không bao giờ bị crop.
Vùng an toàn để in chữ được xác định bằng pixel **trên ảnh nguồn**:
- trái 128 px; phải 807 px; trên 389 px; dưới 1406 px.
- Khi app đo `stageWidth`, `stageHeight`, tính `scale=min(stageWidth/941,stageHeight/1672)`.
- `imageLeft=(stageWidth-941*scale)/2` và `imageTop=(stageHeight-1672*scale)/2`.
- `textLeft=imageLeft+128*scale`, `textTop=imageTop+389*scale`, `textWidth=(807-128)*scale`, `textHeight=(1406-389)*scale`.
- Ảnh và chữ dùng CHUNG hệ quy chiếu; kích thước màn hình đổi thì chữ di chuyển cùng giấy.
- Trên máy quá hẹp, xoay ngang hoặc tăng cỡ chữ >1.6 lần, dùng khung giấy đọc được, không ép chữ qua hoa văn. Không kết luận đây là pixel-perfect trên mọi thiết bị nếu chưa chạy APK thật.

## Giữ bảo vệ
- `session-gate.tsx` vẫn kiểm tra Firebase Auth signed-in + UID/Profile/Membership/Family + Welcome ledger.
- `AuthContext.dismissWelcome` vẫn cần xác nhận lưu seen thành công; không có đường tắt Home.
- Không đổi Firebase Rules / Render / Vercel / Web.
- Bộ chẩn đoán D1/D3 còn hoạt động ở bản test.

## Kiểm thử
- `node scripts/tests/release/test-r3r3d7-welcome-single-paper.cjs`: kiểm tra hình WebP duy nhất, tọa độ trên 8 kích cỡ màn hình, scroll, footer, nguyên văn 14 đoạn, lỗi ảnh, chặn bấm đôi và bảo vệ Home.
- Tất cả các script hợp đồng cũ về motion được điều chỉnh thành hợp đồng thiết kế mới; bản gốc được lưu tại `document/releases/r3r3d7/historical-visual-tests` để đối chiếu.
- Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, dừng nếu preflight không PASS. Sau đó dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat` hoặc Metro dev client.

## Giới hạn cần xác nhận trên Android
Ảnh nguồn có tỷ lệ khoảng 9:16. Trên máy dài hơn sẽ có dải nền gỗ nâu ở trên/dưới do cơ chế `contain`, **đây là chủ ý để tuyệt đối không cắt mép giấy**; không có một ảnh 9:16 nào vừa full-bleed trên mọi tỷ lệ 9:20 vừa không crop và không méo. Kiểm thử thật: xoay thiết bị, tăng cỡ chữ, cuộn đến đoạn 14, kiểm tra nút Home.
