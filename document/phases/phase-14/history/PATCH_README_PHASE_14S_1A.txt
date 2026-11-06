Family Bloom — Phase 14S.1A Fund Form UX Hotfix
Date: 2026-10-02
Base: Phase 14S.1 Fund Stewardship, Audit & Analytics

Fixes
1) Quỹ date picker crash
- home-fund.tsx was calling BloomDatePicker with legacy props value/onChange.
- The shared BloomDatePicker contract is selectedDate/onDateChange.
- This left onDateChange undefined and caused handleConfirm -> "undefined is not a function".
- The fund editor now uses the canonical props.

2) Multiline keyboard reveal
- The issue was not only vertical-gap math: the handover note and assistant-task multiline inputs were plain TextInput fields, so BloomKeyboardScreen never received their focused refs.
- All fund multiline fields now use FundKeyboardTextInput.
- Multiline fields use a larger reveal gap, re-check once after focus settles, and re-check whenever content height grows.
- This keeps the bottom of a tall multiline field above the keyboard rather than treating it like a one-line input.

3) Friendlier Vietnamese copy
- Removed internal/technical wording such as "user thật" and most "dấu chân" system language from user-facing fund screens.
- Renamed the visible audit area to "Nhật ký quỹ" and rewrote guidance in more natural family-facing language.

4) Full RAM test dataset
- DEV "Dữ liệu thử" now simulates the balance, month totals, transaction history, audit journal and chart, not only the chart.
- Data is deterministic and RAM-only. It never writes Firestore and disappears when the toggle is off.

Version
- app/package 1.2.1
- Android versionCode 142010
- iOS buildNumber 9

Deployment
- No new Firestore Rules or Functions are required for this hotfix if Phase 14S.1 rules are already deployed.
- Apply PATCH over Phase 14S.1, or use the FULL archive.

Validation
- Phase 14S: 35/35 PASS
- Phase 14S.1: 51/51 PASS
- Phase 14S.1A: 25/25 PASS
- TS/TSX syntax: 211/211 PASS
- Phase 14R.5A notification regression: 30/30 PASS
- Phase 14R.4G Gradle regression: 14/14 PASS
- Phase 13 release readiness: 11/11 PASS
