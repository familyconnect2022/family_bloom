# Family Bloom Phase 2.1 — Local Static Test Report

## Verified in this build

- `useMediaUpload.ts`: `uploadSingleFile` explicitly returns `Promise<UploadResult>`.
- `Promise.all()` callback explicitly returns `Promise<UploadResultItem>`.
- Failure result includes every required `UploadResult` field, including `resourceType: file.type`.
- `create-profile.tsx`: optional `shortName` is omitted when empty; it is never assigned `undefined`.
- `gender` defaults to `other` and `GENDER_OPTIONS` is type-safe.
- `profileService` strips undefined values before Firestore writes and normalizes missing optional fields to `null` at the domain boundary.
- `media_assets` lifecycle is present with `uploading`, `uploaded`, `attached`, `failed`, and `cleanup_pending` states.
- Cloudinary uses separate image/video presets through `mediaService`/`cloudinaryService`.
- Markdown documentation is stored under `document/`.

## Important limitation

The build environment used to assemble this ZIP does not have a complete install of this project's `node_modules`, so a full Expo native build (`npx expo run:android`) could not be executed here. The relevant TypeScript logic was inspected and the specific `useMediaUpload` type mismatch was reproduced conceptually: the previous failure branch omitted `resourceType`, which made the `Promise.all()` result incompatible with `UploadResultItem[]`.

On the development PC, run:

```bash
npm install
npx tsc --noEmit
npx expo run:android
```

The Android command is the authoritative runtime test for the native project.
