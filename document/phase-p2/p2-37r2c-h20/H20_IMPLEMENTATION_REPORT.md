# Family Bloom — P2.37R2C H20: Native Mini / premove preservation

**Base:** H19 FULL CODE, isolated changes only. **App:** 1.3.20 / Android 143030. **Native:** P2.37R2C-H20-native-1 / module 1.3.18.

## Findings
- H19 Mini TextView was bound to a static label `♟ CỜ VUA` / `CỜ TƯỚNG`; it had no dedicated Native clock.
- Chess premoves live in `queuedPremoves` outside React. React renders and ticking a clock **do not** reset that array. It could be cleared explicitly on rejected/delayed packets and a paused snapshot. Some premoves *are* truly illegal after the opponent's actual move, which must still be rejected.

## H20 changes
1. Mini has independent Native **move label** and **clock label**. Chess obtains the just-moved glyph from the current FEN at the server-verified last destination; a locally optimistic move can also be shown. Its line contains `♟ e7→e5` (example), and the second line contains the running player's remaining time. Xiangqi derives its own last piece glyph from Xiangqi state/delta (no shared Chess controller) and shows the side-to-move clock.
2. Only the **clock TextView** changes on a one-second Android Handler tick, only while Mini is foregrounded; changes to piece line occur only when the game state changes. Timer is anchored to receipt of the current authoritative snapshot. The tick does not call React/setState, redraw any Chess square, or touch the tab/navigation tree. Full still parks the board when Mini appears.
3. Preserved a Chess premove across `paused` snapshots, state-only clock updates, an invalid/out-of-order delta, and uncertain ACK/timeout. It is rechecked with chess.js against authoritative FEN before execution; a genuinely illegal premove is cancelled with a plain explanation. A terminal game or new waiting game still clears the queue; user cancellation remains supported. One queued premove limit remains.
4. App/native identity bumped and verifier + BAT identity strings synchronized; Build & Share and CLEAN APPLY include `chess:h20:check`. No gameplay server, schema, auth, or Xiangqi rules changes.

## Verification in this environment
- `scripts/tests/history/test-phase-p2_37r2c_h20-mini-premove-isolation.js`: executable controller replay and source-isolation checks, 16/16 PASS.
- H10, H12, H14, H16, H17, H18, H19 suite results: PASS.
- Source import graph and TypeScript transpile: PASS.
- H14R1 build BAT gate, native package preflight, FULL source integrity gate: PASS.

**Not performed:** Gradle/Kotlin Android APK build, actual-device FPS measurement, true UI rendering on an Android device. Source-level checks are not substitutes for those steps. Rebuild native APK; no Render redeploy needed if H19 is already deployed.

## Manual acceptance
1. Enter live Chess, move one piece, minimize. Mini first row shows that piece plus from→to; second row shows side-to-move time decrementing smoothly each second. Verify no Full board/tab rerender.
2. Repeat Chess as Black and observe time switch when server turn switches. Verify active game doesn't close on mini restore.
3. On opponent's turn, queue a valid one-step premove, then receive unchanged snapshot/clock event and pause/resume: it must remain queued. When opponent plays, a still-legal premove should execute once.
4. If opponent checks the king or occupies the queued destination and the premove is no longer legal, a rejection is correct: show notification, don't send an illegal move.
5. In Xiangqi Mini, confirm moved piece and active clock from independent Xiangqi snapshot; no game engine or board coupling.
