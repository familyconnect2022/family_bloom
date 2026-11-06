# FAMILY BLOOM R3R14R3R8 — SỬA KIỂM THỬ GHI FIRESTORE LỖI
Ngày: 28/10/2026 — Base: R3R14R3R7 FULL CODE từ ZIP do người dùng cung cấp.

## Vì sao trước đó bấm mà không thấy bản ghi lỗi?

Đã xem nguồn: Android `src/app/(internal)/firestore-data-fault-test.tsx` gọi Vercel `POST /api/dev/data-fault`; Vercel `vercel-media/api/dev/data-fault.js` có **ghi Firestore thật** dùng Firebase Admin. Tuy nhiên:

- API mặc định TẮT nếu `FAMILY_BLOOM_DEV_DATA_TEST_ENABLED` không đúng `true`.
- Phải điền đúng UID và familyId test allowlist trong Vercel **Production**, redeploy sau khi đổi biến.
- APK trước đây có thể không có `EXPO_PUBLIC_MOMENT_MEDIA_API_URL`; nút bị vô hiệu hóa, báo lỗi nằm cuối màn hình.
- APK thiếu gợi ý rõ khi nhận HTTP 404, 401, 403, 503 hoặc Vercel trả HTML thay vì JSON.
- API `status` trước đây chưa thử kiểm tra gia đình test tồn tại và chỉ có UID developer.
- Nếu service account dùng Firebase project khác, người dùng tìm nhầm project trên Firebase Console.

Chưa truy cập Vercel Logs / Firebase Console thực tế; vì vậy nguyên nhân vận hành cụ thể vẫn phải kiểm tra trên thiết bị và project thật.

## Thay đổi ở bản này

1. Android: URL Vercel media được dùng ở màn diagnostic, có fallback công khai tới `https://familybloom-vercel-media.vercel.app` nếu thiếu EXPO_PUBLIC trong APK. Fallback **CHỈ ÁP DỤNG MÀN DIAGNOSTIC**, không thay đổi việc upload Moment.
2. Màn diagnostic báo rõ URL API, lý do từ chối theo HTTP, và nút `Kiểm tra Vercel + quyền ghi Firebase` ở đầu màn hình; hiển thị Firebase project ID + family test ID do backend đã xác thực trả về.
3. Khi bấm tạo, Android chỉ thông báo thành công khi API trả `verified: true` cùng đường dẫn đã được Firestore đọc lại. Đường dẫn xóa được tự sao chép trước khi gửi request, đề phòng app crash ngay.
4. Backend: kiểm tra `testFamily` và membership chỉ một UID trong cả `status` lẫn `create`.
5. Backend: sau transaction tạo, thực hiện read-back tài liệu xác nhận marker `FB_DIAG_DELETE_MANUALLY` trước khi trả HTTP 201 thành công.
6. `.env.example` và `eas.json` đã có URL công khai để build EAS profile `family-bloom-test` lấy đúng endpoint. Bản build local vẫn cần `.env` hoặc fallback trong màn diagnostic.
7. Đưa lại 4 shortcut BAT ở thư mục gốc (Auto Update, Build & Share, EAS Build, EAS OTA) gọi tới script chuẩn ở `scripts/android/`.
8. Thêm offline runtime test cho endpoint và kết nối gate Auto Update / Clean Apply. KHÔNG sửa mã `src/web`, Firebase Rules, Render, Chess/Xiangqi, native app version.

## 1. Deploy API Vercel Media qua GitHub repo Render hiện tại

- Giữ nguyên repo GitHub và Render. Chỉ cập nhật toàn bộ thư mục `vercel-media` vào repo (chính đường dẫn `vercel-media/api/dev/data-fault.js` phải nằm trên **nhánh production** và Vercel Root Directory phải trỏ đúng `vercel-media`).
- Mở Vercel Dashboard → project `familybloom-vercel-media` → `Settings > Build and Deployment` → Root Directory = `vercel-media` → Framework = Other (API Node JS thuần).
- `Settings > Environment Variables > Production`: giữ FIREBASE_SERVICE_ACCOUNT_JSON, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CRON_SECRET. **Chỉ bật các biến sau trong lúc kiểm thử**:

```dotenv
FAMILY_BLOOM_DEV_DATA_TEST_ENABLED=true
FAMILY_BLOOM_DEV_TEST_UID=<firebase-auth-uid-cua-huynh235>
FAMILY_BLOOM_DEV_TEST_FAMILY_ID=<id-gia-dinh-test-rieng-mot-nguoi>
```

