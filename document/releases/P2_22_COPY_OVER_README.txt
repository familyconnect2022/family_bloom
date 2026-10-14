Family Bloom P2.22 — REAL-DEVICE PAN / FIRST-MOVE AUDIO / CROSS-GAME QUIESCENCE
Date: 2026-10-14
Base: P2.21 FULL

Copy-over install:
1. Close Metro / Expo / Android build terminals.
2. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat in the OLD project.
3. Copy this FULL source over the existing Family Bloom project.
4. Run Family_Bloom_CLEAN_APPLY_FULL.bat from the copied project.
5. Build/run Android normally.

P2.22 fixes:
- Focus View: Android-local GestureHandlerRootView now uses unstable_forceActive next to the Pan/Pinch detector.
- Chess audio: executeAttempt now depends on onMoveStarted, removing the stale closure that made the first legal move silent.
- Chess -> Xiangqi: terminal detach no longer wakes the hidden Chess native board for 240ms. The retired Chess layer is quiescent while Xiangqi mounts/paints.

No Render restart, Firestore rules deploy, or index deploy is required for these client fixes.
