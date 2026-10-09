# Family Bloom Phase 17.9W2 — Web Parity for iPhone, iPad and Desktop

## Base

- Native baseline: **Phase 17.9A17 Native-Persistent UI-thread Tabbar**.
- Game server baseline: **Phase 17.9A16 Chess + Xiangqi server-authoritative runtime**.
- Web baseline: **Phase 17.9W1 Web Companion Preview**.

## Product target

Web is treated as a first-class Family Bloom client for iPhone, iPad and desktop. The user intentionally excludes only:

- OS/background push notifications
- haptics / vibration

All included features use the same Firebase/Firestore/Cloudinary/Render data contracts as Android rather than a separate web data silo.

## W2 delivery

### Responsive ecosystem

- iPhone: safe-area mobile shell + bottom tabbar.
- iPad portrait: navigation rail + responsive two-pane areas.
- iPad landscape: wider graph/game/content arrangement.
- Desktop: expanded rail + bounded large content width.
- Manifest + Apple touch icon retained for Add to Home Screen.
- No service worker yet, intentionally avoiding stale deployment caches during parity testing.

### Auth, account and family

- Google web auth and phone OTP/reCAPTCHA.
- Browser local auth persistence.
- Create family; join by family code/ID; admin approve/reject requests; family switch.
- Full profile parity fields: display name, short name, avatar, phone, birthday, gender, location, bio, blood type, interests and Bloom color.
- Avatar uses managed `media_assets` lifecycle with `purpose=avatar`, `entityType=user`, `entityId=uid`, `familyId=null`.

### Firebase browser runtime

- Modular Firebase Web SDK (no native React Native Firebase imports in web dependency graph).
- Persistent Firestore IndexedDB cache with multi-tab coordination.
- Online/offline visual state.
- Same authoritative Firestore documents as Android.

### Moments / Memory

- Realtime Moments feed.
- Photo/video upload through the same public Cloudinary unsigned presets.
- Person tagging with `personIds`.
- Reactions, comments and own-post delete.
- Family Timeline browser view.
- Bloom Memory Book family/person scope via `families/{familyId}/memoryBooks`.

### Planner

- Create/edit/delete events.
- Recurrence, location/description and participant selection.
- Shared Android Firestore schema.

### Family Graph

- Realtime `persons` + `relationships`.
- Create/edit person and relationships.
- Browser pan/zoom/focus inspector.
- iPad single-finger pan and two-finger pinch zoom.

### Nhà Mình

- Board/feed.
- Whisper + heart reactions.
- Poll create/vote.
- Time Capsule create/open.
- Family Fund transactions/summary.
- Kitchen search-first UI + preferences.
- Six mini games using Android-compatible Firestore sessions/responses/secrets/active slots.

### Chess and Xiangqi

- Firebase Web ID token authenticated Socket.IO.
- Global family presence outside game screens.
- Challenge card from any web tab.
- Family lobby, challenge, accept/reject.
- Five time controls.
- Server-authoritative clocks/state/results.
- Premove for both games.
- Draw/resign/rematch/reconnect/recovery/result ACK.
- Approved 11-file game sound vocabulary.
- Safari visibility/page lifecycle controls app/board presence.
- Xiangqi protocol adds an additive `xiangqi:app:leave` event and server family-room cleanup for web background/family switch safety.

### Vercel/static deployment

- `vercel.json`: `npm run web:build` -> `dist/`.
- `Family_Bloom_WEB_PREVIEW.bat` runs W1 compatibility + W2 parity gates before preview.
- `Family_Bloom_WEB_EXPORT.bat` runs both gates before `expo export --platform web`.
- `Family_Bloom_CLEAN_APPLY_FULL.bat` verifies Firebase JS SDK and W1/W2/native gates.

## Android/native regression safety

SHA-256 comparison against the original A17 full build confirms these are byte-for-byte unchanged:

- `src/app/_layout.tsx`
- all five native tab files/shell (`src/app/(tabs)/*` checked for main routes)
- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/ChessSurfaceHost.tsx`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- `server/src/socket/socketServer.ts`
- `server/src/xiangqi/xiangqiGameManager.ts`
- `firestore.rules`
- `firestore.indexes.json`

The intentional server/runtime additions are limited to Xiangqi `appLeave` protocol/socket cleanup for Safari lifecycle and family-room switching.

## Verification

- Phase 17.9W2 web parity: **88/88 PASS**
- Phase 17.9W1 compatibility: **49/49 PASS**
- Web/server changed TS/TSX syntax scan: **35/35 PASS**
- Phase 17.9A17 native tabbar: **35/35 PASS**
- Phase 17.9A16 Xiangqi server authority: **44/44 PASS**
- Current Chess + Xiangqi aggregate: **19/19 PASS**
- Phase 16B15 smoothness: **50/50 PASS**
- Phase 17 lifecycle: **56/56 PASS**
- Phase 17.9A14 Instant Home/Firebase: **PASS**
- Release Readiness: **11/11 PASS**

## Build-environment limitation

This environment does not contain project `node_modules` and cannot be used to truthfully certify a real `expo export --platform web` production bundle. W2 therefore does **not** claim a production web-export PASS here. Source contracts, platform boundaries, syntax and regression gates are verified. On the user's development machine, the supplied BAT installs missing JS dependencies and performs the real Expo web preview/export.

## Deployment notes

- Android does not need a native rebuild for W2; no new native dependency was added.
- Firestore Rules/Indexes are unchanged and do not need redeployment.
- For full Safari lifecycle parity, deploy/restart the Render server from W2 because `xiangqi:app:leave` handling is additive server code.
- Add the final Vercel/custom domain to Firebase Auth Authorized Domains and Render CORS allowlist as applicable.
