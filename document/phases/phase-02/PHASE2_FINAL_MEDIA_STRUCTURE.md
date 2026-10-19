# Family Bloom Phase 2 — Final Media Structure

## Cloudinary namespace

- User avatar: `family_bloom/users/{uid}/avatar`
- Family events: `family_bloom/families/{familyId}/events`
- Family moments: `family_bloom/families/{familyId}/moments`
- Family albums: `family_bloom/families/{familyId}/albums`
- Family documents: `family_bloom/families/{familyId}/documents`
- Family member-scoped media: `family_bloom/families/{familyId}/members`

A user avatar is intentionally not family-scoped because one account can belong to multiple families.

## media_assets

`media_assets/{mediaId}` is the durable application record for every media lifecycle.
It stores owner, optional family scope, purpose, entity, provider, resource type, URLs/public ID and status.
The state flow is:

`uploading -> uploaded -> attached`

Failure states:

`failed` or `cleanup_pending`

`cleanup_pending` is used when Cloudinary has succeeded but the Firestore attach step fails; deletion from the provider can then be handled by a trusted cleanup worker later.

## Upload presets

`app.json` remains unchanged. The current public config uses:

- `family_bloom_image` for images
- `family_bloom_video` for videos

Purpose (`avatar`, `event`, `moment`, `album`, etc.) is application metadata and does not create a separate Cloudinary preset.
