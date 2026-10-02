# Phase 11.1 — Smart Family Reminders

Phase 11.1 builds on the in-app **Chuyện trong nhà** Activity Center. It does not add FCM/APNs push yet and does not add a realtime listener.

## Reminder rules

- Birthday: reminder the day before and on the day. Even a Normal birthday may badge because it is an explicit family milestone.
- Memorial / ngày giỗ: reminder the day before and on the day, with restrained copy.
- Normal event: can appear in Activity Center; it only becomes badge-eligible when a timed event is within about 3 hours.
- Notable event: reminder the day before / on the day and badge-eligible.
- Important event: same, and a timed event can re-surface near the start time after an earlier reminder has already been seen.
- On This Day: discovery-only Activity Center row; never badge-eligible.
- Three or more simultaneous event reminders in one family collapse into one concise summary instead of flooding the list.

## Preferences

A new `notification-preferences` screen stores `smartReminderPreferences` on `users/{uid}`:

- birthdays
- memorials
- events
- onThisDay

All default to enabled. These preferences are private to the current user and are not mirrored into family member projections.

## Performance / storage

- Reminder data is derived with bounded one-shot reads.
- Regular events use a today→tomorrow date window; yearly events use the existing bounded recurring-event collection.
- Event windows are cached in RAM for 5 minutes; On This Day discovery is cached for 20 minutes.
- No reminder Activity documents are persisted in Firestore in Phase 11.1. They are virtual rows derived from source data, so no duplicate Event/Moment data is created.
- Per-user reminder seen state is a small `smartReminderLastSeenAt` field on the authoritative family member document.
- No new realtime listener is added; the Phase 10 singleton/listener baseline must remain unchanged.

## Phase 11.2 boundary

Remote push is intentionally deferred. Phase 11.2 can reuse the same reminder semantics when FCM/APNs delivery is introduced.
