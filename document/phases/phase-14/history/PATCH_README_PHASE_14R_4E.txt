Family Bloom Phase 14R.4E — Time Capsule Live State + Dual Install Guard
Base: Phase 14R.4D Horizontal Box Collection
Date: 2026-10-01

What changed
1. Nhà Mình Hộp thời gian card now shows state BEFORE entry:
   - MỞ NGAY when a visible recipient box is due and unopened.
   - N HỘP ĐANG CHỜ for locked-preview future boxes.
   - Hidden-preview boxes remain undisclosed until due, preserving privacy.
2. Realtime state is now symmetric:
   - one shared bounded recipient query;
   - one shared bounded creator query;
   - sender horizontal boxes react to openedByUids updates from another device without manual refresh.
3. Status notifications:
   - Báo trước creation writes a targeted Chuyện trong nhà event to recipients;
   - first recipient open writes a targeted Chuyện trong nhà event to the creator;
   - existing target-activity push transport can send these as remote OS pushes when Functions are deployed;
   - exact recipient reveal-time local notification remains scheduled on-device;
   - foreground sender/recipient changes also surface as Bloom notification toasts.
4. Android RELEASE + DEV coexistence is hardened in two layers:
   - ordinary/manual Expo commands default to DEV package com.familybloom.android.dev;
   - production requires explicit APP_VARIANT=production/release/prod;
   - a RELEASE-generated native android/ tree gets debug applicationIdSuffix ".dev", so a later debug build from that same native tree cannot replace RELEASE;
   - production google-services.json carries both canonical RELEASE and DEV Firebase Android clients;
   - both official build scripts verify generated native applicationId after clean prebuild;
   - DEV script verifies RELEASE remains installed when it existed before DEV installation.

IMPORTANT after applying this patch
Run ONE official build script once before using any manual npx expo run:android command. This clean-prebuilds the native android/ tree with the new side-by-side safety rule.

Recommended first run for DEV:
  scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat

Recommended first run for RELEASE:
  scripts\android\Family_Bloom_Android_Test_App_RELEASE.bat

Do not reuse an old pre-14R.4E android/ tree for a manual debug build; that old tree does not contain the native .dev suffix safety net.

Important for two-device live-open state
Deploy the included Firestore rules so a recipient may append only their own uid to openedByUids. Use:
  Family_Bloom_Deploy_Firestore_Rules.bat
Without the updated rule, the canonical sender-side live lid state cannot be guaranteed.

Remote push note
Chuyện trong nhà events are persisted even without Functions. Reliable OS-level remote push while the target app process is fully killed requires the existing Firebase Functions push transport to be deployed. Foreground realtime state and exact recipient local reveal reminders do not require that remote push path.

Recommended device test
1. Apply PATCH over 14R.4D (or use FULL).
2. Deploy Firestore rules.
3. Install RELEASE with the official RELEASE BAT.
4. Install DEV with scripts\android\Family_Bloom_Android_DEV_Build_And_Run.bat.
   Confirm it prints: Side-by-side verification PASS: RELEASE + DEV are both installed.
5. Use two accounts/devices. Create a Báo trước box.
6. Confirm recipient Nhà Mình highlights MỞ NGAY / HỘP ĐANG CHỜ before entering Hộp thời gian.
7. Open the box on recipient device. Without refreshing sender Hộp thời gian, confirm sender box lid animates to ajar/open and a sender status event appears.
