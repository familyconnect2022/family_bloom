# Family Bloom R3R14R3R6 — Planner scroll + Developer Firestore fault laboratory

Ngày 28/10/2026. Nền: FULL CODE R3R14R3R5 (Android P0 data guard).

## Phạm vi sửa

- Android màn **Lịch / Sự kiện**: đưa toàn bộ header Super Bloom, kiểm duyệt và thanh Lịch/Sự kiện vào `ListHeaderComponent` của danh sách tương ứng. Header cuộn lên cùng dữ liệu, không còn chiếm màn hình cố định. `FlatList` của Lịch và `SectionList` của Sự kiện vẫn giữ virtualization, không chuyển sang ScrollView bọc hai danh sách.
- Developer Tools: thêm màn **Thử dữ liệu Firestore sai cấu trúc**. Chỉ tài khoản Firebase `huynh235@gmail.com` đã xác minh thấy công cụ trong Debug/Release.
- Vercel Media project: thêm API `/api/dev/data-fault`, mặc định **TẮT**, ghi dữ liệu cố tình sai bằng Admin SDK vào một gia đình thử nghiệm, sau khi kiểm tra UID/email/emailVerified, quyền owner/admin, và allowlist family. Không nhận path/payload tùy ý từ Android.
- Bản ghi lỗi dùng tiền tố `FB_DIAG_`, trường `fbDiagnostic.tag = FB_DIAG_DELETE_MANUALLY`. Chỉ một tài liệu đang tồn tại mỗi lần, không ghi đè dữ liệu thật. Tài liệu giữ nguyên đến khi **người thử xóa thủ công trên Firestore**. Không sử dụng Cloudinary / Render / Firebase Cloud Functions.
- Không sửa `src/web/`, không deploy Rules, không sửa Chess/Xiangqi.

## Cấu hình Vercel bắt buộc TRƯỚC KHI thử

Vercel project **family-bloom-media**, Root Directory `vercel-media/`. Giữ các biến hiện có `FIREBASE_SERVICE_ACCOUNT_JSON`, `CLOUDINARY_...` và `CRON_SECRET` cho Moment.

Thêm ba biến môi trường trong Vercel Project → Settings → Environment Variables (Production), sau đó redeploy project:

```dotenv
FAMILY_BLOOM_DEV_DATA_TEST_ENABLED=true
FAMILY_BLOOM_DEV_TEST_UID=<UID-Firebase-Auth-cua-huynh235>
FAMILY_BLOOM_DEV_TEST_FAMILY_ID=<familyId-mot-gia-dinh-test-rieng>
```

- Lấy UID từ Firebase Console → Authentication → Users → tài khoản developer.
- `FAMILY_BLOOM_DEV_TEST_FAMILY_ID` là ID của **gia đình thử nghiệm mới, không có thành viên thật**. Developer phải có membership `owner` hoặc `admin` trong gia đình này. **Server từ chối tạo dữ liệu lỗi nếu gia đình có thành viên khác ngoài UID developer**, hoặc chưa có tài liệu gia đình. Không dùng gia đình đang có thành viên thật.
- Khi kiểm thử xong, đặt `FAMILY_BLOOM_DEV_DATA_TEST_ENABLED=false` và redeploy Vercel. Không cấp quyền ghi dữ liệu sai cho khách hàng qua Firestore Rules.
- Trong `.env` của Android trước khi build cần `EXPO_PUBLIC_MOMENT_MEDIA_API_URL=https://<vercel-media-project-domain>`. Đây là biến công khai chứa URL, không có mật khẩu.
- API yêu cầu Firebase ID token, chỉ cho đúng UID đã allowlist, `emailVerified=true`, `huynh235@gmail.com`, đúng familyId test và quyền owner/admin. Chặn mọi payload tự định nghĩa.

## Cách test 1 trường hợp

