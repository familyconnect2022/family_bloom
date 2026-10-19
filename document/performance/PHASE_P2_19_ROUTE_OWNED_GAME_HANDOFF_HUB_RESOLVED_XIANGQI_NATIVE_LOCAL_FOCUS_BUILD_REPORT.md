# Family Bloom P2.19 — Route-Owned Game Handoff + Hub-Resolved Xiangqi + Native Local Focus

Date: 2026-10-14  
Base: P2.18 Pending Game Lock + Lazy Shared Board + Local Focus

## Why P2.18 was not sufficient

Real-device screenshots after P2.18 exposed three visible failures that the previous static contract did not model deeply enough:

1. The Chess command route could remain visible at `Đang đưa bàn Cờ vua vào màn hình…` while the root board never covered it.
2. Normal Xiangqi entry could replace the whole phone with `Đang kiểm tra phiên Cờ tướng…` before a concrete server session existed.
3. `Mở nhánh` could dismiss Person Detail but leave the normal Family Graph visible with no Focus View.

P2.19 treats these as ownership / ordering bugs instead of loader-copy problems.

## 1. Chess recovery no longer clears a route claim during the recovery gap

### Root cause

`ChessRealtimeContext` published `connection = ready` as soon as Socket.IO connected, before `appJoin -> sessionRecover -> gameJoin` completed. During that interval `activeGameId` and `pendingResultGameId` could both still be null.

`BoardGameSessionBridge` interpreted those temporary null ids as authoritative `none` and cleared an already-claimed Chess `ActiveBoardGameSession`. The command route remained mounted, but `GameBoardHost` no longer had a session to render. This directly permits the photographed full-screen Chess command loader.

### Fix

- Added explicit `recoveryKind: ChessSessionRecovery["kind"] | null` to `ChessRealtimeContext`.
- `recoveryKind = null` means the current foreground/family recovery pass has not authoritatively completed.
- The provider publishes the actual recovery kind only after a successful `sessionRecover` ACK.
- Background/family/recovery restarts invalidate the previous recovery authority back to `null`.
- `BoardGameSessionBridge` may clear a Chess lease only after explicit server recovery `kind === "none"`; transient empty ids cannot clear it.

## 2. Route cleanup is owner-token protected, including the same gameId case

### Root cause

P2.18 improved cleanup from “latest session” to an exact `gameId`, but that was still insufficient. Two route instances can temporarily refer to the same gameId during push/replace/recovery. If the newer route presented the board and the older route blurred afterward, the old route could still minimize/park the same game.

### Fix

`boardGamePresentationCoordinator` now owns a route-presentation lease:

- `acquireRouteBoardGamePresentation(kind, gameId, ownerToken)`
- `releaseRouteBoardGamePresentation(kind, gameId, ownerToken, mini|hidden)`

A release succeeds only when kind + gameId + ownerToken all match the current presentation owner.

Chess and Xiangqi command routes each create one stable route token. Their focus effects also follow active-session gameId changes, so rematches cannot leave ownership attached to the previous game.

The P2.19 gate executes the real stores/coordinator and verifies that:

- old Chess route -> new Chess route, same gameId -> old cleanup cannot minimize the new owner;
- old Xiangqi route -> new Xiangqi route, same gameId -> old cleanup cannot park the new owner.

## 3. A finished Chess result is not an active-game lock

When the user explicitly chooses Xiangqi after a Chess game has finished, `pendingResultGameId` is now treated as a finished result, not an active game.

Game Hub now:

1. acknowledges the finished Chess result,
2. releases the finished Chess presentation/session lease,
3. then begins Xiangqi resolution.

A genuinely active Chess `activeGameId` still blocks Xiangqi exactly as required by the cross-game lock.

This is especially important if the user left the finished Chess route with Android Back rather than the `Về Nhà Mình` result action.

## 4. Normal Xiangqi entry is server-confirmed before route navigation

P2.18 navigated to `/xiangqi-preview` first and then performed session recovery/creation there. The route therefore intentionally exposed a full-screen session-check loader.

P2.19 normal Game Hub flow now:

1. remains on Game Hub;
2. calls `resolveOrCreateXiangqiSession(activeFamilyId)` there;
3. keeps pending/cancel UX on the existing Game Hub card;
4. waits for a concrete authoritative Xiangqi state/gameId;
5. caches that bootstrap state;
6. claims Xiangqi as `presentation: "hidden"` so the root `GameBoardHost` can lazy-mount it while parked;
7. navigates on the next frame;
8. the Xiangqi command route only raises the already-confirmed board.

