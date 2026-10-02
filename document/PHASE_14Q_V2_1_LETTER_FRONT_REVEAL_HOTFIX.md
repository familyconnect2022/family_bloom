# Phase 14Q V2.1 — Letter Front Reveal Hotfix

Date: 2026-10-01
Base: Phase 14Q V2 Bloom Time Reveal

## Device finding

Real Android video 3937 showed the letter/card being revealed behind the gift box. The root cause was visual stacking plus an animation contract that started the letter at scale 0.70 while translating it from below the box.

## Approved correction

- The box/lid opening remains the first beat.
- The letter stays fully invisible until the lid has opened.
- Letter reveal starts from `scale: 0` and `opacity: 0`.
- Letter scales toward 1 with a small overshoot and simultaneously settles upward.
- Letter layer is explicitly above the whole gift box (`zIndex 32` versus box `zIndex 21`).
- Box remains visually anchored through the opening beat, then yields downward only after the letter reveal has begun.
- No Firestore schema, Rules, Functions, data semantics, permissions, native dependency, or persistence changes.

## Device validation needed

Confirm on the real Android phone that: (1) lid opens first; (2) no visible card exists behind the box before that; (3) card appears in front from tiny/transparent to full size; (4) no frame exposes the box over the letter after reveal begins; (5) motion remains smooth.
