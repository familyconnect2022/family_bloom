# Family Bloom — Phase 2 Full Build

## Included in this baseline

- Human-friendly unique `familyCode` alongside technical `familyId`.
- User without a family is held at `family-gateway`; tabs are not shown before `activeFamilyId`.
- `shortName` remains optional and normalizes to `null`.
- `gender` defaults to `other`.
- Firestore writes strip `undefined`; read normalization supplies stable nullable domain fields.
- Centralized error normalization handles provider casing differences.
- Durable `media_assets/{mediaId}` lifecycle is used by avatar upload.
- Cloudinary folders are now scoped as follows:
  - user avatar: `family_bloom/users/{uid}/avatar`
  - family event/moment/album/document/member media: `family_bloom/families/{familyId}/{category}`
- Image/video presets remain type-based (`family_bloom_image`, `family_bloom_video`) and are not duplicated per screen.
- `app.json` is preserved from the Phase 2.1 baseline and was not changed by this refactor.

## Validation

Run `npm run phase2:check` after installing dependencies. The check validates TS/TSX delimiter balance, required Cloudinary public configuration in `app.json`, and scans all source files.