- `FAMILY_BLOOM_DEV_TEST_UID` là Firebase Auth **UID**, không phải email. Email thực phải là `huynh235@gmail.com` với `emailVerified=true`.
- `FAMILY_BLOOM_DEV_TEST_FAMILY_ID` phải là **document ID gia đình thử nghiệm** trong cùng Firebase project, không phải tên hiển thị. Gia đình chỉ có developer, developer là owner/admin và membership phải khớp.
- `FIREBASE_SERVICE_ACCOUNT_JSON` phải thuộc **đúng Firebase project** mà bạn đang xem Firestore. Đừng sao chép khóa vào mã nguồn, ZIP, `.env` Android hay git.
- Sau khi đổi env và cập nhật code vào GitHub, Vercel **Redeploy Production** và xem Logs.
- Nếu chỉ cập nhật APK mà chưa deploy API mới, server cũ sẽ không trả `ready / firebaseProjectId / verified`, ứng dụng sẽ báo chưa được xác nhận — cần deploy cả 2.

## 2. Build APK mới

- Không thay đổi package/versionCode Android: `com.familybloom.android`, `1.3.33 / 143043` (giữ native identity).
- Giải nén FULL ZIP → dùng `Family_Bloom_AUTO_UPDATE_FULL.bat` nếu cập nhật dự án hiện tại; sau đó dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat` để build local hoặc `Family_Bloom_EAS_BUILD_TEST.bat` để build cloud.
- `.env` tại root project khi build local nên có:

```dotenv
EXPO_PUBLIC_MOMENT_MEDIA_API_URL=https://familybloom-vercel-media.vercel.app
```

- EAS `family-bloom-test` trong ZIP đã có `build.family-bloom-test.env.EXPO_PUBLIC_MOMENT_MEDIA_API_URL` là URL công khai. Nếu cấu hình EAS env trên cloud khác, phải kiểm tra bundle sau build.
- Cần cài **APK mới** (hoặc OTA phù hợp) để nhận UI/logic mới.

## 3. Kiểm tra trên Android

1. Đăng nhập đúng tài khoản developer Firebase có email đã xác minh; chọn gia đình test chỉ một UID.
2. Cài đặt → Kiểm thử & chẩn đoán → Thử dữ liệu Firestore sai cấu trúc.
3. Bấm `Kiểm tra Vercel + quyền ghi Firebase`. Nếu báo HTTP 404: chưa deploy endpoint hoặc sai Root Directory; 403 disabled: bật biến; 503: thiếu allowlist/service config; wrong family: chọn đúng gia đình; 401: Auth token; 500: xem Runtime Logs và service account.
4. Khi báo API sẵn sàng, xem **Firebase project nhận ghi** và **Family ID được phép** trên màn hình. Mở Firebase Console đúng project ID đó.
5. Chọn case và bấm `Ghi dữ liệu lỗi vào Firebase`, xác nhận. Nếu thành công sẽ có dòng **ĐÃ GHI + ĐỌC LẠI TRÊN FIRESTORE** kèm đường dẫn document chính xác.
6. Vào Firebase Console → Firestore Database → Data → theo đúng đường dẫn `users/{UID}/memberships/...` hoặc `families/{familyId}/(members|joinRequests|events|moments)/FB_DIAG_...`.
7. **Chỉ xóa document lỗi đó bằng tay** trước khi tạo ca khác. Không xóa cả collection, gia đình hay membership thật. Tắt tính năng trên Vercel sau khi xong: `FAMILY_BLOOM_DEV_DATA_TEST_ENABLED=false` + redeploy.

## 4. Kết quả kiểm thử offline (không thay thế test Firebase thật)

- Gate cũ R3R14R3R6: 11/11 fixture + 16/16 assertions PASS.
- Gate mới R3R14R3R8: disabled/no-write, wrong UID/no-write, multi-member/no-write, wrong family/no-write, status/projectID, create + readback, one-active-lock, manual-delete-then-new-test, Android UI diagnostics PASS (7 nhóm test).
- Syntactic `node --check` API/auto-update PASS; TypeScript TSX transpilation PASS.
- **Không** deploy GitHub/Vercel từ môi trường này và **không** chạy Android Gradle/Windows APK/Firebase production thật. Không tuyên bố đã ghi dữ liệu trên Firebase của bạn.

## Ghi nhớ kiến trúc

- Vercel Media xử lý Moment + API test dữ liệu Firestore (chỉ developer).
- Render chỉ Chess/Xiangqi.
- Web Family Bloom chưa triển khai: **giữ nguyên**, không sửa `src/web/`.
- Các credential chỉ nằm trên dịch vụ server (Vercel), KHÔNG nằm trong APK hoặc ZIP.
