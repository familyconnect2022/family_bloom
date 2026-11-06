# Family Bloom P2.37R2C-H21R1 — Local Build SoundPool Audio Guard

**Code base:** H21 v1.3.21 (`versionCode=143031`), server/gameplay unchanged.

## Screenshot diagnosis

Gradle reports `BUILD SUCCESSFUL`, then the local release BAT rejects the APK because `check-board-audio-apk.js` cannot find the literal 11 paths `res/raw/fb_board_*.mp3` in the APK zip. The H21 source contains all 11 MP3 files; `npm pack --dry-run` shows those files in the local native module distribution. This alone cannot establish whether generated APK resources were omitted, shrunk, or merely renamed. An APK from the Windows machine is needed to identify which.

## H21R1 fixes

1. Add Android shrinker `tools:keep` rule for each of the eleven native SoundPool MP3s in the local overlay module (`modules/family-bloom-overlay/android/src/main/res/raw/com.familybloom.keep.xml`), including EAS autolinking builds.
2. After `expo prebuild --clean`, stage the 11 identical MP3s and the keep rules into the generated app's `android/app/src/main/res/raw/`, verifying SHA256. This is before Gradle so app and module resource merging can package them safely.
3. APK validation first accepts all 11 canonical named files. If Android renamed one or more APK paths, use Android SDK `aapt2 dump resources` to verify **every** compiled `R.raw.fb_board_*` entry. Missing resources still fail; no gate was bypassed.
4. Add an H21R1 packaging regression check to Release, CLEAN APPLY and EAS helper.

## Results and limits

- Native assets present in source: 11/11.
- Local module npm-pack dry run includes native audio: 11/11.
- Simulated APK validator: full named entries PASS; renamed APK paths with all resource-table IDs PASS; missing resource-table ID FAIL as intended.
- Automated gate checks the release BAT stages audio after prebuild but before assembleRelease.
- No Android SDK/Gradle build toolchain is available in this container; therefore real APK compilation and in-device audio are **not verified**. To confirm on Windows, run `Family_Bloom_BUILD_APK_TO_SHARE.bat` from this H21R1 copy and share its final output if anything fails.
- Changes do **not** alter Chess/Xiangqi game logic, clock, animation, UI, server, Firebase, or EAS identity.

## Installation

Use the normal FULL copy-over process: backup H21, pre-copy clean BAT, overlay all files in H21R1, run CLEAN APPLY, then BUILD APK TO SHARE. Do not upload/deploy Render for this packaging-only fix.
