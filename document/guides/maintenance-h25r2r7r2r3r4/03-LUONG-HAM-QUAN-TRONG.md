# Các hàm quan trọng — đọc và sửa đúng nơi

Đây là hướng dẫn **đã đối chiếu tên định nghĩa trong source**, không phải toàn bộ call graph. Tên hàm giữ nguyên tiếng Anh để không phá import; giải thích bằng tiếng Việt để thuận tiện chỉnh sửa. Tra cứu 876 tên khai báo ở `05-DANH-MUC-HAM-TU-DONG.md` và mở file ngay tại dòng được ghi.

## Startup, chuyển tab và điều hướng

| File / API | Chức năng / lưu ý khi sửa |
|---|---|
| `src/services/bootstrap/bootstrapCoordinator.ts` — `BootstrapCoordinator`, `bootstrapCoordinator` | Quản lý các phase COLD → IDENTITY → FIRST_PAINT → INTERACTIVE → SYNCING → SETTLED. Đừng thêm task nặng chặn first paint. |
| `src/services/bootstrap/bootSessionCache.ts` — `bootSessionCache` | Lưu/đọc hồ sơ và membership cache của UID; có thời hạn, phải kiểm tra UID. |
| `src/context/TabRuntimeContext.tsx` — `MAIN_TAB_IDS`, `SURFACE_PROFILES` | Quy tắc tab ACTIVE/WARM/SUSPENDED; không bắt tab ẩn giữ listener/timer. |
| `src/app/_layout.tsx` | Lối vào điều hướng gốc; tránh thêm fetch cho từng feature ở đây. |
| `src/app/(tabs)/_layout.tsx` | Layout năm tab, bảo vệ tabbar khỏi rerender và reload. |
| `src/constants/featureFlags.ts` — `FEATURE_FLAGS`, `ENABLE_FAMILY_BULLETIN` | Cloud Functions tắt trên Spark; Bảng tin đang ẩn. Không thay cả file chỉ để thêm cờ mới. |

## Đăng nhập, gia đình và Firestore

| File / API | Chức năng / lưu ý |
|---|---|
| `src/context/AuthContext.tsx` | Trạng thái đăng nhập, UID hiện tại. |
| `src/services/firebase/firestorePaths.ts` — `FIRESTORE_PATHS` | Nguồn đường dẫn Firestore chuẩn; thêm collection mới nên cập nhật cùng Rules. |
| `src/services/familyGraph/familyGraphRepository.ts` — `familyGraphRepository` | Tầng đọc dữ liệu Phả hệ; đừng đưa query vào render component. |
| `src/services/familyGraph/familyGraphQueryEngine.ts` | Tính truy vấn quan hệ, context Focus. |
| `src/services/familyGraph/familyGraphMutationService.ts` | Thao tác thay đổi dữ liệu Phả hệ; kiểm quyền trước khi ghi. |
| `src/services/calendar/calendarIndex.ts` | Lập chỉ mục ngày/tháng để xem nhanh. |
| `src/services/calendar/calendarService.ts` — `calendarService` | Truy xuất nghiệp vụ Lịch nhà. |
| `src/services/media/cloudinaryService.ts` — `cloudinaryService` | Upload media lên Cloudinary; cần giới hạn kích thước/loại ảnh. |

## Super Bloom — bài học và “Cả nhà cùng giải”

| File / API | Chức năng / lưu ý |
|---|---|
| `src/features/learning/publishedLessons.ts` — `listPublishedLessons`, `getPublishedLesson` | Đọc các bài đã xuất bản từ Bloom Content Studio, không phải nơi biên soạn. |
| `src/features/study/studyRepository.ts` — `studyRepository.listQuestions` | Phân trang câu hỏi, mặc định 15/trang; chỉ gọi khi vào màn. |
| `studyRepository.createQuestion` | Xác thực tiêu đề, môn/lớp, giới hạn block/ảnh; ghi câu hỏi vào Firestore family. |
| `studyRepository.createAnswer` | Tạo lời giải vào collection con `answers`. |
| `studyRepository.acceptAnswer` | Ghi `acceptedAnswerId` (Rules kiểm quyền chủ câu hỏi). |
| `studyRepository.listComments`, `studyRepository.addComment` | Phân trang và thêm bình luận vào lời giải. |
| `studyRepository.setReaction` | Thêm/xóa lượt thích của UID. |
| `src/features/study/StudyFormulaTemplates.ts` — `VISUAL_FORMULA_TEMPLATES` | Danh sách mẫu Toán/Lý/Hóa và các ô nhập tương ứng. |
| `findVisualTemplate`, `sampleFields`, `compileVisualFormula` | Tìm mẫu, tạo dữ liệu ô ban đầu, biên dịch mẫu sang TeX. |
| `src/features/study/StudyFormulaExpression.ts` — `templatePart`, `textPart` | Biến mẫu hoặc chữ/số thành một thành phần biểu thức. |
| `isFormulaPartComplete`, `compileFormulaParts` | Kiểm đủ ô và ghép thành biểu thức như `√25 + 3`; giới hạn kích thước và ký tự. |
| `compoundFromSaved` | Mở lại biểu thức cũ và mới mà không âm thầm mất dữ liệu TeX nâng cao. |
| `moveFormulaPart` | Đổi thứ tự các thành phần của biểu thức. |
| `src/features/study/StudyFormulaEditor.tsx` | Trình nhập ƒx; chỉ nạp khi mở, tránh tích hợp tại root. |
| `src/features/study/StudyComposer.tsx` | UI đặt câu hỏi/viết lời giải, quản lý nhập và upload ảnh. |

