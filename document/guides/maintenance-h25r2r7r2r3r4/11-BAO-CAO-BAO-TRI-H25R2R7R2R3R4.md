# BÁO CÁO BẢO TRÌ FAMILY BLOOM H25R2R7R2R3R4

**Nền:** H25R2R7R2R3R3 — Công thức ghép; Android `1.3.32`, versionCode `143042`.
**Mục đích:** khắc phục thao tác Build & Share khi project không có `google-services.json`, chuẩn hóa hướng dẫn BAT/script và tạo tài liệu kỹ thuật tiếng Việt để sửa lâu dài. Không chỉnh logic gameplay, scene Phả hệ hay màn Super Bloom.

## I. Chẩn đoán từ ảnh người dùng

- Người dùng xác nhận `Family_bloom_V2` **đã có** `google-services.json` và Auto Update thành công. Ảnh log chỉ chứng minh BAT đã không thấy file trong **đường dẫn target mà nó thực sự kiểm tra**; chưa đủ chứng minh file vắng mặt trong thư mục mà người dùng đang mở. Có thể đường dẫn `last-target.txt` bị lệch, vị trí JSON khác root, hoặc cấu hình bị từ chối vì không khớp. Lệnh mới bắt buộc in rõ cả đường dẫn đang kiểm tra và cho chọn lại target.
- FULL CODE không và không nên chứa file Firebase Android riêng của chủ dự án.
- BAT Build & Share trước đây chỉ dừng và yêu cầu phục hồi thủ công. Hướng đi đúng là **nhận diện trước, xác minh nguồn, cho chọn file hợp lệ, hỏi trước khi chép, không tự ghi đè**.

## II. Phần mã đã thay đổi

1. `Family_Bloom_BUILD_APK_TO_SHARE.bat`: ưu tiên JSON hợp lệ tại thư mục BAT đang chạy; nếu chạy từ FULL ZIP thì in rõ đường dẫn lưu từ Auto Update và đường dẫn JSON đang kiểm tra. Nếu sai/mất cấu hình, cho **chọn lại project đã update trước**, hoặc tự nguyện phục hồi từ nguồn hợp lệ; tránh báo thiếu chung chung. Không ghi đè file đã tồn tại.
2. `scripts/android/build/firebase-android-config.cjs` (mới): các lệnh `check`, `diagnose`, `candidate`, `restore`. Xác nhận project đúng `family-bloom`, Android app `com.familybloom.android`, Firebase ID `family-connect-4184f`; không overwrite, không tạo JSON giả, không in nội dung riêng.
3. `scripts/android/build/Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat` (mới): workflow hỗ trợ Windows, gợi ý bản copy trong `android/app` hoặc backup hợp lệ, hỏi xác nhận sao chép.
4. `scripts/android/build/Select-GoogleServicesFile.ps1` (mới): hộp thoại Windows để người dùng chọn file, fallback nhập path.
5. `scripts/android/build/resolve-build-target.cjs`: thêm `redirect-source` để kiểm tra đồng nhất FULL source mà chưa cần cấu hình Firebase; `redirect` vẫn yêu cầu file hợp lệ và **in thư mục đang build/đường dẫn JSON khi lỗi**.
6. Hai BAT build trong `scripts/android/build/`: kiểm tra cấu hình ngay trước khi chạy các bài test nặng/Gradle.
7. `scripts/maintenance/auto-update-full.cjs`: bổ sung kiểm thử Firebase recovery trong preflight **trước backup/cleanup/overlay**.
8. `scripts/setup/bat-entrypoints-manifest.json`: đăng ký BAT mới, kiểm CRLF và file tham chiếu.
9. `.gitignore`: bỏ qua root `google-services.json` tránh commit nhầm; `.easignore` vẫn do EAS kiểm soát riêng.
10. `package.json`: lệnh `npm run maintenance:map`, `npm run maintenance:verify`, `npm run firebase:android:diagnose`.
11. `scripts/maintenance/generate-vietnamese-code-map.cjs`: sinh tự động 3 bảng tra cứu từ source, không sửa logic chạy app.
12. `scripts/tests/release/test-h25r2r7r2r3r4-firebase-recovery.cjs`: test an toàn không cần Firebase thật.

## III. Cấu trúc + tài liệu tiếng Việt

Tất cả tài liệu mới ở `document/guides/maintenance-h25r2r7r2r3r4/`:

- `00-BAT-DAU-TIEN.md`: lộ trình từ giải nén đến APK.
- `01-KIEN-TRUC.md`: hệ thống, phân lớp, hiệu năng và thư mục.
- `02-BAT-VA-QUY-TRINH.md`: 6 BAT root và mục đích, troubleshooting.
- `03-LUONG-HAM-QUAN-TRONG.md`: giải thích hàm nghiệp vụ trọng yếu.
- `04-DANH-MUC-SCRIPTS-TU-DONG.md`: tất cả script đang tồn tại (230 script).
- `05-DANH-MUC-HAM-TU-DONG.md`: 876 khai báo API/hàm được quét tĩnh với vị trí file:dòng.
- `06-DANH-MUC-ROUTE.md`: 63 route Expo Router.
- `07-DU-LIEU-VA-BAO-MAT.md`: Firestore schema chính, Firebase, secrets.
- `08-TEST-PERFORMANCE-VA-SUA-LOI.md`: kiểm thử/nhật ký lỗi thường gặp.
- `09-HUONG-DAN-SUA-CODE.md`: hướng dẫn sửa ít rủi ro.
- `10-PROMPT-GIAO-DU-AN-CHO-AI.md`: prompt bàn giao project cho ChatGPT/AI.

