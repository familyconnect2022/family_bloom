# P2.37R2C-H3 — Idle-hidden authenticated native sibling

H3 fixes the white native plane seen after Home became ready in H2.

## Root cause fixed
H2 promoted the full-screen `FamilyBloomOverlayHostView` in `onAttachedToWindow()` even while presentation mode was `idle`. `hideAll()` hid only Full/Mini children, leaving the full-screen host root mounted above `react-native-screens`.

## H3 contract
- Host remains mounted/persistent after authenticated shell creation.
- Host root and overlay root are explicitly transparent.
- In `idle`, both roots are `INVISIBLE`, elevation/translationZ are zero, and attach never calls `bringToFront()`.
- `FULL`, `MINI`, or native proof explicitly reveal the host, promote it, and show only their own rectangles.
- Returning to `idle` hides the root again without destroying it.
- Native proof hides the root after its badge finishes when no presentation is active.

Binary identity: `1.3.8 / 143018 / P2.37R2C-H3-native-1`.
