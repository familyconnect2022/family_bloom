# Family Bloom H21R4 — Chess preparation recovery and guarded Build & Share

Date: 2026-10-19. Base: `FAMILY_BLOOM_P2_37R2C_H21R3_GRADLE_AAPT2_RESOURCE_NAME_BUILD_FIX_FULL_2026-10-19.zip`.

## 1. Defect investigated: Chess waiting after choosing Bloom Bot

The client previously assigned `readyRequestedForGame = gameId` **before** two orientation-settling `requestAnimationFrame` callbacks. If the authoritative revision, transport state, or session changed before the callbacks, the callback did not send `chess:game:ready` but the latch prevented any later automatic retry. This is a definite lost-intent path consistent with a board stuck at "Đã chốt màu quân · Đợi Bloom Bot sẵn sàng". A missing board-ready ACK also lacked an independent retry once native had sent `assetsReady` once.

**H21R4 changes** (`src/services/games/nativeChessGameplayController.ts`):

- Distinguish orientation scheduled / ready ACK in-flight / ready intent delivered.
- Consume `readyRequestedForGame` **only after** validated native orientation frames.
- On failed board or play ACK, schedule a delayed 1.5-second idempotent retry while the **same game** is still waiting and transport is online. No local clock or state transition is faked.
- Clear retry timer and latches when a game ends, the game ID changes, or the Socket disconnects; verified server resync still owns reconnect.
- Keep native assets idempotently re-advertised at most once every 5 seconds during a waiting game, so a JS/runtime restart can recover an already-loaded board.

## 2. Preparing countdown

- Dedicated native countdown row in the Bloom Arena waiting card; the two match clocks remain at their full initial time until the server activates the game.
- Remaining waiting budget is computed using the server's `createdAt` and `serverNowMs` (120-second preparation deadline already enforced by `server/src/chess/chessGameManager.ts`).
- Android animates the text locally with `SystemClock.elapsedRealtime()`, with no Firestore or server timer writes; reconnect does not update the actual server-side deadline.
- The existing invitation countdown is a separate 60-second server-expiry feature; it is not repurposed as a playing clock or preparation deadline.
- This release deliberately does NOT change the server's invitation/away-budget policies.

## 3. Build & Share hardening

`Family_Bloom_BUILD_APK_TO_SHARE.bat` stays at root; implementation is under `scripts/android/build/`.

- Repairs incomplete/missing npm lock and stale installed local `family-bloom-overlay` dependency automatically before native checks (`npm install` if needed). If `npm ci` cannot use an existing lock, it retries with `npm install`.
- Removes a stale generated `android/app/build/outputs/apk/release/app-release.apk` and `build-output/Family_Bloom_Release_LATEST.apk` before compiling. Stale outputs can no longer satisfy the new build's output-existence check.
- Preserves H21R3 AAPT2 raw-resource file-name gate, 11 SoundPool MP3 integrity checks, native project/autolinking proof, package/versionCode proof, and DEX identity check.
- Verifies that the copied APK is SHA-256 identical to the freshly verified source before publishing `Family_Bloom_LATEST.apk`. Writes via `Family_Bloom_LATEST.apk.pending`, publishes a timestamped copy, and verifies both transfers.
- If a build fails, prints a warning that an older `Family_Bloom_LATEST.apk` in the share folder is NOT a result from this attempt.
- Preserves `C:\FamilyBloomShare\apk` default path and `FAMILY_BLOOM_SHARE_DIR`/first argument overrides; no phone or Metro needed for local Release build.
- Windows BAT files retain CRLF line endings; EAS post-install performs the H21R4 source gate.

**Identity unchanged from H21R3:** Android package `com.familybloom.android`, version `1.3.21`, versionCode `143031`, native identity `P2.37R2C-H21-native-1`. The published APK checksum distinguishes this build from the previous package. Reinstalling over an existing Android app additionally requires a compatible signing certificate.

## 4. Verification executed

- 17/17 automated source/build entrypoint/check suites passed (including Chess H15-H21, H21R1, H21R3, H21R4, AAPT2, imports, BAT structure, and native identity).
- H21 authoritative invitation/away tests: 32/32 passed.
- H21R3 native audio/AAPT2 checks: 9/9 passed.
- H21R4 gate: 12/12 passed; exercise both a matching APK copy and intentionally corrupted copy to confirm that the SHA-256 verifier rejects a mismatch.
- Audited 32 shipped BAT files: 32 found, 0 unmanaged.
- Source TS syntax transpile for changed bridge files passed (using globally installed TypeScript).

**Not verified here:** Android Gradle `:app:assembleRelease`, Kotlin/Android native compilation, dependency installation, APK signing and real-device install/launch. This workspace has no Android SDK/Gradle wrapper generated from Expo and npm registry network access is unavailable. A source test PASS must not be represented as a device APK PASS. This is a source-code FULL ZIP, **not a compiled APK**.

## 5. User steps on Windows

1. Extract this FULL ZIP into a fresh folder. For an existing project, run the included root `Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against that old project folder **before** copying the new files over it. Keep existing `.env` and local custom files according to the cleanup script's safeguards.
2. Copy the complete extracted project to the target project directory; run `Family_Bloom_CLEAN_APPLY_FULL.bat` in that directory to clear stale generated/cached state and install/verify dependencies.
3. Run root `Family_Bloom_BUILD_APK_TO_SHARE.bat`. Do not distribute any APK until it prints `[PASS] APK, timestamped backup, SHA256 and metadata verified...`.
4. Confirm new `Family_Bloom_LATEST.apk`, timestamped APK, `.sha256`, and `.txt` metadata in `C:\FamilyBloomShare\apk`, then install on a test Android device and exercise: new Bloom Bot game → preparing countdown → boardReady → color confirmation → playReady → 10:00 clock starts, including background/resume tests.
5. If Build & Share fails, retain the complete log beginning at the **first FAIL/Gradle error**, and attach it for a precise environment-specific fix. Also check that the remote Chess server is deployed and exposing the expected H21 protocol; an older deployed server can still reject H21 events.
