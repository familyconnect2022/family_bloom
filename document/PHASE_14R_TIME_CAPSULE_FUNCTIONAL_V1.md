# PHASE 14R — HỘP THỜI GIAN FUNCTIONAL V1

Date: 2026-10-01
Base: Phase 14Q V2.2 BUILD-READY CLEAN-ROOT
Status: IMPLEMENTED / AWAITING FIRESTORE RULES DEPLOY + REAL ANDROID DEVICE TEST

## 1. Contract đã được user chốt

Hộp thời gian dùng membership user thật của gia đình, không dùng Person trong phả hệ.

Firestore:

```text
families/{familyId}/homeTimeCapsules/{capsuleId}
  id
  familyId
  createdByUid
  createdByName
  audience: family | selected
  recipientUids[]
  previewMode: hidden | locked
  openAt: Timestamp
  revealTheme: warm | formal | festive
  createdAt
  updatedAt

families/{familyId}/homeTimeCapsules/{capsuleId}/content/main
  title
  message

families/{familyId}/homeTimeCapsules/{capsuleId}/opens/{uid}
  uid
  openedAt
```

Không migration/backfill dữ liệu cũ. Theme không có/không hợp lệ khi normalize client sẽ fallback `warm`.

## 2. Bảo mật nội dung

Metadata và nội dung được tách document. Recipient chỉ được Rules đọc `content/main` khi `request.time >= openAt`. Creator được đọc nội dung của hộp mình tạo.

Create metadata yêu cầu `content/main` tồn tại trong cùng atomic write batch bằng `existsAfter(...)`, tránh tạo metadata rỗng ngoài flow chuẩn.

Creator chỉ được sửa/xóa trước `openAt`. Sau thời điểm mở, metadata/content trở thành bất biến với creator. Recipient chỉ được ghi receipt `opens/{ownUid}` của chính mình sau `openAt`.

## 3. Audience

- `selected`: chọn một hoặc nhiều family membership users thật.
- `family`: snapshot membership hiện tại lúc gửi.
- Creator luôn bị loại khỏi `recipientUids`.
- Client/rules cho tối đa 500 recipient UID để không tự tạo bottleneck ở family lớn.

## 4. Chế độ trước ngày mở

### hidden — Ẩn hoàn toàn

Recipient không thấy card trong danh sách trước giờ mở. Nếu một route nội bộ/direct link bị mở trước giờ, UI cũng không hé lộ sender, theme, title/message hoặc thời điểm mở.

Metadata vẫn có thể được client đọc nội bộ để local notification được schedule đúng `openAt`; đây không phải cryptographic metadata hiding.

### locked — Báo trước

Recipient thấy có một Hộp thời gian đang chờ và thời điểm mở, nhưng không fetch/read title/message trước giờ.

## 5. Reveal themes

Ba theme user đã chốt:

- `warm` — Ấm áp: hồng/kem/vàng, petal, soft motion.
- `formal` — Trang trọng: xanh dương/bạc, particle tiết chế, motion chắc, không letter overshoot.
- `festive` — Rộn ràng: vàng bơ + hồng, confetti/sparkle, pop vui hơn.

Core reveal contract được giữ nguyên: box mở trước, sau đó letter mới xuất hiện phía trước với scale 0→1 và opacity 0→1. Letter layer luôn ở trên box layer.

Accessibility Reduce Motion: rút timeline còn ~700ms, bỏ decorative particles và bỏ nhịp haptic thứ hai; nội dung/permission/theme vẫn giữ nguyên.

## 6. First open / replay

- Recipient chưa có `opens/{uid}` và đã tới `openAt`: chạy full ceremony.
- Khi ceremony hoàn tất, app ghi `opens/{uid}` với server timestamp.
- Lần vào sau: đọc nhanh card/nội dung, có nút `Xem lại hiệu ứng`.
- Nếu user thoát ceremony trước khi hoàn tất thì receipt chưa được ghi; lần sau ceremony vẫn chạy lại.

## 7. Local notification

Dùng pipeline `expo-notifications` local-first hiện có. Capsule recipient được schedule một notification chính xác tại `openAt` với deep-link tới `/home-time-capsule/{capsuleId}`.

Time Capsule không bị giới hạn bởi horizon Event 30 ngày: nếu thiết bị đã sync metadata, hộp có thể ngủ nhiều tháng/năm mà notification vẫn được schedule tại đúng thời điểm.

Giới hạn local-first quan trọng: thiết bị recipient phải từng mở/resume app sau khi capsule được tạo để metadata tới thiết bị và schedule local notification. Không có Cloud Function/remote push mới trong Phase 14R.

## 8. Build/APK fixes đi kèm

- Không còn dùng `expo run:android --output` (Expo CLI không hỗ trợ option đó).
- Release build dùng Expo prebuild + Gradle `:app:assembleRelease`.
- APK xuất ra `dist/android/Family_Bloom_Release_Test_LATEST.apk`.
- Có APK-only BAT, không cần USB phone.
- BAT kiểm tra cả `expo-notifications`, `expo-application` và RNFirebase native package.
- Nếu `package-lock.json` inherited bị cũ, BAT tự fallback `npm install --no-audit --no-fund` để đồng bộ lock + node_modules rồi tiếp tục build, thay vì dừng ở `npm ci`.
- Có helper `scripts/setup/Family_Bloom_Sync_Dependencies.bat` nếu muốn sync thủ công trước.

## 9. Root-clean standard

Giữ root sạch: BAT ở `scripts/`, reports ở `reports/`, docs ở `document/`. Không đưa PATCH_INFO/checklist/build helpers trở lại root.

## 10. Deploy cần thiết

Phase 14R có Rules mới nên trước device test multi-account phải deploy:

```text
scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat
```

Không cần deploy Functions. Không có composite index mới cho Time Capsule V1.

## 11. Device gate

Chưa tuyên bố Phase 14R runtime PASS cho tới khi user test Android thật các case trong `reports/device/PHASE_14R_TIME_CAPSULE_DEVICE_CHECKLIST.txt`.
