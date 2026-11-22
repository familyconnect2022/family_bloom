# Family Bloom Android · R11R4R2R4 WEB GRAPH UI PARITY R1

Ngày phát hành: 09/11/2026

## Nền mã nguồn

Bản đầy đủ `FamilyBloom_Android_R11R4R2R3_TYPESCRIPT_STABILIZATION_R2_FULL_CODE_2026-11-09.zip` (1.765 file). Không sử dụng các bản vá R1→R2, GitHub-derived hoặc R2→R3 cũ.

## Phạm vi giao diện

- Tab **Cây nhà** mở trực tiếp cây phả hệ thay vì màn giới thiệu nhiều thẻ. Tabbar có sẵn được giữ nguyên.
- Header `FamilyGraphWebHero` dùng artwork thật của Family Bloom, text sans-serif tối giản, metadata số người và tên gia đình.
- Admin: **Duyệt đề xuất**, **Quản lý gốc**. Thành viên: **Đề xuất thay đổi**.
- **Tìm trong phả hệ** mở modal tìm kiếm thật của renderer.
- Canvas trắng viền nhẹ, bo góc; chế độ mặc định **toàn phả hệ**, camera tự căn giữa và thu nhỏ để xem tổng thể khi mở lần đầu.
- Không còn hiển thị thường trực các nút 3/5/toàn phả hệ, Nhánh, định vị và chú giải trong khung chính. Nhấn `…` ở header để bật chế độ nâng cao hoặc mở màn quản lý Cây nhà cũ.
- Mỗi node có nút menu `…` mở chi tiết, chỉnh sửa, nối/thêm người (admin), mở trang đề xuất (thành viên), và Focus. Chạm node vẫn mở chi tiết như trước.
- Giữ màn Quản lý/Đề xuất, người thân, và mọi thuật toán gia phả trước đó; không thay Firebase Rules, Android package, dependencies, cấu hình Cloud Functions hay server.

## Kiểm thử

Đã chạy thành công: cấu trúc 19/19; Expo Router; FamilyGraphWebSync R3; AndroidSyncAcceptance R3; StableWebSync R3; FamilyGraphNode R2; source contract WebUI R4; parser TypeScript cho mã TS/TSX.

**Chưa xác minh:** `npm run typecheck` toàn dự án do môi trường hiện tại không chứa `node_modules`, build Release APK trên Windows và độ khớp pixel với mã CSS Web thực tế. Thiết kế hiện dựa trên ảnh Web được người dùng cung cấp. Không gọi bản này là pixel-perfect hay production validated cho đến khi kiểm thử thiết bị thật.

## Hướng dẫn dùng FULL CODE

1. Sao lưu dự án Android đang chạy; giải nén FULL CODE R4 vào `D:\FB_R4` (đường dẫn ngắn tránh CMake path-limit).
2. Sao chép `google-services.json` và chỉ những biến môi trường thật sự cần thiết. **Không chép `src`, `node_modules`, `android`, `scripts` hay root BAT từ bản cũ.**
3. Trong root R4: `npm install --include=dev --no-audit --no-fund`.
4. Chạy: `npm run typecheck`; chỉ khi exit code bằng 0 mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`.
5. Kiểm tra trên máy Android: tab Cây nhà, cùng dữ liệu 10 người như Web, zoom/pan, menu node, Focus, sửa quan hệ, duyệt đề xuất, chuyển các theme, tabbar và hoạt động sau background.
6. Giữ nguyên bản R3 đã build trước cho rollback; không áp SAFE PATCH lên project không cùng baseline.

## Phiên bản

Release ID **R11R4R2R4-WEB-GRAPH-UI-PARITY-R1**, khác tất cả release IDs trước đó. `app.json` versionCode vẫn 143045 để không làm hỏng chuỗi gate Android cũ; việc tăng Android binary versionCode cần được làm riêng cùng các build gates có ràng buộc cứng và xác minh đầy đủ trước phát hành chính thức.
