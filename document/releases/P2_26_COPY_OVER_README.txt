Family Bloom P2.26 FULL CODE
Dedicated Focus Camera + Chess-Only Realtime

COPY-OVER INSTALL
1. In the existing project run scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat.
2. Copy the entire P2.26 FULL package over the existing Family Bloom project.
3. Run scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Build/run Android normally.

P2.26 keeps the canonical root clean: source documentation is under document/.
The root .gitignore is included.

SERVER
P2.26 server/ is byte-for-byte identical to P2.25. No new Render deployment is required if Render already runs the current P2.18+ compatible server baseline.

PRIMARY DEVICE TESTS
- Focus: one-finger pan, two-finger pinch, close/reopen camera restore.
- Xiangqi -> finish -> Chess: never show Xiangqi session UI.
- Chess -> finish -> Xiangqi: never reuse Chess state.
- Chess FULL <-> MINI repeatedly without changing gameId/clock/session.
