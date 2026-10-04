# Phase 14V.3M — Chess FX A/B Switch

Date: 2026-10-04
Baseline: Phase 14V.3L Chess FX Frame Pacing

## Goal
Provide a clean on-device A/B test to isolate whether battle FX contributes to chess move stutter.

## Behavior
- Chess FX is **OFF by default** when a game screen opens.
- A single binary chip below the board toggles `FX: TẮT` / `FX: BẬT`.
- When FX is OFF:
  - `ChessBattleEffects` is not mounted.
  - battle events are not derived from realtime state.
  - no FX banner, glow or FX haptic runs.
  - piece motion, legal move hints, last-move/check highlights, clocks and server-authoritative game logic remain unchanged.
- When FX is ON, Phase 14V.3L frame-paced FX behavior is used unchanged.
- Toggling OFF clears any pending battle event immediately.

## Test
Play the same Bloom Bot flow with FX OFF, then toggle FX ON and repeat. Compare piece-motion smoothness. Because the switch is local UI state, no Render redeploy is required.
