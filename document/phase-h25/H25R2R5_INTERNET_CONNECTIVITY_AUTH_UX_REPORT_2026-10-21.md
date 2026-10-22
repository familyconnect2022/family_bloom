# Family Bloom H25R2R5 — Internet reachability and Android auth UX

## Baseline
H25R2R4 FULL CODE; H25R2R3 updater and source architecture retained. No changes to server, Firestore Rules/Indexes, Android native modules or signing configuration. Version 1.3.29, Android versionCode 143039, Android package `com.familybloom.android` unchanged.

## Problem
A device may display 5G/Wi-Fi while having no actual Internet (exhausted mobile data, captive portal, weak network). In H25R2R4, Google login could open an account picker then leave the user with unclear state. Phone login reported generic errors. A failure of Firebase is not proof of the entire Internet being offline.

## Implementation
- `src/services/network/internetReachabilityService.ts`: lightweight, dependency-free reachability probe. Uses two independent small HTTPS endpoints; validates expected response, bounds waits to 3400 ms, coalesces simultaneous probes, caches short-term outcomes and broadcasts status changes. Does not use SMS, credentials, user data or the Render socket. Internet online/offline is a best-effort observation; it cannot definitively diagnose cellular quota.
- `src/components/system/BloomInternetBanner.tsx`: non-blocking Android-only banner for confirmed probe failure. Polls while app is active: about every 16 s if offline or 85 s otherwise; probes immediately on foreground resume; no background timer. Hides automatically on recovery. Does not reset navigation, board state or Firebase Auth.
- `src/app/_layout.tsx`: banner positioned above the navigation/game siblings and is available before login.
- `src/context/AuthContext.tsx`: check reachability before Google sign-in, sending phone verification and confirming OTP. On network failures, show actionable Vietnamese copy; errors with confirmed Internet continue through existing Firebase error handling. No forced sign-out or credential reset.
- `src/app/(auth)/login.tsx`: immediate Google button loading + synchronous re-entry latch, and disable concurrent phone/login buttons.
- `scripts/test-h25r2r5-internet-connectivity.cjs`: preinstall source-only checks and dependency-aware JS VM tests. 20/20 total PASS including offline, captive portal, one-endpoint recovery, concurrent requests and offline→online. Added to H25 preflight, EAS, Clean Apply, Build & Share, direct APK release. Debug preflight runs source-only before dependencies.

## Validation executed
- Internet connectivity preinstall + runtime: 20/20 PASS.
- H25 preinstall source gate: 9/9 PASS.
- H25 Firebase invitation: 38/38 PASS.
- H25R2R4 touch/ACK runtime: 21/21 PASS.
- Native package identity 14/14 PASS.
- Windows BAT entrypoints 36 PASS.
- New/changed TS/TSX sources syntax-transpiled without diagnostics.
- No native Kotlin, Render server or Firebase configuration changed.

## Limitations and deployment
- This is a lightweight active probe, not operator quota detection; failures of both probes might reflect firewall/restrictions rather than exhausted data.
- Authentication failure with working Internet may still be a Firebase configuration, signing certificate, or native crash. For app force closes collect Android logcat rather than attributing them to network alone.
- Actual Windows Gradle APK compilation and device/network-condition tests have not been performed in this environment.
- JavaScript-only client change, no new native module; a compatible EAS OTA can work, or update the FULL source and build APK as normal.
- No Firebase indexes/rules or Render deployment required specifically for H25R2R5.

## Installation
1. Extract this FULL ZIP into its own new folder (never into an old project directory).
2. Run `Family_Bloom_AUTO_UPDATE_FULL.bat` in the extracted source.
3. After CLEAN APPLY success, run `Family_Bloom_BUILD_APK_TO_SHARE.bat` in the updated project.
4. Validate: mobile data disconnected, 5G signal with no Internet, Wi-Fi captive portal, restoration, Google/Phone login; distinguish errors from actual APK crash.
