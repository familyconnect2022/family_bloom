# Phase 10 Performance Lab Hotfix

Device testing exposed two benchmark-harness defects that did not indicate a production data-path regression:

1. `performance-data-test.tsx` published metrics from inside `useMemo()`. Because the previous Performance Lab screen remains mounted underneath the stress route, that synchronous publish notified its subscriber while the stress screen was rendering, producing React's “Cannot update a component while rendering a different component” warning.
2. Timeline stress used an unsafe `item.moment.id` key extractor. SectionList can surface non-row/transition tokens while the route is changing; the benchmark now guards both key extraction and row rendering.

The hotfix also makes benchmark media visible using deterministic local JPEG data URIs (no Firebase/Cloudinary/network writes), uses explicit video thumbnails when supplied, filters section headers out of the initial-visible-row metric, ends the initial stress trace when first paint + first real row are both ready (instead of measuring how long the tester stayed on the screen), and records jump-to-end latency as a separate metric.

Stress “video” entries intentionally benchmark the feed thumbnail + play-badge path; the list stress harness does not stream or autoplay video, keeping the measurement deterministic and RAM/local-media only.
