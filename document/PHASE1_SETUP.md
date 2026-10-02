# Family Bloom — Phase 1 Foundation

## What was rebuilt

- Auth state machine: initializing → signed-out/signed-in → profile loading/missing/ready.
- Google Sign-In configuration moved to Expo public config.
- Real Firebase Phone Auth: send OTP, confirm OTP, resend OTP.
- Profile persistence to `users/{uid}`.
- First-family creation in the same Firestore batch as the owner membership.
- No hard-coded `family_one` dependency.
- Firestore rules for user/profile + family + membership access.
- Avatar upload happens after the family is created, then profile is updated.
- Cloudinary upload retry uses bounded exponential backoff.
- Removed the invalid `undefined` dependency.
- Extracted domain types into `src/types`.

## Firebase checklist

1. Enable **Phone** provider in Firebase Authentication.
2. Enable **Google** provider in Firebase Authentication.
3. Add the Android SHA-1/SHA-256 fingerprints required by your Firebase project.
4. Configure iOS APNs/Push settings required by Firebase Phone Auth.
5. Deploy `firestore.rules` before testing production data.
6. Keep `google-services.json` and `GoogleService-Info.plist` matched to the Firebase project.

## Cloudinary checklist

The current Expo public config contains:

- `googleWebClientId`
- `cloudinary.cloudName`
- `cloudinary.uploadPresets.image`
- `cloudinary.uploadPresets.video`

These are client-side configuration values, not server secrets. Never put a Cloudinary API secret in the mobile app.

## Run

```bash
npm install
npx expo start --dev-client
```

For native builds:

```bash
npx expo run:android
npx expo run:ios
```

## Firestore deployment

With Firebase CLI configured for this project:

```bash
firebase deploy --only firestore:rules
```

## Expected Phase 1 flow

```text
Launch
  ↓
Login
  ├── Google → Firebase Auth
  └── Phone → OTP → Firebase Auth
  ↓
Load users/{uid}
  ↓
Missing profile → Create Profile
  ↓
Create family + owner membership + profile (atomic batch)
  ↓
Optional avatar upload
  ↓
Family Home
```

## Important limitation

Phone Auth requires the Firebase native project to be correctly configured. The code now calls the real React Native Firebase API; SMS delivery cannot be verified from a static code audit alone.
