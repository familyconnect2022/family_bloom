# Phase 14V4D — Chess Diagnostic Interaction Fix

Diagnostic trace from device showed two concrete client interaction failures before any socket traffic:

1. Tap selection was being cleared by the Pan gesture lifecycle. `Pan.onBegin` ran on a simple touch before the pan had actually activated, then the losing pan could finalize and call drag cancel, clearing `selectedRef` before the target-square tap.
2. Drag release could classify the destination as the origin square (`d2 -> d2`). Release now derives the final board coordinate directly from the gesture event's final translation instead of relying on a potentially one-frame-stale shared position.

Changes:
- Pan enters drag mode in `onStart` only after `minDistance(5)` is crossed.
- Pure taps never set `dragAllowed`, never call `onDragStart`, and losing Pan finalization is inert.
- Drop coordinate is `startX/startY + event.translationX/Y`, then converted by the existing board coordinate mapper.
- Illegal local drag still snaps back in ~95ms and does not emit a socket command.
- Existing RAM-only Chess Diagnostics remain enabled so the device can prove the repaired flow reaches local validation, optimistic motion, socket emit, ACK, authoritative delta, commit, and visual settle.

No server protocol, Firestore schema, rules, or Render deployment changes are required relative to 14V4A/V4B/V4C server state.
