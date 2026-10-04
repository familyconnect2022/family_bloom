# Phase 14V4G — Chess Premove + Lift Motion + Cascading Hints

## Scope
Built on Phase 14V4F without changing the Socket.IO/server protocol.

### One local premove
- Opponent turn is touchable for exactly one local premove intent.
- Premove is kept in RAM only and is never emitted early.
- Tap or drag can queue/replace the premove.
- Dragged premove piece settles back to its authoritative source square; lavender from/to highlight marks the queued intent.
- After the opponent move is visually committed, the premove is revalidated by client chess.js against the NEW authoritative FEN/version.
- If still legal: animate immediately and submit through the same normal move command path.
- If invalidated: clear silently/diagnostically; no rollback animation.
- Full snapshot/reconnect/game-over clears premove.

### Bloom lift movement
- Tap/opponent/premove: scale 1.0 -> 1.3 -> 1.0 during the same translate animation.
- Drag begin: scale 1.0 -> 1.3 after Pan activates, stay 1.3 while following the finger.
- Drag release: snap/settle 1.3 -> 1.0 at target.
- Illegal drag: return to origin while settling 1.3 -> 1.0.
- Moving piece gets temporary elevated z-index; no layout size changes.

### Cascading legal hints
- 64 HintSlot components remain mounted statically.
- One Reanimated SharedValue (`hintRevealProgress`) drives all reveal animation.
- Sliding rays reveal near -> far; equal distances on different rays animate in parallel.
- Normal hints use Bloom rose; premove hints use lavender.
- No React state and no mount/unmount per selection.

## Deploy
Client-only change. If Render already runs the 14V4F server, no server redeploy is required.
