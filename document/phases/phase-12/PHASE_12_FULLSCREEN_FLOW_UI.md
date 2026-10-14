# Phase 12 · Full-screen flow UI

Phase 12 chuẩn hóa các luồng có nội dung dài thành **full-screen page** thay vì bottom-sheet kéo lên/xuống.

## Quy tắc UX

1. Tạo/sửa/quản lý nhiều bước dùng `BloomFullScreenFlow`.
2. Header luôn có Back rõ ràng, eyebrow, tiêu đề và một câu dẫn ngắn mang giọng Bloom.
3. Luồng có dữ liệu người dùng đang nhập cần cảnh báo trước khi bỏ thay đổi.
4. Modal nhỏ vẫn được dùng cho micro-interaction: confirm, date/time picker, reaction/menu, media viewer và loading overlay.
5. Không dùng drag handle để biểu diễn một trang làm việc dài.

## Màn hình đã chuẩn hóa

- Event create + moderation.
- Moment create/edit/moderation + inline fallback edit.
- Profile edit.
- Family switcher.
- Person detail + person timeline composer.
- Family Graph member link.
- Graph proposal create/relation picker/review.
- Family person multi-picker.
- Router presentation cho create-profile/profile/notifications/family-join-requests.

## Regression guard

Chạy:

```bash
node scripts/test-phase12-fullscreen-flow-ui.js
node scripts/test-phase11-final-performance-gate.js
node scripts/test-phase112b-harness.js
node scripts/test-phase112b-firebase-e2e.js
```

Phase 11 performance và notification/E2E foundation không bị thay đổi bởi patch UI này.
