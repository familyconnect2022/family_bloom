# Family Bloom Phase 2 — Full Baseline

This package is the Phase 2 full-code baseline.

Key decisions retained:

- `shortName` is optional and normalized to `null` when absent.
- `gender` is required in the domain model and defaults to `other`.
- Firestore writes never contain `undefined`.
- Profile reads normalize missing optional fields to `null` and arrays to `[]`.
- Users without a family stay on `family-gateway`; family tabs are not shown until `activeFamilyId` exists.
- The first user can create a family and becomes its admin/owner.
- A human-friendly unique `familyCode` is stored separately from the technical `familyId`.
- Errors are normalized through the central error service.
- Cloudinary media is abstracted behind `mediaService`.
- `media_assets` is the durable media lifecycle record.
- User avatar storage is user-scoped; family media is family-scoped by `familyId`.
- `app.json` settings are preserved in this package; no native configuration changes are required for the media-folder refactor.
