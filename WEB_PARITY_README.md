# Family Bloom Web Parity — Phase 17.9W2

Family Bloom Web is a first-class client for **iPhone, iPad and desktop**. It shares the same Firebase project, Firestore data, Cloudinary media and Render realtime game server as Android A17.

The only intentional web exclusions are:

- OS/background push notifications
- haptics / vibration

Everything else in W2 is designed to follow the Android data contracts and product flows as closely as practical.

## What W2 includes

### Account and family
- Google and phone/OTP sign-in with browser session persistence.
- Create a family, join with family code/ID, admin approve/reject, family switch.
- Full profile editing: display/short name, avatar, phone, birthday, gender, location, bio, blood type, interests and Bloom color.
- Avatar upload uses the same managed Cloudinary + `media_assets` lifecycle as Android (`purpose=avatar`, `entityType=user`).

### Home
- Same active family, members, recent Moments and upcoming events.
- Persistent Firestore browser cache (IndexedDB) and online/offline feedback.

### Kỷ niệm
- Read/post photo and video Moments through the same Cloudinary presets.
- Person tagging (`personIds`), reactions, comments and own-post delete.
- Family Timeline view.
- Bloom Memory Book for family/person scope using `families/{familyId}/memoryBooks`.

### Lịch
- Create/edit/delete events, recurrence, participant selection and family-shared data.

### Phả hệ
- Same `persons` and `relationships` collections.
- Create/edit people and relationships.
- Pan, wheel zoom, one-finger pan and two-finger pinch zoom for iPad/touch.
- Focus/inspector experience adapted for browser.

### Nhà Mình
- Bảng tin.
- Lời thì thầm + hearts.
- Cùng quyết định / Poll.
- Hộp thời gian.
- Quỹ gia đình.
- Bếp Nhà Mình with search above preferences.
- Six family mini games using the same Firestore sessions/responses/secrets/active slots.

### Chess and Xiangqi
- Same Render Socket.IO server and Firebase Web ID token authentication.
- Global family presence and challenge card from every web tab.
- Family lobby, challenge/accept/reject.
- Five time controls.
- Server-authoritative clocks/state/results.
- Premove, draw/resign/rematch, reconnect/recovery and result ACK.
- The 11 approved game sounds.
- Bloom Bot pacing remains server-authoritative.
- Safari background/foreground maps to app/board presence; returning recovers/resyncs the active game.

## Device layouts

- **iPhone / narrow browser:** bottom tabbar, single-column mobile layout, safe-area aware.
- **iPad portrait:** navigation rail with responsive two-pane sections.
- **iPad landscape:** wider graph/game/content panes and safe-area handling.
- **Desktop:** expanded navigation rail and larger bounded content surface.

## Local preview

```bash
npm install
npm run web:parity:check
npm run web:preview
```

Or double-click:

```text
Family_Bloom_WEB_PREVIEW.bat
```

## Static production build

```bash
npm run web:build
```

Or double-click:

```text
Family_Bloom_WEB_EXPORT.bat
```

Expo writes the production site to `dist/`.

## Vercel

`vercel.json` uses:

- Build command: `npm run web:build`
- Output directory: `dist`

After assigning the production domain:

1. Add the domain to **Firebase Authentication → Authorized domains**.
2. Add the domain to the Render Socket.IO CORS allowlist if production CORS is restricted.
3. Keep Firebase Web / Cloudinary unsigned preset / Render URL values as Vercel `EXPO_PUBLIC_*` environment variables when overriding the bundled public defaults.

Firebase web config and unsigned Cloudinary preset names are public client configuration; Firebase Admin credentials and other server secrets must never be exposed to the browser.

## Safari lifecycle and cache

Firestore uses persistent IndexedDB cache with multi-tab coordination. Firebase Auth uses browser local persistence.

When Safari becomes hidden, Family Bloom leaves global game presence and an active board sends `boardPresence=false`. Returning to the page re-joins presence and recovers/resyncs through the authoritative server.

## PWA shell

W2 retains the manifest and Apple touch icon so iPhone/iPad users can use **Add to Home Screen**. A service worker is intentionally not enabled yet, avoiding stale cached deployments while web parity is still being tested.
