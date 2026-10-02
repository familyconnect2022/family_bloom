# Phase 11.0 Activity / Badge / Graph UX Hotfix

Device feedback addressed:

1. A Person tagged in a Moment did not reliably see a Home badge.
   - Target resolution now uses `Person.linkedUid` first and falls back to the canonical `personLinks` projection.
   - Activity metadata creation retries twice after a published Moment using deterministic activity ids, so retries stay idempotent. Failure still never rolls back the Moment itself.
   - Home rechecks the bounded activity badge twice after the existing realtime Moment/Event head changes, without adding another realtime listener.
   - Only linked accounts receive a targeted badge; an unlinked Person still receives the Person Timeline association but has no account to notify.

2. Opening a Moment from “Chuyện trong nhà” could feel slow because the feed paged through older Moments.
   - The target Moment is now fetched directly by id and temporarily injected into the already-mounted Moments feed. A lightweight Bloom “Đang mở kỷ niệm…” status appears while the direct read resolves.
   - Cross-family deep links carry the family id and wait for the correct active family before resolving.

3. The add-person entry in Family Graph was not visually obvious.
   - Admins now get an explicit `Thêm` action beside Graph search in addition to the existing management route. The composer also restores a clear gap between “Chọn người liên quan” and “Ảnh / Video” so the two touch targets no longer look attached.

No new realtime listener was added. Firestore Rules/schema are unchanged in this hotfix.