1. Tại **Cài đặt → Kiểm thử & chẩn đoán → Thử dữ liệu Firestore sai cấu trúc**. Chọn đúng gia đình thử nghiệm trước khi mở công cụ.
2. Chọn ca kiểm thử. Màn hình hiển thị **đường dẫn dự kiến chính xác**. Sao chép/chụp lại; app cũng tự sao chép trước lúc gọi API.
3. Nhấn **Ghi dữ liệu lỗi vào Firebase** và xác nhận. Vercel Admin SDK tạo document thật. **Không có hoạt động ghi nào trước khi bạn bấm xác nhận.**
4. Mở màn liên quan, hoặc tắt/mở ứng dụng đối với membership startup. Ghi nhận: crash toàn app, crash chỉ một màn, hiển thị sai, im lặng bỏ qua, hoặc từ chối đọc đúng. Nếu có log `adb logcat`, lưu lại.
5. Vào **Firebase Console → Firestore Database → Data**, duyệt đến đường dẫn đã lưu và **Delete document** với ID `FB_DIAG_...` chính xác; không xóa cả collection, user hay gia đình. Có thể làm ngay cả khi APK không khởi động được.
6. Khởi động lại Android và thử lại để xác nhận phục hồi. Trở lại công cụ, nhấn **Kiểm tra lại sau khi xóa thủ công** rồi mới thử ca tiếp theo.

Backend lưu khóa một-ca-at-a-time ở `users/{UID}/developerDataTest/current`. Khóa này chỉ là metadata; sau khi bạn xóa đúng **document lỗi** nói trên, công cụ tự cho phép ca mới mà không yêu cầu khôi phục trong app. **Không xóa membership thật của bạn.**

## 11 ca và vị trí tài liệu được tạo

Với `S = FB_DIAG_{CASE_ID}_{UID8}`; UID8 = tám ký tự đầu của UID đã xác minh:

| Case ID | Đường dẫn Firestore | Kiểu sai / khu vực quan sát |
|---|---|---|
| `MEMBERSHIP_BAD_DATE` | `users/{UID}/memberships/{S}` | `joinedAt` object; khởi động / chuyển nhà |
| `MEMBERSHIP_BAD_ROLE` | `users/{UID}/memberships/{S}` | `role` object; khởi động / chọn nhà |
| `MEMBER_BAD_DATE` | `families/{testFamilyId}/members/{S}` | `joinedAt` object; danh sách thành viên |
| `JOIN_BAD_APPLICANT` | `families/{testFamilyId}/joinRequests/{S}` | `applicant=null`; kiểm duyệt |
| `JOIN_BAD_INTERESTS` | `families/{testFamilyId}/joinRequests/{S}` | `applicant.interests` object; kiểm duyệt |
| `EVENT_BAD_DATE` | `families/{testFamilyId}/events/{S}` | `dateISO` object; lịch / yearly; có thể bị Firestore query loại trước khi đọc |
| `EVENT_BAD_TITLE` | `families/{testFamilyId}/events/{S}` | `title` array; sự kiện sắp tới |
| `EVENT_BAD_PARTICIPANTS` | `families/{testFamilyId}/events/{S}` | `participantIds` object; sự kiện sắp tới |
| `MOMENT_BAD_DATE` | `families/{testFamilyId}/moments/{S}` | `createdAt` object; dòng thời gian |
| `MOMENT_BAD_MEDIA` | `families/{testFamilyId}/moments/{S}` | các phần tử media không đúng chuẩn |
| `MOMENT_BAD_COUNTS` | `families/{testFamilyId}/moments/{S}` | bộ đếm reaction và comment sai kiểu |

**Giới hạn**: Đây là 11 ca thăm dò đại diện cho những đường dữ liệu đọc quan trọng, không phải chứng nhận mọi collection an toàn. Một số kiểu dữ liệu có thể bị query loại ra hoặc qua normalizer chuyển thành giá trị dự phòng. Khi đó cần ghi nhận `Không được tải vào UI` thay vì kết luận parser đã xử lý lỗi an toàn. Test thêm các collection khác sau khi có kết quả thực tế.

## Kiểm chứng và an toàn

- API mặc định tắt; cấu hình từ Vercel riêng, không sửa Rules để cho client ghi bất kỳ dữ liệu sai nào.
- Không chấp nhận tùy ý document path, userId hoặc schema từ request. Chỉ factory 11 trường hợp cố định.
- Mỗi lần chỉ tạo một tài liệu mới bằng `tx.create`, không overwrite. Nếu chưa xóa, trả lỗi 409.
- Không tự động xóa bản ghi test vì người dùng sẽ đối chiếu trên Firebase Console sau khi crash.
- Trình tự của Auto Update: chạy gate mới trước backup/overlay; Clean Apply cũng chạy gate mới.
- Kiểm chứng ở đây là tĩnh/offline và giả lập nguồn. Chưa triển khai hoặc tạo tài liệu lên Firebase thật; chưa có APK Android/Gradle chạy trên thiết bị, chưa kiểm thử môi trường Vercel production. **Không coi 11 ca đã PASS runtime** khi chưa thử trên điện thoại.
