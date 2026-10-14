# Phase 14V4I — Chess Render Isolation / Performance

Purpose: isolate the remaining Android chess lag after Hint ON/OFF produced little difference in V4H.

Changes:
- Default test mode: Hint OFF, Motion OFF, FX OFF.
- Motion OFF removes move/settle/scale animation while preserving drag-follow-finger input and server-authoritative validation.
- Highlight layer reduced from 64 slots × 4 animated views (256 animated styles) to at most 6 animated markers.
- Empty-square interaction reduced from 64 React Native Pressables to one RNGH tap surface.
- Chess clocks now tick only the active side and only once per second (previously both sides re-rendered every 250ms).
- RAM diagnostic event fan-out is disabled and the diagnostic panel is removed from the hot game screen for this performance build.
- No server protocol, Firestore persistence, auth, membership, clock authority, premove validation, or Socket.IO contract changes.

A/B controls:
- Hint: OFF by default; enabling mounts the hint renderer.
- Motion: OFF by default; enabling restores Bloom piece motion/scale.
- FX: OFF by default; existing battle FX toggle remains.

Decision gate:
1. Test with all three OFF. If pieces/taps become fast, re-enable Motion, then Hint, then FX one at a time.
2. If all three OFF is still laggy, the remaining suspects are piece Gesture/Image rendering, screen/ScrollView gesture contention, or renderer architecture; then evaluate a Skia board branch.