## Realtime Chess (riêng)

| File / hàm | Chức năng / lưu ý |
|---|---|
| `src/services/games/nativeChessGameplayController.ts` — `verifiedSide` | Đối chiếu màu quân từ trạng thái đã xác minh; không dùng lượt để xoay bàn cờ. |
| `syncNativeChessAuthoritativeState` | Đồng bộ trạng thái chuẩn từ server vào Native renderer. |
| `syncNativeChessAuthoritativeMove` | Nhận delta nước đi server, tránh nhảy trạng thái sai. |
| `showNativeChessConnectingPreview` | Mở board ngay ở trạng thái chờ mà không đợi socket. |
| `handleNativeChessAction` | Xử lý hành động từ Native (chọn ô, ready, minimize, ...). |
| `clearNativeChessSession` | Dọn phiên theo kết thúc được server xác nhận, tránh session treo. |
| `server/src/chess/chessGameManager.ts` | Server quyết định lượt, luật, đồng hồ và kết quả; đọc kỹ trước khi sửa timeout. |
| `server/src/games/firebaseInvitationMatch.ts` | Chuyển lời mời Firestore thành game realtime có xác thực. |

## Realtime Xiangqi (riêng)

| File / hàm | Chức năng / lưu ý |
|---|---|
| `src/services/games/nativeXiangqiGameplayController.ts` — `syncNativeXiangqiAuthoritativeState` | Đồng bộ trạng thái cờ tướng với Native. |
| `syncNativeXiangqiAuthoritativeMove` | Xử lý nước đi từ server Cờ tướng. |
| `handleNativeXiangqiAction` | Nhận tương tác bàn cờ tướng. |
| `clearNativeXiangqiSession` | Dọn phiên Cờ tướng sau khi kết thúc. |
| `server/src/xiangqi/xiangqiGameManager.ts` | Server luật/clock/READY cho Cờ tướng, không gộp với chess manager. |
| `server/src/games/boardGameActiveLock.ts` | Khóa liên game ở tầng quyền/ván, không phải chung game state. |

## Build, Auto Update, Firebase — hàm mới có chú thích Việt

| File / API | Chức năng / lưu ý |
|---|---|
| `scripts/maintenance/auto-update-full.cjs` — `assertSafe` | Chặn sai project, chép đè chính nguồn/đích, downgrade, symlink nguy hiểm. |
| `copyTree`, `localSecret`, `verify`, `backup` | Chép dữ liệu an toàn, không ghi đè secret, băm checksum, backup trước cleanup. |
| `scripts/android/build/resolve-build-target.cjs` — `checkGoogleFile` | Kiểm config Firebase Android và đối chiếu nguồn đã cập nhật. |
| `scripts/android/build/firebase-android-config.cjs` — `validateRoot` | Xác nhận thư mục được chọn là Family Bloom. |
| `validateJson` | Kiểm JSON có Android package chuẩn và đúng Firebase project ID. |
| `backupCandidate` | Chỉ gợi ý backup thuộc CHÍNH project đang build. |
| `scripts/android/build/Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat` | Điều phối xác minh → gợi ý backup → chọn file bằng Windows → hỏi đồng ý → sao chép. |

### Quy tắc bảo trì hàm

- Giữ tên export và chữ ký hàm ổn định; nếu muốn đổi phải rà toàn bộ import/call-site và test.
- Viết comment tiếng Việt ngay trước **hàm nghiệp vụ không hiển nhiên**, giải thích: đầu vào, đầu ra, nơi có side effect và trường hợp lỗi; tránh lặp lại từng câu lệnh hiển nhiên.
- Không rename một loạt hàm thành tiếng Việt: có thể phá test/protocol/exports và làm dự án khó dùng thư viện chuẩn.
- Nếu thêm một hàm công khai, chạy `node scripts/maintenance/generate-vietnamese-code-map.cjs` để tái tạo chỉ mục.
