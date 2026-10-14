Family Bloom Phase 14R.4B — RELEASE GATE HOTFIX
Date: 2026-10-01

Cause of RELEASE build failure:
- Phase 14R.1 static gate rejected every .bat file in the project root.
- The current FULL source intentionally ships two approved deployment helpers in the root:
  * Family_Bloom_Deploy_Firestore_Rules.bat
  * Family_Bloom_Deploy_Functions.bat
- Therefore phase14r1:check ended with 1 FAIL even though the app code itself was valid.

Fix:
1. Phase 14R.1 now allows exactly those two approved root deployment helpers and still rejects any other root BAT clutter.
2. Release build now also runs phase14r4:check so the latest Time Capsule UX/realtime changes are covered before Gradle.
3. Phase 14R.4 test now guards that the RELEASE BAT includes phase14r4:check.

Apply PATCH over Phase 14R.4A / current project root and overwrite files.
Then run the RELEASE helper again.
