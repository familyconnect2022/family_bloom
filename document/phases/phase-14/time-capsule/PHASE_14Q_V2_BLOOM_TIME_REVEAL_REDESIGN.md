# Family Bloom — Phase 14Q V2 Bloom Time Reveal redesign

Date: 2026-10-01
Base: `Family_Bloom_Phase_14Q_TIME_CAPSULE_REVEAL_PROTOTYPE_FULL_2026-10-01.zip`

## Reason for V2

Real Android test of the first prototype showed three visual problems:

- motion felt pose-to-pose / stuttery instead of continuous;
- the gift box read as flat UI blocks rather than a premium physical object;
- the warm light was too weak and looked like a background circle rather than light spilling from the box.

V2 treats the first build as a flow prototype and replaces the reveal presentation rather than polishing the old 3D path.

## V2 motion architecture

- One monotonic Reanimated shared progress value drives the entire reveal on the UI thread.
- Main reveal duration: 2550ms with linear master time; each element has its own eased visual interval through interpolation.
- Removed `rotateX` / perspective lid animation used by V1. The lid now lifts and drifts with 2D transforms to reduce Android rendering cost and avoid the old flip/jump feeling.
- Main animated properties are transform + opacity only.
- Particle count is bounded to 12 lightweight predeclared Views.
- No animated shadow/elevation is used by the reveal scene.
- A second light haptic lands near the lid/glow release; success haptic remains at completion.
- Haptic timer is cleared when the screen unmounts or the reveal resets.

## V2 visual redesign

- New layered gift-box construction: front body, side shade, lower shade, back lip, lid top, lid underside, ribbon, bow, flower seal.
- Box has more depth while staying pure React Native Views; no new graphics/native animation dependency.
- Glow is now layered into outer/middle/inner halos plus a bright white-gold core and a seam-light line at the opening.
- Letter begins behind the box, rises through the lit opening, then settles near the center.
- The box moves lower and smaller after the reveal so the letter becomes the emotional focal point while the opened object remains visible.
- Letter keeps the existing sample message but gains softer paper detail and small floral decoration.

## Data / backend impact

None.

- No Firestore reads/writes were added.
- No schema, rules, indexes, functions, auth, membership, music source or Time Capsule persistence contracts were changed.
- This is still a device-first visual prototype only.

## Device gate

Static checks are not a substitute for real Android rendering. The V2 acceptance signal is the user's device recording, especially:

1. no visible frame hitch when the lid releases;
2. no jump when the letter begins rising;
3. bright light clearly originates at the box seam;
4. gift box reads as a dimensional object before opening;
5. replay behaves identically across repeated runs.
