# Kiến trúc Family Bloom — bản đọc hiểu

## Công nghệ, vai trò

| Phần | Công nghệ | Vai trò | Vị trí |
|---|---|---|---|
| Ứng dụng điện thoại | React Native, Expo Router, TypeScript | UI, điều hướng, giao tiếp hệ thống | `src/`, `app.json`, `app.config.js` |
| Hệ thống đăng nhập, cơ sở dữ liệu | RNFirebase Auth, Firestore | UID, thành viên, dữ liệu chung gia đình | `src/context`, `src/services/firebase`, `firestore.rules` |
| Tệp media | Cloudinary / Expo image | Ảnh, video, thumbnail | `src/services/media/` |
| Server chơi cờ | Node.js, Socket.IO, Firebase Admin | Xác thực, luật, clock, kết quả (server authoritative) | `server/src/` |
| Luật cờ, render Native | TypeScript và Android Kotlin | Cờ vua và cờ tướng độc lập, bề mặt Full/Mini | `src/services/games/`, `modules/family-bloom-overlay/` |
| Build/phát hành | Expo, Gradle, EAS, BAT | Build APK và chia sẻ, OTA | `scripts/android/`, root BAT |
| Web phụ | React Native Web / Vercel | Bản web thử nghiệm, không ưu tiên | `src/web/`, `.web.tsx`, `vercel.json` |

## Sơ đồ luồng tổng quát

```text
Android app (Expo Router)
  ├─ Tab Home / Kỷ niệm / Lịch / Cây nhà / Nhà Mình
  │   └─ Các repository, cache, store theo từng feature
  ├─ Auth / activeFamilyId ── RNFirebase ── Firestore (Rules)
  ├─ Super Bloom học tập
  │   ├─ Bài học công bố từ Content Studio
  │   └─ Hỏi đáp ── StudyRepository ── Firestore; ảnh ── Cloudinary
  └─ Game Hub
      ├─ Chess controller ── Native Chess ── Socket ── Chess server
      └─ Xiangqi controller ── Native Xiangqi ── Socket ── Xiangqi server
```

## Nguyên tắc hiệu năng phải giữ

1. **Không thêm listener ở app root** chỉ để dùng một feature. Root giữ identity, activeFamilyId và tín hiệu tối thiểu.
2. Tab không hiển thị phải ngừng việc nặng; state cần thiết được giữ trong cache theo vòng đời ACTIVE / WARM / SUSPENDED (tên runtime được định nghĩa tại `src/context/TabRuntimeContext.tsx`).
3. Home là giao diện tổng hợp, tránh tự nhân đôi Firestore fetch cho mỗi card.
4. Phả hệ dùng store/scene đã chuẩn hóa; phân biệt Focus với tree chính; không gắn chung host/camera.
5. Chess và Xiangqi **không dùng chung game state/renderer/lifecycle**. Hai server manager độc lập. Khóa phiên chung chỉ dùng để không cho 1 UID mở hai game song song.
6. Đồng hồ, luật, kết quả cờ do server xác nhận. Không ghi Firestore mỗi giây; dùng thời điểm gốc để tính local UI.
7. Bộ soạn công thức chỉ tải khi bấm ƒx; chỉ render danh sách câu hỏi theo trang, không dựng WebView mỗi card.
8. Ẩn Bảng tin Nhà Mình bằng feature flag; không xóa mã/dữ liệu. Không bật Cloud Functions trên Spark.

## Bản đồ thư mục dự án

- **`src/app`**: file route theo Expo Router. `src/app/(tabs)` là năm tab; `(home)/(learning)` là Super Bloom; `(home)/(games)` là hai game.
- **`src/components`**: components UI, đặc biệt `ui/`, `moments/`, `familyGraph/`, `system/`.
- **`src/features`**: feature mới có logic UI cục bộ; `study` cho hỏi đáp/công thức, `learning` cho kho bài học.
- **`src/services`**: nghiệp vụ; `firebase`, `familyGraph`, `games`, `bootstrap`, `calendar`, `media`, `performance`, `presentation`.
- **`src/context`, `src/hooks`, `src/types`**: context chung, hooks, khai báo type.
- **`server/src`**: socket và luật server, có `chess`, `xiangqi`, `games`, `security`, `firebase`.
- **`modules/family-bloom-overlay`**: UI Native Android Full/Mini; cần build APK mới nếu đổi Kotlin.
- **`scripts/android`**: `build`, `dev`, `maintenance`, `eas`, `install`, `verify`.
- **`scripts/setup`**: các điều kiện build, chuẩn hóa dependencies, kiểm tra native identity.
- **`scripts/test-*`**: các bài hồi quy theo phiên bản; **đường dẫn lịch sử được giữ ổn định**.
- **`scripts/firebase`**: triển khai Firestore Rules/Indexes và các lệnh Firebase (chỉ chạy khi cần).
- **`document/`**: toàn bộ Markdown/TXT; thư mục release/phase, hướng dẫn và báo cáo.

## Không được tự ý đổi

- `applicationId: com.familybloom.android`, scheme, Firebase client, UID phân quyền dev; không tự tăng versionCode trừ khi build Native mới.
- Giao thức Socket/Firestore checkpoint của hai trò; thời gian chờ và lock theo server.
- Trình tự Auto Update: check → backup → cleanup → overlay → verify → CLEAN APPLY → remember.
- Cấu trúc Firestore được quy định bởi `firestore.rules`, `src/services/firebase/firestorePaths.ts` và các repository.
