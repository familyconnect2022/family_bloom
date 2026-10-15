Family Bloom P2.25 FULL CODE — Copy-over

Base: P2.24 FULL.

Main changes:
- Board-game lifetime is server-owned: a dead/expired/not-found server session deletes the matching local session.
- Chess owns only Chess state. Xiangqi owns only Xiangqi state. Cross-game lock is neutral arbitration only.
- Chess can no longer route/present Xiangqi from stale recovery data, and Xiangqi can no longer route/present Chess.
- Xiangqi route always validates its own server session before raising a retained board.
- Focus pan/zoom no longer uses RNGH inside the native Modal; Focus uses React Native PanResponder for one-finger pan and two-finger pinch.
- Full-screen Focus responder shield is retired.
- P2.23 FULL <-> MINI ownership and P2.24 Xiangqi identity fix remain intact.

Recommended copy-over flow:
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat in the existing project.
2. Copy the complete P2.25 FULL tree over the project.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Build/run Android normally.

P2.25's server directory is identical to P2.24. If Render is already on the P2.18+ current shared-lock baseline, no server redeploy is required for P2.25. If Render was never updated to that baseline, deploy server/ from this FULL package once.
