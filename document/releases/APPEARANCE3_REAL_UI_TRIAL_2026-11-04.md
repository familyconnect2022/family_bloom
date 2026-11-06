# Family Bloom Android · Appearance 3.0 Real UI · Compiler ON · Thử nghiệm

## Mốc nguồn và phạm vi

- Nguồn: `Family_Bloom_APPEARANCE3_CORE_REACTIVE_COMPILER_ON_TRIAL_FULL_CODE_2026-11-03.zip`, là mốc Dev Core Preview đã được người dùng xác nhận thay theme/font/cỡ chữ và khôi phục từ cache.
- Giữ `app.json` (`reactCompiler: true`), `firestore.rules`, auth flow và server nguyên vẹn về hợp đồng. **Không chỉnh sửa Web**.
- Tích hợp snapshot reactive vào màn hình Android thực, trong `src/app`, các component dùng chung và các panel chức năng hiện có.
- Không dùng `key={theme}` để remount React tree; không ghi Firebase từ render. A/B Lab và Cold Start Lab giữ lại để so sánh.

## Cách thức chuyển đổi

- `src/appearance3/compatReactiveStyles.ts`: bridge đọc `useA3Theme` + `useA3Typography`, materialize style map thuần từ factory cũ theo revision với cache một phiên bản. Compiler nhìn thấy giá trị style mới qua kết quả Hook. Không ghi IO hoặc xuất console.
- Tại các component được chuyển: thay `styles.xyz` thành `__a3_styles.xyz`, đọc màu `COLORS.xyz` thành `__a3Colors.xyz` từ reactive snapshot; các callback memoized nhận dependency tương ứng.
- Bổ sung nhận diện các component `memo(function …)` trước đây dễ bị bỏ sót (đặc biệt Trang chủ, Lịch, Kỷ niệm và Gia phả).
- Trạng thái palette và chế độ của Hero/Tabbar lấy từ snapshot, không gọi global getter trong JSX.
- `ScreenContainer` sử dụng màu mặc định từ snapshot, tránh nền cha bị giữ theme cũ.
- Đổi theme/typography không làm root Auth hay game sockets remount.

## Các ngoại lệ chủ ý (không coi là đã tích hợp xong)

- `components/games/*`: giữ nguyên Full/Mini chess/xiangqi, đồng hồ và network authoritative. Kiểm tra màu chrome riêng trước khi thay.
- `components/onboarding/WelcomeModal.tsx`: lá thư nghệ thuật/khung giấy đã duyệt, không đổi bố cục.
- `features/study/StudyFormula.tsx`: chữ và glyph công thức có sizing riêng (sqrt, matrix, lim); không áp tự động typography.
- `diagnostics/SessionDiagnosticCard.tsx`: card dev chẩn đoán, không chạy bình thường.
- `theme/BloomAppearanceAccountBridge.tsx`: Auth/UID lifecycle, không thêm hook cản gate.
- `src/web/*`: ngoài phạm vi Android.

Các giá trị màu cố định đã được phê duyệt cho lớp phủ ảnh, hero art, game imagery vẫn được giữ theo danh sách tại bài kiểm thử token.

## Kiểm tra trước khi dùng trên điện thoại

1. Trên Windows, cài PATCH bằng BAT có kiểm tra SHA-256. Nếu không khớp phiên bản, dừng (không ép copy).
2. Build Release APK bằng `Family_Bloom_BUILD_APK_TO_SHARE.bat` (không cần Metro), **không xóa dữ liệu** để so sánh Cold Start.
3. Đăng nhập, đổi Garden -> Rose -> Heritage -> Midnight, cả sáng/tối, quan sát: Trang chủ, Cài đặt, avatar/card Hồ sơ, Gia phả, Kỷ niệm, Lịch, Học tập.
4. Đổi font Rounded/Classic và scale 100% -> 160%; kiểm tra nút, Input, Modal không cắt chữ và giữ nội dung.
5. Đóng app hoàn toàn, mở lại 5–10 lần; trong LIVE Lab phải trùng palette/mode/font/scale đã lưu và `source: cache`, `reads:0`, `writes:0` trong lần khôi phục cache hợp lệ.
6. Test nhập liệu đang gõ, modal đang mở, chuyển tab, game đang chạy: không reset state hoặc crash. Trường hợp Release gặp crash, lấy `adb logcat -d -s AndroidRuntime ReactNativeJS`.
7. So sánh hiệu năng thực tế trên cùng máy với bản Core trước; bản mới không được chấp nhận khi FPS/độ trễ xấu đi rõ rệt.

## Cổng phát hành

Bản này là **TRIAL**, chưa được build APK hoặc kiểm chứng runtime trong môi trường tạo mã. Kiểm tra nguồn đạt không chứng minh mọi màn hình đã đúng trên máy thật. React Compiler ON trong cấu hình không thay thế việc xác minh transform bằng build thực tế. Không dùng ZIP này làm bản phát hành ổn định trước khi người dùng xác nhận.

## Câu lệnh kiểm tra

```text
node scripts/tests/release/test-appearance3-real-ui-reactive.cjs
node scripts/tests/release/test-r3r3-appearance-token-inventory.cjs
node scripts/tests/release/test-r3r3d7r2r3r3r1-hook-safety.cjs
node scripts/maintenance/check-project-structure.js
node scripts/setup/check-expo-route-uniqueness.cjs
```
