# Family Bloom R3R3D7R2R3R1 — sửa nhận diện Auto Update an toàn

- Nền chức năng: R3R3D7R2R3, **chỉ thay mã nhận diện nguồn FULL CODE và bộ test**. Không thay Firebase Rules, data, UI hay app versionCode.
- Nhận trực tiếp mã nguồn chính thức R3R3D7R2R1, cũng cho phép R2R2/R2R3 khi dấu vân tay 8 tệp chính + >=10 tệp nhạy cảm khớp chính xác ZIP phát hành. Không chỉ dựa trên tên thư mục.
- Không nhận mã đã sửa ở những tệp kiểm soát, thiếu tệp gốc hoặc mã lạ. Quy trình Auto Update vẫn bắt buộc backup -> cleanup -> overlay -> verify -> clean apply, không tự build APK.
- Ở Windows: giải nén ZIP R2R3R1 vào thư mục riêng (không lồng trong thư mục dự án). Chạy `Family_Bloom_AUTO_UPDATE_FULL.bat`, chọn đúng thư mục đích **đang ở R2R1**. Nếu báo source unverified, không ép chạy, gửi log kiểm tra.
- Test đối chiếu snapshot chính thức: `node scripts/tests/release/test-r3r3d7r2r3r1-approved-upgrade-lineage.cjs` và truyền `FB_OFFICIAL_R2R1_DIR`/`R2R2_DIR`/`R2R3_DIR` để chạy cả kiểm tra dương tính.
- Không chạy cleanup độc lập trước Auto Update; không sửa `firestore.rules` đang triển khai.
- Chưa build APK trong môi trường Windows thiết bị thật.
