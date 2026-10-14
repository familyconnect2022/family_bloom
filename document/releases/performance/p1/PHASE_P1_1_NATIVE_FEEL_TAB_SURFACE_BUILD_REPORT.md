# Family Bloom — Android Performance Foundation P1.1

Date: 2026-10-09
Base: Android Performance Foundation P1 on Phase 17.9W3 / A18

## Goal
Remove the visual jump-cut between the five persistent Android tabs without reintroducing heavy mount/unmount work or putting network/data work on the transition path.

## Implemented
- Main tab scene transition changed from `none` to a short custom `shift` handoff.
- Duration: **168ms**.
- Travel: **18px** only, direction follows tab order.
- Visual properties: `translateX` + light `opacity`; no animated width/height/top/left/padding.
- Existing five tab surfaces remain eager/persistent: `lazy: false`, `detachInactiveScreens: false`.
- Tab indicator remains one Reanimated SharedValue and one glyph per tab.
- Added `latestRequestedIndexRef`: stale intermediate navigation commits cannot pull the optimistic pill backward during rapid multi-tab tapping.
- P1 UI critical window now covers the full P1.1 scene handoff.
- Existing P1 delayed live-work restore remains 210ms so heavy realtime/list work resumes after the 168ms visual handoff.
- No Chess/Xiangqi gameplay/server/rules changes.

## Why this approach
React Navigation Bottom Tabs supports `transitionSpec` and `sceneStyleInterpolator` on its custom JavaScript tab implementation. Using the navigator scene progress allows both the outgoing and incoming already-mounted surfaces to participate in the same transition, instead of wrapping each heavy screen in extra React state/animation layers.

## Regression policy
Historical gates that asserted the old `animation: none`/older pill duration were updated only where P1.1 intentionally supersedes that invariant. Existing single-icon tab geometry, persistent-surface behavior, lifecycle gating, game baselines, server and Firestore files remain protected.

## Test target
On a physical Android device, rapidly tap Home → Moments → Planner → Family → Nhà Mình and reverse direction. The expected feel is a short continuous handoff, not a full-page carousel and not a jump-cut. Rapid taps should target the newest tab without the pill visibly bouncing back to an intermediate tab.

## Verification result
- P1.1 gate: **25/25 PASS**.
- P1 gate: **32/32 PASS**.
- Phase 17.9A17: **33/33 PASS**.
- Phase 17.9A18: **15/15 PASS**.
- Phase 17 five-tab lifecycle: **56/56 PASS**.
- Phase 17.8D navigation/event gate: **52/52 PASS**.
- Phase 17.8E tabbar gate: **39/39 PASS**.
- Current Chess/Xiangqi aggregate: **20/20 gate groups PASS**.
- Release readiness: **11/11 PASS**.

These are source/runtime-contract regression gates. The perceived transition still needs physical-device validation because frame pacing and device/GPU load cannot be proven by static gates alone.
