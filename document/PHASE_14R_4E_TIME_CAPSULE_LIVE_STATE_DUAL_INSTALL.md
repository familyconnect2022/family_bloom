# Phase 14R.4E — Time Capsule Live State + Dual Install Guard

## User-visible behavior
- Nhà Mình shows the Hộp thời gian status before the user opens the feature. Locked-preview boxes show a highlighted waiting state; due unopened boxes show MỞ NGAY. Hidden-preview boxes remain invisible until their reveal time.
- Recipient metadata is watched through one shared bounded query. Sender metadata is watched through one shared bounded created-by query. The horizontal sender box reacts to openedByUids from another device without pull-to-refresh.
- Creating a Báo trước capsule creates a targeted Chuyện trong nhà activity for each recipient. Hidden capsules intentionally create no early activity.
- The first recipient open creates a targeted Chuyện trong nhà activity for the creator. Existing Phase 11 target-activity push transport can deliver these remotely when Cloud Functions are deployed.
- Recipient reveal-time notification remains the exact local scheduled notification on that recipient device.

## Android side-by-side safety
- `app.config.js` now defaults ordinary/manual Expo commands to the DEV package. Production is only selected when `APP_VARIANT=production|release|prod` is explicit.
- Production prebuild also injects native `debug.applicationIdSuffix = ".dev"`. Therefore a later debug build from the RELEASE-generated `android/` tree still installs as `com.familybloom.android.dev` instead of replacing release.
- Production `google-services.json` now contains both the canonical release and DEV Android Firebase clients (the production client is unchanged), so that safety debug build can compile.
- The official DEV and RELEASE scripts validate the generated native base `applicationId` immediately after clean prebuild and stop before install/build if it is wrong.
- The DEV script records whether RELEASE was already installed and verifies that both package IDs still exist after DEV install.
- After applying 14R.4E, run an official DEV or RELEASE build script once before any manual `npx expo run:android`; this clean-prebuild refreshes an older native `android/` tree with the `.dev` debug suffix safety net.

## Required server state
- Deploy the Firestore rules included with 14R.4D/14R.4E so recipient writes to `openedByUids` are allowed. Without that rule, canonical sender-side live lid state cannot update from another device.
- Deploy Functions if OS-level remote push is required while the target app process is fully killed. The persisted Activity Center notices still exist without Functions, and foreground realtime state still works.
