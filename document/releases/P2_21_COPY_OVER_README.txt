FAMILY BLOOM — P2.21 TERMINAL-FIRST GAME TEARDOWN / DEDICATED FOCUS CAMERA

SAFE COPY-OVER FLOW
1. Keep your existing Family Bloom project folder.
2. Run Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat from this P2.21 package and point it at the old project when prompted.
3. Copy the ENTIRE P2.21 FULL CODE package over the existing project and replace files.
4. Inside the updated project run Family_Bloom_CLEAN_APPLY_FULL.bat.
5. Build/run Android Debug normally. If Metro cache looks stale, `npx expo start -c` is safe.

P2.21 IMPORTANT BEHAVIOR
- Authoritative terminal packet ends Chess/Xiangqi session immediately; result modal never keeps a session alive.
- Old terminal game ids are tombstoned so late callbacks cannot reclaim them.
- Result UI is root-owned and independent from GameBoardHost.
- Xiangqi terminal route returns to Game Hub and cannot auto-create/recover another game behind the result.
- Focus stays inside Phả hệ at 85% x 85% native-window geometry.
- Focus owns dedicated pan/zoom SharedValues and one native gesture root; no nested Focus gesture root remains.
- Chess/Xiangqi are still lazy-mounted. No startup board prewarm is reintroduced.

No Render restart or Firestore Rules/Indexes deployment is required solely for P2.21.
