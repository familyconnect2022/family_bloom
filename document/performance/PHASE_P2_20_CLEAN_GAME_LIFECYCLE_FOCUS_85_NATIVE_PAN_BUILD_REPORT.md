# Family Bloom P2.20 — Clean Game Lifecycle + Focus 85% + Native Pan

Date: 2026-10-14  
Base: P2.19 Route-Owned Game Handoff + Hub-Resolved Xiangqi + Native Local Focus

## Device-video findings

Video `6356.mp4` exposed two independent successor bugs:

1. Family Graph Focus was now present reliably, but its shell height still came from the Family Graph/tab-local frame, so it occupied far less than the requested 85% of the physical screen. Pan inside Focus also did not respond.
2. After a Chess match finished, a finished-result receipt (`pendingResultGameId` / `finished_unseen`) was still allowed to behave like a resumable realtime session. That let old Chess/Xiangqi state reclaim presentation ownership, produce the old “move board into screen / check session” command UI, and replay an old Xiangqi away-timeout result.

P2.20 removes those successor ambiguities instead of adding more route-specific loader workarounds.

## 1. One finished-game invariant across Android and Web

The release now enforces:

`finished result != active session != presentation owner`

A finished game may remain visible only as the result currently being presented on the board. It may not:

- claim a missing `ActiveBoardGameSession`;
- become a Game Hub active-game target;
- auto-route from Chess lobby;
- redirect Xiangqi back to an old Chess result;
- be joined again during `sessionRecover`;
- raise a hidden board from `pendingResultGameId`;
- survive as Xiangqi local board/result/premove state after the surface is detached.

### Chess

- `ChessGlobalUiHost` routes only `activeGameId`.
- Chess lobby routes only `activeGameId`.
- Chess command route treats only `activeGameId` as authoritative.
- `BoardGameSessionBridge` can temporarily preserve the exact result already on screen, but `pendingResultGameId` can never create/claim a lease.
- Game Hub ACKs/releases an old finished receipt before opening a fresh Chess lobby or Xiangqi.
- Foreground recovery ACKs `finished_unseen` without `gameJoin` and normalizes recovery to `none`.
- When the result is actually left, `finishClaimedBoardGame()` clears active lease, presentation rail identity and Chess surface `gameId`; the retained native board then reconciles to its initial position off-screen.

### Xiangqi

- `resolveOrCreateXiangqiSession()` joins only `active` recovery.
- `finished_unseen` is ACKed and never joined; normal entry continues toward a new authoritative session.
- When Xiangqi surface `gameId` becomes null, retained local `serverState`, selection, premove, Ready/result state and errors are hard-reset. The native layer may remain mounted off-screen for performance, but it owns no finished match state.

### Web parity

`WebRealtimeGames` now applies the same rule for Chess and Xiangqi: a `finished_unseen` receipt is ACKed, never rejoined.

## 2. User-facing “warm session” behavior removed

The optimization concept of a retained/native-ready board remains internal only. It is no longer allowed to imply a realtime session.

Removed/superseded user-visible flows include:

- `Đang đưa bàn Cờ vua vào màn hình…`
- `Đang kiểm tra phiên Cờ tướng…`
- result copy saying the board/session is being kept “warm”.

The intended lifecycle after leaving a finished result is now simply:

`Game Over -> server result finalized -> result presentation closes -> finishClaimedBoardGame -> session/rail/surface identity cleared -> board reset off-screen`

## 3. Family Graph Focus is exactly 85% of the native window

Focus stays route-owned inside the Phả hệ feature. No root/global Focus rail was reintroduced.

P2.20 changes shell geometry to:

- width = `windowWidth * 0.85`;
- height = `windowHeight * 0.85`;
- centered in the native `overFullScreen` Modal window.

The previous tab/root-local height no longer determines Focus size.

## 4. Focus Pan restored at the native gesture boundary

The Focus native Modal now owns a `GestureHandlerRootView` at its root. In Focus mode, the two full-viewport `Pressable` background responders inside the graph canvas are not installed, so they cannot steal Pan gestures.

The existing UI-thread `Gesture.Pan()` and simultaneous Pan + Pinch camera gestures are retained. Standard Family Graph still keeps its background Pressables for deselection behavior.

## 5. Source/build cleanup

- Added `phaseP2_20:check` and wired it into CLEAN APPLY, Android Debug and Android Release flows.
- P2.20 gate covers Android/native, Web parity, lifecycle runtime stores, Focus geometry, gesture boundary and changed-file syntax.
- Updated active historical regression assertions whose old behavior explicitly required finished-result resurrection or the retired Focus dimensions.
- Pre-copy / build-share banners now identify P2.20 instead of stale P2.16.2/P2.16.3 wording.
- All modified BAT entrypoints use CRLF.
- Root `.gitignore` remains included.
- No app-start Chess/Xiangqi board prewarm was introduced.
- No global Family Graph Focus host/store was reintroduced.

## Verification

Dedicated/current successor gates:

- **P2.20 lifecycle + Focus + pan:** 48/48 PASS
- **P2.19 route ownership / native Focus:** 60/60 PASS
- **P2.18 pending lock / lazy shared board:** 86/86 PASS
- **P2.17.1 Xiangqi shared transport / graph first paint:** 25/25 PASS
- **P2.15.2 Focus reopen / Chess audio:** 30/30 PASS
- **P2.12.5 standalone APK/share:** 26/26 PASS
- **Current Chess aggregate:** 21/21 phase gates PASS
- **Project structure:** 18/18 PASS
- **Build entrypoint audit:** 22 BAT files PASS
- **Release readiness:** 11/11 PASS

`CLEAN_APPLY` currently invokes 54 test scripts. During the P2.20 audit, all 54 were exercised. Two inherited Focus assertions (P2.7 and P2.11) initially encoded the retired pre-P2.20 geometry; their successor assertions were updated to accept the explicit 85% window contract and then passed.

The current Chess aggregate also performs a full TypeScript/TSX transpile scan of **354 source files**, which passed after the P2.20 changes.

## Real-device validation checklist

1. Finish Chess -> leave result -> Game Hub must appear immediately; no “moving Chess board into screen” phase.
2. Immediately start Xiangqi -> no old Chess or Xiangqi finished result may flash; no endless session-check screen.
3. Finish Xiangqi -> leave result -> reopen Xiangqi -> initial/new authoritative state only, never the previous result.
4. Open Family Graph Focus repeatedly -> shell should be visually centered at about 85% width and 85% height.
5. Drag inside Focus -> pan must respond; pinch must remain simultaneous; tapping person cards must still work.
6. Close/reopen Focus on cached branches -> no regression to global/root Focus ownership or a blank Focus presentation.

## Deployment note

P2.20 changes client/source lifecycle and Web recovery behavior only. No Firestore rules/index deployment is required. The server protocol already exposes `finished_unseen` and `gameResultAck`; P2.20 changes how clients consume that receipt. A Render server restart is not required solely for these source changes if the deployed server is already the P2.19-compatible server.
