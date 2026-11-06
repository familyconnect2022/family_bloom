# Phase 2.1 Final Test Checklist

## Static checks performed
- `app.json` parsed successfully as JSON.
- All `.ts`/`.tsx` files passed delimiter-balance scan.
- No Markdown files remain outside `document/`.
- `family-join-requests.tsx` renderItem JSX closes with `)}` correctly.
- `create-profile.tsx` gender state defaults to `other` and `GENDER_OPTIONS` is type-safe.
- `CreateProfileInput.shortName` is optional.
- `UserProfile` normalizes optional scalar fields to `null` and arrays to `[]`.
- Firestore writes pass through `removeUndefinedDeep` at the data-service boundary.
- `media_assets/{mediaId}` lifecycle is represented in types, paths, service and Firestore rules.
- Cloudinary presets are selected by media type, not by UI screen/purpose.
- Error normalization is centralized in `services/error/errorService.ts`; the old constants path only re-exports it.

## Android test
From the project root:

```bash
npm install
npx expo run:android
```

## Profile test cases
1. Create a profile with only the required full name.
2. Leave nickname, phone, birthday, location and bio empty.
3. Confirm the profile saves successfully.
4. Confirm `gender` is `other` when not changed.
5. Confirm nickname is `null` in the normalized profile, not a fabricated name.
6. Create a profile with an avatar.
7. Confirm a `media_assets` record moves through `uploading` → `uploaded` → `attached`.
8. Confirm the user profile stores the Cloudinary URL/public ID only after the media upload succeeds.

## Failure tests
- Disable network during media upload: profile should not be attached with a fake avatar URL; the media asset should become `failed`.
- Make the profile write fail after media upload: media asset should become `cleanup_pending` rather than silently disappearing.
- Trigger Firebase/Axios/Cloudinary errors: UI should use `parseAppError()` and should not inspect provider strings itself.

## Family Code & UX update
1. Create family with Vietnamese name, e.g. `Gia đình Bloom`.
2. Confirm a readable unique `familyCode` such as `gia-dinh-bloom-4827` is created in `family_codes` and linked to the new `familyId`.
3. Confirm the creator is admin and can see the family code before entering the house.
4. Confirm entering the family code from another account creates a pending join request; invalid code shows “Không tìm thấy gia đình”, not “server busy”.
5. Confirm the family-name keyboard opens automatically on Android.
6. Confirm save/create shows a blocking loading overlay and a darker primary loading button.
7. Confirm login image no longer shows the previous opaque-image halo while loading.
8. Confirm old Firestore `familyId` values still work for joining.