**Lưu ý:** Chỉ mục hàm tự động là chỉ mục tên & vị trí, không thể thay thế việc đọc code/viết mô tả chính xác cho mọi hàm nội bộ. Giữ nguyên tên export để không gây lỗi import. Đã rà các hàm quan trọng và diễn giải bằng tiếng Việt.

**Vì sao không di chuyển 230 script?** Rất nhiều bài kiểm thử cũ viện dẫn đường dẫn tĩnh trong BAT/npm scripts và tài liệu. Di chuyển diện rộng trong lần sửa Build này là rủi ro hồi quy không cần thiết. Các BAT thực thi vẫn nhóm `scripts/android/build|maintenance|eas|dev|install|verify`; root giữ 6 launcher tương thích.

## IV. Kiểm thử thực sự đã chạy

- `scripts/tests/release/test-h25r2r7r2r3r4-firebase-recovery.cjs`: **23/23 PASS**.
- `scripts/tests/release/test-h25r2r7r2r3r4-build-existing-json.cjs`: **12/12 PASS**, tái hiện trường hợp project đúng đã có file JSON, nhưng nơi khác bị thiếu.
- `scripts/tests/release/test-h25r2r7r2r3r2-build-config-routing.cjs`: **15/15 PASS**.
- `scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs`: **18/18 PASS**.
- `scripts/tests/release/test-h25r2r7r2-study-qa.cjs`: **14/14 PASS**.
- `scripts/tests/release/test-h25r2r7r2r1-flags-regression.cjs`: **10/10 PASS**.
- `scripts/maintenance/check-project-structure.js`: **19/19 PASS**.
- `scripts/setup/check-build-entrypoints.js`: **37/37 BAT quản lý**, không có BAT chưa khai báo; CRLF đạt.
- `scripts/setup/check-ts-syntax-transpile.js`: **324/324 TS/TSX không lỗi cú pháp**.
- `scripts/setup/check-source-import-integrity.js`: **324 file, 1.937 import nội bộ/hệ package** được kiểm tra, PASS.
- `auto-update-full.cjs check` trên project giả lập đường dẫn có dấu cách: **PREFLIGHT PASS**, không sửa đích.

**Chưa có kết quả chạy BAT GUI trong Windows, Gradle Release, hoặc APK trên Android thực tế.** Hộp thoại Windows, quyền filesystem và Firebase client thực phải được kiểm tra trên máy người dùng. Không gọi đây là bản build APK đã xác nhận.

## V. Hướng dẫn test thật trên Windows

1. Giải nén FULL CODE vào thư mục riêng.
2. Chạy Auto Update và xác nhận đúng project hiện tại (có thể là `D:\Project Family Bloom\Bloom\Family_bloom_V2`).
3. Sau PASS, chạy Build & Share. **Nếu project đang mở đã có JSON mà BAT báo thiếu, xem ngay đường dẫn mà BAT đang kiểm tra, chọn lại `Family_bloom_V2` đúng trước**, không tải/copy thêm file. Chỉ khi file thực sự không có ở root project đúng thì mới dùng chức năng khôi phục có xác nhận.
4. Chẩn đoán không sửa dữ liệu: từ FULL CODE chạy `node scripts\android\build\diagnose-build-location.cjs "D:\Project Family Bloom\Bloom\Family_bloom_V2"`. Khi chọn nhầm project, JSON hay hủy, lệnh phải dừng mà không phát hành APK.
5. Khi có cấu hình đúng, chạy tới Gradle và kiểm tra APK tại `C:\FamilyBloomShare\apk`.
6. Mở APK: Home/chuyển tab/Phả hệ/Chess/Xiangqi/Super Bloom; đối chiếu hiệu năng với bản cũ.

## VI. Giới hạn và rủi ro còn lại

- Nếu file Firebase Android đã mất ở mọi bản sao và bạn không tải lại được từ Firebase Console, script không thể tự tạo cấu hình đúng.
- Nếu cấu hình đã tồn tại nhưng sai ID hoặc JSON hỏng, script dừng để tránh ghi đè. Cần sao lưu và chọn giải pháp thủ công.
- `.gitignore` mới không tự xóa file Firebase đã được `git add`/commit từ trước; cần tự kiểm tra Git history nếu từng commit.
- Không áp dụng dịch thuật tên hàm trong runtime vì có thể phá hợp đồng API; tài liệu tra cứu đã được bổ sung để bạn hiểu code bằng tiếng Việt.

## VII. Đính chính quan trọng sau phản hồi của người dùng

Người dùng cho biết **Auto Update đã PASS vào `D:\Project Family Bloom\Bloom\Family_bloom_V2` và file JSON đã nằm trong đó**. Không thể suy từ ảnh log rằng file thực tế đã biến mất. Cơ chế trước phụ thuộc `last-target.txt` nhưng không hiện đường dẫn, dễ kiểm tra nhầm project khác. BAT trong bản này ưu tiên JSON hợp lệ tại root hiện tại; nếu chạy từ ZIP thì hiện cả target, kiểm tra dấu nhận diện nguồn, cho chọn lại project (hộp thoại và nhập tay), và chỉ đề nghị phục hồi file khi root của chính project được chọn thật sự chưa có.

Nếu JSON có trong `android/app` thay vì root, BAT sẽ giải thích sự khác biệt; nếu có `google-services.json.json` sẽ cảnh báo phần đuôi lặp. Không bao giờ lấy Admin SDK JSON thay Google client. Không thể khẳng định tình huống chính xác trên PC nếu chưa đọc trực tiếp ổ D của người dùng.

## VIII. Đối chiếu gói phát hành

FULL ZIP R4 giữ đủ **1.354 file đã có trong R3R3** và bổ sung công cụ, bài kiểm thử cùng tài liệu bảo trì; không bỏ sót `scripts/android` hoặc mã Native `modules/.../android`. Không có `google-services.json` của người dùng bên trong.
