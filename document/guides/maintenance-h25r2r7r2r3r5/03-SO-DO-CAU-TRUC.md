# Sơ đồ dự án Family Bloom

```text
Family Bloom/
├── app.config.js / app.json / package.json  # khai báo Expo, Android identity, dependencies
├── src/                  # màn hình, services, repositories, UI React Native
├── server/               # Express/Socket.IO authoritative Chess và Xiangqi
├── modules/family-bloom-overlay/android/   # Kotlin Native Full/Mini, assets SFX
├── assets/               # icon/ảnh/âm thanh dùng trong bundle
├── firestore.rules       # quyền dữ liệu Firebase, deploy riêng
├── scripts/
│   ├── android/Family_Bloom_MENU.bat  # điểm khởi đầu duy nhất
│   ├── android/{build,dev,eas,install,maintenance,verify}/
│   ├── firebase/          # deploy Rules/Indexes/Functions (cần xác nhận)
│   ├── setup/             # môi trường, manifest, migration map
│   ├── maintenance/       # updater engine và cấu trúc
│   ├── tests/{release,history,features,kotlin}/
│   ├── windows/web/       # công cụ web
│   └── music/             # công cụ dữ liệu nhạc
└── document/              # tài liệu tiếng Việt, mã hàm/route, bàn giao
```

**Đọc chi tiết API, Firestore và luồng data:** bộ tài liệu đã có tại `document/guides/maintenance-h25r2r7r2r3r4/`. R3R5 chỉ cập nhật vị trí BAT và test; số tham chiếu cũ `scripts/test-...` trong tài liệu giai đoạn trước không còn là vị trí chạy trực tiếp.

**Chức năng Hỏi đáp**: `src/features/study`, dữ liệu `families/{familyId}/studyQuestions`; vẫn lazy-load và không tạo listener root. **Chess/Xiangqi**: server sở hữu nước đi/thời gian; hai UI/socket state phân biệt. **Phả hệ**: Graph/Focus lifecycle độc lập. Không thêm dependency Native hay ảnh vào nguồn trong đợt bảo trì.
