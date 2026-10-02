# Phase 14C — Nhà Mình Functional V1

**Base:** Phase 14B.1 UI Shell PASS.  
**Status:** IMPLEMENTED / AWAITING REAL ANDROID DEVICE TEST.  
**No migration:** Existing Phase 14A whispers/polls remain readable and old-client create/vote contracts remain accepted by Direct Rules.

## Lời thì thầm

Actual recipients are `families/{familyId}/members/{uid}` only. Genealogy Person nodes are never selectable recipients. V2 supports `family` and `direct` audience. Direct documents store a two-user viewer snapshot and are unreadable by other family members. Family sending requires an explicit confirmation and intentionally creates no family-wide notification event.

The feed uses 20-item bounded pages, 10 emotion choices, heart reactions, and filters for all/to-me/sent/family/saved. Unsaved V2 whispers expire after 60 days. Saving writes a private snapshot under the user's document so it remains after source deletion. Cleanup physically deletes expired source documents in small client batches, avoiding a Firestore TTL billing dependency on Spark.

For future Blaze use, Cloud Function source `pushDirectWhisperCreated` is included. It sends to the selected recipient only. The client bridge recognizes `home_whisper` and opens `/home-whispers`. This Function is source-ready but not required/deployed for Spark testing.

## Cùng quyết định

Poll audience can be the whole family or a selected group. Group selection is restricted in UI to actual membership users and must contain at least three users; the creator remains included. Each poll stores an immutable eligible-UID snapshot and `eligibleCount`, so later membership changes do not change the denominator.

Polls have free-form description, Today/Tomorrow/custom-day expiry, and anonymous/named mode. Only two vote actions exist: Agree and Disagree. Not-yet-voted is derived while active and No-vote after expiry. Anonymous ballots live in `homePolls/{pollId}/ballots/{uid}` and do not persist display names; security rules allow other voters to read ballots only when the poll is non-anonymous. After expiry, vote controls disappear and the poll is shown in `Đã kết thúc`. Cleanup removes poll + ballots after 30 days.

## Bếp Nhà Mình

V1 bundles a local Bloom-owned catalog of 100 Vietnamese dishes. Runtime does not depend on TheMealDB/Spoonacular/third-party recipe calls. Each user can select dietary preferences; the family daily menu engine combines current membership-user preferences and rotates breakfast/lunch/dinner deterministically by date and family, with a manual `Đổi món` offset and search over the catalog.

Health-related labels are preference candidates only; the UI explicitly avoids disease diagnosis/treatment claims.

## Phòng nhạc

`src/app/home-music.tsx` is unchanged byte-for-byte from Phase 14B.1. No music data schema is introduced before the user approves its product contract.

## Firebase / deploy

Publish `firestore.rules` and deploy `firestore.indexes.json` before real V2 query testing. A new `Family_Bloom_Deploy_Firestore_Indexes.bat` helper is included. `firestore.cloud.rules` is synchronized as future Cloud-mode source. Functions remain optional/deferred until Blaze.

## Validation

- Phase14C static contract: 40/40 PASS.
- 191/191 TS/TSX syntax transpile PASS.
- Phase14B.1 UI Shell: 27/27 PASS.
- Phase13 release readiness: 11/11 PASS.
- Functions JS syntax and JSON files PASS.
- Not certified here: native Android build, device UX, emulator Rules behavior, real multi-account privacy test, real remote push.
