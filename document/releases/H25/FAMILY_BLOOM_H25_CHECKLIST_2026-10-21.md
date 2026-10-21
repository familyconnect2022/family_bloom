# Family Bloom H25 — Checklist triển khai và kiểm chứng

**Quy ước:** `[x]` = đã kiểm tra trong môi trường source của phiên này. `[ ]` = chưa kiểm chứng thực tế, không được đánh dấu PASS trước khi có kết quả. Đây là bản kiểm soát phát hành, không phải tài liệu quảng cáo.

## A. Kiến trúc và nguồn
- [x] H23R3 là baseline; H24 bị hủy, không dùng.
- [x] Firebase lưu và phát lời mời trước trận (không Socket.IO lúc app khởi động).
- [x] B được mời A ngay cả khi A không online; Firebase Auth + family membership được xác minh qua Rules.
- [x] Cả A và B nghe cùng bản ghi invitation bằng UID.
- [x] Trạng thái PENDING / CANCELLED / DECLINED / EXPIRED / ACCEPT_REQUESTED / ACCEPTED / FAILED được định nghĩa rõ.
- [x] Hạn 60 giây, chỉ cập nhật trạng thái khi có sự kiện, không ghi mỗi giây.
- [x] Firestore transaction chiếm hai per-UID invite slots trong cùng lần tạo.
- [x] Mỗi UID chỉ có một lời mời ở mọi vai trò và hai game.
- [x] A đồng ý mới kết nối Render; người nhận không bắt buộc ở sảnh.
- [x] Render xác minh và khóa gameId duy nhất; 180 giây kết nối.
- [x] Màu quân được Render chốt trước READY; 1 READY cho mỗi người.
- [x] READY được lưu bền vững trong ván; cả hai READY mới bắt đầu đồng hồ.
- [x] Deadline chuẩn bị 180 giây không reset khi reconnect.
- [x] Chess/Xiangqi quản lý ván, board, gameplay riêng.
- [x] Game finish giải phóng lời mời MATCHED, chống giải phóng nhầm session mới.
- [x] Dọn lời mời cũ chỉ khi Render tự thức (theo lô và bỏ qua phiên chưa xử lý).
- [x] FCM chưa triển khai theo quyết định; không gọi socket chỉ để hiển thị lời mời.

## B. UI Super Bloom
- [x] Một form invitation ổn định; nội dung/nút thay đổi theo vai trò và trạng thái.
- [x] PENDING: bên mời có Hủy; bên nhận có Đồng ý/Từ chối.
- [x] Trạng thái kết thúc lời mời: nút Đồng ý, không có Mời lại.
- [x] Chưa xác minh không được hiển thị đã tạo game.
- [x] PNG Vua/Tướng RGBA trong suốt, không nền, không chữ Hán.
- [x] Absolute center top; một nửa nhô ra phía trên.
- [x] Không nhân bản modal cho từng trạng thái nhỏ của invitation.
- [ ] Kiểm tra form trên thiết bị nhỏ / dark mode / clone app; không che nội dung.
- [ ] Kiểm tra native Full/Mini/chuẩn bị/kết quả giữ bố cục đúng hai vai trò.
- [ ] Xác nhận không hiện lại form cũ khi app foreground/reconnect.

## C. Kiểm thử tĩnh + mô phỏng
- [x] H25 contract/static 38/38.
- [x] H25 runtime mocked Admin claim/recovery 7/7.
- [x] 35/35 command-level release regression tests.
- [x] Source syntax transpile 305/305.
- [x] Source import integrity 305 files / 1823 imports.
- [x] 36/36 BAT CRLF + entrypoint integrity.
- [x] Expo Router screen identity unique.
- [x] versionCode=143039; appVersion=1.3.29; package com.familybloom.android.
- [ ] Full TypeScript typecheck with installed Expo+server dependencies.
- [ ] Firebase Rules Emulator for role/clock/race/getAfter (unavailable here).
- [ ] Real Firestore index deploy and query test.
- [ ] Real Render typecheck + build + deploy healthy.
- [ ] Real Android Gradle native assembleRelease success.
- [ ] APK file bytes/identity verified from your Windows build.
- [ ] Real EAS cloud APK build (optional).

## D. Test hai tài khoản cùng một Android
- [ ] B mời A đang Home/Phả hệ và A thấy lời mời đúng tên/game.
- [ ] B xuống nền, A đồng ý; B quay lại vào cùng gameId.
- [ ] Hủy trước Đồng ý / Đồng ý trước Hủy; chính xác một kết quả.
- [ ] Hai người cùng mời A; chỉ 1 lời mời thành công.
- [ ] B gửi hai lời mời; lời thứ hai bị chặn.
- [ ] A bị kill/restart rồi quay lại trước 60 giây: đồng hồ không reset.
- [ ] Lời mời hết 60s chuyển EXPIRED một lần và không chấp nhận trễ.
- [ ] Render cold start khi A đồng ý; hai bên vẫn đồng bộ sau khi server thức.
- [ ] Chậm hơn 180s kết nối: FAILED, không giữ lời mời vô hạn.
- [ ] Game tạo một lần, màu quân không đổi khi reconnect.
- [ ] A READY trước, A xuống nền, B READY sau: bắt đầu ván theo luật.
- [ ] Đồng hồ trước PLAYING đứng yên; sau PLAYING đúng bên đến lượt.
- [ ] Một người đang PLAYING >180s thì sảnh vẫn hiển thị Đang trong ván.
- [ ] Kết thúc Chess giải phóng slot; có thể mời lại thủ công.
- [ ] Kết thúc Xiangqi giải phóng slot; có thể mời lại thủ công.
- [ ] Mất mạng/reconnect, không xuất hiện hai form hoặc double SFX.
- [ ] Bot flow Chess/Xiangqi không hồi quy.
- [ ] Kiểm tra WIN/LOSS/DRAW đúng người và màu giao diện.

## E. Build & Share Windows — phải xác thực trước khi gửi APK
- [ ] `google-services.json` đúng Firebase project có ở root (tệp cấu hình riêng không có trong H23R3 gốc).
- [ ] Deploy Firestore Rules **và** Indexes của H25.
- [ ] Deploy Render server H25, xác minh server thật, không phải H23.
- [ ] Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` (hoặc CLEAN APPLY đúng trình tự).
- [ ] Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` và nhìn thấy [PASS].
- [ ] Không có `TS2322` hoặc lỗi server `npm run typecheck`.
- [ ] Không có lỗi AAPT2/Kotlin/Gradle.
- [ ] `Family_Bloom_LATEST.apk` được tạo **trong lần build H25**, không phải file cũ.
- [ ] So SHA256 APP source vs copy `.pending` và output share.
- [ ] Xác nhận appId/versionCode/native identity trên APK thật (143039).
- [ ] Chụp log & màn hình hai ứng dụng; chỉ sau đó đánh dấu hoàn thành.

**Không phát hành nếu mục E còn lỗi. Mọi thử nghiệm thực địa còn để `[ ]` vì chưa có quyền truy cập thiết bị/Render/Firebase của bạn.**
