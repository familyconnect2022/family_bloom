# Family Bloom Web Companion W1

W1 is a browser companion for iPhone/iPad/desktop users while the native iOS build path is still being prepared.

## What W1 shares with Android

- The same Firebase Authentication project.
- The same `users/{uid}` profile and membership reverse index.
- The same active family and family member documents.
- The same Moments, Events, Family Graph, Nhà Mình collections.
- The same Render Socket.IO backend for Chess and Xiangqi.
- The same server-authoritative clocks, moves, bot pacing and game locks.

No web-only Firestore copy is created.

## What W1 intentionally does not do yet

- Create/join a family from the browser.
- Publish/edit Moments.
- Edit the Family Graph.
- Full Chess/Xiangqi lobby UI or premove UI.
- Native push notification parity.
- Offline service-worker caching.

Those are follow-up web phases after the browser shell and auth/data contract are validated.

## Run locally

After copying the FULL build, run `Family_Bloom_CLEAN_APPLY_FULL.bat` once. It installs the Firebase Web SDK if needed.

Then:

```bash
npx expo start --web -c
```

or:

```bash
npm run web:preview
```

The web bundle uses `.web.tsx` route/layout files. Android keeps the native A17 route files.

## Production/static preview

```bash
npm run web:build
```

Expo Router exports the static website to `dist/`. Upload `dist/` to an HTTPS static host (Firebase Hosting, Vercel, Netlify, Cloudflare Pages, etc.).

Before Google or Phone Auth is tested on that public URL, add the hostname in:

**Firebase Console → Authentication → Settings → Authorized domains**

For a long-lived deployment, register a **Web App** inside the existing `family-connect-4184f` Firebase project and place its `appId` in:

```env
EXPO_PUBLIC_FIREBASE_WEB_APP_ID=...
```

The W1 code deliberately does not reuse the Android Firebase App ID as a fake web ID. Auth and Firestore can initialize from the existing public project config while you register the browser app properly.

## iPhone / iPad

Once hosted on HTTPS, open the URL in Safari. The W1 HTML includes an Apple touch icon and a small web manifest so Safari can add Family Bloom to the Home Screen. W1 does not install a service worker yet, so updates are not trapped behind an offline cache.

## Game server

W1 defaults to the existing Render endpoint:

```env
EXPO_PUBLIC_CHESS_SOCKET_URL=https://family-bloom-chess.onrender.com
```

Chess and Xiangqi obtain the signed-in Firebase Web ID token and send it in the same Socket.IO handshake used by Android.
