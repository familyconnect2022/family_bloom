# Family Bloom — M3R4R3 lên M3R4R5 trực tiếp

1. **Giữ nguyên thư mục R3 đang dùng.** Giải nén ZIP mới vào một thư mục riêng, không nằm trong R3.
2. Từ thư mục ZIP vừa giải nén, chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`.
3. Nếu hiện hộp chọn, trỏ đến thư mục gốc dự án R3 (có `package.json` và `app.config.js`).
4. Chỉ chọn Y sau khi đúng thư mục. Tool nhận diện chữ ký mã nguồn R3 trước mọi thay đổi; nếu khác sẽ STOP.
5. Auto Update sao lưu, copy, verify, clean apply. Nếu FAIL: đọc dòng FAILED đầu tiên và đường dẫn backup; không build cho đến khi khắc phục.
6. Nếu hoàn tất, chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` trong dự án đã cập nhật.

Bản này bảo vệ `.env`, `google-services.json`, khóa Firebase, các cache Android/Gradle. Không tự chạy build hay deploy Rules.
**R2 vẫn chưa được đối chiếu trực tiếp nên bản này chỉ dành cho R3 gốc.**
