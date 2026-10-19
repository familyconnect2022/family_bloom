# Family Bloom — H21R6 Render TS2322 hotfix (19/10/2026)

## Sự cố

Render `family-bloom-chess` chạy `npm run build` / `tsc -p tsconfig.json` rồi thất bại với:

`src/chess/chessGameManager.ts(638,7): error TS2322: Type '"board" | "colors" | "play"' is not assignable to type '"board" | "colors"'.`

## Nguyên nhân & sửa chữa

- Kiểu lưu Firestore `PersistedGame.preparationPhase` chỉ có hai giai đoạn `board`/`colors` (trạng thái `waiting`).
- Kiểu public `PublicGameState.preparationPhase` có thêm `play` sau khi game hoạt động.
- `PublicGameState` trước đây `Omit<PersistedGame,...>` nhưng KHÔNG loại trừ `preparationPhase`, tạo intersection làm hẹp kiểu trở lại `board | colors`.
- H21R6 thêm `"preparationPhase"` vào `Omit` của `PublicGameState` và giữ khai báo public tường minh. **Không nới kiểu dữ liệu lưu trữ, không ép kiểu `any`, không đổi hành vi runtime hay luật cờ.**

## Chặn build lỗi

- `server/package.json`: lệnh Render `npm run build` chạy `npm run typecheck` trước khi emit.
- `scripts/android/maintenance/Family_Bloom_VERIFY_SERVER_TYPES.bat`: tự cài dependency server nếu thiếu, chạy `npm run typecheck` và trả về mã lỗi khác 0 khi có vấn đề.
- `Family_Bloom_CLEAN_APPLY_FULL.bat`: server TypeScript không còn non-blocking.
- `Family_Bloom_BUILD_APK_TO_SHARE.bat` qua batch release nội bộ, và lệnh release APK trực tiếp, đều kiểm tra kiểu server trước build Android. App TypeScript legacy warnings vẫn tách riêng.
- Các file BAT được lưu bằng CRLF chuẩn Windows.

## Bài kiểm tra đã chạy trong môi trường này

- H21 invite/away server: **32/32 PASS**.
- H21R1 audio packaging: **6/6 PASS**.
- H21R3 AAPT2 audio/resource names: **9/9 PASS**.
- H21R4 readiness/build-share integrity: **12/12 PASS**.
- H21R5 cold recovery/server expiry: **14/14 PASS**.
- H21R6 TypeScript semantic contract + mandatory build gates: **7/7 PASS**. Bài test chủ động chứng minh kiểu cũ gây TS2322 và kiểu mới chấp nhận `play`.
- H14R1 build BAT audit: **11/11 PASS**.

**Giới hạn kiểm thử:** môi trường này không truy cập npm registry (`EAI_AGAIN`), vì vậy không cài được các dependency server để chạy `npm run typecheck`/`npm run build` end-to-end, cũng không có Windows/Android SDK để biên dịch APK Release. Các PASS ở trên là các kiểm tra mã nguồn/hành vi cô lập, **KHÔNG PHẢI** xác nhận Render đã deploy hay APK đã tạo thực tế.

## Cách khắc phục Render

1. Giải nén bản H21R6 FULL CODE, ghi đè đúng dự án GitHub đang cấu hình trên Render. Có thể chỉ commit các file server được sửa nếu bạn chưa muốn build APK mới.
2. Trong thư mục `server/` chạy `npm install --include=dev` rồi `npm run build`; phải kết thúc exit code 0.
3. Commit và push nhánh Render theo dõi (ảnh lỗi là `main`); kiểm tra Render dashboard bản Deploy mới có trạng thái `Live`.
4. Kiểm tra `node scripts/setup/check-render-chess-protocol.cjs --strict` từ root. Fingerprint vẫn là `h21r5-durable-preparation-recovery` vì hotfix H21R6 chỉ sửa kiểu TS, không đổi runtime protocol.
5. Chỉ sau khi Render Live, kiểm tra lại Chess mời Bloom Bot, đếm ngược chuẩn bị, khôi phục từ Firestore.

## Kiểm tra Build & Share

- Chạy `Family_Bloom_CLEAN_APPLY_FULL.bat`, rồi `Family_Bloom_BUILD_APK_TO_SHARE.bat` trên Windows.
- Khi TypeScript server lỗi, build dừng thay vì in `[WARN] ... continues`.
- Build & Share vẫn giữ kiểm tra AAPT2, audio, native proof, SHA256 sao chép APK. Không sử dụng lại file LATEST.apk cũ khi build mới thất bại.
