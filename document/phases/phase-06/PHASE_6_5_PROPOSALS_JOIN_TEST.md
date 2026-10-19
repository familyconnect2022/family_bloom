# Family Bloom — Đề xuất phả hệ và hai cách mời vào nhà

Base: main `646457dbb0883fd849211695b082f43cf4631787`. Gói ZIP tổng hợp có cả splash, tab hồng, padding và tối ưu chuyển tab trước đó.

**Trạng thái: OPEN / AWAITING USER DEVICE TEST. Chưa đóng phase, chưa push GitHub.**

## Áp dụng trước khi test

1. Giải nén ZIP vào gốc project và ghi đè file tương ứng.
2. Firebase Console → Firestore Database → Rules: thay bằng **firestore.rules** trong ZIP rồi **Publish**. Rules Phase 6.5 đã deploy trước đây chưa có quyền cho đề xuất mới.
3. Giữ `USE_CLOUD_FUNCTIONS=false`, khởi động lại ứng dụng. Không dùng firestore.cloud.rules hoặc deploy Functions cho lượt test Direct Mode này.

Không thêm dependency ứng dụng, không cần migration dữ liệu. Hai collection mới được tạo khi gửi/duyệt đề xuất. Bộ kiểm thử emulator cần firebase-tools, @firebase/rules-unit-testing, firebase, firebase-admin và typescript trong môi trường kiểm thử; không cần cài chúng để chạy app.

## Cách sử dụng

**Cây nhà → Góp ý phả hệ · Đề xuất và duyệt**

- Thành viên chọn thêm/sửa/xóa Người hoặc Quan hệ, nhập lý do rồi gửi. Dữ liệu phả hệ chưa thay đổi khi gửi.
- Admin/owner mở đề xuất, xem trước/sau, bấm Duyệt và áp dụng hoặc Từ chối. Từ chối cần ghi lý do.
- Người gửi có thể rút đề xuất đang chờ. Các trạng thái đã xử lý giữ trong lịch sử và không sửa/xóa được.
- Chỉ role member được gửi đề xuất. Admin/owner chỉ duyệt đề xuất của người khác, không tự duyệt. Đề xuất cũ của chính mình có thể rút hoặc nhờ admin khác duyệt.
- Nếu dữ liệu gốc đã thay đổi, duyệt bị chặn; cần từ chối và gửi lại sau khi kiểm tra. Không tự gộp hoặc ghi đè.
- Chỉnh sửa quan hệ giữ nguyên hai đầu/type; đổi người hoặc loại quan hệ cần đề xuất xóa và tạo mới. Hỗ trợ sửa loại cha mẹ–con, tình trạng bạn đời và ngày bắt đầu/kết thúc.
- Không đổi liên kết tài khoản qua đề xuất. Không xóa dây chuyền: xóa người còn quan hệ, tài khoản hoặc nội dung liên quan sẽ bị chặn.
- Hai danh sách hiển thị tối đa 100 đề xuất/lượt; lịch sử là 100 bản ghi gần nhất. Xử lý các đề xuất chờ sẽ nhường chỗ cho các bản ghi chờ tiếp theo.

**Hồ sơ → Mời người thân vào nhà**

- Có Family ID và Mã nhà, mỗi mục có nút Sao chép riêng.
- Family ID giữ nguyên chữ hoa/thường; mã nhà không phân biệt hoa/thường.
- Nhà cũ chưa có mã: chủ nhà bấm Tạo mã nhà. Thao tác này không đổi mã đã có.
- Người nhận gửi yêu cầu bằng một trong hai mã; vẫn chờ admin duyệt. Khi được duyệt, người nhận tự kích hoạt family. Có nút Mở gia đình / Thử lại nếu mạng gián đoạn.

## Một lượt test trên thiết bị

Chuẩn bị một tài khoản admin, một member và một tài khoản chưa thuộc nhà. Nếu có thể, dùng hai thiết bị để test cập nhật realtime.

