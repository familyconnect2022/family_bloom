# Family Bloom — Phase 16B.17 Build Report

## Checkpoint

**Phase:** 16B.17 — Away Timeout + SharedValue Tab Continuity  
**Base:** Phase 16B.16 FULL CODE  
**Date:** 2026-10-06

This checkpoint adds a server-authoritative away-from-board loss rule for realtime Chess and introduces a lightweight UI-thread sliding indicator for the five main app tabs. It also audits where SharedValue is appropriate across Family Bloom without duplicating application data state.

---

## 1. Realtime Chess: server-authoritative away timeout

### Rule

For clocked realtime Chess games, when a player leaves the game board (route blur or app background), the server snapshots that player's own remaining clock and grants an away allowance equal to **50% of that remaining time**.

Example:

- player has 8:00 remaining when leaving the board;
- away allowance = 4:00;
- returning before 4:00 cancels the away deadline;
- returning after the deadline cannot rescue the game;
- server finishes the game with `finishReason = "away_timeout"` and awards the win to the opponent.

The budget is captured only on the first leave event. Repeated away packets cannot extend the deadline.

### No-clock games

`No clock / Không giờ` games are intentionally exempt because there is no finite remaining-time denominator from which to derive a 50% allowance.

### Fair deadline ordering

The game manager evaluates both:

1. the ordinary chess-clock deadline; and
2. the away-from-board deadline.

Whichever deadline occurs first wins. Therefore a player cannot avoid a normal flag by leaving the board, and the away policy cannot overwrite an earlier legitimate clock timeout.

### Late-return race protection

A `visible=true` event received after the away deadline first rechecks terminal deadlines inside the per-game mutation queue. The server therefore finishes the game before clearing presence. A return packet arriving in the same ~scheduler window cannot escape the loss.

### Server ownership

Away budgets live only in the server runtime. The client reports board visibility but never decides the winner. Membership is revalidated before board-presence mutations. Terminal state is persisted through the existing authoritative finish pipeline.

Files changed include:

- `server/src/chess/chessTypes.ts`
- `server/src/chess/chessGameManager.ts`
- `server/src/socket/socketServer.ts`
- `src/types/chess.ts`
- `src/hooks/chess/useChessGame.ts`

---

## 2. Result delivery for both players

### Winner still on the board

When the away deadline expires, the server broadcasts the finished authoritative game state. The remaining player receives the normal victory result modal immediately. Away-timeout copy explains that the opponent was away too long.

### Losing player outside the game route

The global Chess realtime context retains a pending finished state when `finishReason === "away_timeout"`.

When that user later opens Chess:

1. the lobby detects the pending away-result game;
2. it routes directly back to the finished game;
3. the result modal opens from the cached authoritative snapshot and is reconciled with the server;
4. the modal explains **“Hết thời gian rời bàn”**;
5. the pending result is acknowledged only after the user dismisses the result or starts a rematch/new flow.

This prevents the finished result from disappearing merely because the active-game lock was released on the server.

Relevant client files include:

- `src/context/ChessRealtimeContext.tsx`
- `src/hooks/chess/useChessLobby.ts`
- `src/app/(chess)/chess-lobby.tsx`
- `src/app/(chess)/chess-game/[gameId].tsx`
- `src/app/(chess)/chess-history.tsx`
- `src/components/chess/ChessBattleEffects.tsx`

---

## 3. Board-presence lifecycle

The game reports board visibility at the lifecycle points that matter:

- successful initial game join → visible;
- successful rejoin → visible;
- app foreground → visible + resync;
- app background/inactive → away;
- game route blur/unmount → away **before** heavy game listeners are suspended.

Network loss by itself is not treated as an intentional board leave because the client may be unable to send the presence event. This avoids punishing a user simply because connectivity disappeared.

---

## 4. SharedValue audit across Family Bloom

The audit did **not** convert arbitrary React state to SharedValue. SharedValue helps when values update at animation/frame frequency; it is not a replacement for application data ownership.

### Good SharedValue / UI-thread candidates

These paths either already use SharedValue or benefit directly from it:

- Chess and Xiangqi piece x/y/scale/opacity;
- drag position and settle motion;
- legal-move hint reveal and pooled hint nodes;
- battle FX / result confetti;
- bottom-modal translate/scale/backdrop animation;
- Graph pan/zoom/focus visual transforms;
- main-tab sliding selection indicator;
- scroll-linked decorative transforms when added later.

### Keep in React state/store/ref

These should **not** be moved to SharedValue simply to avoid renders:

