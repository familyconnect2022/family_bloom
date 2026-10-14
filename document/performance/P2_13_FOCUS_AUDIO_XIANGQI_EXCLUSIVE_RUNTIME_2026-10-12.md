# Family Bloom P2.13 — Focus hot revisit, Chess audio, Xiangqi persistent runtime

## Scope

- Focus View reuses a revision-safe renderer-ready BSH scene before native Modal `onShow` when the same immutable graph snapshot/branch was already hydrated.
- Chess move SFX is emitted from the authoritative accepted move delta only; optimistic local animation no longer emits a second copy. Accepted move events are deduplicated by stable event id.
- All 12 supplied Chess WAV cues are mapped to semantic events. Win, loss and timeout no longer collapse into the generic game-end cue.
- Xiangqi gameplay moved from route-owned heavy UI to a process-persistent root surface, matching Chess surface ownership. The route now only presents/hides the retained surface.
- Xiangqi battle/capture FX component was removed. Hint reveal budget is 56 ms with parallel directional rays.
- Chess and Xiangqi share one durable per-uid Firestore game lock. Recovery explicitly reports the other active board game so the client cannot start both game types simultaneously.

## Copy-over

`Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` and `Family_Bloom_CLEAN_APPLY_FULL.bat` remove the retired `XiangqiBattleEffects.tsx` file so overlay installs do not leave stale FX code behind.
