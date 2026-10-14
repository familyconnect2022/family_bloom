# Family Bloom Phase 17.9W3 + A18 — Web Stability/Visual Rebuild + Single-Icon Native Tabbar

## Base

- Web base: **Phase 17.9W2 Web Parity iPhone/iPad/Desktop**.
- Native base: **Phase 17.9A17 Native-Persistent UI-thread Tabbar**.
- Realtime game server remains the A16/A17 server-authoritative Chess + Xiangqi baseline.

## Why this rebuild exists

Real-device/web testing exposed three problems that static W2/A17 gates did not capture well enough:

1. The A17 two-glyph native tab icon architecture still produced visible icon displacement on the user's Android device.
2. The curved/glow tab indicator felt more expensive than the earlier single-icon tabbar.
3. W2 web looked substantially flatter/sparser than the intended Bloom mockups, had weak content hierarchy, and browser scrolling felt unclear.
4. W2 enabled Firestore multi-tab IndexedDB persistence. Firebase's IndexedDB client metadata/lease code can log `Detected an update time that is in the future` even for a 1 ms wall-clock reversal/hot-reload/multi-tab timing edge.

## A18 native tabbar

- Exactly **one Ionicons glyph per tab**.
- No active/inactive overlay glyph.
- No glyph scale animation.
- No glyph mount/unmount on active change.
- Active state only changes the single glyph color.
- One fixed 26x26 icon slot per tab.
- One 50x36 pill only; the glow layer is removed.
- Pill animation is transform-only on Reanimated UI thread.
- Motion duration reduced from 232 ms to **184 ms**.
- `detachInactiveScreens={false}` and `lazy:false` remain, preserving warm native tab surfaces.
- Main screen transition remains `none` through `BLOOM_MOTION.tabs.animation`.

## W3 Firestore/browser stability

- Removed Firestore `persistentMultipleTabManager` / persistent IndexedDB coordination from the web critical runtime.
- Web Firestore now initializes with `memoryLocalCache()`.
- Firebase Auth still uses `browserLocalPersistence`, so sign-in survives browser relaunches.
- Firestore realtime listeners continue to recover data immediately after page launch/reconnect.
- This intentionally trades offline document persistence for a cleaner/stabler Safari/Chrome runtime during the current web rollout.
- Preview/export/clean BATs now detect an outdated Firebase Web SDK baseline and run `npm install` when needed.

## W3 web visual rebuild

### Scrolling/layout

- Root browser body is fixed to the app viewport and the Family Bloom content surface owns scrolling explicitly.
- `.bloom-body` uses `overflow-y:auto`, `min-height:0`, iOS momentum scrolling and overscroll containment.
- iPhone keeps the bottom navigation.
- iPad keeps the navigation rail and two-pane responsive layout.
- Desktop keeps the expanded rail with bounded content width.

### Global Bloom language

- Rebuilt the color/surface/shadow/radius system around warmer Bloom pink/cream/lilac/mint surfaces.
- Replaced symbol-like navigation glyphs with real Ionicons on web.
- Reduced technical copy shown to family members.
- Cards now use stronger hierarchy, richer pastel grouping and denser content rather than large empty white blocks.

### Home

Home is rebuilt rather than patched:

- large Bloom hero greeting card;
- live family member count;
- photo collage from recent Moments;
- horizontally scrollable recent-memory strip;
- upcoming family schedule;
- family/Graph overview with avatar stack;
- Nhà Mình quick actions;
- additional family rhythm/stat surfaces;
- enough vertical content to make scrolling explicit on phone, iPad and desktop.

### Login

- responsive Bloom login composition;
- richer desktop/iPad story panel;
- compact mobile sign-in card;
- existing Google + Phone OTP logic unchanged.

### Planner / other tabs

- Planner rebuilt with month/upcoming/family summary surfaces, richer event cards and a side rhythm panel on wider screens.
- Moments, Graph and Nhà Mình retain their full W2 feature logic but inherit the new scroll/layout/card visual system.
- User-facing subtitles were rewritten to warm Bloom copy rather than technical implementation language.

## Data/backend safety

SHA comparison against the original W2 full build confirms these remain byte-for-byte unchanged:

- `src/components/chess/ChessBoard.tsx`
- `src/components/chess/ChessSurfaceHost.tsx`
- `src/components/xiangqi/XiangqiGameBoard.tsx`
- `server/src/socket/socketServer.ts`
- `server/src/xiangqi/xiangqiGameManager.ts`
- `firestore.rules`
- `firestore.indexes.json`

No Firestore schema migration is introduced by W3/A18.

## Regression gates

- W1 Web Companion compatibility: **49/49 PASS**
- W2 Web Parity compatibility: **88/88 PASS**
- W3 Web Stability + Visual Rebuild: **34/34 PASS**
- A17 native tabbar compatibility: **33/33 PASS**
- A18 Single-Icon Tabbar: **15/15 PASS**
- Phase 17 main-tab lifecycle: **56/56 PASS**
- Phase 16B15 Chess/Xiangqi smoothness: **50/50 PASS**
- Current Chess + Xiangqi aggregate: **20/20 PASS**
- Release Readiness: **11/11 PASS**
- Full TS/TSX scan is also exercised by the current Chess gate.

## Build/deploy notes

### Android

No new native dependency is added. If the previous A17/W2 Android development build already runs, use:

```bash
npx expo start -c
```

A Render redeploy is **not required specifically for W3/A18** because game server code is unchanged from W2.

### Web

Use:

```text
scripts/windows/web/Family_Bloom_WEB_PREVIEW.bat
```

or:

```bash
npm run web:preview
```

Static build:

```text
scripts/windows/web/Family_Bloom_WEB_EXPORT.bat
```

The BAT verifies/updates the Firebase Web SDK baseline before preview/export.

## Build-environment limitation

The artifact environment does not contain project `node_modules`, so this report does not claim a real `expo export --platform web` execution. Source boundaries, syntax and project regression gates are verified; the supplied Preview/Export BAT performs the real dependency install and Expo bundle on the user's development machine.
