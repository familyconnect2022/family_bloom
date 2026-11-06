# Family Bloom — Metro logging policy (Android)

Default for ordinary phone testing: **quiet**. No noisy `[BloomGate]`, `[BloomVisualD3]`, `[BloomSession]`, E2E-notification success messages, or family-switch performance messages. No automatic diagnostic ribbon/Android alert on Welcome. The SessionDiagnostics observer also remains off by default, avoiding snapshot listeners, diagnostic timers and repeated timeline allocations.

Do NOT call `console.disableYellowBox`, `LogBox.ignoreAllLogs`, or override global `console`: genuine failures must remain discoverable. This change does not alter Auth/Profile/Membership gates, data reads, Firestore rules or user features. Only the observer and test-only output/overlays are opt-in.

For a deliberate diagnostic **development** build, set `EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS=1` to enable the in-memory session timeline and Welcome visual probes (only for the verified developer account). Set `EXPO_PUBLIC_FB_METRO_TEST_LOGS=1` to print Metro test information. Flags are independent. Remove the flags (or set to `0`) for regular phone performance testing; restart Metro with `npx expo start --clear` after changing EXPO_PUBLIC values. Release builds should leave both unset.

The app's error handling and important `console.error`/`console.warn` calls are retained. Debug instrumentation can still affect performance if explicitly enabled; benchmark with flags off, ideally a Release APK as well as a Development build. Metro itself can be slower than a Release APK even with no app-side logs.
