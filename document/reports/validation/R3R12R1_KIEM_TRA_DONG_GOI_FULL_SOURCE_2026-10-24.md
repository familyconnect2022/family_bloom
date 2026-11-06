# Family Bloom R3R12R1 — Báo cáo kiểm tra toàn vẹn FULL CODE

**Bản nền R3R11 được người dùng cung cấp:** `FAMILY_BLOOM_H25R2R7R2R3R11_CENTERED_LIM_MATRIX_NATIVE_MATH_FULL_CODE_2026-10-24.zip`.
SHA256 bản nền: `1333097c5462022da9824f176e470fed0bac03897e1d87ed359f830275483e80`.

**Lỗi ở ZIP R3R12 lần đầu**: loại nhầm **75 file** so với R3R11, trong đó có module Kotlin native của Chess/Xiangqi và nhiều BAT thiết yếu. Ngoài ra, **6 file BAT/build đã chỉnh sửa trong cây mã nguồn nhưng bị đóng gói bản cũ**, gây thất bại bài kiểm tra R3R12 khi chạy trên ZIP.

**Bản R3R12R1 này** dựng từ cây mã nguồn FULL của R3R11 + các chỉnh sửa R3R12.
- Khôi phục đủ 75 file vốn có trong R3R11.
- Bổ sung đủ 6 file BAT/build sửa mới, bao gồm kiểm thử R3R12 trước build và OTA.
- Giữ 16 file tính năng sửa và 7 file mới từ R3R12 ban đầu.
- Không có file gốc R3R11 nào bị mất. Tổng số file trong ZIP là 1405 (bao gồm báo cáo này).
- Mã nguồn trước khi build phải cập nhật Firestore rules, riêng thao tác đổi tên giới thiệu nhà.
- Kiểm tra tĩnh/Node không thay thế chạy Gradle APK, Firebase/Android thực tế.

## File BAT/build được khôi phục nội dung mới

- `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat`
- `scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat`
- `scripts/android/build/resolve-build-target.cjs`
- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`
- `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`

## Các file bị thiếu trong ZIP lần đầu

- `document/android/ANDROID_SCRIPT_LAYOUT.md`
- `modules/family-bloom-overlay/android/build.gradle`
- `modules/family-bloom-overlay/android/src/main/AndroidManifest.xml`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiMiniState.kt`
- `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bb.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bk.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bn.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bp.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bq.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/br.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_advisor.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_cannon.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_chariot.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_elephant.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_general.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_horse.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_soldier.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_advisor.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_cannon.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_chariot.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_elephant.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_general.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_horse.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_soldier.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wb.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wk.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wn.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wp.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wq.png`
- `modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wr.png`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_capture.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_castle.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_game_end.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_game_start.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_illegal.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_check.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_opponent.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_self.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_premove.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_promote.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/fb_board_tenseconds.mp3`
- `modules/family-bloom-overlay/android/src/main/res/raw/keep.xml`
- `scripts/android/Family_Bloom_MENU.bat`
- `scripts/android/build/Family_Bloom_Android_Build_APK_ONLY.bat`
- `scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat`
- `scripts/android/build/Family_Bloom_Android_Test_App_CLEAN_RELEASE.bat`
- `scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat`
- `scripts/android/build/Family_Bloom_BUILD_APK_AND_SHARE.bat`
- `scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat`
- `scripts/android/build/Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat`
- `scripts/android/build/Select-GoogleServicesFile.ps1`
- `scripts/android/build/diagnose-build-location.cjs`
- `scripts/android/build/firebase-android-config.cjs`
- `scripts/android/build/resolve-build-target.cjs`
- `scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat`
- `scripts/android/dev/Family_Bloom_Android_Metro_Only.bat`
- `scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat`
- `scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat`
- `scripts/android/install/Family_Bloom_Android_Install_Last_APK.bat`
- `scripts/android/install/Family_Bloom_INSTALL_R2C_APK.bat`
- `scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat`
- `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`
- `scripts/android/maintenance/Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat`
- `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`
- `scripts/android/maintenance/Family_Bloom_VERIFY_SERVER_TYPES.bat`
- `scripts/android/maintenance/Select-FamilyBloomProjectFolder.ps1`
- `scripts/android/verify/Family_Bloom_VERIFY_DEVICE_BINARY_R2C.bat`
- `scripts/android/verify/Family_Bloom_VERIFY_FULL_SOURCE.bat`

## Kiểm tra an toàn khi bàn giao

ZIP gồm nguồn trực tiếp từ worktree, không qua bộ lọc loại trừ `modules/**/android` hoặc `scripts/android/**`. Xác minh mỗi file byte-for-byte với mã nguồn làm việc và phát hành SHA256.