The command route still keeps its recovery UI for direct/deep-link/reconnect fallback. It is no longer the normal Game Hub entry flow.

Additional bootstrap hardening releases the local Xiangqi reservation on `appJoin` or `sessionRecover` failure, preventing a failed connect attempt from leaving an artificial local lock.

## 5. Active board kind mounts in the same React render

`GameBoardHost` previously latched `chessEverMounted` / `xiangqiEverMounted` only in an effect. That inserted an avoidable blank render between acquiring a valid session and creating the board layer.

P2.19 renders with:

- `mountChess = chessEverMounted || session?.kind === "chess"`
- `mountXiangqi = xiangqiEverMounted || session?.kind === "xiangqi"`

The latch still retains a board after its first real session; the currently authoritative kind no longer waits one extra effect cycle to mount.

No Chess/Xiangqi board is prewarmed at app startup.

## 6. Family Graph Focus serializes native Modal ownership

### Root cause

Person Detail is a native React Native `Modal`. P2.18 tried to start Focus in the same commit that hid Person Detail. On Android, native modal/window teardown can lag the React visibility update. This allowed two native-window ownership transitions to overlap and could leave the graph visible with no Focus presentation.

### Fix

Focus remains strictly inside `FamilyGraphPrototype` / the Phả hệ route. It is not restored to the app-root presentation rail.

The handoff is now serialized:

1. prime the Focus session/geometry with `presentImmediately = false`;
2. set Person Detail to immediate native dismissal;
3. if Android supplies `onDismiss`, attach the already-primed Focus native `overFullScreen` Modal immediately;
4. otherwise wait two native animation frames and attach Focus;
5. keep a 140 ms vendor fallback so correctness does not depend on `onDismiss` support.

Focus BSH hydration still begins only after the Focus shell is visible/cancellable. Cached Focus scenes remain retained route-locally.

## 7. Copy-over / build integration

- Root `.gitignore` remains included.
- `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` identifies P2.19.
- `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat` runs the P2.19 successor gate after P2.18.
- Android Debug and Release BATs run `phaseP2_19:check`.
- Modified BAT files are preserved as Windows CRLF; build-entrypoint audit passes.
- No startup Chess/Xiangqi prewarm was reintroduced.
- No global/root Family Graph Focus host/store was reintroduced.

## Verification before packaging

Current/successor gates:

- P2.19 route ownership / Xiangqi handoff / Focus: **60/60 PASS**
- P2.18 inherited contract: **86/86 PASS**
- P2.17.1 shared Xiangqi transport / graph first paint: **25/25 PASS**
- P2.15.2 Focus reopen + Chess audio: **30/30 PASS**
- P2.11 Family Graph retained camera: **31/31 PASS**
- P2.11.1 BSH: **45/45 PASS**
- P2.11.2 Focus runtime/presentation: **30/30 PASS**
- P2.11.3 cancel-first Focus: **31/31 PASS**
- P2.11.4 retained chunks: **40/40 PASS**
- Xiangqi server authority 17.9A16: **45/45 PASS**
- Current Chess aggregate: **21/21 PASS**
- Build entrypoint audit: **22 BAT files PASS**
- Project structure gate: **18/18 PASS**
- Release readiness: **11/11 PASS**

### Historical-gate note

P2.12.1 / P2.12.2 / P2.12.3 encode retired root-owned Focus architecture (including files intentionally removed by P2.18). They are not active release gates in this package and will fail if manually invoked against the successor route-local Focus design. P2.19 adds a direct successor test for the current native-window handoff rather than weakening those historical assertions silently.

## Real-device validation target

Static/runtime gates cannot prove Android compositor timing. The device test for this release should specifically reproduce the three supplied failures:

1. Finish a Chess game, leave it, then choose Xiangqi. Normal Game Hub flow must not open the full-screen `Đang kiểm tra phiên Cờ tướng…` screen; it should remain on Hub until a concrete Xiangqi session exists, then show the board.
2. Enter/re-enter an active Chess game repeatedly, including rapid duplicate navigation. `Đang đưa bàn Cờ vua vào màn hình…` must not remain exposed after the session exists.
3. In Family Graph, open Person Detail -> `Mở nhánh` repeatedly on cold and already-cached branches. Detail must disappear first, then Focus must appear; returning/reopening must not require rebuilding an already-retained Focus scene.
