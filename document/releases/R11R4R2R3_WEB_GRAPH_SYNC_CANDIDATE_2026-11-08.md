# FAMILY BLOOM · ANDROID R11R4R2R3 — Web Graph Parity Candidate

**Ngày:** 08/11/2026  
**Nền Android:** R11R4R2R2 (giữ nguyên file ZIP gốc và dữ liệu người dùng)  
**Chuẩn Web được nghiệm thu:** W1R19R2R11 / GRAPH-LINE-01  
**Phạm vi:** thay đổi Android source. Không chỉnh `firestore.rules`, Firebase Cloud Functions, website, thông tin Google, signing, data.

## 1. Chức năng đã tích hợp trong mã

- `familyGraphPrototypeData.ts` và `familyGraphLiveAdapter.ts`: giữ trạng thái `married/partner/separated/divorced/widowed` từ dữ liệu thật đến renderer và đến lần cập nhật avatar/profile.
- `familyGraphGeometry.ts`: chia riêng nhóm con chung và *con riêng chỉ trong phép chiếu hiển thị*. Không tạo bất kỳ cạnh cha/mẹ–con nào giả. Điều kiện ghép con riêng: một cặp bạn đời duy nhất, có con đã được xác nhận với cả hai. Trường hợp nhiều cặp phù hợp thì không tự suy đoán.
- `FamilyGraphUnionLines.tsx`: component native để vẽ hai nhẫn vàng / tim đỏ / nhóm 3 người xanh, nền pastel không viền; nét liền nhánh married, nét đứt nhánh partner; một icon anh chị em ở điểm chia nếu có >=2 con.
- `familyGraphLineCorridor.ts` và `appConfiguration.ts`: hành lang an toàn 20px mỗi phía, bước thế hệ tối thiểu 344 canvas units cho node Android 132x176; chừa chỗ nhãn con riêng và tránh ép icon vào card.
- Cả Main Tree (`FamilyGraphPrototype.tsx`) và Focus (`FamilyGraphFocusView.tsx`) dùng chung renderer native; cache geometry/scene/layout tăng version, không thay camera/panning logic hiện hữu.
- `familyGraphQueryEngine.ts`: Focus truy ngược nhiều đời tổ tiên ở luồng đồng bộ và bất đồng bộ; không tự mở các nhánh bên cạnh/con riêng của bạn đời không nằm trong dòng chính.
- `familyKinshipResolver.ts`: chuẩn hóa UI “cha kế”, “mẹ kế”, “con kế”.
- Detail người: thêm nút **sửa** riêng cho từng quan hệ (nút xóa vẫn độc lập), mở route `family-graph-relationship-detail.tsx`. Cho chủ nhà/admin sửa `partnerStatus` và `parent_child.subtype` trên đúng mối nối, có câu diễn đạt và xác nhận trước ghi. Điểm nối đầu–cuối không được phép đổi tại màn này.
- Guard hôn nhân: nếu tạo/đổi sang quan hệ `married`, chặn khi một trong hai người có một quan hệ `married` hoặc `separated` khác chưa kết thúc. Kiểm tra ở dịch vụ ghi phía client, **chưa phải khóa server an toàn tuyệt đối khi hai admin cùng ghi đồng thời**.

## 2. Trường hợp nghiệm thu

- Vợ chồng Nhân–Hồng (nhẫn + nét liền), bạn đời Nhân–B (tim + nét đứt).
- Gia B là con nuôi chung của Nhân–B; Gia Linh là con riêng của B; cả hai có thể được gom thành một nhóm *trên hình* với nhãn con riêng, không gán Nhân làm cha Gia Linh.
- Gia Khôi là con riêng của Hồng, không được tự nhét vào nhánh Nhân–Hồng.
- Focus Gia Minh đi lên Thanh Nhân, Kim Hồng, cụ Long và Bích; không kéo theo Gia Linh/Gia Khôi.
- Focus Thanh Nhân hiển thị các con thuộc nhánh và bạn đời/người phối ngẫu; không kéo con riêng chưa có quan hệ cha–con vào hậu duệ.
- Màn Detail phân biệt sửa thông tin cá nhân và sửa loại/trạng thái của từng mối nối.
- Không cho tạo hôn nhân thứ hai đang hiệu lực nếu chưa xác định tình trạng hôn nhân trước.

## 3. Kết quả và giới hạn

**PASS đã thực thi trong môi trường đóng gói:** 6 bộ kiểm tra Family Graph, Expo Router uniqueness, cú pháp TS/TSX mới và typecheck strict 2 module thuần (geometry/marriage guard).

**CHƯA XÁC NHẬN:** `npm run typecheck` toàn Android, Release APK, Firestore thật, hiệu năng 100–1000 người và cảm ứng màn hình thực tế (thiếu đầy đủ React/Expo node_modules, Android SDK và signing ở môi trường đóng gói). Bộ cập nhật Windows kiểm tra typecheck và gọi BAT build nguyên bản trên máy người dùng; thất bại tự hoàn nguyên.

**Chưa triển khai trong đợt candidate này (không được hiểu là đã hoàn thành):**
- Công tắc lọc ngoài dòng dựa trên **gốc gia phả chính thức** vì Android chưa có hợp đồng dữ liệu gốc tương ứng Web. Android hiển thị các profile sẵn có, không tự ẩn người bằng suy luận.
- Gói đề xuất đa quan hệ/duyệt nguyên tử cho Member: Firestore Rules hiện tại chưa cấp hợp đồng nguyên khối tương ứng. Không tự sửa Rules.
- Ngoại lệ đa hôn lịch sử, khóa đa thiết bị chống ghi hôn nhân đồng thời; cần dịch vụ server để bảo đảm.
- Sửa lại ID người ở hai đầu mối nối trong một thao tác: Rules hiện tại cấm thay `personAId/personBId`, cần workflow thay thế có duyệt.
- Thiết kế Web search modal riêng và một số menu con không được chép đè toàn phần; giữ điều hướng, camera, album, timeline Android hiện có.

## 4. Bảo toàn hệ thống

- Không xóa hồ sơ/mối nối từ Firestore.
- Không chỉnh `firestore.rules` hoặc file `.env`, `google-services.json`, `package.json` hay build scripts nền.
- Bản nguồn R11R4R2R2 giữ nguyên để quay lại. Chỉ phát hành R11R4R2R3 là candidate chờ xác minh APK.
- Cần kiểm thử `BUILD SHARE` từ Android source trên máy Windows người dùng và thực hiện theo checklist trước khi dùng dữ liệu thật.
