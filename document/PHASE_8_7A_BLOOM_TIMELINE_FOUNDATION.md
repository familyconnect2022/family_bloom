# Phase 8.7A — Bloom Timeline Foundation

Baseline: Phase 8.5B Runtime Singleton Optimized. Apply after the optional 8.6 navigation-polish patch.

## Timeline routing

Moment visibility remains family-scoped. `timelineAudience` only decides where the Moment is projected:

- `self`: no Person selected; Moment belongs to the linked FamilyPerson of the author.
- `family`: Moment appears on Family Timeline only.
- `persons`: Moment appears on each selected `personIds` timeline.

The composer defaults to `self`. Cross-family publishing UI is intentionally dormant and the composer always passes `additionalFamilyIds: []`.

## Person Timeline

The existing Person "Dòng thời gian" now combines:

- birth milestone from `birthDate` / `birthYear`;
- death milestone from `deathDate` / `deathYear`;
- existing manual timeline entries;
- linked family events;
- Moments explicitly tagged to that Person;
- untagged `self` Moments when the Person is linked to the author's uid.

Moment media is not copied. Timeline reads the original Moment media references.

## Media presentation

Timeline media uses 40–42px circular thumbnails with 50% horizontal overlap. Pressing the stack opens the existing MediaViewer with the Moment's media list.

Exact duplicate references inside one Moment are collapsed by `publicId` (fallback: `secureUrl`). No original Moment/media is deleted or rewritten.

Important: perceptual duplicate detection across separately uploaded files is intentionally NOT enabled in 8.7A. Two different Cloudinary uploads may be visually identical but have different IDs. A later 8.7B can add a content/perceptual fingerprint after device-cost testing.

## Family Timeline

`/family-timeline` is a dedicated history view, linked from the Family tab. It subscribes only while that screen is open and only to Moments explicitly marked `timelineAudience == "family"`.

This keeps Family Timeline distinct from Feed: year rails, milestone cards, compact circular media stacks, and no feed reaction/comment chrome.

## Performance constraints

No baseline active-family listener was added to `FamilyRealtimeProvider`. Timeline-specific subscriptions exist only while the relevant Timeline view is open. Existing 8.5B singleton/navigation/performance contracts remain unchanged.
