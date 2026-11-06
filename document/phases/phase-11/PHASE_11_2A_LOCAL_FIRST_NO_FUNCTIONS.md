# Phase 11.2A — Local-first Notifications (No Functions)

This interim Phase 11.2 mode avoids any required Cloud Functions deployment while preserving the already-approved Activity Center and Smart Reminder behavior.

## Device-local scheduling

Android uses `expo-notifications` to schedule reminders already known to the device. The scheduler is bounded to 30 days, caps pending Bloom reminders at 48, and uses three semantic channels: `bloom_normal`, `bloom_notable`, and `bloom_important`.

The schedule refreshes on app resume, membership/preference changes, and after event creation. No Firestore realtime listener is added.

## Foreground behavior

When Family Bloom is open, system banners are suppressed. A Bloom in-app notification/toast is shown instead. When a local notification is tapped from Android, the existing cross-family deep-link path is reused.

## Limits without backend push

Local scheduling cannot know about brand-new actions created on another device while Family Bloom is fully closed. Moment tags, family broadcasts, join requests, moderation activity, and Graph proposals continue to appear in `Chuyện trong nhà` when the app later syncs, but true real-time background delivery remains reserved for the future server-backed Phase 11.2B.

## Deployment

No Cloud Functions deployment is required. No additional Firestore Rules deployment is required beyond the approved Phase 11.1 rules. Because `expo-notifications` is a native dependency, run `npm install` and rebuild Android with `npx expo run:android`.
