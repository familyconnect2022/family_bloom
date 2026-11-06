# Family_Bloom — Android FULL CODE độc lập (A1)

Mốc: R3R14R3R8 ngày 28/10/2026. Đã **tách** `server/` sang gói `Render_chess_xiangqi` và `vercel-media/` sang gói `Vercel_media`. Android không còn chứa hai backend. Không phát hành Gunny/Music server (chỉ là ví dụ). **Không có thư mục `xxx` theo đúng tên trong source gốc**.

## 1. Quản lý trên máy tính

Khuyến nghị ba thư mục ngang hàng:

```text
C:/FamilyBloomProjects/
  Family_Bloom/              (Android)
  Render_chess_xiangqi/      (Node Render)
  Vercel_media/              (API Vercel)
```

**KHÔNG** giải nén backend ZIP vào bên trong Android. Các file mã nguồn của ứng dụng không thay đổi logic Chess/Xiangqi và Moment. `functions/` và Firestore Rules là Firebase infrastructure cần cho Family Bloom nên giữ lại; `src/web/` và `public/` cũ giữ nguyên vì Web chưa nằm trong phạm vi sửa lần này.

`script/music` là dữ liệu và công cụ cho tính năng Music **bên trong ứng dụng Android**, không phải Vercel Music Server, nên vẫn giữ. Không xóa thư mục chỉ vì tên `music`.

## 2. GitHub repository riêng

Tạo repo `family-bloom-android` tại https://github.com/new. Giải nén ZIP tại thư mục app Android, rồi từ PowerShell:

```powershell
git init
git branch -M main
git add .
git commit -m "Family Bloom Android separated A1"
git remote add origin https://github.com/<USERNAME>/family-bloom-android.git
git push -u origin main
```

Nếu repo đã tồn tại thì dùng GitHub Desktop để xem thay đổi và commit. `.gitignore` bảo vệ `.env`, `google-services.json`, `node_modules`, output build. **Không upload service accounts/private keys**. Firebase client config có thể cần trên PC/EAS nhưng không commit vào Git.

## 3. Build APK Android

- Cài Node.js, Android SDK/JDK nếu build local. Chạy `npm install` khi cài mới, hoặc dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat` theo cấu hình cũ.
- `Family_Bloom_AUTO_UPDATE_FULL.bat` vẫn có đường dẫn project cũ, backup và CLEAN APPLY. Trong lần cập nhật từ bản gộp, nó **di chuyển** các thư mục `server/` và `vercel-media/` cũ sang thư mục riêng NGANG HÀNG đặt tên `Render_chess_xiangqi_LEGACY*`, `Vercel_media_LEGACY*` sau khi hoàn thành backup, không xóa. Sau khi đối chiếu ZIP S1/M1, hãy kiểm tra hai thư mục legacy này trước khi tự dọn.
- Nếu bạn muốn cách sạch nhất, có thể dùng Android ZIP như dự án mới rồi chép lại `.env`/`google-services.json` trên PC an toàn.
- EAS OTA chỉ cập nhật JS/assets, không thay được mã native; Build & Share APK cần chạy lại khi native code thay đổi.

## 4. Runtime kết nối backend qua URL

- Render `EXPO_PUBLIC_CHESS_SOCKET_URL=https://<render-host>.onrender.com`.
- Media `EXPO_PUBLIC_MOMENT_MEDIA_API_URL=https://<vercel-host>.vercel.app`.
- Cấu hình biến PUBLIC trong `.env` Android khi build local; với EAS Build cần kiểm tra biến tương ứng trong `eas.json` hoặc EAS Environment. **Không** đưa Firebase Admin/Cloudinary Secret vào app.
- Giữ URL cũ nếu chỉ thay GitHub repository cho service Render/Vercel; nếu tạo service mới/URL mới, phải đổi app config và build APK mới.

## 5. Những gì chưa test

Chưa build APK Gradle Windows, chưa deploy server production, chưa chạy kiểm thử hai repo cùng nhau; những bài kiểm tra lịch sử cần server hoặc Media bên cạnh sẽ hiển thị rõ `SKIP-CROSS-REPO`, không tự xem là đã PASS. Kiểm tra Render riêng bằng `npm run build`, Vercel riêng bằng `npm run verify` và kiểm thử tích hợp thực tế sau triển khai.
