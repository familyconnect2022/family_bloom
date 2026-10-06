# Phase 15A — Structure & Bloom Supper Consistency

Baseline: Phase 14V4P Chess Board Local Overlay Host.

## Mục tiêu

Phase này diễn ra trước vòng performance toàn app. Mục tiêu là giảm nợ cấu trúc và đưa trải nghiệm người dùng về cùng một ngôn ngữ Bloom để vòng profiling sau đó không phải tối ưu trên một source tree đang tiếp tục thay đổi lớn.

## Cấu trúc

- Tài liệu được phân vào `document/phases`, `architecture`, `firebase`, `handoff`, `guides`.
- Các route Home, Family và Activity được gom bằng nested Expo Router route-groups. Route URL cũ được giữ nguyên vì nhóm `(…)` không xuất hiện trong URL.
- `src/data` được chia thành `games`, `kitchen`, `music`; app, service và regression/catalog scripts đều dùng path mới.
- Không di chuyển `components`/`services` hàng loạt khi chúng đã chia domain rõ ràng; tránh churn chỉ để thay đổi hình thức.

## Bloom UI

- `BLOOM_SUPPER` là shared visual token cho card, modal, toast, backdrop, glow, border, radius và shadow.
- Home dùng Bloom Supper Hero đầy đủ và đặt mái nhà đang active ngay trong hero.
- Các route người dùng chính có Bloom Hero; internal performance routes, legacy redirect và visual demo được phép không có hero.
- Welcome/Join/Loading/Confirm/Date/Time surfaces dùng chung Bloom Supper modal language.
- Event/Moment/Pending Moment và BloomCard dùng shared card surface/token để giảm drift.

## Input & keyboard

- Form cuộn dùng `BloomKeyboardScreen`.
- List-based screens không thể lồng ScrollView dùng `ScreenContainer keyboardSafe` và Android `softwareKeyboardLayoutMode=resize`.
- `BloomTextInput` gọi keyboard focus context khi focus và khi multiline tăng chiều cao.
- Không còn route production dùng `BloomTextInput` mà thiếu một keyboard-safe host.

## Copy

Copy kỹ thuật hiển thị cho người dùng được thay bằng cách nói ấm áp: “người giữ nhà”, “Bloom đang mở bàn cờ”, “Bloom cất kín lời nhắn”… Internal variable/service/log terminology vẫn giữ nguyên trong code.

## Regression guard

Chạy `npm run phase15a:check` cùng các gate Phase 14V4P/V4K/V4J và Chess core trước khi đóng FULL ZIP.
