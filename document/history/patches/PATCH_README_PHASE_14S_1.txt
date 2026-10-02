FAMILY BLOOM — PHASE 14S.1 PATCH
Fund Stewardship, Audit & Analytics
Base: Phase 14S Family Fund V1

Apply
1. Extract this PATCH into the current Family Bloom project root.
2. Choose Replace/Overwrite for existing files.
3. Run Family_Bloom_Deploy_Firestore_Rules.bat before testing.
4. Build DEV with scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat.
5. Follow reports/device/PHASE_14S_1_DEVICE_CHECKLIST.txt.

Important behavior
- Admin/Owner bootstraps the fund as primary treasurer.
- Handover does not change rights until invited member accepts.
- After accepted handover, old Admin has no fund write right unless added as helper.
- Primary may choose max 2 helpers; each helper requires a task description.
- Only fund team can record income/expense.
- Primary edits/deletes any row within 3 days; helpers only their own rows.
- After 3 days the row is locked at client + Firestore Rules.
- Every financial/governance change writes immutable audit evidence.
- Day/month/year analytics are bounded; DEV mock chart data is RAM-only.

Version
1.2.0 / Android 142000 / iOS 8
