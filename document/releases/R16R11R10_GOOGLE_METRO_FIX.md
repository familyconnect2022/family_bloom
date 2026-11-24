# R16R11R10 · Android Metro Google login build gate

- Bug reproduction: `test-h25r2r5-internet-connectivity.cjs` was checking `onPress={handleGoogle}` while previous Google CTA used an arrow wrapper, causing a false FAIL after network banner PASS.
- Fix: one direct `handleGoogle`, synchronous `googleBusyRef.current = true`, state set for spinner/label and cleanup in finally; no experimental account chooser CTA.
- Loading UX: `BloomButton.keepTextWhileLoading` displays a readable label beside ActivityIndicator; opt-in and leaves all other buttons unchanged.
- Firebase: explicit manual sign-out clears Firebase and application Google selection; remote session eviction remains Firebase-only.
- Binary proof: exact 1.3.49/143059 in app.json, build metadata, bot proof, EAS and APK proof. P2.37R2C Kotlin native identity unchanged.
- Updated old regression gates to recognize current verified membership, Welcome, single session guards, and A3 styling; did not remove their protective checks.
- Tests to run: `node scripts/tests/release/test-h25r2r2-release-preflight.cjs`, `node scripts/tests/release/test-h25r2r5-internet-connectivity.cjs --source-only`, `node scripts/tests/release/test-r16r11r10-google-cancel-ui.cjs`, and `node scripts/tests/history/test-phase-p2_37r2c-binary-identity-lock.js`.
- Not yet proven: signed/installed APK on Windows or physical Google account chooser cancellation sequence.
