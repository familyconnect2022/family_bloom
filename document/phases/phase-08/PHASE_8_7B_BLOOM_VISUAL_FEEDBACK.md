# Phase 8.7B — Bloom visual consistency & media feedback

- Default card surface: `COLORS.card = #FFF5F8` (white + very light Bloom blush).
- Focus/selected surface: `COLORS.surfaceFocus = #FFE8F0`; focus border `#F3BFD0`.
- Tab active/inactive/background moved to semantic theme tokens.
- Timeline rail/card/media borders use semantic tokens instead of alternating ad-hoc pinks.
- Fullscreen media viewer now shows a Bloom loading treatment for images and video warm-up instead of an empty black frame.
- Toast adds `warning`; normal `info` uses Bloom blush instead of system-like blue. Validation/user-correctable states use warning, informational/permission states use info, actual failures remain error.
- No runtime listener, graph, family-switch, or performance harness architecture changed.
