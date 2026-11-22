# FAMILY BLOOM · ANDROID R11R4R2R3 — TS-STABLE WEB GRAPH SYNC R1

**Ngày:** 09/11/2026.  **Trạng thái:** Candidate chờ kiểm thử TypeScript đầy đủ và APK trên máy Windows / thiết bị người dùng.

## Nguồn gốc (quan trọng)

- Nền duy nhất: `FamilyBloom_Android_R11R4R2R2_TYPESCRIPT_STABILIZATION_R1_FULL_CODE_2026-11-09.zip` (bản FULL CODE Android R2 đã sửa TypeScript, người dùng đã build chạy được).
- Nguồn phả hệ: delta chính xác từ `FamilyBloom_Android_R11R4R2R2_FAMILY_GRAPH_FULL_CODE_2026-11-07(1).zip` sang `FamilyBloom_Android_R11R4R2R3_WEB_GRAPH_SYNC_FULL_CODE_2026-11-08(1).zip`, ứng với Web W1R19R2R11 / GRAPH-LINE-01.
- **Không** dùng bản GitHub-R1-derived, không áp lại SAFE PATCH R2 gốc → R3 gốc. Patch mới chỉ áp vào TS STABILIZATION R1, có kiểm tra SHA nguồn.
- Ba file giao nhau giữa bản sửa TypeScript và bản phả hệ (`family-graph.tsx`, `FamilyGraphPersonSheet.tsx`, `FamilyGraphPrototype.tsx`) đã được merge thủ công và kiểm tra các phần thay đổi độc lập. 75 file sửa TypeScript của bản nền vẫn được bảo toàn.

## Chức năng phả hệ được đồng bộ

1. Phân biệt mối quan hệ `married`, `partner`, `separated`, `divorced`, `widowed` từ snapshot đến hiển thị: nhẫn/nét liền cho hôn nhân, tim/nét đứt cho bạn đời; icon nhóm con và điểm chia anh chị em.
2. Nhóm **con chung** khi có hai cạnh cha/mẹ–con được xác nhận. **Con riêng** của một người trong cặp chỉ được nhóm trên hình khi có đúng một nhóm bạn đời đủ điều kiện, với nhãn `Con riêng của ...`. Không tự ghi thêm cạnh cha/mẹ; không gán người không có quan hệ pháp lý/thực tế thành cha/mẹ.
3. Hành lang đường nối tối thiểu 344 canvas units, giảm đè lên node/nhãn; sử dụng chung bộ vẽ trên màn chính và màn Focus.
4. Focus truy về nhiều đời tổ tiên; không kéo thêm các con riêng của bạn đời vào hậu duệ người được Focus nếu không có cạnh cha/mẹ–con.
5. Quản trị viên/người giữ nhà có thể sửa **mỗi mối nối** (subtype của `parent_child`, status của `partner`) qua màn chi tiết riêng, có câu đọc trước + xác nhận. Giữ nút xóa độc lập. Không cho sửa endpoint trong màn này.
6. Chặn tại client nếu lập hôn nhân đang hiệu lực chồng với `married`/`separated` còn hiệu lực; `divorced` không khóa cuộc hôn nhân tiếp theo. Không tuyên bố đây là cơ chế khóa chống ghi đồng thời giữa nhiều admin.

## Phạm vi không thay đổi

- `firestore.rules` là nguồn Rules đang chạy; **không sửa, không deploy** Rules; không thay dữ liệu Firestore, Cloud Functions, Render, Vercel, Web.
- Không sửa `app.json`, `package.json`, `.env.example`, BAT/CMD build, `google-services.json`, signing, package/versionCode. Giữ bản Expo 1.3.35 / Android 143045 để không làm hỏng các gate native hiện hữu.
- Không đưa bổ sung các tính năng chưa đủ hợp đồng dữ liệu/Rules: gốc gia phả chính thức lọc ngoài dòng; duyệt gói đa quan hệ nguyên tử cho thành viên; sửa endpoint hoặc khóa hôn nhân server.

## Kiểm thử bắt buộc trên máy người dùng

```bat
cd /d D:\FB_R2
npm run typecheck > GRAPH_SYNC_TYPECHECK.txt 2>&1
node scripts\tests\features\test-familyGraphWebSyncR11R4R2R3.cjs
node scripts\tests\features\test-familyGraphAndroidSyncAcceptanceR11R4R2R3.cjs
node scripts\tests\features\test-r11r4r2r3-stable-web-sync.cjs
Family_Bloom_BUILD_APK_TO_SHARE.bat
```

**Trước build:** Nếu dùng FULL CODE mới, giải nén vào thư mục mới có đường dẫn ngắn và chép `google-services.json` hợp lệ; `npm install --include=dev` nếu chưa có `node_modules`. Không chép nguyên `src/`/`android/`/`node_modules` của bản cũ. Nếu dùng SAFE PATCH, ba BAT bên ngoài dự án chạy lần lượt CHECK → APPLY, rollback khi cần.

**Điện thoại:** Kiểm tra Nhân–B, Gia B con chung và Gia Linh con riêng B; đường/nút anh chị em, không hiển thị Nhân là cha Gia Linh; Focus Gia Minh, Focus Nhân; sửa quan hệ, toast, vai trò admin/member; xem đủ 4 theme sáng/tối; kiểm tra mở lại app và Chess/Xiangqi/Moments còn chạy.

**Giới hạn QA nội bộ:** Test thuần dữ liệu/cú pháp/gate cấu trúc không thay thế TypeScript toàn ứng dụng, Gradle Release, Firebase Rules thực tế hoặc thử cảm ứng/hiệu năng trên thiết bị.
