# Family Bloom R3R14R3R5 — Android P0 data-boundary protection

Date: 2026-10-28. Based on R3R14R3R4 FULL CODE. App version remains 1.3.33 / Android versionCode 143043 for this patch; Android identity unchanged.

## Scope

**Android-only**: Web application is not deployed, and is deliberately left unchanged. All source files under `src/web/` are byte-identical to R3R14R3R4. No changes were made to Render, Vercel Media API or Web configuration. Android user profile/membership/join requests, event and Moment reads are hardened.

## Key changes

- `src/utils/dataBoundary.ts`: runtime guards for ISO-8601 UTC, Firestore Timestamp/Date legacy reads, strings, arrays, member/membership/join request projections. No `.toString()` calls on untrusted data. Permission-bearing malformed records rejected rather than coerced.
- `src/context/AuthContext.tsx`, `src/services/bootstrap/bootSessionCache.ts`: prevent bad `joinedAt` and cached membership from throwing during sign-in/startup.
- `src/services/family/familyService.ts`: validate membership/member documents at read boundary and before switching active family.
- `src/services/family/familyJoinService.ts`: enforce one request per (familyId, UID) across aliases; sanitize reader and transaction review flow; reject malformed applicants. Existing transaction is retained.
- `src/utils/profile.ts`: do not coerce arbitrary Firestore types to strings/roles/dates.
- `src/services/event/eventService.ts`: filter corrupt event date records before sorting/rendering.
- `src/services/moments/momentsService.ts`: filter invalid media entries and bound reaction counts on read.
- `firestore.rules` and `firestore.cloud.rules`: proposed tighter client validation for family join and membership; disallow listing family code aliases; preserve exact lookups. **NOT DEPLOYED.** Validate against live records and test with Firebase Emulator before deploying either ruleset.

## Security and compatibility limitations

- This release does **not** claim to have exhaustively hardened all 300+ TS/TSX modules or every Firebase document. Subsequent targeted audits are needed for graph, comments, learning content, uploads, and game payloads.
- This package has not run Gradle/Windows BAT, physical Android device, Firebase Rules Emulator, or live Firebase migration. Do not deploy modified Rules directly without a staged dry run and user-permission tests.
- A malformed existing document will be ignored/quarantined by guarded readers but is not deleted or silently rewritten. If permission-bearing records are invalid, family membership may appear unavailable until data is corrected.
- Firestore Security Rules cannot protect Admin SDK writes; Firebase Admin backends need their own schemas. No Web deployment is in scope.
- Existing Android build scripts remain in scripts/android and FULL CODE auto-update flow is unchanged apart from adding the security:data:check gate.

## Tests executed locally

- Android boundary unit/static tests: 14/14 PASS.
- H25 Release Preflight: 10/10 PASS.
- Phase13 Spark-safe release readiness: 11/11 PASS.
- Planner event layout regression: 8/8 PASS.
- Expo Router duplicates: PASS.
- Project structure: 19/19 PASS.
- TS/TSX/JS parser transpile: 523 files, 0 parser errors (not a semantic typecheck).
- `src/web/` exact-byte comparison to R3R14R3R4: PASS.
- ZIP CRC and source-file preservation to be verified after packaging.

## To test after update

1. Backup Firebase documents and use a separate Firebase Emulator project before trying invalid data.
2. On Android debug, sign in with a normal UID, confirm family roles and home startup, and test multiple names/codes resolving to the same `familyId`.
3. Inject invalid joinedAt/applicant into Emulator, verify app does not crash and no approval is allowed.
4. Test valid join, reject, retry after rejection, approve and family switching, then Moment feed and Planner.
5. Only after validating Rules with legitimate families and actual Android requests consider an explicit Firestore Rules deploy. Never run rule deploy automatically from Auto Update.
