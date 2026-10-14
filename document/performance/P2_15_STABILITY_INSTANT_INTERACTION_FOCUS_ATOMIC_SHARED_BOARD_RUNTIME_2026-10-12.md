# Family Bloom P2.15 — Stability + Instant Interaction

## Mục tiêu

P2.15 được triển khai trực tiếp trên P2.14 để các sửa đổi có liên quan đến lifecycle/cache/persistent surface được kiểm thử trong cùng một bản máy thật:

1. Family Graph Focus View mở lại ngay và cây lớn không còn “mọc” theo nhiều đợt render.
2. Chess dùng đúng bộ 11 âm thanh người dùng cung cấp, phản hồi local sớm, không phát trùng và tự phục hồi khi Android làm rớt native player.
3. Xiangqi dùng cùng kiểu persistent lifecycle với Chess, không sinh board rỗng rồi bổ sung quân theo nhiều frame.
4. Chess/Xiangqi dùng chung ownership/presentation/audio runtime để giảm race condition giữa hai game.

## Family Graph — BSH Focus Atomic Scene

- Focus auto-fit hydrate runtime từ toàn bộ `scene.personIds` đã được BSH chuẩn bị thay vì chỉ `bootstrapPersonIds` rồi bổ sung node qua các effect sau.
- Full/3/5 graph bình thường vẫn giữ spatial retention/bootstrap path; thay đổi atomic chỉ áp dụng Focus auto-fit.
- Khi Person Detail đang mở, Focus Scene của person đó được prewarm bằng `InteractionManager.runAfterInteractions`; prewarm không commit React state.
- Hot reopen tiếp tục dùng cache theo graph fingerprint/revision + scene version + focus slot từ P2.14, không phụ thuộc identity của snapshot Firestore.
- Detail -> Focus dùng native `Modal.onDismiss` làm ranh giới thật: Person sheet dismiss không animation, Focus attach sau khi Android xác nhận modal cũ đã rời window. Có fallback 240 ms chỉ cho vendor Android bỏ lỡ `onDismiss`.

## Shared Board Game Audio Runtime

- Chess và Xiangqi không còn tạo hai bộ native audio player riêng sau khi cả hai game đã được mở.
- `BoardGameAudioProvider` nằm tại root persistent surface stack và sở hữu đúng 11 native players dùng chung cho cả hai game.
- Provider chỉ warm sau khi Chess hoặc Xiangqi đã được prepare, không tranh startup first paint của app.
- Exact 11 MP3 gốc vẫn được giữ nguyên byte/hash:
  - game-start
  - move-self
  - move-opponent
  - capture
  - move-check
  - castle
  - promote
  - premove
  - illegal
  - tenseconds
  - game-end
- Local Chess move phát cue trước visual/network completion; authoritative delta dùng cùng `clientMoveId` và persistent host dedupe.
- Audio recovery dùng request token mới nhất để async `seekTo(0)` cũ không phát lại một nước đã lỗi thời.
- Player bị detach sẽ wake recovery khi có cue thật; poll có giới hạn 5.2 s, không giữ timer vĩnh viễn.

## Shared Board Surface Lifecycle

Tạo `src/services/games/boardGameSurfaceLifecycle.ts` dùng chung:

- `createBoardGameSurfaceOwnerId("chess" | "xiangqi")`
- `canReleaseBoardGameSurface(...)`
- `isBoardGameSurfacePresented(...)`

Chess và Xiangqi đều nhận owner token mới cho mỗi route focus. Cleanup/blur cũ chỉ được release surface nếu owner token còn khớp, nên callback trễ không thể che board mới.

Cross-game exclusion vẫn giữ: vào Chess sẽ hide Xiangqi surface; vào Xiangqi sẽ hide Chess surface; durable uid lock server của P2.13 vẫn là authoritative guard cho active game.

## Xiangqi Chess-parity board warmup

- Persistent Xiangqi host được sinh ra với `createInitialXiangqiState()` đủ 32 quân ngay từ lần prepare đầu.
- Socket snapshot hydrate đè lên warm state trong cùng persistent host; không remount board.
- Bỏ renderer staged 8 -> 18 -> 26 -> 32 quân. `XiangqiGameBoard` render trực tiếp toàn bộ `pieces`.
- Xiangqi outer host được `React.memo` để 11 trạng thái native audio load không kéo board tree rerender theo.
- Ready gate vẫn đợi layout + toàn bộ piece assets + hai painted frames.
- Hint reveal giữ 56 ms (<= 60 ms), tap-only, Battle FX vẫn bị loại bỏ.

## Build/regression integration

Thêm `phaseP2_15:check` vào:

- `package.json`
- Debug Android build BAT
- Release test Android build BAT
- root `Family_Bloom_CLEAN_APPLY_FULL.bat`

Historical compatibility tests P2.12.1/P2.13 được cập nhật lexical contract để chấp nhận cơ chế native onDismiss/shared presentation mới nhưng vẫn kiểm tra cùng invariants cũ.

## Regression gates đã chạy trong môi trường đóng gói

- P2.12.1 native Focus compatibility: 15/15 PASS.
- P2.12.3 Focus native recovery: 23/23 PASS.
- P2.12 persistent BSH: 44/44 PASS.
- P2.13 Focus/Audio/Xiangqi exclusive runtime: 44/44 PASS.
- P2.14 revision cache/exact audio/Xiangqi owner: 50/50 PASS.
- P2.15 Stability + Instant Interaction: 63/63 PASS.
- Phase 17.9A15 shared board sound/premove: 27/27 PASS.
- Phase 16B Xiangqi playable logic: 29/29 PASS.
- P2.12.4 build integrity + Chess audio: PASS.
- Board audio integrity: PASS, 11/11 MP3, 60,419 bytes, no competing Chess WAV bank.
- Build entrypoint audit: PASS, 22 BAT files; modified Windows BAT files normalized to CRLF.

## Lưu ý kiểm thử máy thật

Container chỉ chạy static/regression/syntax/integrity gates; không giả định đã thay thế kiểm thử thiết bị Android thật. Lần test P2.15 nên tập trung:

1. Focus nhánh lớn lần đầu và mở lại cùng nhánh 3-5 lần.
2. Chess đi nhanh nhiều nước, capture/check/castle/promotion, background/foreground rồi tiếp tục nghe sound.
3. Vào/ra Xiangqi nhiều lần và chuyển Chess <-> Xiangqi để xác nhận board không trắng và stale route cleanup không che surface mới.
