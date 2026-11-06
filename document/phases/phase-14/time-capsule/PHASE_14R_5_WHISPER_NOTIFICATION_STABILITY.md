# Phase 14R.5 — Whisper Notification & Stability

## Goal
Close the remaining notification gap in **Lời thì thầm** without changing the approved audience rules or regressing Time Capsule and dual-install behavior.

## Audience contract
- **Người thân / direct**: only the selected family membership user receives the notification.
- **Cả nhà / family**: no broadcast notification is created.
- Genealogy Person nodes are never recipients.

## Delivery architecture
The recipient-private document `users/{uid}/homeInbox/{eventId}` is the delivery source of truth. A `deliveredAt` acknowledgement is claimed transactionally. The client listener and optional Cloud Function use the same claim; whichever wins delivers the alert, preventing duplicate notification delivery across Release, DEV and server push.

The client owns exactly one bounded inbox listener per signed-in uid (limit 20), shared through `sharedRealtimeRegistry`. This is intentionally not multiplied by active family count.

### Foreground
The client claims the event and shows a Bloom notification toast. Tapping it opens `/home-whispers`.

### Background
On Android, when the JS process is still available, the client claims the event and schedules an immediate local notification on `bloom_notable`.

### Killed process
If `pushDirectWhisperCreated` is deployed, the server trigger on `users/{uid}/homeInbox/{eventId}` can claim and send FCM. If no enabled token receives the push, the function releases the claim so the client can surface it later.

Without the Cloud Function, a fully killed process cannot be guaranteed to wake for a newly-created Firestore document; the next app start can still surface recent undelivered inbox events.

## Upgrade safety
Legacy inbox documents without `deliveredAt` remain compatible. Events older than 72 hours are acknowledged silently on first upgrade so users are not flooded with historical alerts.

## Release update identity
- App version: `1.0.5`
- Android versionCode: `140500`
- iOS buildNumber: `5`

Package identities remain unchanged:
- Release: `com.familybloom.android`
- DEV: `com.familybloom.android.dev`
