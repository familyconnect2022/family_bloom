BLOOM EDUCATION BRIDGE — H25R2R6 + L1R10
Ngày đóng gói: 22/10/2026

PHẠM VI ĐÃ TRIỂN KHAI TRONG SOURCE
Family Bloom từ baseline H25R2R5 (1.3.29) -> H25R2R6 (1.3.30, versionCode 143040):
- Nhà Mình -> Góc học tập Super Bloom; duyệt môn/lớp, tìm kiếm; phân trang 30 bài.
- Xem nội dung Markdown dạng Bloom, hình HTTPS, mục tiêu và câu hỏi chạm để lộ đáp án.
- Không có listener bài học ở root; chỉ fetch khi vào trang. Chỉ đọc bài đã duyệt từ bloomStudioPublishedLessons.
- Cài đặt -> Cloud Manager, CHỈ tài khoản developer xác minh hiện thấy. A đang dùng trong Family; C chỉ đọc ảnh học liệu qua URL.
- firestore.rules được ghép từ Rules bạn đã cung cấp, có UID biên soạn, thêm quyền GET/LIST bài đã xuất bản cho Auth user đã có /users/{uid}; không mở draft / không mở quyền ghi Family.
- Không đổi config upload Family Bloom, không di chuyển media cũ.

Bloom Content Studio từ L1R9 (0.1.13) -> L1R10 (0.1.14, versionCode 15):
- Xuất bản -> Cloud Manager: quản lý URL Media Gateway (đã có), kiểm tra xác thực và Usage nếu server hỗ trợ.
- Media Gateway bổ sung endpoint /admin/status có Firebase verifyIdToken, giới hạn UID editor, dùng Cloudinary Admin API trên server (cache 1h).
- Giữ cơ chế SQLite -> Firestore approved -> Media Gateway upload -> queue -> Firestore published; giữ nguyên cấu trúc, không xoá bản nháp.
- 312 bài/ảnh vẫn là DRAFT AI đến khi người biên soạn kiểm duyệt, nhập dữ liệu không tự xuất bản.

PHẢI CẤU HÌNH ĐỂ TEST THỰC TẾ (không có trong ZIP):
1) CẢ HAI APK phải dùng cùng Firebase project và google-services.json đúng package cho mỗi app. Giữ file này trong folder dự án, không đưa vào ZIP công khai.
2) Sao lưu và so sánh Rules đang chạy với Rules gốc mà bạn gửi; chép firestore.rules từ FULL Family vào dự án; deploy một lần bằng BAT của Family Bloom. Nếu Rules server đã đổi từ sau lúc bạn gửi, không ghi đè mù.
3) Cài FULL Family bằng Family_Bloom_AUTO_UPDATE_FULL.bat -> Family_Bloom_BUILD_APK_TO_SHARE.bat.
4) Cài FULL Studio bằng BLOOM_STUDIO_AUTO_UPDATE_FULL.bat -> BLOOM_STUDIO_CHECK_FIREBASE_ANDROID.bat -> BLOOM_STUDIO_BUILD_LOCAL_APK.bat.
5) Studio Google Sign-In phải có SHA-1 cho đúng chữ ký APK. Đăng nhập Google UID editor đã cấp trong Rules.
6) Studio nhập bài DRAFT (nếu cần), bổ sung URL nguồn + ghi chú quyền sử dụng, kiểm tra kiến thức và duyệt 1 bài.
7) Bấm Đồng bộ Firebase. Firebase Console phải có bloomStudioLessons/<id> và bloomStudioPublishedLessons/<id> (nếu bài đã đạt).
8) Mở Family Bloom -> Nhà Mình -> Góc học tập -> bấm bài. Xem nội dung/ảnh/10 câu hỏi, kiểm tra tìm kiếm và tải thêm.
9) Nếu có ảnh staged, Media Gateway L1R10 phải được deploy, có Firebase Admin + Cloudinary C riêng; sau duyệt và private sync, upload approved images rồi syncQueued để xuất bản. Không yêu cầu Gateway khi bài chỉ có văn bản/URL ảnh HTTPS sẵn.
10) Thử thu hồi từ Studio -> đồng bộ -> mở Family; bài phải không còn trên Firestore published, và lần mở detail mới sẽ báo không còn (danh sách cũ vẫn cần Refresh hoặc mở lại).

KHÔNG LÀM / GIỚI HẠN
- Cloud Manager Family là màn kiểm tra cấu hình và nguồn học liệu; KHÔNG tự chuyển account, không gọi Admin API A, không có quota giả. Cloud Manager Studio hiển thị usage chỉ khi gateway đã triển khai; không tự nâng gói, không tự chuyển cloud.
- Nút Cloudinary A trong Family không được thay thế sang B chỉ vì quota, tránh vi phạm điều khoản. Đơn vị đo/cảnh báo chỉ hiển thị khi có API hợp lệ.
- Không sửa ảnh/URL Family cũ; không dùng Cloudinary API Secret trên thiết bị.
- Không triển khai Firestore Rules hay Render trong môi trường này.
- Không thể chạy Windows Gradle thật hoặc đăng nhập/Firestore/Cloudinary production từ môi trường đóng gói; chỉ kiểm thử source + mocks. Chỉ gọi PASS cho kiểm thử đã chạy.
- Bảo vệ chữ ký Android; không gỡ app cũ khi nâng cấp. Các BAT tự động không build APK trong bước update.
- Family Bloom vẫn dùng code H25R2R5 làm baseline; nếu trên máy người dùng đã có H25 mới hơn, phải kiểm tra version/source trước khi copy-over.
