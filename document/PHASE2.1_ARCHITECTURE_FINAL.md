# Family Bloom Phase 2.1 – Architecture Final

## Profile data contract
- Domain `UserProfile` uses `null` for optional scalar fields so the UI receives a stable shape.
- Firestore writes never contain `undefined`; `removeUndefinedDeep()` is the final write guard.
- `shortName` is optional and is normalized to `null` when the user does not provide a nickname.
- `gender` is required in the domain and defaults to `other`.
- `interests` and `fcmTokens` default to empty arrays.
- Reads go through `normalizeUserProfile()` so old documents with missing fields remain compatible.

## Media assets
`media_assets/{mediaId}` is a durable lifecycle record independent from Cloudinary.

Lifecycle:
1. Create asset with `uploading`.
2. Upload to Cloudinary.
3. Update asset with Cloudinary IDs and `uploaded`.
4. Atomically attach the profile/business document and set asset to `attached`.
5. If attachment fails, mark asset `cleanup_pending` for later cleanup.

Purpose is business metadata (`avatar`, `event`, `calendar`, `moment`, `album`, `document`, `chat`). It does not create a Cloudinary preset per screen.

Cloudinary presets are selected by media type:
- image → `family_bloom_image`
- video → `family_bloom_video`

## Centralized errors
All provider/application errors are normalized by `src/services/error/errorService.ts`.
UI can continue importing `parseAppError` from `src/constants/errorConstants.ts` for backward compatibility, but the implementation is now centralized.

Provider codes are normalized to lowercase before comparison. UI does not inspect Firebase/Axios/Cloudinary error strings directly.

## Avatar transaction boundary
Cloudinary and Firestore are independent systems, so there is no true distributed transaction. The implementation uses a compensating lifecycle through `media_assets` rather than pretending they are atomic.

## media_assets schema
Each asset stores `ownerUid`, optional `familyId`, business `purpose`, `entityType/entityId`, provider (`cloudinary`), media type, provider IDs/URLs, and lifecycle `status`. This makes the record reusable for avatar, event, calendar, moment, album, document and chat media without redesigning the schema later.
