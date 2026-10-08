FAMILY BLOOM - PHASE 17.9A11 - FAMILY RECOVERY / RECONNECT SYNC / TIME CONTROLS

Goal
- Close the remaining Chess reconnect gap where Socket.IO transport could be connected before the game was authoritatively rejoined.
- Make Chess family switching strictly isolated: leave/mark-away the old family's game room before binding the new family.
- Recover either an active game or a finished-but-unseen result when returning to a family.
- Persist result acknowledgement per user + family so a finished result is shown once and survives server runtime eviction.
- Keep all A10 tap-only input, external material lanes, smaller Mini Chess, persistent root geometry and A9 lifecycle behavior.
- Keep one generic server clock model for every supported time control.

Reconnect contract
- Transport connected is NOT the same as game synchronized.
- Game connection phases: connecting / reconnecting / synchronizing / connected.
- During synchronizing the persistent board stays painted but interaction remains blocked.
- Foreground recovery runs appJoin -> sessionRecover -> gameJoin -> authoritative state commit -> connected.
- A stale state packet whose familyId does not match the active family is discarded before entering ChessGameStore.
- A move delta is ignored unless its current authoritative game belongs to the active family.

Family switching
- Client proactively sends boardPresence=false + appLeave for the old family before local Chess bindings are reset.
- Server repeats the cleanup authoritatively when appJoin changes family: mark old board away, disconnect runtime membership, leave chess:game:<id>, leave old family/lobby rooms.
- Old-family game state can no longer leak into the new family's client store.
- Returning to the old family calls sessionRecover.

Session recovery
- active: return the current-family active/waiting/paused game and gameJoin it.
- finished_unseen: reopen the final authoritative board + Result surface even if the game runtime has already been evicted from server RAM.
- none: no Chess surface is restored.
- Finished results are recorded by Firebase Admin at chessRecovery/<uid>/families/<familyId>.
- Closing Result or starting a rematch sends gameResultAck; only that user's matching recovery pointer is deleted.
- A wrong/stale ACK cannot delete a newer recovery pointer.
- Recovery collection is server-only; no client Firestore Rules/Indexes change is needed.

Time controls
- Siêu nhanh · 3+2 = 180s initial + 2s after each accepted move.
- Nhanh · 5+0 = 300s initial, no increment.
- Nhanh · 10+0 = 600s initial, no increment.
- Nhanh +5 · 10+5 = 600s initial + 5s after each accepted move.
- Không giờ = null clock; no away-time loss by design.
- All presets use the same {initialMs, incrementMs} server engine.
- Increment is added only after a legal server-accepted move; reconnect/rejoin never grants an extra increment.
- Rematch preserves the exact time control from the previous game while swapping colors deterministically.
- Ready handshake still starts the clock only after both boards are ready.

Preserved A10 behavior
- Chess pieces are tap-only; piece drag/drop remains retired.
- One local premove remains server-revalidated.
- Material/captured pieces remain outside HUD cards.
- Mini Chess remains 88x40, independently draggable/snappable, while the heavy full-board subscription sleeps.
- Root Chess has no elevation:1000 and no full-screen alpha fade.
- Battle FX remains retired.

Intentional policies still preserved
- Switching away from a clocked game grants the existing 50%-of-remaining-time away allowance; repeated away events do not extend it.
- Unlimited games are intentionally exempt from away-time loss.
- A Render restart restores active games as paused and waits for both players before resuming the clock.

Server / Firestore
- A11 changes server code relative to A10/A9. DEPLOY/RESTART the included Render server before testing A11 Chess.
- Firebase Admin writes a small server-only recovery document per player when a game finishes and deletes it after Result ACK.
- No Firestore Rules deployment is required.
- No Firestore Indexes deployment is required.

Copy-over
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat against the existing project.
2. Copy the entire Phase 17.9A11 FULL package over the project and replace files.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Deploy/redeploy the included server to Render and wait for /health.
5. Run npx expo start -c or the normal Android Debug/Release BAT.

Primary real-device checks
- During a network drop, the board stays visible and input stays blocked through “Đang đồng bộ ván cờ…” until authoritative gameJoin completes.
- Switch Nhà A -> Nhà B while a Chess game is active: Nhà B must not receive or paint Nhà A game packets.
- Switch back to Nhà A before away deadline: the active game must restore at the latest authoritative position.
- Let the Nhà A game end while viewing Nhà B, then return to Nhà A: final board + Result must reopen once.
- Close Result, leave/re-enter the family: the acknowledged result must not reopen.
- Test 3+2 and 10+5: increment is applied once after each accepted move and never again on reconnect.
- A10 tap-only board/material/mini geometry must remain unchanged.
