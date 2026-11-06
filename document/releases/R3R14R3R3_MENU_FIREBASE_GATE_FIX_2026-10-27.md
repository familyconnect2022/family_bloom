# Family Bloom R3R14R3R3 — Menu tong & gate Spark-safe (27/10/2026)

- `scripts/android/Family_Bloom_MENU.bat` la diem vao Windows duy nhat de chon tuan tu 1-9, A-N, 0.
- `[1]` cap nhat FULL ZIP co backup -> gate -> copy -> verify -> CLEAN APPLY.
- `[2]` build APK Release; `[3]` Android debug qua USB; `[4]` iOS chi thong bao tren Windows; `[5]` web Expo.
- `[A]` chi kiem tra Firebase Android, **KHONG deploy**. `[B]` Rules, `[C]` Indexes, `[D]` ca hai deu **deploy len Firestore that**. Kiem tra dung Firebase project truoc khi su dung.
- `[E]` Blaze setup co nhap `DEPLOY` va chi nen dung sau khi nang cap, ve mat canh bao chi phi.
- Gate Phase 13 da doi chieu runtime Cloud Functions. Gia tri mac dinh trong `cloudRuntimeState.ts` va `cloudFeatureService.ts` la OFF; cap quyen bat phai duoc backend xac minh.
- Xoa 3 BAT khong con chuc nang rieng: `Android_Test_App_CLEAN_RELEASE`, `Android_Build_APK_ONLY` (delegating wrappers), `setup/settup.bat` (retired). Auto updater xoa chung tren project dich **sau backup**.
- Cac BAT trung ten lich su con lai la wrappers/entrypoints can thiet cho bai test va Build Share cu; khong xoa ma khong doi routing va gate.
- Kiem tra: `node scripts/tests/release/test-r3r14r3r3-menu-gates.cjs`; `node scripts/tests/history/test-phase13-release-readiness.js`; `npm run release:check`.
- Chua xac nhan Windows CMD, Gradle/APK, Firebase deploy, Vercel deploy tren may that.
