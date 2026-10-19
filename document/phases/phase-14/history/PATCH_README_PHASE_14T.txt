FAMILY BLOOM — PHASE 14T — TRÒ CHƠI NHÀ MÌNH V1
Date: 2026-10-02
Base: Phase 14S.1A Fund Form UX Hotfix
App: 1.3.0 | Android versionCode 143000 | iOS build 10

WHAT IS INCLUDED
- Functional Trò chơi Nhà Mình hub with six approved games:
  1) Ai hiểu ai nhất?
  2) Đoán người Nhà Mình
  3) Ký ức này của ai?
  4) Chuyện thật hay bịa?
  5) Nối chuyện Nhà Mình
  6) Bingo Nhà Mình
- Turn-based/asynchronous family sessions. Players are real family membership users, never genealogy Person nodes.
- Hidden answers/secrets stay protected by Firestore rules until the round is revealed.
- Ký ức này của ai? uses bounded existing family Moments and hides the author until reveal.
- Nối chuyện can be saved as a text-only family Moment after reveal.
- 304+ curated Vietnamese prompts/items across question, clue, truth/lie inspiration, story and bingo banks.
- RAM-only 10 / 50 / 100 simulated session data on the game hub. No Firestore writes.
- Home hub card upgraded from shell to usable Trò chơi Nhà Mình.
- Bloom multiline input infrastructure hardened: remeasure on content growth + delayed Android keyboard remeasure. Bloom Supper visual styling is preserved.
- Phase 14S/14S.1/14S.1A Quỹ gia đình is preserved in the same source tree so fund testing can continue.

PERFORMANCE / DATA RULES
- One bounded shared session listener on the games hub, max 80 sessions.
- One bounded public-response listener while a game detail is mounted, max 60 rows.
- No per-game listener fan-out on the hub.
- No new Firestore composite index is required for Phase 14T.

BEFORE DEVICE TEST
1) Overwrite this patch on top of Phase 14S.1A, or use the FULL package.
2) Deploy Firestore Rules:
   Family_Bloom_Deploy_Firestore_Rules.bat
3) Build DEV:
   scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat

STATIC VALIDATION
- Phase 14T: 44/44 PASS
- Phase 14S: 35/35 PASS
- Phase 14S.1: 51/51 PASS
- Phase 14S.1A: 25/25 PASS
- Phase 14R.5A: 30/30 PASS
- Phase 14R.4G: 14/14 PASS
- Phase 14R.1 dual Android variants: 45/45 PASS
- TS/TSX syntax: 215/215 PASS

NOTE
This environment cannot run your physical Android Gradle/ADB flow. Device testing remains the final gate.
