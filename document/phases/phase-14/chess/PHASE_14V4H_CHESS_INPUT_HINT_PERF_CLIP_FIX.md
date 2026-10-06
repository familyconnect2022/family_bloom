# Phase 14V4H — Chess input + hint performance + board clip fix

## Why this build
Device video 4015.mp4 showed four regressions together: board corner clipping looked square/overpainted, intermittent valid-piece input loss, very heavy frame pacing, and the requested 1.0→1.3→1.0 move lift was too fast to perceive.

## Changes
- Android board clipping now uses a dedicated inner rounded clip View; shadow/elevation stays on an outer shell and a separate border overlay prevents square layers from painting over the rounded frame.
- Piece Pan threshold increased 5→8 dp; opponent pieces no longer activate a Pan recognizer, so capture taps cannot lose the Race to an impossible drag.
- A tiny accidental drag released on the source square is recovered as a selection instead of being treated as an illegal from==to move.
- Normal move lift is 170 ms, opponent move 180 ms, premove 150 ms. Lift profile remains exactly first half 1.0→1.3, second half 1.3→1.0. Drag lifts to 1.3 and settles to 1.0 on release.
- Hint hot path reduced from 128 Animated hint nodes/worklets (dot + ring for every square) to 64 single-node slots. Sequential near-to-far reveal is preserved.
- Added independent `Hint: BẬT/TẮT` switch beside the existing FX switch. OFF unmounts the entire HintLayer and skips hint reveal animation, so device testing can isolate whether hints are the main UI-thread load.

## Suggested device A/B
1. FX TẮT + Hint BẬT — baseline.
2. FX TẮT + Hint TẮT — if lag largely disappears, HintLayer is still the dominant cost.
3. FX BẬT + Hint TẮT — isolates Battle FX.
4. FX BẬT + Hint BẬT — worst-case combined path.
