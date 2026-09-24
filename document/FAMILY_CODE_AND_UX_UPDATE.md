# Family Bloom Phase 2.1 – Family Code & UX Update

## 1. Mã nhà dễ nhớ
- Family vẫn giữ `familyId` Firestore làm khóa kỹ thuật.
- Khi tạo nhà, Bloom sinh thêm `familyCode`, ví dụ `gia-dinh-bloom-4827`.
- `familyCode` được reserve trong `family_codes/{familyCode}` trong cùng transaction với family + owner membership.
- Thành viên có thể nhập `familyCode`; service tự đổi về `familyId` trước khi tạo join request.
- Family ID cũ vẫn được chấp nhận để tương thích dữ liệu Phase 2.1 trước đó.
- `familyCode` được tạo từ tên gia đình + 4 chữ số nên dễ đọc/dễ nói nhưng vẫn đủ không gian để tránh trùng.

## 2. UX tạo gia đình
- Sau khi tạo, `activeFamilyId` chưa được set ngay. Gateway hiển thị tên nhà + mã nhà để admin kịp lưu/chia sẻ.
- Admin bấm “Vào nhà của mình” mới chuyển `activeFamilyId` và vào Tabs.
- Khi tạo/join đang chạy, màn hình bị khóa bởi blocking loader; nút chính dùng màu loading đậm hơn.
- Ô tên gia đình được focus lại sau interaction để Android mở bàn phím ổn định hơn.

## 3. Login image
- `icon.png` cũ có nền sáng opaque gây cảm giác halo/border khi Android render.
- Tạo `assets/images/login-family-icon.png` với nền ngoài được loại bỏ và hiển thị qua `expo-image` với `transition={0}`.

## 4. Tương thích
- Không đổi `media_assets`, Cloudinary hoặc contract profile đã chốt.
- `shortName` vẫn optional/null.
- `gender` mặc định `other`.
