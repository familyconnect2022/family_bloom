Family Bloom P2.27 FULL CODE
Focus UI-Thread Camera + Deterministic Chess Ready

COPY-OVER INSTALL
1. In the existing project run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat.
2. Copy the entire P2.27 FULL package over the existing Family Bloom project.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Build/run Android normally.

P2.27 keeps the P2.26 two-camera Family Graph architecture.
Focus now uses its own RNGH/Reanimated UI-thread Pan + Pinch controller instead of JS PanResponder.
Chess cold activation no longer clears preparation before the persistent board is visually ready.

SERVER
P2.27 server/ is byte-for-byte identical to P2.26. No new Render deployment is required if Render already runs the current P2.18+ compatible server baseline.

PRIMARY DEVICE TESTS
- Focus: long one-finger pan, slow/fast two-finger pinch, pan -> pinch -> release -> pan.
- First Chess game after app launch: "Đang vẽ bàn cờ…" must finish.
- While Chess is truly active, Xiangqi remains correctly blocked.
- Finish Chess on the server, then Xiangqi must become available.
- Chess FULL <-> MINI repeatedly without changing gameId/clock/session.
