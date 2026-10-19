# Family Bloom P2.37R2C-H8 — Native Chess tap-to-move

## Scope

H8 keeps the H6/H7 stability baseline frozen:

- Root/auth navigation remains Stack-based.
- `(tabs)` navigator host remains normal `flex: 1` layout.
- `FamilyBloomOverlayRail` remains attached to `Activity.window.decorView`, outside React/Yoga.
- Xiangqi remains probe-only in H8.

H8 restores playable Chess inside the native decor rail without putting the board back into the React tree.

## Authority boundary

The native board is presentation/input only. It never commits game truth locally.

1. Server/Socket state supplies authoritative FEN/revision/status/clocks.
2. JS `chess.js` derives selectable pieces and legal destinations from the current FEN.
3. Native square taps return an intent to JS.
4. JS submits `chess:game:move` with `clientMoveId` + `expectedVersion`.
5. The visible piece position changes only after authoritative `gameMoveApplied`/state arrives.

This preserves the server-authoritative model while restoring the previous tap-to-move interaction.

## Native renderer

`ChessNativeBoardView.kt` provides:

- 12 bundled PNG piece assets;
- FEN rendering;
- white/black orientation;
- selected-square highlight;
- quiet-move dots;
- capture rings;
- last-move highlight;
- check-square highlight;
- Ready button for waiting games;
- player/opponent rails and snapshot clocks;
- no drag-and-drop.

Promotion currently resolves to queen when a promotion target is tapped. A dedicated promotion sheet remains a follow-up after the core authoritative move loop is device-verified.

## Binary

- App version: `1.3.8`
- Android versionCode: `143018`
- Native module: `family-bloom-overlay@1.3.6`
- Native identity: `P2.37R2C-H8-native-1`

H8 changes Kotlin/native resources, so an H8 APK/development-client rebuild is required before Metro/OTA can exercise the new board.
