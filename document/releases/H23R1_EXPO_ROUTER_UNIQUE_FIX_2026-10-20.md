# Family Bloom H23R1 — Expo Router duplicate screen hotfix

Ngày: 2026-10-20. Nguồn nền: H23 FULL CODE (Android 1.3.28 / versionCode 143038).

## Lỗi người dùng gặp

Lỗi Metro: `Screen names must be unique` trỏ tới `src/app/_layout.tsx:163`. Ở bản H23, root `<Stack>` có 2 dòng `home-chess` và 2 dòng `home-xiangqi` trong cùng một Stack. React Navigation chặn render RootNavigator ngay khi Metro tải JS. Đây không phải lỗi Gradle, Firestore, chess server hay APK native.

## Sửa đổi

- Xóa **chỉ** cặp `<Stack.Screen>` bị lặp trong `src/app/_layout.tsx`. Vẫn giữ một route Chess và một route Xiangqi; không thay đổi trang quản lý sảnh hoặc logic realtime.
- Thêm `scripts/setup/check-expo-route-uniqueness.cjs`: quét mọi `_layout.tsx|js` thuộc `src/app`, kiểm tra các tên `Stack.Screen`/`Tabs.Screen`/`Drawer.Screen` trùng trong *cùng* file và báo chính xác tên, vị trí dòng. Không yêu cầu node_modules.
- Thêm `scripts/test-h23r1-expo-router-unique.cjs` với ca kiểm thử âm tính: tạo route trùng sẽ phải fail; sửa route phải pass.
- Chặn lỗi từ trước khi build/launch trong Clean Apply, Build & Share, EAS, Debug BAT và Metro BAT; npm `start`/`android` cũng được kiểm tra qua `prestart`/`preandroid`.
- H23 Family Arena check và EAS post-install gọi route gate tự động.

## Kiểm tra đã chạy trong môi trường tạo source

- Expo Router H23R1 regression: **19/19 PASS**.
- H23 family game hubs: PASS.
- Source structure: **19/19 PASS**.
- Auto Update: **21/21 PASS**.
- Build & Share Windows preflight: **7/7 PASS**.
- Chess PNG/H22R9 gate: PASS; H22R7 modals: **20/20 PASS**; H22R8 Xiangqi UX: **16/16 PASS**; H22 Xiangqi parity: **32/32 PASS**; H21R4 ready: **12/12 PASS**; FULL source integrity: **31/31 PASS**.

Không chạy Gradle trên Windows, Android Studio, Metro, hoặc thử nghiệm điện thoại thật trong môi trường đóng gói. Gate tĩnh mới phát hiện lỗi khai báo route trùng, không thay thế smoke test điều hướng runtime.

## Cài đặt

1. Đóng Metro/CMD đang chạy; giải nén FULL H23R1 vào thư mục **khác** dự án đang dùng.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, trỏ tới thư mục cũ; chờ PASS.
3. Trong dự án đã cập nhật, chạy `npm run route:check` (mong đợi PASS), sau đó `npx expo start -c --dev-client` nếu tiếp tục sử dụng Debug app cài sẵn. Chạy lại BAT Android Debug nếu muốn build/cài lại.
4. Chỉ dùng `Family_Bloom_BUILD_APK_TO_SHARE.bat` nếu muốn có APK độc lập mới; native versionCode vẫn giữ 143038 (mã sửa chỉ JavaScript). Không cần deploy Render.
