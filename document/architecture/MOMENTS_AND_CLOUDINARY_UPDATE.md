# Family Bloom — Moments & Cloudinary update

## Moments / Timeline
A family has a wall-like timeline at `families/{familyId}/moments/{postId}`.
Each post stores caption, author snapshot, one or more Cloudinary media records, visibility, reaction counters and comment counter.

Subcollections:
- `comments/{commentId}` — comment text + author snapshot + timestamps.
- `reactions/{uid}` — one reaction per member. Supported: like, love, haha, wow, sad, celebrate.

Reaction counters are updated in a Firestore transaction so changing a member's reaction is atomic with the post counter update.

## Event / Calendar media
`FamilyEvent.attachments` stores one or more Cloudinary `secureUrl` values.
`attachmentPublicIds` stores the matching Cloudinary public IDs when available. Firestore stores metadata/URLs; image/video bytes remain in Cloudinary.

## Cloudinary folder convention
- `family_bloom/{familyId}/moments`
- `family_bloom/{familyId}/events`
- `family_bloom/{familyId}/users`

For production, keep the Cloudinary API secret out of the mobile app. Prefer signed upload authorization or a secure upload preset appropriate to the project.
