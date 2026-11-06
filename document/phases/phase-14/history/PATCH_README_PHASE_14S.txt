FAMILY BLOOM — PHASE 14S — QUY GIA DINH V1
Date: 2026-10-01
Base: Phase 14R.5A Whisper App-Entry Catch-up Hotfix

WHAT CHANGED
- Replaced Quỹ gia đình UI shell with functional shared family ledger.
- Realtime family balance summary while the Fund screen is mounted.
- Realtime latest 30 ledger rows + bounded 30-row pagination for older history.
- Bounded current-month total scan (up to 500 rows, with an explicit cap notice beyond that).
- Full-screen Bloom create/edit flow with custom Bloom date picker.
- Income/expense types, VND amount, category, note and date.
- All family members may add entries.
- Creator may edit/delete their own entries; Owner/Admin may manage all entries.
- Firestore writes are atomic: ledger mutation and balance summary move together in one transaction.
- Firestore Rules validate the ledger shape and summary arithmetic.
- No bank account, card, payment credential or real payment integration is added.
- App update version advanced to 1.1.0 / Android versionCode 141000 / iOS build 7.

IMPORTANT BEFORE DEVICE TEST
1) Deploy the new Firestore Rules:
   Family_Bloom_Deploy_Firestore_Rules.bat
2) Build DEV first:
   scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat
3) Test Quỹ gia đình on two family accounts/devices when possible.
4) Only after DEV passes, build RELEASE:
   scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat

PATCH TARGET
- Apply this patch on top of Phase 14R.5A only.
- Allow Replace/Overwrite when extracting.

STATIC VALIDATION
- Phase 14S gate: 35 PASS / 0 FAIL
- Phase 14R.5A: 30 PASS / 0 FAIL
- Phase 14R.5: 27 PASS / 0 FAIL
- Phase 14R.4G: 14 PASS / 0 FAIL
- Phase 14R.4F: 10 PASS / 0 FAIL
- Phase 14R.4E: 22 PASS / 0 FAIL
- Phase 14R.4D: 26 PASS / 0 FAIL
- Phase 14R.4: 16 PASS / 0 FAIL
- Phase 14R.3: 8 PASS / 0 FAIL
- Phase 14R.2: 25 PASS / 0 FAIL
- Phase 14R.1: 45 PASS / 0 FAIL
- Phase 14R Time Capsule: 49 PASS / 0 FAIL
- Phase 14Q: 34 PASS / 0 FAIL
- Phase 14N: 13 PASS / 0 FAIL
- Phase 13: 11 PASS / 0 FAIL
- TS/TSX syntax: 211/211

NOTE
A full Expo/Gradle device build cannot be executed in this container. The provided Windows build scripts keep their existing real-device gates and now also run phase14s:check before prebuild.
