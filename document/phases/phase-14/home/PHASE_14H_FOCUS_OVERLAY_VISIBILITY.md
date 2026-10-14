# Family Bloom — Phase 14H Focus Overlay Visibility Hotfix

Base: **Phase 14G TRUE FOCUS OVERLAY FULL**.

## Lỗi thiết bị thật
Trên một số Android, lớp `filter: blur(...)` kết hợp với `renderToHardwareTextureAndroid` của Canvas View có thể được compositor đặt lên trên sibling Focus card. Kết quả: người dùng thấy toàn bộ cây bị blur nhưng Focus View không xuất hiện.

## Sửa
- Không dùng Android hardware-texture blur cho Canvas View nữa.
- Canvas View vẫn giữ nguyên component instance, node/line, pan, zoom, 3/5/toàn phả hệ và không bị recompute chỉ vì mở Focus.
- Thay bằng một lớp **frosted shield rất nhẹ** nằm giữa Canvas và Focus View. Lớp này vừa tạo tách lớp thị giác, vừa chặn toàn bộ touch xuống Canvas.
- Ép thứ tự vẽ rõ ràng: shield thấp hơn, Focus card có zIndex/elevation cao hơn để luôn hiển thị trên Android.
- Thêm nút **Trở lại** dễ thấy trong header Focus. Nút X vẫn giữ. Chạm vùng frosted bên ngoài Focus cũng đóng. Android hardware Back cũng đóng Focus trước khi rời màn.
- Ba nút `3 thế hệ / 5 thế hệ / Toàn phả hệ` tiếp tục disabled trong khi Focus mở.
- Focus vẫn rộng/cao 80% Canvas View, mở/đóng từ node đã bấm bằng gradual translate+scale, và loading `Đang chuẩn bị nhánh của ...` vẫn giữ nguyên.
- Focus branch vẫn lấy từ full family snapshot, không phụ thuộc Canvas đang ở 3/5/toàn phả hệ.

## Performance
Không thêm `expo-blur` hoặc native dependency. Hotfix bỏ một GPU blur/hardware-texture layer, vì vậy an toàn hơn cho Android và không làm Canvas View render lại.
