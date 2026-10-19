# Family Bloom H22R7 — quân Vua nổi một nửa trên tất cả modal Chess / Xiangqi

Ngày 19/10/2026. Nền H22R6 FULL. Bản H22R7 là **FULL CODE** độc lập, không phải patch. Android version `1.3.25`, versionCode `143035`, native identity `P2.37R2C-H22R7-native-1`.

## Thiết kế chốt

- Mọi modal Cờ vua/Cờ tướng (mời thách đấu, nhận lời mời, chuẩn bị, chờ sẵn sàng, kết quả thắng/hòa/thua) giữ phong cách Super Bloom; **Vua/General nằm chính giữa mép trên card: một nửa phía ngoài, một nửa phía trong**. Không thay một vị trí này bằng emoji cúp hay quân Hậu trong trạng thái kết quả.
- **Chess**: quân Vua Trắng PNG `wk.png` trên modal React Native khi thách đấu và `ImageView` native trên toàn bộ dialog của Chess; khung card tự đo để neo phần đầu Vua theo vị trí thực tế của panel, không hardcode theo chiều cao máy.
- **Xiangqi**: quân Tướng Đỏ (帥) PNG; React Native dùng ảnh cắt gọn `assets/xiangqi/red_general_modal.png` (nội dung lấy từ ảnh nguồn đã có), renderer Canvas tái sử dụng PNG preload của Cờ tướng. Tất cả trạng thái connecting/waiting/ready/finished vẽ cùng dấu ấn Vua nổi ở panel top.
- Riêng lời mời (cả A/B) dùng bảng pastel đồng nhất với countdown 60s/progress bar, hủy lời mời của A; nhận/từ chối của B; quân Vua không chặn touch. Giữ logic socket/ACK/giới hạn thời gian server như H22R6.
- Chuẩn bị có trạng thái `SẴN SÀNG VÀO TRẬN` khi `preparationPhase=play`. Kết quả vẫn có ba bảng màu vàng (thắng), xanh (hòa), xanh lá (thua), nút xác nhận nằm trong vùng touch chính xác.
- Xiangqi renderer, game/mini/controller/socket không dùng chung với Chess. **Không động đến luật đi, giới hạn thời gian, animation 205ms, âm thanh SoundPool, lock chéo game, hay protocol Render.**

## Kiểm tra tự động (không phải chạy trên máy Android)

- Kiểm tra mới `node scripts/test-h22r7-royal-bloom-modals.cjs`: **20/20 PASS**. Hard gate trong cả `Build & Share` và EAS helper.
- Bộ hồi quy từ H22R6: 19/19 suite PASS, gồm Xiangqi parity 26/26, bot invite 10/10, source imports, TS syntax 299/299, Gradle-resource names, native identity and Build & Share BAT CRLF.
- Định danh hiện rõ trong tài khoản developer test giúp xác nhận APK đúng `143035 / P2.37R2C-H22R7-native-1`.
- **Chưa biên dịch Gradle APK và chưa có test tương tác thực tế trên máy Android** trong môi trường này. Test nguồn/cú pháp Kotlin bằng kiểm tra tĩnh không phải xác nhận build Kotlin thành công.

## Cách cài đặt

1. Sao lưu mã nguồn trước khi cập nhật. Dùng `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` theo hướng dẫn sẵn có, copy đè **toàn bộ** FULL ZIP vào thư mục dự án và chạy `Family_Bloom_CLEAN_APPLY_FULL.bat`.
2. Chạy `Family_Bloom_BUILD_APK_TO_SHARE.bat` tại root (sẽ gọi nhóm `scripts/android/`; đường dẫn output mặc định `C:\FamilyBloomShare\apk`). Có thể dùng `Family_Bloom_EAS_BUILD_TEST.bat` để build profile test và `Family_Bloom_EAS_UPDATE_TEST.bat` để cập nhật JS có nhập message, nhưng thay đổi Kotlin **không đi qua OTA**; cần APK bản mới.
3. Cài đúng APK `versionCode 143035`. Server Render H22 đang chạy không cần nâng protocol chỉ cho thay đổi này.
4. Trên thiết bị thật: mở lời mời Chess A/B, Xiangqi A/B, chờ 60 giây/hủy; thử cả hai game với Bloom Bot; kiểm tra modal chuẩn bị, màn sẵn sàng; tạo 3 kết quả thắng-hòa-thua; quan sát Vua đúng 50/50, không bị cắt và không che dòng đầu/nút; quan sát native Mini/Full, clock, animation và âm thanh không hồi quy. Kiểm thử cả chế độ font lớn và màn nhỏ.
