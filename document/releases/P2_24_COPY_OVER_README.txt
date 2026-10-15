Family Bloom P2.24 FULL CODE — Copy-over

Base: P2.23 FULL.

Fixes in this checkpoint:
- Xiangqi render crash: myName is now declared in XiangqiPreparedSurface scope.
- Family Graph Focus: native Modal owns the effective force-active RNGH root; the Focus graph no longer creates an ignored nested root.
- P2.23 Chess FULL <-> MINI ownership remains unchanged.

Recommended copy-over flow:
1. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat against the existing project.
2. Copy the complete P2.24 FULL tree over the project.
3. Run Family_Bloom_CLEAN_APPLY_FULL.bat.
4. Build Android normally.

P2.24 itself does not require a Render/Firebase deployment. If the Render server is still older than the P2.18+ shared Chess/Xiangqi pending-session baseline, deploy the server directory from this FULL package once before judging cross-game recovery behavior.
