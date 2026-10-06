# Family Bloom — Phase 14D Nhà Mình Music + TODO

Base code **duy nhất** cho build này:
`Family_Bloom_Phase_14C_1_MEMBER_PICKER_INDEX_UX_HOTFIX_FULL_2026-09-29`

Nguồn user upload ngoài ZIP: `full code 14C.zip`.
SHA-256 base upload: `a1e58799fcf4881859807f1deff27995eba040feaa471238aafa78e998e4bf93`.

## 1. TODO UX đã gom vào build
- Không dùng Android native `Alert` trong Lời thì thầm / Cùng quyết định; dùng `BloomConfirmModal`.
- Các input quan trọng dùng keyboard focus/reveal để nội dung đang nhập không bị bàn phím che.
- Validation chỉ hiện đúng lúc cần, highlight field liên quan và đưa focus về field.
- Note retention/guidance chuyển sang `BloomNoteCallout`: wording ấm hơn, icon + nền nhấn Bloom.

## 2. Bếp Nhà Mình — invariant thực đơn chung
- `Ăn bình thường` / không có filter = **không có personalization**.
- Cùng `familyId` + cùng ngày => sáng/trưa/tối dùng seed chung, mọi user mặc định thấy cùng menu.
- Menu mặc định đổi theo ngày.
- Chỉ khi user chủ động chọn filter khác `normal` mới đưa `uid + filter signature` vào seed.
- Xóa filter sẽ xóa preference doc và quay lại menu chung của ngày đó.
- `Đổi món` chỉ khả dụng khi đang ở chế độ đã cá nhân hóa; default shared menu không nhận local swap offset để tránh hai user mặc định nhìn khác nhau.

## 3. Nhạc Nhà Mình nằm trực tiếp trong tab Nhà Mình
Không mở một trải nghiệm nhạc riêng. Route `/home-music` cũ chỉ redirect về `/(tabs)/play` để giữ deep-link compatibility.

### Bloom Supper section
- Hero lavender/pink full card, decoration + title + subtitle + cycle badge.
- Search nằm trong hero, không để ô tìm kiếm trơ trọi.
- Tabs ngang: `Playlist` / `Yêu thích` / `Bài hát Nhà Mình`.
- Search result có `Yêu thích` và `Thêm vào Nhà Mình` trực tiếp.

### Playlist tự động
- Chu kỳ mặc định: **3 ngày**.
- Target: **20 bài**.
- Mix: 25% nhẹ nhàng (5), 20% vui vẻ (4), 15% acoustic/chill (3), 20% trending (4), 20% recent/new (4).
- Snapshot được tạo một lần theo family/cycle và đóng băng trong `homeMusicCycles` để cả nhà thấy cùng track/order.
- Loại/down-rank track của ~3 chu kỳ gần nhất; artist cap 2 bài khi chọn chính.
- Provider abstraction tách riêng; V1 dùng Audius.

### Yêu thích và Bài hát Nhà Mình
- Yêu thích: private theo `users/{uid}/homeMusicFavorites`.
- Bài hát Nhà Mình: chung gia đình ở `families/{familyId}/homeMusicSongs`.
- Một provider track dùng một doc ID nên UI tránh đăng trùng.

## 4. Player và hiệu năng
- Tận dụng dependency `expo-video` đã có sẵn; **không thêm npm dependency mới**.
- Một `HomeMusicPlayerProvider` cấp player persistent qua navigation.
- Dùng `replaceAsync` để tránh synchronous media replacement trên UI thread.
- Search debounce 360ms + AbortController + cache 10 phút (bounded 30 entries).
- Track list render theo block 20 bài + Xem thêm.
- Artwork dùng `expo-image` recyclingKey.
- Player progress context được tách khỏi control context để time update mỗi giây không bắt cả danh sách track rerender.
- Queue V1 là local theo thiết bị/user, chưa đồng bộ điều khiển nghe chung giữa nhiều máy vì contract đó chưa được duyệt.
- Player reset khi đổi family để không phát nhạc của family trước trong context family mới.

## 5. Firebase / native impact
- Thêm Rules cho `homeMusicCycles`, `homeMusicSongs`, `homeMusicFavorites` ở cả `firestore.rules` và `firestore.cloud.rules`.
- Không thêm composite index mới cho Phase 14D.
- Không cần Functions mới.
- `app.json` bật plugin `expo-video.supportsBackgroundPlayback=true`; vì đây là native config, cần rebuild app binary/dev client trước khi test background playback/Now Playing.
- Android vẫn giữ `softwareKeyboardLayoutMode=resize`.
- iOS bundle id vẫn `com.family.ios`.

## 6. Audius scope
Read/search/trending/stream dùng public read API. Code loại track `is_stream_gated` khỏi kết quả V1. Không nhúng bearer token hoặc secret trong app.

## 7. Validation ở môi trường build
- Phase 14D static contract: **47 PASS / 0 FAIL**.
- Phase 14C regression static: **44 PASS / 0 FAIL**.
- TS/TSX syntax transpile: **198/198 PASS**.
- JSON parse (`app.json`, `package.json`, `package-lock.json`): PASS.
- Không có `expo-audio`; không có `node_modules` đóng gói.

Chưa tuyên bố Android/iOS native build PASS, Firestore emulator Rules PASS, Audius runtime/network PASS hoặc real-device performance PASS. Các mục đó cần chạy trên môi trường/device của user.
