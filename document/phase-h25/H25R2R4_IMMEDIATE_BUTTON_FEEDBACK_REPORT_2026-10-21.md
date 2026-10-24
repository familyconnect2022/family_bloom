# Family Bloom H25R2R4 — Immediate Button Feedback

Base: H25R2R3 Windows NPM ENOENT Safe Updater. This is a gameplay-UX-only release: no Firestore schema, Firebase security rules, Render protocol, Flutter/Web, timer policy or native app identity changes.

## Scope

1. Remove the overlapping `Chạm quân để chọn · Chạm ô để đi` hint from the Chess native board. Xiangqi removes its equivalent instructional/last-move notice below the player card, retaining a small error message only when needed.
2. Firebase invitation Accept/Decline/Cancel: respond in the same React event tick with a targeted Android spinner and text. A ref latches before the first network call; the second tap never creates a new Firestore transition while the first is pending.
3. Chess/Xiangqi family lobbies: targeted `Đang gửi…` spinner on the exact invite row, synchronous ref guard against rapid repeated invites. Resume control shows an inline spinner and latches during recovery.
4. Chess native drawing/offer/resign confirmations: genuine indeterminate Android `ProgressBar` appears on the **same confirmation button immediately on tap**. Do not dismiss the dialog until the server ACK or authoritative status arrives. Local native guard and independent Chess JS guard each reject repeated taps; failed ACK displays feedback and allows safe retry with the original `requestId`.
5. Xiangqi native draw/resign confirmations: a native Canvas spinner/label updates on the original action without waiting for JavaScript. Only the affected action-rail/modal area is re-invalidated during the animation. Native tap guard + independent Xiangqi JS guard prevent duplicates; a failed ACK displays retry feedback, and retry retains the original `requestId`.
6. Xiangqi **terminal result CTA**: the already-confirmed result closes its Full/Mini surface immediately; its server result ACK runs in the background (same behavior as Chess).
7. Both authoritative game controllers still receive state, turn, move version, clock and result from Render; no optimistic win/loss is invented by button feedback. Chess/Xiangqi keep separate lifecycle, session and native renderer implementations.

## Verification run

- `node scripts/tests/release/test-h25r2r4-touch-feedback.cjs --source-only`: 11/11 source-contract checks; does **not** need npm or TypeScript, and is included in the pre-copy updater preflight.
- `node scripts/tests/release/test-h25r2r4-touch-feedback.cjs`: 21/21 total (11 source + 10 VM behavioral): repeated Chess draw offer and Xiangqi resignation, pending frames, ACK timeout, request-ID reuse, and successful server confirmation.
- `node scripts/tests/release/test-h25r2r2-release-preflight.cjs`: 8/8 pre-copy gates.
- `node scripts/tests/release/test-h22r8-xiangqi-ux-draw.cjs`: 16/16; legacy expectation for the now-removed passive hint was updated, preserving all actual draw/move colors and geometry.
- Existing H25 Firebase, H25R2 black-side, H17–H21 Chess reconnect/offline and H22 native Xiangqi checks remain in release/build scripts.

## Release and deployment

Run `Family_Bloom_AUTO_UPDATE_FULL.bat` from the freshly extracted FULL ZIP, then `Family_Bloom_BUILD_APK_TO_SHARE.bat` in the updated project.

**A fresh Android APK is required** because `ChessNativeBoardView.kt`, `XiangqiNativeBoardView.kt` and native wire-state Kotlin classes changed. An OTA-only update is insufficient. There is no need to redeploy Firebase Rules/Indexes or Render only for H25R2R4.

Source-level and VM tests are not proof of a full Windows Gradle/Android APK build. Validate the first APK build on Windows before distributing.
