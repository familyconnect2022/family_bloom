# Phase 11 Final Performance Gate — Timeline scroll hotfix

Date: 2026-09-27

## Fixed
- Prevents React Native `scrollToIndex should be used in conjunction with getItemLayout or onScrollToIndexFailed` crash during Timeline 100/200 automated stress steps.
- Adds `onScrollToIndexFailed` to the Timeline `SectionList`.
- Falls back to a large pixel offset when the final synthetic row has not been measured yet, so the native list can clamp to the content end without requiring exact row layout.
- Guards jump measurement against double completion and clears pending timers on unmount.
- Records `Stress timeline scroll fallback` whenever the fallback path is used, so the Final Gate report remains transparent rather than silently hiding the condition.

## Scope
- Performance test harness only. No Firebase writes, auth, notification, Event/Moment production behavior, or Phase 11.2B delivery/deep-link behavior changed.
