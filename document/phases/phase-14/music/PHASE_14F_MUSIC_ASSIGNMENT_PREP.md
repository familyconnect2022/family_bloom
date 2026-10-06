# Phase 14F — Preparation for curated music assignment

No music-runtime behavior changes in Phase 14F. This note preserves the next implementation contract.

The approved 20-track / 3-day family playlist mix remains:

- 25% nhẹ nhàng / thư giãn = 5 tracks
- 20% vui vẻ = 4 tracks
- 15% acoustic / chill = 3 tracks
- 20% popular / trending = 4 tracks
- 20% recent / new = 4 tracks

For the next assignment step, the first 60% can be sourced from a Bloom-curated provider-ID pool so quality is controllable, while trending and recent remain dynamic provider queries. Curated entries should store provider IDs/metadata rather than user-visible links, so the current `MusicProvider` abstraction, favorites, family songs and persistent player do not need redesign.

Do not activate hard-coded curated track IDs until the actual track set has been reviewed. Keep the anti-repeat rules across recent 2–3 cycles and artist-diversity rules already implemented.