- Firestore document/list snapshots;
- Moments / Activity / Home lists and pagination data;
- permissions and membership state;
- form/input values and validation;
- navigation/business state;
- server-authoritative Chess FEN/revision/result data;
- subscription lifecycle and route-focus ownership.

Moving these to SharedValue would create a second source of truth and would not remove the expensive work that occurs when the underlying data itself changes.

### Existing audit observations

- Moments scroll position already avoids React state in its hot scroll path.
- Family Graph already uses SharedValue extensively for pan/zoom/focus visuals.
- Chess/Xiangqi board rendering already isolates frame-by-frame motion from React after Phases 16B13–16B16.
- No broad high-frequency `setState` loop was found in the five-tab shell that justified a risky application-wide rewrite.

---

## 5. Main tab continuity indicator

`src/app/(tabs)/_layout.tsx` now uses a single Reanimated `Animated.View` as the active-tab indicator.

Properties:

- one shared indicator, not one animated pill per tab;
- `indicatorX` / `indicatorWidth` are SharedValues;
- movement uses UI-thread `withTiming` (~180 ms, cubic-out);
- tab screen content itself remains `animation: none`;
- existing `tab_switch` performance trace is preserved.

The intent is to provide a visual continuity cue without adding a full-screen slide transition that would make heavy screens such as Graph or Moments more expensive.

---

## 6. Why the app does not use a full-page sliding transition

A full-page animated view can make a transition *look* smoother while simultaneously keeping two heavy screens alive and composited during the animation. That is especially undesirable for Family Bloom because Graph, Moments and game surfaces can be substantial native trees.

Phase 16B.17 therefore animates only the lightweight tab indicator on the UI thread. Screen ownership remains immediate, so the app is not hiding performance problems behind an expensive transition.

---

## 7. Xiangqi scope

The current Xiangqi implementation is local/Bloom-Bot gameplay rather than the realtime two-human server-authoritative architecture used by Chess. Therefore the new away-forfeit rule is implemented only for realtime Chess, where there is a real opponent who must receive an authoritative victory result.

If realtime two-user Xiangqi is added later, the same board-presence contract and server deadline model should be reused rather than implementing a separate client-only winner rule.

All existing Xiangqi smoothness/lifecycle improvements remain intact.

---

## 8. Validation

Final validation after the pending-result changes:

- **Phase 16B.17 Away Timeout + Tab SharedValue:** 38 / 38 PASS
- **Current Chess aggregate:** 15 / 15 gate groups PASS
- **Phase 16B.16 Game Entry/Lifecycle:** 48 / 48 PASS
- **Phase 16B.15 Smoothness:** 51 / 51 PASS
- **Phase 16B.14 Runtime Lifecycle / Zero-Leak:** 51 / 51 PASS
- **Phase 16B Xiangqi Playable:** 26 / 26 PASS
- **Phase 16B.10 server-authority compatibility:** 20 / 20 PASS
- overlay-route cleanup: PASS
- changed Phase 16B.17 TypeScript/TSX syntax checks: PASS

The current aggregate now includes the Phase 16B.17 gate.

---

## 9. Deployment requirements

### Render Chess server

**Required.** Phase 16B.17 changes the server protocol/game manager (`chess:game:boardPresence` and `away_timeout`), so the updated `server/` folder must be deployed/restarted on Render.

### Firestore

No Firestore Rules or index changes are required for this phase.

### Android copy-over

The FULL package includes the current:

- `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`
- `Family_Bloom_CLEAN_APPLY_FULL.bat`
- Android Debug/Release helper scripts
- Phase 16B.17 regression gate

Recommended update sequence:

1. Run `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the existing project.
2. Copy the entire Phase 16B.17 FULL package over the project.
3. Run `Family_Bloom_CLEAN_APPLY_FULL.bat`.
4. Deploy/restart the Render Chess service from the updated `server/` directory.
5. Run `npx expo start -c` or the normal Android build BAT.

---

## 10. Real-device acceptance focus

Recommended scenarios:

1. Start a 10+0 realtime Chess game; leave with ~8 minutes remaining; return before 4 minutes — game continues.
2. Repeat and remain away beyond the 50% allowance — opponent sees victory result.
3. Losing player opens Chess afterward — finished board/result opens and shows **Hết thời gian rời bàn**.
4. Leave with very little clock remaining and verify normal timeout wins if it expires first.
5. Verify No-clock games do not receive an away-forfeit deadline.
6. Switch rapidly among the five main tabs and confirm the selection indicator glides while screen content switches immediately.
7. Recheck Phase 16B16 game lifecycle: enter Chess/Xiangqi, leave, then rapidly scroll Moments/Graph/Home and confirm game native surfaces remain released.

