# Family Bloom H25R2R7R2R3R5 — Bảo trì thư mục và kiểm thử

**Chỉ thay đổi công cụ build/cập nhật/test và tài liệu; không sửa Chess, Xiangqi, Phả hệ hoặc UI.**

## Bắt đầu trong 30 giây

1. Giải nén FULL CODE vào thư mục khác project đang dùng.
2. Mở `scripts/android/Family_Bloom_MENU.bat` trong bản mới.
3. Chọn **1 – Cập nhật FULL CODE**; chỉ đúng thư mục `Family_bloom_V2` bạn dùng, xác nhận sao lưu.
4. Khi cập nhật + CLEAN APPLY thành công, chọn **2 – Build APK Release và chia sẻ**.
5. APK mục tiêu: `C:\FamilyBloomShare\apk` (chỉ nhận là mới nếu lần build báo `BUILD SUCCESSFUL`).

**Không còn 6 BAT ở root.** Bộ lệnh chính là `scripts/android/Family_Bloom_MENU.bat`.

File `google-services.json`, `.env`, khóa ký và cache ở máy bạn không được đưa vào ZIP. Auto Update giữ cấu hình hiện hữu; nếu kiểm tra Firebase thất bại, dùng menu mục 3, đối chiếu `package_name=com.familybloom.android`, `project_id=family-connect-4184f`, tên file và đường dẫn đang kiểm tra. Không dùng Firebase Admin SDK JSON để thay client JSON.

Không chạy trực tiếp Gradle từ ZIP giải nén: dùng project đã cập nhật có cấu hình Firebase. Nếu cập nhật thất bại, kiểm tra log đầu tiên; bản sao lưu nằm ở `%LOCALAPPDATA%\FamilyBloom\updater\backups` (trừ khi bạn đã đặt `FB_STATE_DIR`).

Giới hạn xác minh: kiểm tra script/nguồn và copy giả lập trên Linux/Node; **chưa chạy Windows CMD, Android Gradle Release hay test APK trên thiết bị**.
