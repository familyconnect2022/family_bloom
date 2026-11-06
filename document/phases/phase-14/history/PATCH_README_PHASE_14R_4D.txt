Family Bloom — Phase 14R.4D
TIME CAPSULE HORIZONTAL BOX COLLECTION
Date: 2026-10-01
Base: Phase 14R.4C Focus View Generation Hierarchy Hotfix

WHAT CHANGED
1. Hộp thời gian list now has exactly two collection rails:
   - Hộp dành cho tôi
   - Hộp tôi gửi
   Both rails scroll horizontally, snap item-by-item, and use bounded FlatList rendering.

2. Real themed box visuals replace the old vertical text cards:
   - Ấm áp: pink/cream
   - Trang trọng: blue/silver
   - Rộn ràng: butter-yellow/pink

3. Ordering in both rails:
   - Due + unopened first
   - Future boxes next, nearest opening time first
   - Opened boxes last, newest opened-time target (openAt order) first

4. Open-state behavior:
   - Recipient: due + unopened => Mở ngay + bounded shake.
   - After first reveal: state becomes Đã mở, shake stops permanently.
   - Sender: once any recipient opens, the sender-side box becomes ajar.
   - Multi-recipient boxes show X/N đã mở; partial open uses a partially ajar lid, all-open uses the full open target.

5. Ajar/open visual state is ANIMATED, never snapped:
   - 560 ms eased lid lift/rotation
   - letter peek + warm glow appear with the same native-driver timeline
   - Reduce Motion skips the transition safely

6. Date / time selector alignment fixed:
   - same 64 px trigger height
   - BloomDatePicker wrapper no longer adds inherited bottom margin

7. Open-state persistence / migration:
   - /opens/{uid} remains the canonical per-user first-open receipt.
   - openedByUids is a best-effort metadata summary to render sender/recipient rails without per-capsule listeners.
   - Existing boxes created before 14R.4D are hydrated from /opens only when already due and missing the summary.
   - No new sender realtime listener was added.
   - First openedAt is preserved on reveal replay.

FIRESTORE RULES
Updated firestore.rules and firestore.cloud.rules are included. The app remains compatible with the previously deployed Time Capsule rules because creation does not require openedByUids and the canonical /opens receipt is still written first. Deploy the new rules when convenient to enable the efficient metadata summary path for future opens.

TEST / BUILD
Release script now also runs:
  npm run phase14r4d:check

Recommended on-device checks:
- Open Hộp thời gian and verify only the two horizontal rails exist.
- Verify the next item peeks at the right edge and horizontal snapping feels smooth.
- Create one box per theme and confirm the physical box colors differ.
- Let an incoming box reach its time: it should shake only while unopened.
- Finish the reveal and return: it should animate from closed to open and show Đã mở; no shake.
- On the sender account, refresh/re-enter the screen: the corresponding sent box should animate ajar and show X/N đã mở.
- Verify Ngày and Giờ triggers have identical height.
