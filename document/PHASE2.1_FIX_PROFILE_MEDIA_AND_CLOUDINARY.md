# Family Bloom 2.1 — Profile, Firestore & Media Fix

## 1. Profile / Firestore

`create-profile.tsx` now builds the profile payload without optional fields set to `undefined`.

- `gender` defaults to `"other"`.
- `GENDER_OPTIONS` is typed as `Gender`, so `setGender(item.key)` needs no unsafe cast.
- Optional `phoneNumber`, `birthDate`, `currentLocation`, and `bio` are added only when they contain a value.
- `profileService` sanitizes data recursively before every profile write.
- Family join request writes also remove `undefined` values recursively.

## 2. Family join requests

`src/app/family-join-requests.tsx` was rewritten into normal multiline JSX/TypeScript to remove the malformed-brace (`}`) syntax issue and make the `renderItem` block unambiguous.

## 3. Avatar UI

The create-profile avatar is 140px and uses a 70px overlap, keeping approximately half of the avatar in the header and half below it.

## 4. Cloudinary architecture

The app no longer models Cloudinary as one avatar-specific preset.

`app.json` contains:

```json
"cloudinary": {
  "cloudName": "g7fnsxw5",
  "uploadPresets": {
    "image": "family_bloom_image",
    "video": "family_bloom_video"
  }
}
```

The runtime flow is:

`screen/hook -> mediaService -> cloudinaryService -> Cloudinary`

Use cases such as avatar, event, calendar, moment, album, document and chat remain business purposes/categories; they do not require a separate preset each. The preset is selected by resource type (`image` or `video`).

`mediaService.uploadImage()` and `mediaService.uploadVideo()` are available for future screens.

## 5. Cloudinary dashboard requirement for this development build

Create these two upload presets in Cloudinary and set their signing mode to **Unsigned**:

- `family_bloom_image`
- `family_bloom_video`

Do not put a Cloudinary API Secret in `app.json` or the React Native app.

## 6. Android test

After replacing the project files:

```bash
npm install
npx expo run:android
```

If `app.json` or native configuration changes, rebuilding with `npx expo run:android` is required.
