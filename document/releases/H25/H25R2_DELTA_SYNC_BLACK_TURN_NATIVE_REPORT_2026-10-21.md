# Family Bloom H25R2 — Incremental foreground sync / black Xiangqi turn / automatic invitation reconnect

Base: H25R1 full native release. One Android applicationId `com.familybloom.android`. Chess/Xiangqi remain fully independent, server authoritative. The APK identity stays at H25 (`1.3.29`, versionCode `143039`) to preserve existing H25 gates; this release **changes native Kotlin**, and an Android APK rebuild/reinstall is mandatory. OTA alone does not update native code.

## Implemented

1. Chess client/server: `chess:game:catchup` compares revision and FEN; returns `unchanged` (clock baseline), verified consecutive move deltas, or a canonical snapshot fallback. Native Chess continues using verified one-ply motion and avoids invalidating all board cells on clock-only updates.
2. Xiangqi client/server: independent `xiangqi:game:catchup` compares revision and board piece key, returns `unchanged` (clocks), bounded contiguous move deltas, or snapshot. Native Xiangqi retains board/bitmap/View and updates player HUD dirty rectangles rather than repainting 90 intersections for a clock baseline. Board changes still use one existing native view and verified movement.
3. Chess/Xiangqi accepted Firebase invitation gate: no manual **Thử kết nối lại** button while claim/join pending. Self-retry idempotent claim/join with capped exponential backoff (Socket.IO handles transport); does not issue a second invitation or game.
4. Xiangqi black-turn input: a pending read-only foreground reconciliation no longer disables tapping the player's piece while the Socket remains connected; every move still includes `expectedVersion` and the server rejects stale, illegal or out-of-turn intents. Live Socket.IO connectivity is read at tap/paint time to avoid stale foreground transport flags. Offline transport still locks moves.
5. Android dormant game layers are `View.INVISIBLE` (not merely alpha zero), preventing hidden child hit-testing while preserving both View instances. Xiangqi native tap + input block diagnostics are emitted to the app's existing developer diagnostic path for repro analysis.

## Checks executed (source/mock/static only; NOT real-device or Gradle build)

- H25 Firebase invitations: 38/38
- H25 concurrent Render claim integration mocks: 7/7
- H25 source package required files: 102 entries
- H25R2 Xiangqi black-turn during outstanding catch-up test: 5/5
- Xiangqi H22 native/server parity: 32/32
- Xiangqi H22R6 motion/sounds: 18/18
- Chess H18 reconnect: 25/25
- Chess H19 offline: 15/15
- Chess H20 Mini/premove: 16/16
- Windows BAT preflight: 7/7, canonical root 6 BATs, CRLF intact
- project structure: 19/19
- native identity test: 14/14
- TS/TSX syntax transpile: 305/305
- H22R7, H22R8, H23R2 and other release gates also tested.

## Deployment & validation

1. Extract FULL ZIP into a separate folder. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` there to update the existing project with backup.
2. Deploy the modified `server/` to Render for the new catch-up Socket.IO routes. If old Render stays deployed, the client times out its catch-up attempt and falls back to legacy full resync; safety is preserved but optimization is degraded.
3. Build a **new APK** with `Family_Bloom_BUILD_APK_TO_SHARE.bat` and install it (Kotlin changed). Do not rely on OTA for this native change.
4. H25R2 does not modify Firestore rules or indexes compared with H25R1, so repeating Firebase Rules/Indexes deployment is unnecessary if H25 is already deployed.
5. On two accounts, verify black's active clock permits selecting the black piece and moving, swapping apps retains the board and applies missing moves, automatic claim/wait remains free of any manual reconnect button, and offline intent safety holds.

**Limitations**: The environment did not have a configured Android Gradle/SDK or real Render deployment/Android device. Kotlin was reviewed and scoped source/static regression tests passed; final device validation remains necessary.
