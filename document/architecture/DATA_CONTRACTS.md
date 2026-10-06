# Family Bloom — Firebase data contract

## Global profile
`users/{uid}` is private to the account owner.

Fields visible to other members are projected to every family membership document:
- displayName
- shortName
- phoneNumber
- birthDate
- avatarUrl
- gender
- bio
- bloodType
- interests

`activeFamilyId` is only a UX preference and never grants access.

## Family member projection
`families/{familyId}/members/{uid}` is authoritative for family role/access and also contains the family-visible profile projection. This lets members view one another without exposing the private `users/{uid}` document.

## Events / calendar
Calendar is a domain facade over `families/{familyId}/events/{eventId}`.
- `eventService`: create/read/list/listByMonth/update/delete
- `calendarService`: calendar-facing wrapper around eventService
- all event reads require family membership
- event create requires `createdByUid == request.auth.uid`

## Profile update
`profileService.update()` updates the private user document and atomically updates the user's member projection in every family membership.


## Family identity / invite code
`families/{familyId}` remains the technical identity and is never replaced.

Each new family also gets a unique human-friendly `familyCode`, stored on the family and reserved at `family_codes/{familyCode}` with `familyId` as the target. The join service accepts either the original `familyId` (case preserved for backward compatibility) or the lowercase `familyCode`.
