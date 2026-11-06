# Family Bloom R8R4R4R3R1 – 20 Hero đã duyệt · FULL CODE Android

**Cập nhật trực tiếp từ R8R4R4R2**. Đây là toàn bộ mã nguồn của bản R8R4R4R3 (đã bao gồm R8R4R4R2) và 20 hình PNG riêng do người dùng duyệt ngày 31/10/2026. Không cần cài R8R4R4R3 trước.

## Phạm vi

- Giữ 4 hình Home đang hoạt động.
- Thay **chính xác byte gốc** của 20 ảnh trong `Family_Bloom_20_Hero_Images_4_Themes.zip` cho 5 khu vực `family`, `moments`, `learning`, `events`, `settings` và 4 theme `rose`, `garden`, `heritage`, `midnight`. Có thumbnail tối ưu từ đúng ảnh tương ứng để ảnh chờ tải không bị lạc theme.
- `src/theme/storybookHeroRegistry.ts` ánh xạ từ tên scene/theme đến 24 file, bao gồm 4 Home. `BloomHeroHeader` giữ tỉ lệ bằng `contain`, ảnh có chân alpha tan vào nền theo theme. Trang con kế thừa art từ scene tương ứng.
- Giữ `WelcomeModal` native Modal từ R8R4R4R3 với vùng chạm toàn màn hình, watchdog chống kẹt; cần kiểm thử trên điện thoại. Giữ tabbar kéo-thả/snap, các thay đổi theme/input/button của R8R4R4R2.
- **Không sửa** Firestore Rules, Cloudinary, Render, code bàn cờ Full/Mini và mã Web.

## Cách cập nhật

1. Sao lưu thư mục dự án đang dùng; giải nén ZIP FULL CODE mới thành một thư mục riêng **bên ngoài** thư mục dự án cũ.
2. Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat` ở thư mục vừa giải nén và chọn folder dự án hiện tại (R8R4R4R2).
3. Chỉ khi BAT báo PASS mới chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Không cần chép các bản trung gian.
4. Trong app thử Rose → Garden → Heritage → Midnight trên cả 5 trang; đối chiếu ảnh; thử Sáng/Tối, Thư Ngõ (chạm vào mọi vị trí), chuyển tab, trò chơi.

## Báo cáo kiểm chứng

- SHA từng ảnh trong `APPROVED_HERO_ASSETS.json`. Không dùng tên ảnh/biểu tượng theme trong bản PNG.
- Các kiểm thử mã nguồn **không thay thế** việc build APK hoặc thử màn hình Android thật.
- Gói ZIP không được chứa `.env` thật, secrets, hoặc cache build. Updater phải giữ config local đã có.
