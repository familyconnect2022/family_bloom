Family Bloom Phase 16B.16 — Game Entry / Lifecycle Recovery + Staged Board Paint

COPY-OVER ORDER
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat from this FULL package and point it at the existing Family Bloom project.
2. Wait for PRE-COPY CLEAN PASS.
3. Copy/overlay the entire Phase 16B.16 FULL package into the existing project.
4. Run Family_Bloom_CLEAN_APPLY_FULL.bat inside the updated project.
5. Only after PASS, run npx expo start -c or the normal Android Debug/Release BAT under scripts/android/.

WHAT 16B.16 FIXES
- Game entry is split into a lightweight first frame and a deferred heavy board surface.
- The first Preparing sheet is already settled; it does not slide/scale at the same time as route navigation.
- Chess/Xiangqi initial piece nodes are staged across paint frames (8 -> 18 -> 26 -> full) behind the Preparing shield.
- Chess/Xiangqi piece artwork uses expo-image memory caching with zero transition.
- Ready still waits for the COMPLETE real board: layout + controllers/piece nodes + assets + two painted frames.
- Hidden game routes physically release their heavy board/FX surface on blur while Phase 16B.14 runtime cleanup remains active.
- Chess can warm-start from the authoritative snapshot already received by the global realtime provider.
- Chess fallback loading UI is a designed Bloom shell rather than an empty-looking route.
- Socket readiness no longer waits behind /health, preventing false “Bloom đang mở bàn cờ…” when Socket.IO is already healthy.
- Chess launcher uses the real high-contrast black knight asset (bn.webp); the washed-out white king treatment is gone.
- Phase 16B.15 200 ms parallel hints, motion, drag path, 1-second Bot cadence, victory polish and confetti remain intact.

SERVER / FIREBASE
- No new 16B.16 server protocol or Firestore Rules/index change.
- If Phase 16B.15 server is already deployed, no Render restart is required specifically for 16B.16.
- If the 16B.15 ~1000 ms Chess Bloom Bot server change was never deployed, deploy/restart server/ first.
- No Firestore Rules/index deploy is required.

DEVICE ACCEPTANCE
- Enter Xiangqi: Preparing sheet should already be visible/stable; no sheet + board decode hitch.
- Do not judge Ready until the complete board has appeared behind it; the sheet must wait automatically.
- Leave either game and immediately scroll Kỷ niệm/Lịch/Cây nhà/Nhà Mình: normal app responsiveness should return.
- Enter Chess with an existing authoritative snapshot: no long blank game route.
- With Render awake, Chess lobby should reach “Sẵn sàng” instead of staying at “Bloom đang mở bàn cờ…”.
- Confirm the black knight is visible on the Chess launcher card.
- Re-test Chess drag/drop on the physical device. If it still fails, remove it cleanly in the next checkpoint rather than ship a half-working path.

AUTOMATED CHECKPOINT
- Phase 16B.16: 48/48 PASS
- Phase 16B.15: 51/51 PASS
- Phase 16B.14: 51/51 PASS
- Xiangqi playable logic: 26/26 PASS
- Current Chess aggregate: 14/14 gate groups PASS
- Phase 16B.10 server-authority compatibility: 20/20 PASS
- cleanup-overlay-routes: PASS
