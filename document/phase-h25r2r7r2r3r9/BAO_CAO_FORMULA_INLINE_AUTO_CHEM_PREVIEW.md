# FAMILY BLOOM H25R2R7R2R3R9 — BÁO CÁO BẢO TRÌ BỘ NHẬP CÔNG THỨC

Ngày: 24/10/2026. Nền: H25R2R7R2R3R8 (FULL CODE nguyên vẹn).

## 1. Vấn đề được báo cáo

Video `9079.mp4`: người dùng muốn nhập ngay `O2` sau khi điền tử/mẫu phân số `1/2`, nhưng giao diện R3R8 yêu cầu chọn “Văn bản/Toán” hoặc “Ký hiệu Hóa”, rồi bấm “Chèn sau phần này”. Trong một số trạng thái soạn dở phương trình Hóa, phần xem trước bị rỗng dù các phần khác vẫn tồn tại.

## 2. Luồng mới trên điện thoại

1. Mở `ƒx Ghép công thức`, chọn **Phân số**.
2. Nhập **Tử số = 1**, **Mẫu số = 2**.
3. Trong cùng thẻ **Sửa phần: Phân số**, gõ **O2** vào ô **Viết thêm sau công thức (tùy chọn)** có viền nét đứt, sắc độ mờ.
4. Xem trước tự cập nhật thành phân số 1/2 đứng trước O₂; bấm **Chèn** ở header để lưu toàn bộ một công thức. KHÔNG cần chọn chế độ Hóa hoặc bấm nút chèn phụ.
5. Mở lại công thức để sửa: nguyên tử O₂ vẫn là chuỗi nguồn `O2` trong chính ô bổ sung, không bị thay thế thành ký tự không thể chỉnh sửa.

## 3. Quy tắc biên dịch / bảo toàn dữ liệu

- Chữ/số không mơ hồ theo quy tắc nguyên tố: `O2`, `H2O`, `CO2`, `Fe2(SO4)3`, `Ca^2+` được phân tích cú pháp Hóa và hiển thị chỉ số/điện tích phù hợp.
- `x + 1`, văn bản thường, hoặc chữ có thể là tên nguyên tố đơn lẻ như `Co` được giữ nguyên, **không tự suy diễn**.
- `02`, `Ca2+` và chuỗi Hóa không chắc chắn giữ nguyên chữ đã nhập, hiện lời cảnh báo trong ô nét đứt; không tự biến `0` thành `O`, không tự đoán điện tích.
- Mã công thức gốc (`TeX`) và `formulaParts`/`formulaFields` được giữ trong cấu trúc lưu hiện có; thêm trường chuỗi tùy chọn `__after` ở phần `fields` của template, không thay đổi collection hoặc Firestore Rules.
- Tính năng tự nhận diện chỉ tải trong trình soạn `ƒx`; không thêm WebView, dependency, listener hoặc tải dữ liệu tại root.

## 4. Lỗi xem trước

Trước đây `compileVisualFormula` của mẫu Hóa có thể ném lỗi khi vế phản ứng chưa nhập xong; `useMemo` catch trả về chuỗi rỗng khiến mọi công thức trong xem trước biến mất. Bản này dùng khối giữ chỗ `□` cho mẫu đang soạn dở, vẫn hiển thị các phần khác. Khi bấm **Chèn**, chế độ kiểm tra nghiêm ngặt tiếp tục từ chối dữ liệu thiếu/sai thay vì lưu giả.

## 5. Tệp mã nguồn thay đổi

- `src/features/study/StudyFormulaEditor.tsx`: giao diện một ô nhập mờ sau mẫu, tự hiện nội dung khi gõ; bỏ lựa chọn hai chế độ và nút chèn phụ.
- `src/features/study/StudyFormulaExpression.ts`: `FORMULA_FOLLOW_FIELD`, `formatFormulaFollow`, biên dịch đầu ra và preview an toàn.
- `scripts/tests/release/test-super-bloom-chemistry-safe-r3r8.cjs`: giữ kiểm tra an toàn Hóa theo trải nghiệm mới.
- `scripts/tests/release/test-super-bloom-inline-chemical-follow-r3r9.cjs`: 11 kiểm tra riêng nguồn/logic và tính tương thích cũ.
- Các gate R3R9 trong `scripts/maintenance/auto-update-full.cjs`, BAT CLEAN APPLY, Build & Share, EAS Build/OTA; kiểm tra dấu nhận diện nguồn ở `resolve-build-target.cjs` và các bài test liên quan.

## 6. Kiểm tra tự động thực thi tại môi trường nguồn

- Cú pháp JS/TS/TSX (tất cả các nhóm `src`, `server/src`, `scripts`, `modules/.../src`): **511 tệp, không lỗi cú pháp**.
- Hóa học R3R8: **16/16 PASS**.
- Bộ ghép công thức: **18/18 PASS**.
- Bộ nhập trực quan: **16/16 PASS**.
- Renderer bài học Toán–Lý–Hóa: **15/15 PASS**.
- Hỏi đáp: **14/14 PASS**.
- Bloom Toast/bàn phím: **15/15 PASS**.
- Firebase recovery: **23/23 PASS**.
- Build routing: **15/15 PASS**.
- `npm run release:check`: **11/11 PASS**.
- Tiền kiểm Auto Update thử trong project giả lập có khoảng trắng, trước backup/overlay: **PASS**, không sửa target.
- Gate mới R3R9: **11/11 PASS** (khi có TypeScript), **4/4 PASS** (khi chưa có TypeScript).

Các kiểm tra nguồn không thay thế việc chạy BAT trên Windows, build Gradle Release hoặc kiểm tra trực tiếp React Native TextInput/preview trên APK Android. Bản này **chưa được xác nhận bằng APK trên thiết bị thật**.

## 7. An toàn cập nhật và cách kiểm thử

- Giải nén FULL CODE vào **thư mục khác** project đang chạy.
- Chạy `scripts/android/Family_Bloom_MENU.bat`, chọn cập nhật. Trình cập nhật sao lưu trước khi ghi đè; bảo vệ `google-services.json`, `.env` và cấu hình Firebase cá nhân.
- Sau khi cập nhật thành công, dùng Build & Share trên đúng project đích.
- Test `1/2` + `O2`; mở lại chỉnh thành `H2O`; xóa hết phần bổ sung; test `√25 + x + 1`; test mẫu phản ứng đang nhập dở; test `02` và `Ca2+` có cảnh báo không chuyển nghĩa.
- Nếu một bài test/gate fail, dừng phát hành. Không chia sẻ lại file APK cũ như APK mới.

Không thay đổi Firestore Rules, Kotlin Native, tài khoản Firebase, Chat/Chess/Xiangqi hoặc dữ liệu đã xuất bản.
