# Phase 11.2 — Android FCM Push + Bloom Time Picker

## Scope
- Android-first remote push via `@react-native-firebase/messaging`.
- iOS code path intentionally dormant until APNs/Apple Developer credentials are available.
- Existing Phase 11.0 Activity Center and Phase 11.1 Smart Reminder logic remain the source of truth.
- Planner native Android clock dialog replaced by an in-app Bloom time picker.

## Push behavior
- Foreground: no duplicate Android system notification; Bloom shows a tappable in-app notification toast.
- Background/killed: FCM renders Android notification.
- Tap deep-links to Moment/Event/Graph/review route and switches family first when needed.
- Moment direct tag: targeted push.
- Family Moment: push only when `Thông báo cho cả nhà` created a badge-eligible activity.
- Normal Event: no immediate push; timed normal Event gets a quiet reminder around 3h before.
- Notable Event: push when created + scheduled pre-reminder.
- Important Event: high-priority heads-up channel + pre-reminder/near-time reminder.
- Birthday/Memorial: day-before + day-of reminder, respecting Smart Reminder preferences.
- On This Day: no remote push by default.
- Join requests and Graph proposals: push only to current owner/admin accounts that can act; no family-wide fan-out.

## Android channels
- `bloom_normal`: low importance, silent/no vibration.
- `bloom_notable`: default importance, light sound/vibration.
- `bloom_important`: high importance, heads-up + stronger vibration.

Channels are created by `plugins/withBloomNotificationChannels.js` during `expo run:android` / prebuild.

## Token lifecycle
- Per-device FCM tokens live under `users/{uid}/pushTokens/{tokenId}`.
- Android 13+ permission is requested once automatically for a new token when push is enabled.
- Token refresh replaces stale token docs.
- Logout disables the current token before auth sign-out.
- Invalid/expired tokens are cleaned by the server after FCM responses.

## Backend
Cloud Functions:
- `pushFamilyActivityCreated`
- `pushTargetActivityCreated`
- `pushJoinRequestCreated`
- `pushGraphProposalCreated`
- `syncEventPushJobs`
- `dispatchSmartReminderPush`

`syncEventPushJobs` converts Event reminder timing to small transient `pushJobs` docs. Scheduler dispatches due jobs every 15 minutes. Yearly reminders roll forward after delivery.

## Deployment requirement
Remote push fan-out and scheduled reminders require Cloud Functions to be deployed from `functions/`. This is a trusted backend requirement; do not send FCM server credentials from the client.

Before device test:
1. `npm install`
2. `cd functions && npm install && cd ..`
3. `firebase deploy --only firestore:rules`
4. Deploy functions when the Firebase project is on a plan that permits Cloud Functions deployment (normally Blaze for this setup): `firebase deploy --only functions`
5. Rebuild native Android app: `npx expo run:android`

## Performance contracts
- No new Firestore realtime listener was added.
- Push delivery is event/schedule driven on backend.
- Client token writes are one-shot plus FCM token-refresh subscription.
- Existing target of 10 tracked Firestore listeners remains unchanged.
