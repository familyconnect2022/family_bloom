FAMILY BLOOM P2.28 — COPY-OVER README
=========================================

BASE
- Built from P2.27 FULL.
- Android identity remains com.familybloom.android.

RECOMMENDED COPY-OVER
1) Close Metro/Expo/Android Studio builds for the old project.
2) From THIS P2.28 package run:
   Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat "D:\path\to\your\existing\FamilyBloom"
3) Copy/overlay the entire P2.28 FULL package over that existing folder.
4) In the resulting project run:
   Family_Bloom_CLEAN_APPLY_FULL.bat
5) For a Release APK/share build run:
   Family_Bloom_BUILD_APK_AND_SHARE.bat

P2.28 PRE-COPY specifically removes the retired shared game/session modules so
an old overlay cannot leave stale files behind.

WHAT TO TEST FIRST
A. Focus
- Open Main Tree -> choose one person -> Focus.
- Pan repeatedly in all directions; newly reached nodes should appear and stay retained.
- Pinch follows fingers like Main Tree.
- Nodes inside Focus cannot switch the focused person.
- Back exits immediately; reopen another person from Main Tree.

B. Chess / Xiangqi outgoing Bot
- Use “Tôi mời Bot” three times.
- Run 1: Bot accepts.
- Run 2: Bot accepts.
- Run 3: Bot rejects; challenger sees warm terminal message + one “Đồng ý” button.
- Cycle then repeats.

C. Incoming Bot
- Use “Bot mời tôi”.
- Leave/return as directed and verify global invite UI.
- Accept: game page prepares board/audio before start.
- Reject: invitation dies cleanly.

D. 2-minute timeout
- Leave an invitation unanswered for 2 minutes.
- Invitee is told the invitation is no longer available.
- Challenger sees the “chưa sẵn sàng chơi lúc này” terminal state + one “Đồng ý”.
- Afterwards a fresh Chess or Xiangqi challenge must be allowed; old session/lock must not survive.

E. Cross-game exclusivity
- While A -> B challenge is pending in Chess, neither A nor B may create/join a Xiangqi challenge.
- Cancel/Reject/Expire then verify the other game becomes available immediately.

NOTE
The package does not include node_modules. CLEAN_APPLY/BUILD BAT installs missing
dependencies and runs app + server typecheck before Android build.
