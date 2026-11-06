# Family Bloom P2.22 — Real-device Focus Pan + First-move Audio + Cross-game Quiescence

Date: 2026-10-14  
Base: P2.21 FULL

## Why this successor exists

Real-device feedback on `6365.mp4` invalidated the P2.21 Focus-pan acceptance claim, and device testing also exposed two regressions: the first Chess move was silent, and a completed Chess session followed by Xiangqi could crash the app. P2.22 treats the device as authoritative and fixes the concrete runtime paths rather than adding retries.

## 1. Focus View pan — Android handler ownership

The dedicated Focus camera itself was correct: Pan wrote directly to Focus-only SharedValues. The remaining weak point was Android touch ownership at the native Modal boundary. P2.22 places `GestureHandlerRootView` immediately around the Focus `GestureDetector` and enables `unstable_forceActive` only for Focus. This is the RNGH escape hatch for native Android parents that cancel the touch stream. Pan/Pinch remain simultaneous and the 85% geometry is unchanged.

## 2. Chess first-move sound — stale callback closure

`executeAttempt` called `onMoveStarted` before the socket round trip, but `onMoveStarted` was missing from the callback dependency list. The persistent board can first render with `onMoveStarted=undefined`; the callback therefore retained `undefined` until another dependency changed, matching the device symptom that move 1 is silent and move 2 has sound. P2.22 adds the missing dependency.

## 3. Chess -> Xiangqi — terminal means quiescent

P2.21 correctly destroyed session identity at terminal, but `ChessSurfaceHost` then intentionally reactivated the hidden persistent board for 240ms to reset 32 native piece slots. A fast cross-game handoff could therefore mount/paint Xiangqi while retired Chess Reanimated/native work was still active. P2.22 removes that hidden wake. After terminal detach the retained Chess layer is dormant; a future Chess session rebuilds from its authoritative snapshot before interaction.

## Acceptance

- Open Focus View and drag repeatedly with one finger in all directions; content must track the finger immediately.
- Start a fresh Chess game; the first legal local move must play exactly one board cue.
- Finish Chess, close/acknowledge result presentation, then start Xiangqi immediately; app must remain alive and Xiangqi must become interactive.
- Repeat Xiangqi -> Chess and Chess -> Xiangqi several times.
