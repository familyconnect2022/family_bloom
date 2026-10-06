# Phase 6.5 — Moments spacing and bottom-tab switching

Base: main, 646457dbb0883fd849211695b082f43cf4631787.
Status: IMPLEMENTED / AWAITING USER DEVICE TEST. User confirms Firebase Rules were deployed before this hotfix.

## Findings and changes

- MomentCard's “Có trong kỷ niệm” container had no horizontal inset. Added 16 points on both sides, matching the caption/header, plus 14 points below the section.
- Planner passed screen focus into useFamilyEvents. Every bottom-tab blur cleared calendar/past-list state and disposed its query; returning subscribed and rebuilt the data again. Planner now keeps the current mode's bounded query active across tab changes. App backgrounding, family changes, mode changes and unmount still release the relevant query. This intentionally keeps one bounded month query (or past-events query in list mode with the shared provider) live while another tab is visible.
- Moments resumed card comment listeners and reaction hydration in the focus callback. This now runs in an idle callback, with a 300 ms timeout and cancellation on blur. Existing posts remain visible; only per-card realtime work is deferred.
- Visible MomentCards rerender when realtimeEnabled changes. Their photo/video grid now has a memo boundary and a stable open callback, avoiding grid reconciliation when media and its viewer metadata have not changed. Media edits still update the grid/viewer.

These are source-confirmed sources of repeated work. No device CPU/frame trace was available, so this report does not claim they explain every device stall or that runtime performance has passed.

## Validation

PASS: phase2-static-check (126 TS/TSX files), test-familyGraphPhase65, test-familyGraphPhase64, test-familyGraphQueryEngine, test-familyGraphBatchRelationships, test-familyGraphLayout, functions/test-familyGraphCore, node --check functions/index.js, git diff --check.

Static checks used the existing local TypeScript dependency through NODE_PATH. Full project typecheck, native build, visual verification and device profiling were not run. No Firebase rules, Functions, schema, dependency or native-code changes are included.

## Apply and device check

Extract this patch into the existing project root, allowing its src/ and document/ paths to replace/add the corresponding files. No wrapper folder. Restart/reload the app normally. No additional Firebase deployment or dependency install is needed for this hotfix.

1. Check “Có trong kỷ niệm” with one and several people, a long name and a post without caption. Both edges should align with the card text; person links should still open the correct Person.
2. Visit all five bottom tabs, then alternate Moments, Planner and Home 10–15 times. After the first load, the selected calendar month should not blank/reload on each return. Repeat in Planner list mode after loading older events.
3. Switch away quickly from Moments and back; comments/reactions should resume correctly. Open photos/videos after returning and verify their contents/captions.
4. Background/resume the app and switch family. Verify the calendar updates to the active family and new events still appear.

Phase 6.5 remains OPEN until device validation.
