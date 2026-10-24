# Danh mục API/hàm để tra cứu

Sinh tự động bằng `node scripts/maintenance/generate-vietnamese-code-map.cjs`.

**Lưu ý quan trọng:** đây là bảng *tên và vị trí định nghĩa* do công cụ quét tĩnh tìm được, không phải khẳng định mọi hàm hay suy diễn hành vi cụ thể. Đối với các hàm nội bộ, callbacks và dynamic exports, mở file tương ứng để xem. Muốn hiểu luồng chạy, hãy bắt đầu bằng `01-KIEN-TRUC.md` và `03-LUONG-HAM-QUAN-TRONG.md`.

Số file nguồn đã quét: 351. Số khai báo được lập chỉ mục: 876.

| Phân hệ | File : dòng | Hàm / API | Gợi ý khu vực |
|---|---|---|---|
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt:5` | `ChessSquareLayoutIdentity` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt:13` | `chessFacingForPlayer` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt:19` | `chessSquareLayoutIsStale` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt:27` | `chessSquareAtScreenCell` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:30` | `ChessNativeBoardView` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:107` | `run` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:146` | `configurePlayerCard` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:162` | `configureAvatar` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:175` | `configureClock` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:239` | `parkForMini` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:249` | `handleAudio` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:259` | `bind` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:304` | `onVisibilityAggregated` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:312` | `planPieceMotion` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:338` | `cancelPieceMotion` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:354` | `startPieceMotion` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:403` | `onDetachedFromWindow` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:410` | `destroy` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:421` | `scheduleClockTick` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:427` | `updateClocks` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:447` | `ensureSoundPool` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:484` | `emitGameAction` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:491` | `notifyAssetsReadyIfLoaded` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:506` | `playSound` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:514` | `buildPromotionPicker` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:557` | `configureAction` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:577` | `buildBloomActionRow` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:588` | `buildBloomDialog` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:600` | `configureLabel` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:664` | `bloomGradient` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:672` | `styleBloomDialog` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:740` | `updateWaitingStatus` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:758` | `renderBloomDialog` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:875` | `submitDecision` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:889` | `launchBloomFireworks` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:909` | `askConfirmation` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:919` | `buildCells` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:964` | `onSizeChanged` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:969` | `layoutChildren` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1062` | `ensureRecoveredGeometry` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1077` | `layoutSquares` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1104` | `render` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1243` | `parseFen` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1264` | `pieceDrawable` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1279` | `clock` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1288` | `rounded` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1294` | `roundedStroke` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1297` | `squareBackground` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1302` | `dot` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1307` | `captureRing` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt:1313` | `dp` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt:8` | `ChessPieceMotionLeg` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt:11` | `plan` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt:48` | `parseFen` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:24` | `PresentationCommand` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:51` | `definition` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:160` | `requireActivity` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:163` | `railFor` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:189` | `destroyRail` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:198` | `sendDiagnostic` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:205` | `emit` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:220` | `FamilyBloomOverlayRail` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:285` | `run` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:311` | `ProbeState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:323` | `isMiniPeeked` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:324` | `setMiniPeeked` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:328` | `dockedMiniX` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:370` | `onAttachedToWindow` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:386` | `onDetachedFromWindow` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:391` | `onSizeChanged` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:404` | `hasHostSize` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:408` | `viewportWidth` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:410` | `viewportHeight` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:412` | `hasViewportSize` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:414` | `emitLayoutReady` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:427` | `onInterceptTouchEvent` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:429` | `onTouchEvent` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:431` | `setMode` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:439` | `setKind` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:444` | `setGameId` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:449` | `setInsetTop` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:454` | `setInsetBottom` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:459` | `applyCommand` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:474` | `suspendForBackground` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:485` | `statusPayload` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:502` | `runNativeProof` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:525` | `runProbe` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:555` | `destroy` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:573` | `scheduleApply` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:582` | `applyPresentation` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:600` | `setRailBounds` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:612` | `showFull` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:644` | `confirmFullVisible` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:674` | `completeProbeIfVisible` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:692` | `showMini` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:738` | `confirmMiniVisible` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:759` | `hideAll` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:767` | `ensureTransparentHost` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:772` | `revealHostForPresentation` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:782` | `hideHostRoot` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:794` | `promoteAboveScreenStack` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:807` | `siblingPayload` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:836` | `visibilityName` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:843` | `buildNativeProofBadge` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:859` | `buildFullSurface` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:904` | `buildMiniSurface` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:925` | `updateFullGeometry` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:939` | `applyKind` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:962` | `noteMiniClockSource` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:968` | `chessClockSource` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:971` | `xiangqiClockSource` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:974` | `activeMiniClock` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:982` | `chessLastGlyph` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1001` | `refreshMiniText` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1028` | `applyXiangqiMiniState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1035` | `updateChessMiniOpacity` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1042` | `applyChessBoardState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1061` | `configureChessLayer` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1075` | `applyXiangqiBoardState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1081` | `configureXiangqiLayer` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1089` | `configureGameLayer` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1131` | `configureActionButton` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1144` | `actionLayout` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1149` | `installMiniGesture` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1213` | `emit` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1230` | `rounded` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1236` | `roundedStroke` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1239` | `dp` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt:1240` | `pxToDp` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt:6` | `NativeChessBoardState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt:51` | `fromJson` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:6` | `XiangqiNativePiece` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:9` | `XiangqiNativePoint` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:10` | `NativeXiangqiBoardState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:46` | `fromJson` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:48` | `nullable` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:49` | `longOrNull` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt:50` | `pointOrNull` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiMiniState.kt:6` | `NativeXiangqiMiniState` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiMiniState.kt:17` | `fromJson` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiMiniState.kt:19` | `millis` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:29` | `XiangqiNativeBoardView` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:36` | `dp` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:53` | `run` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:63` | `invalidateClocksOnly` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:70` | `scheduleClockTick` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:103` | `preloadAvatar` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:122` | `clearMove` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:125` | `prepareVerifiedMotion` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:142` | `gradientBox` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:152` | `centerText` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:164` | `ensureAudio` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:180` | `playCue` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:191` | `color` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:192` | `box` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:197` | `line` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:201` | `text` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:207` | `toScreen` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:211` | `drawPiece` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:231` | `clock` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:232` | `timeLeft` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:237` | `bind` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:285` | `destroy` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:293` | `showConnectingPreview` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:294` | `ensureRecoveredGeometry` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:295` | `maybeSendReady` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:306` | `onSizeChanged` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:307` | `onDraw` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:419` | `drawBloomKing` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:441` | `drawConnectingBloom` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:453` | `drawBloomHub` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:460` | `card` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:502` | `drawDecisionSpinner` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:512` | `drawBloomActions` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:527` | `drawBloomDrawProposal` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:552` | `h` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:553` | `drawBloomResult` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:588` | `drawBloomPreparation` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:620` | `submitDecision` | Native Surface |
| Native Android module | `modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt:626` | `onTouchEvent` | Native Surface |
| Server Render | `server/src/app.ts:9` | `buildServer` | Xem triển khai trong file |
| Server Render | `server/src/chess/chessGameManager.ts:10` | `awayAllowanceMs` | Server Cờ vua |
| Server Render | `server/src/chess/chessGameManager.ts:51` | `ChessGameManager` | Server Cờ vua |
| Server Render | `server/src/chess/chessPersistenceService.ts:6` | `ChessPersistenceService` | Server Cờ vua |
| Server Render | `server/src/chess/chessTypes.ts:43` | `ChessDomainError` | Server Cờ vua |
| Server Render | `server/src/chess/gameHours.ts:7` | `isFamilyGameCreationOpen` | Server Cờ vua |
| Server Render | `server/src/chess/gameHours.ts:13` | `assertFamilyGameCreationOpen` | Server Cờ vua |
| Server Render | `server/src/chess/rematchProposalStore.ts:21` | `RematchProposalStore` | Server Cờ vua |
| Server Render | `server/src/firebase/firebaseAdmin.ts:12` | `adminAuth` | Xem triển khai trong file |
| Server Render | `server/src/firebase/firebaseAdmin.ts:13` | `adminDb` | Xem triển khai trong file |
| Server Render | `server/src/games/boardGameActiveLock.ts:34` | `inspectBoardGameActiveLock` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGameActiveLock.ts:54` | `resolveLiveBoardGameActiveLock` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:48` | `getPendingBoardGameReservation` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:53` | `reservePendingBoardGame` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:74` | `reservePendingBoardGameParticipants` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:119` | `updatePendingBoardGameInviteId` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:132` | `releasePendingBoardGameReservation` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:146` | `releasePendingBoardGameInvite` | Khóa phiên / lời mời |
| Server Render | `server/src/games/boardGamePendingReservation.ts:160` | `pendingReservationPublicShape` | Khóa phiên / lời mời |
| Server Render | `server/src/games/developerDualAppPresence.ts:9` | `onDualAppPresenceChange` | Khóa phiên / lời mời |
| Server Render | `server/src/games/developerDualAppPresence.ts:14` | `hasDualAppLease` | Khóa phiên / lời mời |
| Server Render | `server/src/games/developerDualAppPresence.ts:17` | `listDualAppLeaseUids` | Khóa phiên / lời mời |
| Server Render | `server/src/games/developerDualAppPresence.ts:22` | `setDualAppLease` | Khóa phiên / lời mời |
| Server Render | `server/src/games/firebaseInvitationMatch.ts:14` | `resolveFirebaseMatch` | Khóa phiên / lời mời |
| Server Render | `server/src/games/firebaseInvitationMatch.ts:74` | `finalizeInvitationWithGame` | Khóa phiên / lời mời |
| Server Render | `server/src/games/firebaseInvitationMatch.ts:94` | `cleanupPreviousInvitesWhenAwake` | Khóa phiên / lời mời |
| Server Render | `server/src/routes/health.ts:5` | `healthRouter` | Xem triển khai trong file |
| Server Render | `server/src/security/developerIdentity.ts:6` | `isVerifiedDeveloperIdentity` | Xem triển khai trong file |
| Server Render | `server/src/socket/socketServer.ts:209` | `installChessSocket` | Xem triển khai trong file |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:6` | `createInitialXiangqiState` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:28` | `isXiangqiInCheck` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:29` | `legalForColor` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:30` | `allLegal` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:31` | `playXiangqiMove` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiEngine.ts:32` | `chooseBotPlan` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiGameManager.ts:31` | `xiangqiAwayAllowanceMs` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiGameManager.ts:37` | `XiangqiGameManager` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiPersistenceService.ts:5` | `XiangqiPersistenceService` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiSocket.ts:19` | `XIANGQI_EVENTS` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiSocket.ts:48` | `installXiangqiSocket` | Server Cờ tướng |
| Server Render | `server/src/xiangqi/xiangqiTypes.ts:39` | `XiangqiDomainError` | Server Cờ tướng |
| Ứng dụng React Native | `src/app/_layout.tsx:307` | `RootLayout` | Màn hình / route |
| Ứng dụng React Native | `src/app/_layout.web.tsx:7` | `WebRootLayout` | Màn hình / route |
| Ứng dụng React Native | `src/app/(activity)/(notifications)/notification-preferences.tsx:30` | `NotificationPreferencesScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(activity)/(notifications)/notifications.tsx:41` | `buildActivitySections` | Màn hình / route |
| Ứng dụng React Native | `src/app/(activity)/(notifications)/notifications.tsx:81` | `Notifications` | Màn hình / route |
| Ứng dụng React Native | `src/app/(activity)/event/[eventId].tsx:32` | `EventDetailScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(auth)/_layout.tsx:4` | `AuthLayout` | Màn hình / route |
| Ứng dụng React Native | `src/app/(auth)/login.tsx:15` | `Login` | Màn hình / route |
| Ứng dụng React Native | `src/app/(auth)/otp.tsx:13` | `OTP` | Màn hình / route |
| Ứng dụng React Native | `src/app/(chat)/chat/index.tsx:16` | `ChatScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(graph)/family-graph-admin.tsx:126` | `FamilyGraphAdminScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(graph)/family-graph-person-editor.tsx:130` | `FamilyGraphPersonEditorScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(graph)/family-graph-proposals.tsx:34` | `GraphProposals` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(graph)/family-graph-relationship-editor.tsx:91` | `FamilyGraphRelationshipEditorScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(graph)/family-graph.tsx:32` | `FamilyGraphScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(membership)/family-gateway.tsx:25` | `FamilyGatewayScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(membership)/family-join-requests.tsx:17` | `FamilyJoinRequestsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(membership)/family-memberships.tsx:28` | `FamilyMembershipsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/(membership)/family-select.tsx:14` | `FamilySelectScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/family-timeline.tsx:62` | `FamilyTimelineScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(family)/member/[uid].tsx:39` | `MemberDetailScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(board)/home-board.tsx:24` | `HomeBoardScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(fund)/home-fund.tsx:451` | `HomeFundScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(games)/home-chess.tsx:22` | `ChessFamilyLobby` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(games)/home-game-create.tsx:23` | `HomeGameCreateScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(games)/home-game/[sessionId].tsx:41` | `HomeGameDetailScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(games)/home-games.tsx:21` | `HomeGamesScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(games)/home-xiangqi.tsx:22` | `XiangqiFamilyLobby` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(kitchen)/home-kitchen/[recipeId].tsx:11` | `HomeKitchenRecipeScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(kitchen)/home-kitchen/index.tsx:10` | `HomeKitchenScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(learning)/learning-lesson.tsx:11` | `LearningLesson` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(learning)/learning-library.tsx:11` | `LearningLibrary` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(learning)/study-question-compose.tsx:12` | `StudyQuestionCompose` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(learning)/study-question-detail.tsx:49` | `StudyQuestionDetail` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(learning)/study-questions.tsx:22` | `StudyQuestions` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(music)/home-music.tsx:7` | `HomeMusicLegacyRedirect` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(polls)/home-polls.tsx:11` | `HomePollsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(time-capsule)/home-time-capsule-compose.tsx:80` | `HomeTimeCapsuleComposeScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(time-capsule)/home-time-capsule-demo.tsx:5` | `HomeTimeCapsuleDemoScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(time-capsule)/home-time-capsule/[capsuleId].tsx:35` | `HomeTimeCapsuleDetailScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(time-capsule)/home-time-capsules.tsx:350` | `HomeTimeCapsulesScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(home)/(whispers)/home-whispers.tsx:11` | `HomeWhispersScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(internal)/board-game-bot-test.tsx:88` | `BoardGameBotTestScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(internal)/developer-tools.tsx:23` | `DeveloperToolsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(internal)/performance-data-test.tsx:84` | `PerformanceDataTestScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(internal)/performance-graph-test.tsx:22` | `PerformanceGraphTestScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(memories)/memory-book.tsx:17` | `MemoryBookScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(profile)/cloud-manager.tsx:12` | `CloudManager` | Màn hình / route |
| Ứng dụng React Native | `src/app/(profile)/create-profile.tsx:39` | `CreateProfileScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(profile)/profile.tsx:67` | `Profile` | Màn hình / route |
| Ứng dụng React Native | `src/app/(profile)/settings.tsx:21` | `SettingsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/_layout.tsx:493` | `TabLayout` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/_layout.web.tsx:2` | `WebTabsLayout` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/family.tsx:30` | `FamilyScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/index.tsx:361` | `HomeScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/moments.tsx:173` | `MomentsScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/planner.tsx:476` | `PlannerScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/(tabs)/play.tsx:51` | `PlayScreen` | Màn hình / route |
| Ứng dụng React Native | `src/app/+html.tsx:3` | `Root` | Màn hình / route |
| Ứng dụng React Native | `src/components/events/EventCard.tsx:29` | `EventCard` | Thành phần UI |
| Ứng dụng React Native | `src/components/events/EventParticipantsPicker.tsx:7` | `EventParticipantsPicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/family/FamilyMemberPicker.tsx:32` | `FamilyMemberPicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/family/FamilySwitcherModal.tsx:65` | `FamilySwitcherModal` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:47` | `getFamilyGraphBshModel` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:48` | `putFamilyGraphBshModel` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:50` | `getFamilyGraphBshLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:51` | `putFamilyGraphBshLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:53` | `getFamilyGraphBshGeometry` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:54` | `putFamilyGraphBshGeometry` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:56` | `getFamilyGraphBshScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:57` | `putFamilyGraphBshScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:59` | `hydrateFamilyGraphRuntimeState` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:76` | `retainFamilyGraphRuntimePersonIds` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:90` | `updateFamilyGraphRuntimeCamera` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:102` | `clearFamilyGraphBshCaches` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphBshCache.ts:110` | `getFamilyGraphBshCacheStats` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphConnectorRouting.ts:39` | `getFamilyGraphConnectorPort` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphConnectorRouting.ts:321` | `buildFamilyGraphConnectorRoutingPlan` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:34` | `getFamilyGraphFocusBshModel` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:35` | `putFamilyGraphFocusBshModel` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:37` | `getFamilyGraphFocusBshLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:38` | `putFamilyGraphFocusBshLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:40` | `getFamilyGraphFocusBshScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:41` | `putFamilyGraphFocusBshScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusBshCache.ts:43` | `clearFamilyGraphFocusBshCaches` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusCamera.ts:4` | `applyFocusPanDelta` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusCamera.ts:17` | `applyFocusPinchScale` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/FamilyGraphFocusHost.tsx:28` | `FamilyGraphFocusHost` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusRuntimeCache.ts:38` | `hydrateFamilyGraphFocusRuntimeState` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusRuntimeCache.ts:52` | `retainFamilyGraphFocusPersonIds` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusRuntimeCache.ts:70` | `updateFamilyGraphFocusCamera` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphFocusRuntimeCache.ts:86` | `clearFamilyGraphFocusRuntime` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/FamilyGraphFocusView.tsx:129` | `FamilyGraphFocusView` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphGeometry.ts:13` | `FAMILY_GRAPH_GEOMETRY_VERSION` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphGeometry.ts:14` | `FAMILY_GRAPH_NODE_CARD_WIDTH` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphGeometry.ts:15` | `FAMILY_GRAPH_NODE_CARD_HEIGHT` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphGeometry.ts:16` | `FAMILY_GRAPH_CONNECTOR_LANE_GAP` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphGeometry.ts:46` | `buildFamilyGraphGeometry` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphLiveAdapter.ts:22` | `getFamilyGraphGenerationY` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphLiveAdapter.ts:25` | `getFamilyGraphCanvasHeight` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphLiveAdapter.ts:378` | `adaptFamilyGraphSnapshot` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphLiveAdapter.ts:508` | `refreshFamilyGraphVisualProfiles` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphMainCamera.ts:4` | `applyMainFamilyGraphPanDelta` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphMainCamera.ts:17` | `applyMainFamilyGraphPinchScale` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/FamilyGraphPersonSheet.tsx:156` | `FamilyGraphPersonSheet` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/FamilyGraphPrototype.tsx:167` | `FamilyGraphPrototype` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphPrototypeData.ts:46` | `FAMILY_GRAPH_CANVAS` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphPrototypeData.ts:57` | `FAMILY_GRAPH_PROTOTYPE_PEOPLE` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphPrototypeData.ts:463` | `FAMILY_GRAPH_PROTOTYPE_CONNECTIONS` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphPrototypeData.ts:499` | `FAMILY_GRAPH_DEFAULT_FOCUS_ID` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphRevision.ts:4` | `fingerprintFamilyGraphSnapshot` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphRevision.ts:21` | `fingerprintFamilyGraphLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:31` | `FAMILY_GRAPH_BSH_VERSION` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:32` | `FAMILY_GRAPH_SCENE_VERSION` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:33` | `FAMILY_GRAPH_LAYOUT_VERSION` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:34` | `FAMILY_GRAPH_FOCUS_ENTRY_SCALE` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:35` | `FAMILY_GRAPH_FOCUS_ENTRY_VIEWPORT_Y` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:154` | `peekFamilyGraphRenderSceneIdentity` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:177` | `peekFamilyGraphRenderScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:235` | `fingerprintFamilyGraphTopology` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:263` | `buildFamilyGraphModel` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:426` | `buildFamilyGraphLayout` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:503` | `buildFamilyGraphScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:913` | `buildFamilyGraphRenderScene` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSceneBuilder.ts:936` | `buildFamilyGraphRenderSceneInterruptible` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSpatialGrid.ts:35` | `getSpatialSegmentBounds` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSpatialGrid.ts:42` | `expandSpatialRect` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphSpatialGrid.ts:56` | `FamilyGraphSpatialGrid` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:30` | `mapFamilyGraphCanvasPointToViewport` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:52` | `mapFamilyGraphViewportPointToCanvas` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:73` | `getFamilyGraphPanForAnchor` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:96` | `getFamilyGraphCameraSnapshotFromTransform` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:119` | `mergeRetainedFamilyGraphPersonIds` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:128` | `rectsIntersect` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:138` | `getFamilyGraphNodeRect` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:160` | `getPolylineBounds` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:185` | `getFamilyGraphViewportRect` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphViewport.ts:230` | `buildProgressiveFamilyGraphOrder` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:80` | `hydrateFamilyGraphWarmCache` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:99` | `primeFamilyGraphWarmCache` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:136` | `getFamilyGraphWarmRecord` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:139` | `getOrBuildFamilyGraphVisual` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:163` | `updateFamilyGraphViewState` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/familyGraphWarmCache.ts:171` | `clearFamilyGraphWarmCache` | Thành phần UI |
| Ứng dụng React Native | `src/components/familyGraph/FamilyPersonMultiPicker.tsx:10` | `FamilyPersonMultiPicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/BoardGamePresentationRoot.android.tsx:32` | `BoardGamePresentationRoot` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/BoardGamePresentationRoot.tsx:37` | `BoardGamePresentationRoot` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/BotInviteCountdown.tsx:8` | `botInviteSecondsLeft` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/BotInviteCountdown.tsx:13` | `BotInviteCountdown` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/ChessChallengeGate.tsx:14` | `ChessChallengeGate` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/ChessSessionRecoveryGate.tsx:16` | `ChessSessionRecoveryGate` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/FamilyBoardGameLobbyVisuals.tsx:10` | `mayChallengeMember` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/FamilyBoardGameLobbyVisuals.tsx:11` | `memberPresenceText` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/FamilyBoardGameLobbyVisuals.tsx:20` | `ArenaPlayerRow` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/FamilyBoardGameLobbyVisuals.tsx:39` | `ArenaRuleLine` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/FirebaseBoardInvitationGate.tsx:20` | `FirebaseBoardInvitationGate` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/XiangqiChallengeGate.tsx:10` | `XiangqiChallengeGate` | Thành phần UI |
| Ứng dụng React Native | `src/components/games/XiangqiSessionRecoveryGate.tsx:11` | `XiangqiSessionRecoveryGate` | Thành phần UI |
| Ứng dụng React Native | `src/components/home/HomeActivityBell.tsx:11` | `HomeActivityBell` | Thành phần UI |
| Ứng dụng React Native | `src/components/layout/BloomKeyboardScreen.tsx:35` | `useBloomKeyboardFocus` | Thành phần UI |
| Ứng dụng React Native | `src/components/layout/BloomKeyboardScreen.tsx:47` | `BloomKeyboardScreen` | Thành phần UI |
| Ứng dụng React Native | `src/components/layout/ScreenContainer.tsx:6` | `ScreenContainer` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:43` | `useMediaViewer` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:49` | `inferMediaViewerType` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:62` | `cloudinaryVideoThumbnail` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:70` | `cloudinaryImageThumbnail` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:79` | `cloudinaryAvatarThumbnail` | Thành phần UI |
| Ứng dụng React Native | `src/components/media/MediaViewerProvider.tsx:166` | `MediaViewerProvider` | Thành phần UI |
| Ứng dụng React Native | `src/components/moments/MomentCard.tsx:913` | `MomentCard` | Thành phần UI |
| Ứng dụng React Native | `src/components/moments/MomentFamilyMultiPicker.tsx:8` | `MomentFamilyMultiPicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/moments/PendingMomentCard.tsx:19` | `PendingMomentCard` | Thành phần UI |
| Ứng dụng React Native | `src/components/onboarding/JoinFamilyModal.tsx:13` | `JoinFamilyModal` | Thành phần UI |
| Ứng dụng React Native | `src/components/onboarding/WelcomeModal.tsx:10` | `WelcomeModal` | Thành phần UI |
| Ứng dụng React Native | `src/components/system/BloomAppBootstrap.tsx:10` | `BloomAppBootstrap` | Thành phần UI |
| Ứng dụng React Native | `src/components/system/BloomInternetBanner.tsx:7` | `BloomInternetBanner` | Thành phần UI |
| Ứng dụng React Native | `src/components/system/BloomPushBridge.tsx:31` | `BloomPushBridge` | Thành phần UI |
| Ứng dụng React Native | `src/components/system/DeferredFamilyPrewarm.tsx:17` | `DeferredFamilyPrewarm` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomActionCard.tsx:7` | `BloomActionCard` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomAvatarButton.tsx:30` | `BloomAvatarButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomButton.tsx:38` | `BloomButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomChipButton.tsx:25` | `BloomChipButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomFAB.tsx:21` | `BloomFAB` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomHoldButton.tsx:23` | `BloomHoldButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomIconButton.tsx:28` | `BloomIconButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomIconToggle.tsx:18` | `BloomIconToggle` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomProgressButton.tsx:26` | `BloomProgressButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomQuantityButton.tsx:19` | `BloomQuantityButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/BloomSwitch.tsx:13` | `BloomSwitch` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/shared.ts:9` | `COLORS` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/shared.ts:38` | `renderIcon` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/shared.ts:60` | `useBloomTouchAnimation` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/utils.ts:3` | `getInitials` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomButtonComponents/utils.ts:17` | `getColorByName` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomConfirmDialog.tsx:22` | `BloomConfirmDialog` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomConfirmModal.tsx:19` | `BloomConfirmModal` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomDialogProvider.tsx:35` | `useBloomDialog` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomDialogProvider.tsx:48` | `BloomDialogProvider` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomFullScreenFlow.tsx:34` | `BloomFullScreenFlow` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomHeroHeader.tsx:436` | `BloomHeroHeader` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomDatePicker.tsx:28` | `BloomDatePicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomFilePicker.tsx:23` | `BloomFilePicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomInputAvatar.tsx:23` | `BloomInputAvatar` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomOTPInput.tsx:14` | `BloomOTPInput` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomRatingInput.tsx:16` | `BloomRatingInput` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/BloomTextInput.tsx:37` | `BloomTextInput` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/shared.ts:17` | `COLORS` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/shared.ts:36` | `renderIcon` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomInputComponents/shared.ts:66` | `sharedInputStyles` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomLoadingOverlay.tsx:18` | `BloomLoadingOverlay` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomNoteCallout.tsx:20` | `BloomNoteCallout` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:11` | `BloomBackButton` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:26` | `BloomStickyHeader` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:49` | `BloomPageHeader` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:75` | `BloomSectionHeader` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:103` | `BloomCard` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:132` | `BloomQuickAction` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:154` | `BloomInfoRow` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:176` | `BloomListRow` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:222` | `BloomEmptyState` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomPageComponents.tsx:246` | `BloomPill` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomTimePicker.tsx:75` | `BloomTimePicker` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomToast.tsx:86` | `useBloomToast` | Thành phần UI |
| Ứng dụng React Native | `src/components/ui/BloomToast.tsx:92` | `BloomToastProvider` | Thành phần UI |
| Ứng dụng React Native | `src/config/env.ts:14` | `DEFAULT_CHESS_SOCKET_URL` | Xem triển khai trong file |
| Ứng dụng React Native | `src/config/env.ts:26` | `ENV` | Xem triển khai trong file |
| Ứng dụng React Native | `src/config/env.ts:38` | `assertPublicConfig` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:1` | `FAMILY_GRAPH_MAX_PEOPLE_DEFAULT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:11` | `APP_CONFIG_DEFAULTS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:100` | `DEFAULT_FAMILY_GRAPH_QUERY_CONFIG` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:105` | `DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:109` | `DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:113` | `resolveFamilyGraphQueryConfig` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appConfiguration.ts:129` | `resolveFamilyGraphFocusConfig` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appPaths.ts:4` | `APP_CONFIG` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appPaths.ts:9` | `APP_CATEGORIES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/appPaths.ts:36` | `getCloudinaryFolder` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/bloomSupper.ts:7` | `BLOOM_SUPPER` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/buildMode.ts:6` | `INTERNAL_TOOLS_ENABLED` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/buildMode.ts:7` | `RELEASE_BUILD` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/dataLimits.ts:5` | `DATA_LIMITS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/e2eTest.ts:7` | `E2E_TEST_HARNESS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/e2eTest.ts:14` | `isE2ETestHarnessAvailable` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/featureFlags.ts:8` | `FEATURE_FLAGS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/featureFlags.ts:19` | `ENABLE_FAMILY_BULLETIN` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/homeKitchenRecipes.ts:3` | `HOME_KITCHEN_RECIPES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/homeKitchenRecipes.ts:78` | `getHomeKitchenRecipe` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/motion.ts:1` | `BLOOM_MOTION` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/performanceTest.ts:5` | `PERFORMANCE_TEST_BUILD` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/performanceTest.ts:6` | `FAMILY_BLOOM_DEV_EMAIL` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/performanceTest.ts:8` | `isPerformanceTestAccount` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/performanceTest.ts:10` | `isVerifiedDeveloperAccount` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/theme.ts:1` | `COLORS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/theme.ts:31` | `UI` | Xem triển khai trong file |
| Ứng dụng React Native | `src/constants/theme.ts:38` | `SPACING` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/AuthContext.tsx:64` | `AuthProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/AuthContext.tsx:428` | `useAuth` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/FamilyRealtimeContext.tsx:54` | `FamilyRealtimeProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/FamilyRealtimeContext.tsx:158` | `useFamilyMembersRealtime` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/FamilyRealtimeContext.tsx:159` | `useFamilyMomentsRealtime` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/FamilyRealtimeContext.tsx:160` | `useFamilyEventsRealtime` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/HomeMusicPlayerContext.tsx:32` | `HomeMusicPlayerProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/HomeMusicPlayerContext.tsx:167` | `useHomeMusicPlayerControls` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/HomeMusicPlayerContext.tsx:173` | `useHomeMusicPlayer` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/MomentPublishContext.tsx:69` | `useMomentPublish` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/MomentPublishContext.tsx:95` | `usePendingMomentProgress` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/MomentPublishContext.tsx:112` | `MomentPublishProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:16` | `MAIN_TAB_IDS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:23` | `TAB_WARM_GRACE_MS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:24` | `TAB_RESTORE_DELAY_MS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:25` | `TAB_HANDOFF_FREEZE_MS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:369` | `TabRuntimeProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:387` | `useTabRuntimeController` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:400` | `useTabLiveState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:407` | `useTabRuntime` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:415` | `useTabRuntimeSnapshot` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:422` | `useTabDirtyVersion` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:477` | `useTabLiveEffect` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabRuntimeContext.tsx:488` | `useOptionalTabLiveEffect` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabStartupContext.tsx:26` | `TabStartupProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabStartupContext.tsx:79` | `useTabStartup` | Xem triển khai trong file |
| Ứng dụng React Native | `src/context/TabStartupContext.tsx:80` | `useTabStartupTask` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:5` | `KNOW_EACH_OTHER_QUESTIONS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:79` | `GUESS_PERSON_CLUES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:130` | `TRUTH_LIE_IDEAS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:149` | `STORY_STARTERS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:212` | `BINGO_CELLS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:233` | `GAME_COPY` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:242` | `getPromptById` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/games/homeGameQuestionBank.ts:246` | `getBingoCell` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/kitchen/bloomRecipesV1.ts:8` | `BLOOM_RECIPES_V1` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogAdditions.generated.ts:14` | `VIETNAMESE_MUSIC_ADDITIONS_GENERATED_AT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogAdditions.generated.ts:16` | `VERIFIED_VIETNAMESE_MUSIC_ADDITIONS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogAdditions.generated.ts:76` | `VIETNAMESE_MUSIC_REVIEW_QUEUE` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV1.ts:39` | `VIETNAMESE_MUSIC_CATALOG_VERSION` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV1.ts:41` | `VIETNAMESE_MUSIC_SEEDS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV1.ts:137` | `vietnameseSeedsForBucket` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV2.ts:13` | `VIETNAMESE_MUSIC_CATALOG_VERSION` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV2.ts:43` | `VIETNAMESE_MUSIC_SEEDS_V2` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV2.ts:44` | `VIETNAMESE_MUSIC_VERIFIED_COUNT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV2.ts:45` | `VIETNAMESE_MUSIC_REVIEW_COUNT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicCatalogV2.ts:47` | `vietnameseSeedsForBucket` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicPlayableV2.generated.ts:10` | `VIETNAMESE_MUSIC_PROVIDER_AUDIT_VERSION` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicPlayableV2.generated.ts:11` | `VIETNAMESE_MUSIC_PROVIDER_AUDIT_GENERATED_AT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicPlayableV2.generated.ts:12` | `PREAUDITED_VIETNAMESE_TRACKS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicPlayableV2.generated.ts:13` | `AUDIUS_UNMATCHED_SEED_IDS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicPlayableV2.generated.ts:14` | `AUDIUS_AMBIGUOUS_SEED_IDS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicSourceSignals.generated.ts:4` | `VIETNAMESE_MUSIC_SOURCE_SIGNALS_GENERATED_AT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/data/music/vietnameseMusicSourceSignals.generated.ts:6` | `VIETNAMESE_MUSIC_DYNAMIC_SIGNALS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/kitchen/KitchenFeaturePanel.tsx:57` | `KitchenFeaturePanel` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/music/HomeMusicPanel.tsx:133` | `HomeMusicPanel` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/polls/PollFeaturePanel.tsx:29` | `PollFeaturePanel` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/timeCapsule/TimeCapsuleRevealPrototype.tsx:149` | `TIME_CAPSULE_REVEAL_THEMES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/timeCapsule/TimeCapsuleRevealPrototype.tsx:413` | `TimeCapsuleRevealPrototype` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/home/whispers/WhisperFeaturePanel.tsx:43` | `WhisperFeaturePanel` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/LessonRichView.tsx:45` | `LessonRichView` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/publishedLessons.ts:3` | `PUBLISHED_PATH` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/publishedLessons.ts:14` | `parsePublished` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/publishedLessons.ts:30` | `listPublishedLessons` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/publishedLessons.ts:39` | `getPublishedLesson` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/richLesson.ts:17` | `inlineTokens` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/learning/richLesson.ts:39` | `parseLessonBlocks` | Xem triển khai trong file |
| Ứng dụng React Native | `src/features/study/StudyComposer.tsx:14` | `StudyComposer` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyFeedback.ts:6` | `studyErrorMessage` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyFeedback.ts:29` | `showStudyError` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormula.tsx:7` | `FORMULA_TEMPLATES` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormula.tsx:24` | `formulaToAccessibleText` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormula.tsx:44` | `splitNativeMath` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormula.tsx:56` | `NativeFormula` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormula.tsx:66` | `StudyBlocksView` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaEditor.tsx:10` | `FormulaEditor` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:6` | `MAX_EXPRESSION_PARTS` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:7` | `MAX_COMPOUND_TEX_LENGTH` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:8` | `COMPOUND_OPERATORS` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:14` | `textPart` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:15` | `templatePart` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:19` | `isFormulaPartComplete` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:24` | `compileFormulaParts` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:37` | `compoundFromSaved` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaExpression.ts:51` | `moveFormulaPart` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaTemplates.ts:11` | `VISUAL_FORMULA_TEMPLATES` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaTemplates.ts:46` | `findVisualTemplate` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaTemplates.ts:47` | `sampleFields` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaTemplates.ts:48` | `compileVisualFormula` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/StudyFormulaTemplates.ts:50` | `migrateLegacyFormula` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyRepository.ts:5` | `STUDY_PAGE_SIZE` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyRepository.ts:12` | `STUDY_SUBJECTS` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyRepository.ts:13` | `subjectName` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyRepository.ts:14` | `studyTimestamp` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/features/study/studyRepository.ts:34` | `studyRepository` | Hỏi đáp / công thức Super Bloom |
| Ứng dụng React Native | `src/hooks/family/useFamilyDashboard.ts:20` | `useFamilyDashboard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyEvent.ts:5` | `useFamilyEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyEvents.ts:38` | `useFamilyEvents` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyGraph.ts:14` | `useFamilyGraph` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyMembers.ts:20` | `useFamilyMembers` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyPersonContent.ts:11` | `useFamilyPersonContent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyPersonDirectory.ts:5` | `useFamilyPersonDirectory` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyPersonIntegrations.ts:7` | `useFamilyPersonIntegrations` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/useFamilyPersonsByIds.ts:13` | `useFamilyPersonsByIds` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/family/usePendingFamilyReviews.ts:8` | `usePendingFamilyReviews` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/games/useDeferredGameSurface.ts:13` | `useDeferredGameSurface` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/media/useMediaUpload.ts:12` | `useMediaUpload` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/moments/useFamilyMoments.ts:17` | `useFamilyMoments` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/moments/useOnThisDayMemories.ts:5` | `useOnThisDayMemories` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/profile/useUserProfile.ts:3` | `useUserProfile` | Xem triển khai trong file |
| Ứng dụng React Native | `src/hooks/ui/useBloomTaskToast.ts:10` | `useBloomTaskToast` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/activity/activityBadgeSignalStore.ts:12` | `activityBadgeSignalStore` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/activity/activityService.ts:179` | `activityService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/activity/graphActivitySessionService.ts:26` | `graphActivitySessionService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/activity/smartReminderService.ts:194` | `smartReminderService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/auth/authService.ts:22` | `normalizePhoneNumber` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/auth/authService.ts:28` | `authService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/bootstrap/bootSessionCache.ts:35` | `bootSessionCache` | Khởi động và cache |
| Ứng dụng React Native | `src/services/bootstrap/bootstrapCoordinator.ts:119` | `bootstrapCoordinator` | Khởi động và cache |
| Ứng dụng React Native | `src/services/bootstrap/familyHomeWarmCache.ts:114` | `familyHomeWarmCache` | Khởi động và cache |
| Ứng dụng React Native | `src/services/calendar/calendarIndex.ts:44` | `monthKey` | Lịch gia đình |
| Ứng dụng React Native | `src/services/calendar/calendarIndex.ts:45` | `dayKey` | Lịch gia đình |
| Ứng dụng React Native | `src/services/calendar/calendarIndex.ts:47` | `buildCalendarMonthProjection` | Lịch gia đình |
| Ứng dụng React Native | `src/services/calendar/calendarIndex.ts:95` | `getDaySummary` | Lịch gia đình |
| Ứng dụng React Native | `src/services/calendar/calendarService.ts:5` | `calendarService` | Lịch gia đình |
| Ứng dụng React Native | `src/services/chess/chessSocketService.ts:344` | `chessSocketService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/error/errorService.ts:138` | `toAppError` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/error/errorService.ts:157` | `parseAppError` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/error/errorService.ts:158` | `errorService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/error/runtimeDiagnosticsService.ts:18` | `runtimeDiagnosticsService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/event/eventEntityCache.ts:42` | `canonicalizeFamilyEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/event/eventEntityCache.ts:66` | `canonicalizeFamilyEvents` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/event/eventEntityCache.ts:69` | `canonicalizeFamilyEventsStable` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/event/eventService.ts:54` | `normalizeFamilyEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/event/eventService.ts:190` | `eventService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/family/familyJoinService.ts:15` | `familyJoinService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/family/familyService.ts:105` | `familyService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/familyGraph/crossFamilyGraphBridge.ts:24` | `buildCrossFamilyIdentityBridge` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphCloudGateway.ts:50` | `postFamilyGraphMutation` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphMutationService.ts:680` | `familyGraphMutationService` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphQueryEngine.ts:200` | `FamilyGraphQueryEngine` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphQueryEngine.ts:1048` | `createFamilyGraphQueryEngine` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphRepository.ts:38` | `familyGraphRepository` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyGraphService.ts:49` | `familyGraphService` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyKinshipResolver.ts:23` | `compareFamilyPersonAge` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyKinshipResolver.ts:169` | `resolveVietnameseKinship` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/familyPersonContentService.ts:109` | `familyPersonContentService` | Phả hệ |
| Ứng dụng React Native | `src/services/familyGraph/graphProposalService.ts:18` | `graphProposalService` | Phả hệ |
| Ứng dụng React Native | `src/services/firebase/firestorePaths.ts:8` | `FIRESTORE_PATHS` | Ánh xạ đường dẫn Firebase |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:29` | `subscribeBoardGameNativeXiangqiActions` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:34` | `setBoardGameNativeXiangqiState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:39` | `subscribeBoardGameNativeChessActions` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:44` | `setBoardGameNativeChessState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:57` | `hasBoardGameNativeHostModule` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:61` | `subscribeBoardGameNativeDiagnostics` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:78` | `subscribeBoardGameNativeActions` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:83` | `setBoardGameNativePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:97` | `getBoardGameNativeHostStatus` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:108` | `runBoardGameNativePlaneProbe` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:125` | `getBoardGameNativeBinaryIdentity` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGameNativeOverlay.ts:137` | `runBoardGameNativeBinaryProof` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationBridge.ts:32` | `syncChessPresentationFromState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationBridge.ts:66` | `syncXiangqiPresentationFromState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationBridge.ts:83` | `syncChessPresentationFromMove` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationBridge.ts:98` | `syncXiangqiPresentationFromMove` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationBridge.ts:122` | `attachBoardGamePresentationBridge` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationDiagnostics.ts:17` | `emitBoardGamePresentationDiagnostic` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationDiagnostics.ts:39` | `subscribeBoardGamePresentationDiagnostics` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationDiagnostics.ts:44` | `getRecentBoardGamePresentationDiagnostics` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:24` | `CHESS_PENDING_PREFIX` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:25` | `XIANGQI_PENDING_PREFIX` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:36` | `markChessResultDismissed` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:43` | `markXiangqiResultDismissed` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:48` | `wasXiangqiResultDismissed` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:54` | `wasChessResultDismissed` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:82` | `getBoardGamePresentationSnapshot` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:86` | `subscribeBoardGamePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:91` | `useBoardGamePresentationSnapshot` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:104` | `activateBoardGamePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:121` | `presentPendingChessBoard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:135` | `dismissPendingChessBoard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:140` | `presentPendingXiangqiBoard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:150` | `dismissPendingXiangqiBoard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:154` | `presentConfirmedBoardGame` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:210` | `minimizeBoardGamePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:215` | `restoreBoardGamePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:220` | `closeBoardGamePresentation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/boardGamePresentationStore.ts:229` | `closeBoardGamePresentationForGame` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/developerDualAppTest.ts:15` | `loadDualAppTestSetting` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/developerDualAppTest.ts:22` | `isDualAppTestOn` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/developerDualAppTest.ts:25` | `setDualAppTestSetting` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/developerDualAppTest.ts:30` | `DEV_DUAL_APP_LEASE_EVENT` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/firebaseBoardInvitations.ts:24` | `inviteIsOccupied` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/firebaseBoardInvitations.ts:29` | `createFirebaseInvitation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/firebaseBoardInvitations.ts:59` | `transitionFirebaseInvitation` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/firebaseBoardInvitations.ts:96` | `watchMyFirebaseInvitations` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/firebaseBoardInvitations.ts:121` | `watchInvitationSlots` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:3` | `HOME_GAME_TIMEZONE` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:4` | `HOME_GAME_OPEN_HOUR` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:5` | `HOME_GAME_CLOSE_HOUR` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:6` | `HOME_GAME_MAX_ACTIVE_PER_TYPE` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:7` | `HOME_GAME_ROUND_DURATION_MS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:29` | `getHomeGamePlayWindow` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:49` | `isHomeGameExpired` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:53` | `homeGameStatusLabel` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/gameRoomPolicy.ts:59` | `formatHomeGameDeadline` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:404` | `showNativeChessConnectingPreview` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:427` | `setNativeChessTransportConnected` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:461` | `syncNativeChessAuthoritativeState` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:568` | `syncNativeChessAuthoritativeMove` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:944` | `handleNativeChessAction` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:1053` | `attachNativeChessAppLifecycle` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeChessGameplayController.ts:1074` | `clearNativeChessSession` | Cờ vua độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:207` | `syncNativeXiangqiAuthoritativeState` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:237` | `syncNativeXiangqiAuthoritativeMove` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:297` | `resyncXiangqi` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:330` | `handleNativeXiangqiAction` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:407` | `setNativeXiangqiTransportConnected` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:424` | `attachNativeXiangqiAppLifecycle` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/games/nativeXiangqiGameplayController.ts:442` | `clearNativeXiangqiSession` | Cờ tướng độc lập |
| Ứng dụng React Native | `src/services/home/homeFundService.ts:353` | `homeFundService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeGameService.ts:157` | `homeGameService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeKitchenService.ts:100` | `homeKitchenService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homePollService.ts:54` | `isHomePollExpired` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homePollService.ts:88` | `endOfLocalDay` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homePollService.ts:94` | `homePollService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeTimeCapsuleService.ts:89` | `isTimeCapsuleOpen` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeTimeCapsuleService.ts:90` | `timeCapsuleOpenMillis` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeTimeCapsuleService.ts:92` | `homeTimeCapsuleService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeTimeCapsuleService.ts:389` | `HOME_TIME_CAPSULE_LIMITS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/homeWhisperService.ts:192` | `homeWhisperService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/music/audiusMusicProvider.ts:70` | `audiusMusicProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/music/homeMusicService.ts:180` | `homeMusicService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/music/vietnameseMusicMatcher.ts:136` | `resolveVietnameseSeed` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/music/vietnameseMusicMatcher.ts:164` | `isCuratedVietnameseTrack` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/home/music/vietnameseMusicMatcher.ts:167` | `clearVietnameseMatchCache` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/media/cloudinaryService.ts:13` | `cloudinaryService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/media/mediaService.ts:58` | `mediaService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/memory/memoryBookService.ts:18` | `memoryBookService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/moments/momentDeepLinkCache.ts:24` | `momentDeepLinkCache` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/moments/momentEntityCache.ts:30` | `canonicalizeFamilyMoment` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/moments/momentEntityCache.ts:46` | `canonicalizeFamilyMoments` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/moments/momentEntityCache.ts:49` | `canonicalizeFamilyMomentsStable` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/moments/momentsService.ts:110` | `momentsService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/navigation/routeOwnership.ts:32` | `routeOwnershipContracts` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/navigation/routeOwnership.ts:34` | `getRouteOwnership` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/navigation/routeOwnership.ts:36` | `assertRouteDoesNotOwnFeatureData` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/network/internetReachabilityService.ts:40` | `internetReachabilityService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/overlay/overlayCoordinator.ts:28` | `OverlayCoordinator` | Native Surface |
| Ứng dụng React Native | `src/services/performance/bloomTaskScheduler.ts:142` | `bloomTaskScheduler` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/e2eTestHarnessService.ts:68` | `e2eTestHarnessService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/performanceTestService.ts:415` | `performanceTestService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:28` | `syntheticMediaUri` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:29` | `syntheticMediaUriFor` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:31` | `generateSyntheticMoments` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:67` | `generateSyntheticMembers` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:86` | `generateSyntheticEvents` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:122` | `generateSyntheticTimeline` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticAppData.ts:133` | `generateSyntheticMemoryBook` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/syntheticFamilyGraph.ts:21` | `createSyntheticFamilyGraph` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:10` | `TAB_UI_CRITICAL_WINDOW_MS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:100` | `beginUiCriticalWindow` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:111` | `commitAfterUiCriticalWindow` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:121` | `cancelDeferredUiCommit` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:126` | `getUiFrameBudgetSnapshot` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/performance/uiFrameBudget.ts:134` | `resetUiFrameBudgetForTests` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/presentation/bloomSurfaceStackStore.ts:6` | `BLOOM_SURFACE_LAYER` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/profile/profileService.ts:43` | `profileService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/push/localNotificationService.ts:272` | `localNotificationService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/push/pushTokenService.ts:60` | `pushTokenService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/realtime/sharedRealtimeRegistry.ts:40` | `subscribeSharedRealtime` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/realtime/sharedRealtimeRegistry.ts:141` | `getSharedRealtimeRegistrySnapshot` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/realtime/sharedRealtimeRegistry.ts:154` | `resetSharedRealtimeRegistry` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/realtime/sharedRealtimeRegistry.ts:162` | `sharedRealtimeRegistryDebug` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/realtime/uiSignalStore.ts:7` | `createKeyedSignalStore` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiLocalRules.ts:7` | `createInitialXiangqiState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiLocalRules.ts:29` | `isXiangqiInCheck` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiLocalRules.ts:30` | `legalForColor` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiLocalRules.ts:31` | `allLegal` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiLocalRules.ts:32` | `playXiangqiMove` | Xem triển khai trong file |
| Ứng dụng React Native | `src/services/xiangqi/xiangqiSocketService.ts:229` | `xiangqiSocketService` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:20` | `EMPTY_CHESS_CAPTURE_COUNTS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:21` | `emptyChessCaptureSummary` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:99` | `applyChessMoveDelta` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:177` | `CHESS_TIME_CONTROLS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:185` | `CHESS_ERROR_COPY` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:205` | `CHESS_EVENTS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:242` | `CHESS_TEST_BOT_UID_PREFIX` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/chess.ts:243` | `isChessTestBotUid` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/errors.ts:36` | `AppError` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/user.ts:12` | `DEFAULT_SMART_REMINDER_PREFERENCES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/xiangqiRealtime.ts:17` | `XIANGQI_EVENTS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/types/xiangqiRealtime.ts:22` | `XIANGQI_TIME_CONTROLS` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:3` | `startOfLocalDay` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:5` | `toDateKey` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:12` | `parseEventDate` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:17` | `eventDateParts` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:28` | `isDateBeforeToday` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:35` | `getEffectiveEventDate` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:60` | `getEventStatus` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:68` | `formatEventDate` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/event.ts:76` | `mergeEventsById` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/family.ts:5` | `normalizeFamilyName` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/family.ts:15` | `createFamilyCodeCandidate` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:77` | `canonicalizePartnerIds` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:84` | `getParentChildRelationshipId` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:91` | `getPartnerRelationshipId` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:96` | `getFamilyRelationshipId` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:104` | `normalizeCreateFamilyPersonInput` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:157` | `normalizeFamilyPerson` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:217` | `normalizeFamilyRelationship` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:278` | `normalizeFamilyPersonLink` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:297` | `wouldCreateParentCycle` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:324` | `getIncidentRelationships` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/familyGraph.ts:343` | `planParentChildRelationshipBatch` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/firestore.ts:2` | `removeUndefinedDeep` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/firestore.ts:16` | `compactRecord` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/graphProposal.ts:5` | `sameDocument` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/graphProposal.ts:12` | `buildProposalTarget` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/graphProposal.ts:41` | `approveTarget` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/index.ts:3` | `getInitials` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/index.ts:17` | `getColorByName` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/momentPublishPolicy.ts:1` | `MAX_ADDITIONAL_MOMENT_FAMILIES` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/momentPublishPolicy.ts:7` | `normalizeMomentTargetFamilyIds` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/momentPublishPolicy.ts:25` | `momentResumeProgress` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/personName.ts:1` | `getGivenName` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/personName.ts:6` | `getGivenNameInitial` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/personName.ts:11` | `getGivenNameSection` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/personName.ts:16` | `compareDisplayNamesByGivenName` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/personName.ts:28` | `groupByGivenNameInitial` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/profile.ts:17` | `normalizeUserProfile` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/safeRouterBack.ts:7` | `safeRouterBack` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/scheduleIdleSequence.ts:2` | `scheduleIdleSequence` | Xem triển khai trong file |
| Ứng dụng React Native | `src/utils/timelineSections.ts:21` | `buildMomentTimelineSections` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebFamilyManager.tsx:10` | `WebFamilyGateway` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebFamilyManager.tsx:16` | `WebFamilyManager` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebLoginScreen.tsx:4` | `WebLoginScreen` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebMemoryTools.tsx:11` | `WebFamilyTimeline` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebMemoryTools.tsx:16` | `WebMemoryBook` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebOverlay.tsx:3` | `WebModal` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebOverlay.tsx:14` | `FormRow` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebOverlay.tsx:15` | `InlineNotice` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:3` | `WebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:17` | `WebCard` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:21` | `EmptyState` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:25` | `Skeleton` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:29` | `DataError` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebPrimitives.tsx:34` | `webGrid` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebRootGate.tsx:7` | `WebRootGate` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebRuntimeBoundary.tsx:4` | `WebRuntimeBoundary` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/components/WebTabShell.tsx:18` | `WebTabShell` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/context/WebAuthContext.tsx:33` | `WebAuthProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/context/WebAuthContext.tsx:129` | `useWebAuth` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/context/WebFamilyContext.tsx:27` | `WebFamilyProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/context/WebFamilyContext.tsx:84` | `useWebFamily` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/firebaseWeb.ts:23` | `firebaseWebApp` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/firebaseWeb.ts:24` | `webAuth` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/firebaseWeb.ts:32` | `webDb` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/firebaseWeb.ts:36` | `webGoogleProvider` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/firebaseWeb.ts:40` | `ensureWebAuthPersistence` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/games/WebFamilyMiniGames.tsx:15` | `WebFamilyMiniGames` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/hooks/useWebCollection.ts:6` | `useWebCollection` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/hooks/useWebDocument.ts:4` | `useWebDocument` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/pages/GraphWebPage.tsx:11` | `GraphWebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/pages/HomeWebPage.tsx:17` | `HomeWebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/pages/MomentsWebPage.tsx:16` | `MomentsWebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/pages/PlannerWebPage.tsx:13` | `PlannerWebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/pages/PlayWebPage.tsx:26` | `PlayWebPage` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFamilyService.ts:12` | `createWebFamily` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFamilyService.ts:38` | `requestWebFamilyJoin` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFamilyService.ts:61` | `approveWebJoin` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFamilyService.ts:65` | `rejectWebJoin` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFamilyService.ts:67` | `updateWebProfile` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:25` | `uploadWebMedia` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:42` | `createMoment` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:49` | `deleteOwnMoment` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:50` | `setMomentReaction` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:54` | `addMomentComment` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:55` | `listMomentComments` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:57` | `createEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:58` | `updateEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:59` | `deleteEvent` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:61` | `createPerson` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:62` | `updatePerson` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:63` | `createRelationship` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:64` | `deleteRelationship` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:66` | `createWhisper` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:67` | `toggleWhisperHeart` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:69` | `createPoll` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:70` | `votePoll` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:72` | `createTimeCapsule` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:73` | `openTimeCapsule` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:75` | `createFundTransaction` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:77` | `saveKitchenPreferences` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webFeatureService.ts:79` | `saveWebMemoryBook` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webHomeGameService.ts:19` | `createWebHomeGame` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webHomeGameService.ts:36` | `getWebHomeGameSecret` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webHomeGameService.ts:37` | `submitWebHomeGameResponse` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webHomeGameService.ts:38` | `submitWebTruthStatements` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/services/webHomeGameService.ts:39` | `revealWebHomeGame` | Xem triển khai trong file |
| Ứng dụng React Native | `src/web/styles/WebGlobalStyles.tsx:1` | `WebGlobalStyles` | Xem triển khai trong file |