| Test | Kết quả cần thấy |
|---|---|
| Copy Family ID → tài khoản ngoài gửi yêu cầu → admin duyệt | Gửi thành công bằng ID đầy đủ; sau duyệt vào đúng nhà |
| Copy mã nhà → nhập mã chữ hoa → gửi yêu cầu | Cùng tìm đúng nhà; không cần sửa ID |
| Gửi trùng; nhập mã không tồn tại; nhập có dấu / | Báo lỗi phù hợp, không tạo membership |
| Admin từ chối → người xin gửi lại | Gửi lại được; membership chỉ xuất hiện sau khi được duyệt |
| Member đề xuất thêm/sửa Person | Phả hệ không đổi trước duyệt; admin thấy trước/sau; sau duyệt dữ liệu cập nhật |
| Member đề xuất thêm/sửa/xóa Relationship | Đúng hướng cha/mẹ → con hoặc cặp bạn đời; giữ mã quan hệ chuẩn |
| Member thử tự duyệt; người khác thử rút | Không được phép; chỉ creator rút đề xuất của mình |
| Admin từ chối có lý do; creator rút đề xuất | Phả hệ không đổi; kết quả và người xử lý hiện trong lịch sử |
| Sửa Person bằng luồng admin cũ sau khi có đề xuất | Duyệt đề xuất cũ bị chặn, không mất thay đổi mới |
| Hai người duyệt cùng đề xuất | Chỉ một lần thành công; không tạo bản sao |
| Đề xuất cha–con gây vòng lặp; xóa người còn liên kết | Bị chặn, không làm hỏng cây |
| Đổi family và mở lại danh sách | Không lẫn đề xuất/dữ liệu giữa các nhà |
| Tắt/mở app, đăng nhập lại, chuyển năm tab | Splash kết thúc khi sẵn sàng hoặc hết hạn chuẩn bị 8 giây; tab hồng và padding đúng |
| Timeline, Moments/Events, Album, bình luận/reaction, DG-11, Full Tree | Chức năng Phase 6.5 trước đó vẫn hoạt động |

## Bằng chứng kiểm tra và giới hạn

- PASS 34 ca Direct Mode chạy trên Firestore Emulator với Rules thật và service ứng dụng qua adapter Web SDK: join bằng ID/code, duyệt, tự kích hoạt, gửi lại, phân quyền, audit nguyên tử, xung đột, đồng thời, vòng lặp và tạo nhà/mã nhà.
- PASS 8 ca Cloud Mode: Rules cho gửi đề xuất nhưng chặn client duyệt trực tiếp; handler backend kiểm tra admin trong transaction, áp dụng, chặn xử lý lại và xung đột.
- PASS static transpile, startup simulation, Phase 6.5 contract, Phase 6.4 viewport/progressive, Query/Kinship, DG-11, layout, Functions core/syntax và kiểm tra diff.
- Chưa xác nhận full typecheck/native build: tải dependency bị ECONNRESET/timeout, môi trường còn thiếu declaration. Chưa có kiểm chứng giao diện/độ mượt trên điện thoại. Emulator không thay thế kiểm thử React Native.
- Direct Mode đã có giới hạn kiểm tra cấu trúc phía client từ trước. Revision mới tuần tự hóa các lần duyệt proposal; luồng admin chỉnh trực tiếp cũ không dùng revision này. Cần chuyển toàn bộ mutation sang backend trước khi yêu cầu bảo đảm cạnh tranh toàn cục trong production. Không đổi feature flag trong bản test này.

Chỉ đóng phase sau khi user xác nhận checklist đạt. Sau đó cập nhật checkpoint CLOSED; hướng tiếp theo nên là củng cố backend mutation, kiểm thử tải trên thiết bị và chuẩn bị bản phát hành.

## Retest UI/quyền mới
- Thẻ Góp ý phả hệ ngay dưới Duyệt thành viên, có khoảng cách và cùng phong cách Bloom.
- Member có Tạo đề xuất; admin/owner không có.
- Đề xuất cũ của chính admin không được tự duyệt, vẫn có thể rút.
- Publish lại firestore.rules trong full ZIP mới nhất trước khi test.

## CHECKPOINT MỚI NHẤT — Báo chờ duyệt trên thẻ (2026-09-24)

- Duyệt thành viên và Góp ý phả hệ có chuông + nhãn Chờ duyệt màu Bloom khi tồn tại pending. Chỉ admin/owner thấy dấu báo. Không phải push notification và không hiển thị tổng số.
- Thẻ Góp ý nằm ngay dưới Duyệt thành viên. Chỉ member tạo đề xuất; admin/owner không tạo, không tự duyệt.
- Mỗi service theo dõi query status=pending, limit(1). Hook chỉ subscribe khi tab Cây nhà được focus và app active; cleanup khi đổi account/family, quyền, tab hoặc background. Lỗi theo dõi hiện thông báo chưa tải trạng thái, không giả làm không có pending.
- Không thay schema/Rules/dependency trong riêng thay đổi badge này. Nếu chưa áp dụng bản quyền member-only trước, vẫn phải Publish firestore.rules kèm full/patch tổng hợp.
- Build badge: 133 TS/TSX transpile PASS, diff check PASS. Các kiểm thử 34 Direct + 8 Cloud là kết quả của bản quyền ngay trước; chưa chạy lại emulator cho badge, chưa kiểm chứng React Native trên thiết bị.
- Cần test tạo yêu cầu từ thiết bị khác → chuông xuất hiện; duyệt/từ chối hết → biến mất; kiểm tra cả join/proposal, member không thấy badge admin, đổi nhà/account không lẫn dấu báo, background/resume tải lại.
- Phase 6.5 vẫn OPEN chờ người dùng test. Chưa push GitHub hoặc deploy Firebase.

