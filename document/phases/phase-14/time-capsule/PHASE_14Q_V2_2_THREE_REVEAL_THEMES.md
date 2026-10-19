# Phase 14Q V2.2 — Three Bloom Time Reveal Themes

Date: 2026-10-01  
Base: Phase 14Q V2.1 Letter Front Reveal Hotfix

## Product decision

Three clearly separated opening themes are implemented on one shared reveal engine:

1. **Ấm áp** — existing accepted direction; warm pink + cream/gold, petal language, soft spring-like visual rhythm.
2. **Trang trọng** — blue-led + silver/white light, restrained particles, cleaner/squarer gift geometry, slower and deliberate motion with no visible letter overshoot.
3. **Rộn ràng** — pale butter-yellow mixed with pink, confetti/petals/sparks, rounder gift geometry, faster opening and a stronger letter pop.

The goal is not three recolors. Each theme has its own color tokens, box/paper shape, seal icon, particle set, duration, lid motion, letter motion, haptic timing and supporting copy.

## Shared contracts preserved

- One Reanimated UI-thread timeline per opening.
- No `rotateX`/3D perspective path.
- Lid/opening beat happens before letter reveal.
- Letter begins from `scale 0` and `opacity 0`, above the complete gift box.
- Particle count is bounded (Warm 12, Formal 8, Festive 14).
- Theme cannot change during an active reveal.
- Selecting another theme resets reveal progress before comparison.
- Same Time Capsule domain/data/permissions are intended to be reused when the real feature is integrated.

## Deploy/data impact

```text
Firestore schema = unchanged
Firestore Rules = unchanged
Functions = unchanged
Persisted data = unchanged
Permissions = unchanged
Native dependencies = unchanged
Firebase deploy = not required
```

## Device gate

Compare all three on the same Android device. Accept only if they are immediately distinguishable before reading their labels, and if the V2.1 letter-front reveal remains smooth in every theme.
