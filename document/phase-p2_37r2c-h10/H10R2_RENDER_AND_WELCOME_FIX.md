# Family Bloom H10R2 — Native chess visibility and post-login welcome

## Observed behavior
- Game Full overlay, player panels, and clocks visible, but chessboard appears white, without 64 squares or pieces.
- After first successful login, a partial pink greeting card can show beneath the tabbar. Relaunch with cached auth often does not reproduce.

## Native chess root cause (source-confirmed)
- `ChessNativeBoardView.kt` created `boardMat` (opaque white background) at positive `elevation=5dp` above the sibling `board` (with 64 cells at default elevation).
- Android draws elevated siblings above later siblings. Thus the white backing mat occluded the checkered squares, pieces, legal hints, and touches visually.
- H10R2 sets `boardMat.elevation = 0f` and retains `addView(boardMat)` before `addView(board)`; normal sibling order now paints 64 squares above the mat. The promotion backdrop retains front ordering.

## Post-login welcome (supported hypothesis, not confirmed by device logs)
- `AuthContext` sets `showWelcome` after an interactive login when an active family is present, but not on ordinary process restore.
- The existing welcome was absolutely positioned relative to `rootNavigatorHost`, which can be unstable in dimensions during auth/tab navigation transition.
- H10R2 keeps the **in-tree** overlay (never a separate Native `Modal`, which previously caused H4 layout regressions), but explicitly bounds its width and height to `useWindowDimensions()`. This prevents an unexpectedly oversized navigation parent from centering the card below the viewport.
- Device verification is still required to confirm the exact first-login stacking behavior.

## Regression tests
- `node scripts/test-phase-p2_37r2c_h10r2-board-layer-welcome.js` checks 12 actual PNGs, mat/board Z-order, board caches, promotion, welcome viewport bounding, and session gate.
- Test is called by FULL CLEAN APPLY and the Android release APK build entrypoints before Gradle.
- Prior H4/H7/H8/H9A/H9B/H10 source checks remain unchanged.

## Test on Android
1. Rebuild and install a **new APK**, because `ChessNativeBoardView.kt` is Native Kotlin (OTA is not enough).
2. Open Chess against Bloom Bot. Confirm 8x8 contrasting squares, 32 pieces, selection hints, and moves render in Full; verify promotion picker if possible.
3. Sign out, then sign in again. Confirm greeting card appears centered ABOVE tab bar and the 'Vào tổ ấm ngay' action closes it; launch again without logging out and ensure there is no ghost card below tab bar.
4. If greeting still appears incorrectly, capture short video and device Logcat of the first sign-in; H10R2 only repairs a strongly suspected geometry issue and does not prove all OEM native-screen stacking conditions.

## Verification limitations
Static/source tests do not prove Android Kotlin compilation, device rendering, frame rate, or modal lifecycle. Requires user's Windows Android SDK Gradle build and real-device smoke test.
