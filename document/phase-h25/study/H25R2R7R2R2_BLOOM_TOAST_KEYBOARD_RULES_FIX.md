# FAMILY BLOOM H25R2R7R2R2 — STUDY UI / RULES DIAGNOSTIC
Date: 2026-10-23
Base: H25R2R7R2R1 (same Android native identity 1.3.32 / 143042)

## 1. Diagnosis from user screenshots 8870, 8871, 8872

- `firestore/permission-denied` is a real Firestore authorization rejection, not a formatter or keyboard failure. The source `firestore.rules` includes the new collection `families/{familyId}/studyQuestions/{questionId}` and nested answers/comments/reactions. **Updating APK does NOT deploy the rules**. If the existing Firebase project has not received this set of rules, writes are denied. The old Study create rule also excluded legacy home owners without a `/members/{uid}` document even though they could read via `familyAccess`. If rules are already deployed, investigate signed-in Firebase UID, activeFamilyId, family membership, and the exact database/project. Do not weaken or globally open Firestore access.
- Native Android Alert dialogs appeared because newly introduced Study Q&A screens called `Alert.alert` rather than the root Bloom Toast provider.
- The question and answer editors were inside plain `ScrollView`, without the existing `BloomKeyboardScreen` focus reveal and Android keyboard reserve. On some Android IME implementations, multiline input ends up behind the keyboard.
- The previous publish flow uploaded up to three Cloudinary images before validating that the question had a title.

## 2. Changes delivered

1. Bloom Toast in StudyComposer, question compose, answer detail/comments/reactions; friendlier error mapping for Firestore. No raw Firebase error displayed to users.
2. `BloomKeyboardScreen` with focus reveal of question title, question/answer body, and comment field. Reuse existing Android `softwareKeyboardLayoutMode: resize`. Does not introduce new Native dependencies, WebViews, or global listeners.
3. Validate title before Cloudinary image upload, focus missing title, and keep local body/formula draft when failed.
4. Study question list and detail display friendly failure description.
5. Add new preflight `scripts/tests/release/test-h25r2r7r2r2-study-ux.cjs` to Auto Update *before any backup/overlay*, and to CLEAN APPLY before release.
6. Authorize Study Q&A writes through existing `familyAccess(familyId)` (which includes `member` OR legacy verified `owner`) instead of `member` only. Continue to require signed-in author UID, existing question/answer, resource validity and per-family path constraints. Update BOTH `firestore.rules` and `firestore.cloud.rules`. No public write access.
7. Do not change Cloudinary, chess, xiangqi, graph, release native identity or other modules. Deferred family bulletin remains hidden.

## 3. Deploy Firestore Rules on YOUR Firebase project

- From an extracted FULL CODE folder or an updated Family Bloom project, run `scripts/firebase/Family_Bloom_Deploy_Firestore_Rules.bat` on Windows.
- Script currently targets `family-connect-4184f`. Verify this matches the Firebase Android project before proceeding. Log in with Firebase CLI when required (`firebase login`); the script prints success or failure.
- The script deploys `firestore.rules`, not only the Study section. The bundled Study rules also repair the verified home-owner fallback. Review differences if remote rules have been edited separately. Deployment itself does not delete Firestore documents and does not require Blaze.
- To confirm, open Firebase console > Firestore Database > Rules and verify `match /studyQuestions/{questionId}` exists. Then sign in with an actual family member and retry publishing a question **without an image first**. Test second account access, reply, comments, reactions. If denial persists, inspect Firebase project, UID and family membership. No live Firebase deployment was performed here.
- Deploying Rules alone can fix the save failure in the *already installed* APK, without rebuilding. The redesigned Toast/keyboard behavior requires installing updated JS via build/OTA compatible with this app runtime.

## 4. Testing performed (source only)

- Study UX regression 15/15 PASS.
- Study Q&A preflight 14/14 PASS.
- Feature flags regression 10/10 PASS.
- H25 release source preflight 10/10 PASS.
- Phase13 release readiness 11/11 PASS.
- Auto Update `check` with spaced dummy target path PASS; no real source update.
- 320 TypeScript/TSX source files transpile without syntax errors.
- Friendly error mappings independently tested for Firestore permission-denied, unavailable, unauthenticated.

NOT TESTED: Actual Android keyboard/IME on target phone, Windows Gradle APK build, live Firebase rules state or production Firestore write. Treat source regression as a gate, not device acceptance.

## 5. Expected user acceptance on Android

1. Focus title and multiline content: the focused field is revealed above keyboard; scrolling and editing remain possible.
2. Publish with no title: Bloom Toast asks for a title and focus moves to title; no image upload starts.
3. Publish without text or formula: Bloom Toast asks for content.
4. Publish with properly deployed Study rules using an authorized family account: question appears in another member's account.
5. Deny permissions deliberately: Bloom Toast gives an intelligible message and retains body/formula draft.
6. Answers, comments, reactions use Bloom feedback. Repeat with two cloned Android apps, then compare Home/Tab/Chess smoothness.
