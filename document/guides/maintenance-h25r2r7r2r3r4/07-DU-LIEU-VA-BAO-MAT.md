# Dữ liệu, phân quyền và secrets

## Nguồn sự thật

- `src/services/firebase/firestorePaths.ts`: registry đường dẫn đọc/ghi Firestore phía client.
- `firestore.rules`: quyền Firestore, có rule cấp `families/{familyId}`. Chỉnh rule phải triển khai lên Firebase riêng, APK không thể tự deploy.
- `firestore.indexes.json`: composite indexes; deploy khi có query mới yêu cầu index.
- `server/src/firebase/firebaseAdmin.ts`: xác thực server qua Admin SDK; tuyệt đối không chứa service-account trong FULL ZIP, app hay Github.

## Một số collection quan trọng

| Đường dẫn | Dữ liệu | Ai sử dụng |
|---|---|---|
| `users/{uid}` và `users/{uid}/memberships` | Hồ sơ/quan hệ membership | Auth, bootstrap |
| `families/{familyId}/members` | Thành viên trong nhà | Gia đình, quyền |
| `families/{familyId}/persons`, `relationships`, `personLinks` | Phả hệ | GraphRepository |
| `families/{familyId}/events` | Sự kiện | Lịch |
| `families/{familyId}/moments` | Kỷ niệm | Moments |
| `families/{familyId}/studyQuestions` | Câu hỏi Hỏi đáp | `studyRepository` |
| `.../studyQuestions/{qid}/answers/{aid}` | Bài giải | Hỏi đáp |
| `.../answers/{aid}/comments/{cid}` | Bình luận | Hỏi đáp |
| `.../answers/{aid}/reactions/{uid}` | Cảm xúc | Hỏi đáp |
| `families/{familyId}/homePolls` | Cùng quyết định | Nhà Mình |
| `families/{familyId}/homeTimeCapsules` | Hộp thời gian | Nhà Mình |

Thực tế có thêm nhiều collection trong rule và registry; bảng này là **bản đồ những đường chính**, không phải schema đầy đủ tuyệt đối. Không thêm collection mới bằng cách chỉ viết `setDoc()` mà bỏ Rules.

## Cấu hình Firebase Android

- `google-services.json`: cấu hình app Android, chỉ đặt ở root của **project đang build** (một số build generated có thêm bản tại `android/app`). Không phải secret Admin SDK, nhưng vẫn là dữ liệu project-specific, không đóng gói FULL ZIP dùng chia sẻ.
- `firebase-adminsdk-*.json`: private credential cho server, **tuyệt đối không copy vào app**.
- `scripts/android/build/firebase-android-config.cjs`: chỉ kiểm/khôi phục cấu hình Android hợp lệ, không gửi mạng, không in nội dung JSON, từ chối ghi đè file đã có.
- `.gitignore`: bỏ qua cấu hình cá nhân trong Git. `.easignore` xử lý riêng đối với EAS nếu build cloud yêu cầu tệp Android; phải kiểm tra chính sách upload phù hợp.

## Media

Ảnh bài giải tải qua Cloudinary khi bấm Đăng, không upload mỗi thao tác nhập. Phải giữ quota ảnh (hiện hỏi đáp giới hạn 3 ảnh) và URL HTTPS hợp lệ. Các tệp trong Cloudinary có quy tắc riêng về xóa/kiểm duyệt; đừng coi xóa document Firestore là đã xóa file đính kèm.

## Server game

Auth Socket xác minh Firebase token và family/uid. Server xử lý move/timeouts, Firestore là checkpoint/result bền; không dùng Firestore như vòng lặp đếm giờ từng giây. Chess và Xiangqi có collection/state/protocol riêng, không chia sẻ renderer.

## Triển khai rules

Lệnh từ root project có tài khoản CLI đủ quyền:

```bat
scripts\firebase\Family_Bloom_Deploy_Firestore_Rules.bat
```

Đọc thay đổi trong `firestore.rules` và xác nhận đúng Firebase project trước khi chạy; không triển khai Cloud Functions trên Spark khi chưa có quyết định chuyển mô hình.
