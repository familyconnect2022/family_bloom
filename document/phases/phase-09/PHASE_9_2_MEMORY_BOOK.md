# Phase 9.2A + 9.2B — Bloom Memory Book

- Reader + editor share one editorial screen (`/memory-book`).
- Scope: Family or Person.
- Source media/Moments are referenced, never copied.
- Family books use only Family Timeline Moments; Person books use tagged Person Moments.
- Bounded one-shot reads (max 120), no new realtime listener.
- Reader/editor uses FlatList virtualization.
- Editor can include/exclude entries, reorder selected entries, edit title, and save draft metadata/references.
- Firestore `families/{familyId}/memoryBooks/{bookId}` is family-readable and creator-editable.
- Carried fixes: profile/member Back button on the left; iOS bundle identifier corrected to `com.family.ios`.
