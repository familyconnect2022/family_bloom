package expo.modules.familybloomoverlay

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.LinearLayout
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.SpannableStringBuilder
import android.text.style.RelativeSizeSpan
import android.text.style.ForegroundColorSpan
import android.text.Spanned
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import kotlin.math.min
import android.view.animation.PathInterpolator
import kotlin.math.roundToInt

/**
 * H8 Chess renderer inside the Android decor rail.
 * It renders authoritative FEN and emits input intents only.
 */
internal class ChessNativeBoardView(
  context: Context,
  private val onSquareTap: (String) -> Unit,
  private val onReady: () -> Unit,
  private val onPromotion: (String) -> Unit,
  private val onGameAction: (String, String) -> Unit,
) : FrameLayout(context) {
  private val density = resources.displayMetrics.density
  private val heroEyebrow = TextView(context)
  private val heroTitle = TextView(context)
  private val footerHint = TextView(context)
  private val boardMat = View(context)
  private val topAvatar = TextView(context)
  private val bottomAvatar = TextView(context)
  private val topClock = TextView(context)
  private val bottomClock = TextView(context)
  private val topBar = TextView(context)
  private val bottomBar = TextView(context)
  private val statusBadge = TextView(context)
  private val readyButton = TextView(context)
  private val board = FrameLayout(context)
  private val cells = LinkedHashMap<String, FrameLayout>()
  private val pieces = LinkedHashMap<String, ImageView>()
  private val hints = LinkedHashMap<String, View>()
  // H16: two retained, board-level motion sprites (king + rook for castling).
  // Animating an ImageView inside a destination cell can be occluded by the
  // other cell siblings; the sprite rail stays above all 64 cells instead.
  private val motionSprites = Array(2) { ImageView(context) }
  private val motionTargets = LinkedHashSet<String>()
  private var motionGeneration = 0
  private var movingLegs = 0
  private var chromePaintKey = ""
  private var lastOpponentLineKey = ""
  private var state: NativeChessBoardState? = null
  private var boardSize = 0
  // Cached native cell paint. React/JS state changes no longer redraw 64
  // ImageViews or allocate 64 drawables for a single square highlight.
  private val paintedCells = HashMap<String, String>()
  private var lastBoardPaintKey = ""
  private var lastSoundGameId: String? = null
  private var lastSoundToken = 0
  private var lastClockIdentity = ""
  private var clockAnchorElapsed = 0L
  private val uiHandler = Handler(Looper.getMainLooper())
  private var clockScheduled = false
  private var soundPool: SoundPool? = null
  private val loadedSounds = HashMap<String, Int>()
  private val loadedSoundIds = HashSet<Int>()
  private var waitingCue: String? = null
  private var lastTenSecondWarningKey: String? = null
  private val promotionBackdrop = FrameLayout(context)
  private val promotionRow = LinearLayout(context)
  private val actionRow = LinearLayout(context)
  private val resignButton = TextView(context)
  private val drawButton = TextView(context)
  private val bloomBackdrop = FrameLayout(context)
  private val bloomPanel = LinearLayout(context)
  private val bloomEyebrow = TextView(context)
  private val bloomEmblem = ImageView(context)
  private val bloomDivider = TextView(context)
  private val bloomStatus = TextView(context)
  private val bloomCountdown = TextView(context)
  private val bloomHeadline = TextView(context)
  private val bloomMessage = TextView(context)
  private val bloomPrimary = TextView(context)
  private val bloomSecondary = TextView(context)
  private var bloomPhase = ""
  private var audioReadySentForGame: String? = null
  private var lastAssetsReadySignalElapsed = 0L
  private val clockTick = object : Runnable {
    override fun run() {
      clockScheduled = false
      updateClocks()
      if (state?.status == "waiting") state?.let {
        updateWaitingStatus(it)
        // Safe idempotent heartbeat for a JS runtime/Socket that restarted
        // after the original native assetsReady action was delivered.
        notifyAssetsReadyIfLoaded()
      }
      if ((state?.status == "active" || state?.status == "waiting") && isShown) scheduleClockTick()
    }
  }

  init {
    clipChildren = false
    clipToPadding = false
    setBackgroundColor(Color.TRANSPARENT)

    // H9B Bloom Super Hero: a vertically centered playing stage, not the old
    // top-anchored board above a half-empty magenta rectangle.
    heroEyebrow.apply {
      text = "✦  BLOOM SUPER HERO  ✦"
      textSize = 10f
      letterSpacing = 0.16f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#8C345D"))
      setTypeface(typeface, Typeface.BOLD)
    }
    addView(heroEyebrow)
    heroTitle.apply {
      text = "ĐẤU TRƯỜNG CỜ VUA"
      textSize = 19f
      letterSpacing = 0.025f
      gravity = Gravity.CENTER
      setTextColor(Color.parseColor("#753256"))
      setTypeface(typeface, Typeface.BOLD)
    }
    addView(heroTitle)

    fun configurePlayerCard(view: TextView, opponent: Boolean) {
      view.gravity = Gravity.CENTER_VERTICAL
      view.setPadding(dp(52f), 0, dp(92f), 0)
      view.textSize = 14f
      view.maxLines = 1
      view.ellipsize = android.text.TextUtils.TruncateAt.END
      view.setTextColor(Color.parseColor("#71354F"))
      view.setTypeface(view.typeface, Typeface.BOLD)
      view.background = roundedStroke(
        "#FFF9F4", 16f, "#F5D0DE", 1f,
      )
      addView(view)
    }
    configurePlayerCard(topBar, true)
    configurePlayerCard(bottomBar, false)

    fun configureAvatar(view: TextView, opponent: Boolean) {
      view.gravity = Gravity.CENTER
      view.textSize = 21f
      view.setTypeface(view.typeface, Typeface.BOLD)
      view.setTextColor(if (opponent) Color.parseColor("#A83567") else Color.parseColor("#6F2849"))
      view.background = rounded(if (opponent) "#F9DEEB" else "#FFE9B5", 13f)
      addView(view)
    }
    configureAvatar(topAvatar, true)
    configureAvatar(bottomAvatar, false)
    topAvatar.text = "♟"
    bottomAvatar.text = "♕"

    fun configureClock(view: TextView, opponent: Boolean) {
      view.gravity = Gravity.CENTER
      view.textSize = 16f
      view.setTypeface(view.typeface, Typeface.BOLD)
      view.setTextColor(if (opponent) Color.parseColor("#883D5F") else Color.parseColor("#713448"))
      view.background = rounded(if (opponent) "#F9E7EC" else "#FFF2D1", 12f)
      addView(view)
    }
    configureClock(topClock, true)
    configureClock(bottomClock, false)

    statusBadge.apply {
      gravity = Gravity.CENTER
      textSize = 11f
      setTypeface(typeface, Typeface.BOLD)
      setTextColor(Color.parseColor("#84365D"))
      background = rounded("#FFF1F5", 999f)
      this@ChessNativeBoardView.addView(this)
    }

    readyButton.apply {
      gravity = Gravity.CENTER
      textSize = 12f
      setTextColor(Color.parseColor("#753A3C"))
      setTypeface(typeface, Typeface.BOLD)
      background = rounded("#FFDF9E", 999f)
      text = "Sẵn sàng"
      isClickable = true
      setOnClickListener { onReady() }
      this@ChessNativeBoardView.addView(this)
    }

    // H12: no gold outline/frame around the checkerboard.
    boardMat.background = rounded("#FFF9FA", 11f)
    // H10R2: This mat is a BACKGROUND sibling, not a floating card.
    // Android renders elevated views above later siblings regardless of
    // addView order. Its former 5dp elevation hid the whole chess board.
    // Keep both mat and board at Z=0 so children and promotion draw in order.
    boardMat.elevation = 0f
    addView(boardMat)
    board.background = rounded("#FFF8FB", 3f)
    board.clipChildren = false
    board.clipToPadding = false
    addView(board)

    footerHint.apply {
      gravity = Gravity.CENTER
      textSize = 11f
      setTextColor(Color.parseColor("#854763"))
      text = "✦  Chạm quân để chọn · Chạm ô để đi  ✦"
      maxLines = 1
      this@ChessNativeBoardView.addView(this)
    }
    buildCells()
    buildPromotionPicker()
    buildBloomActionRow()
    buildBloomDialog()
  }

  /**
   * Mini/IDLE retain the latest authoritative snapshot and cue without touching
   * 64 cells, layout, countdown callbacks or animation. Full binds on restore.
   */
  fun parkForMini(next: NativeChessBoardState) {
    if (state?.gameId == next.gameId && next.renderSequence < (state?.renderSequence ?: 0)) return
    ensureSoundPool()
    state = next
    handleAudio(next)
    uiHandler.removeCallbacks(clockTick)
    clockScheduled = false
    cancelPieceMotion()
  }

  private fun handleAudio(next: NativeChessBoardState) {
    if (lastSoundGameId != next.gameId) {
      lastSoundGameId = next.gameId
      lastSoundToken = next.soundToken
    } else if (next.soundToken != lastSoundToken) {
      lastSoundToken = next.soundToken
      playSound(next.soundCue)
    }
  }

  fun bind(next: NativeChessBoardState) {
    // JS -> native calls may overlap while a Socket ACK resolves. Never
    // let an older client paint overwrite a newer optimistic/confirmed frame.
    if (state?.gameId == next.gameId && next.renderSequence < (state?.renderSequence ?: 0)) return
    val previous = state
    val positionChanged = previous == null || previous.gameId != next.gameId || previous.fen != next.fen
    // Prepare from the LAST authoritative board BEFORE overwriting it. Never
    // animate a same-FEN selection/clock repaint or an unverified resync jump.
    val motion = if (positionChanged && previous != null) planPieceMotion(previous, next) else emptyList()
    if (positionChanged || previous?.orientation != next.orientation) cancelPieceMotion()
    state = next
    if (boardSize > 0 && previous?.orientation != next.orientation) {
      layoutSquares()
      paintedCells.clear()
      lastBoardPaintKey = ""
    }
    val clockIdentity = "${next.gameId}:${next.revision}:${next.turn}:${next.status}:${next.serverNowMs}"
    if (clockIdentity != lastClockIdentity) {
      lastClockIdentity = clockIdentity
      clockAnchorElapsed = SystemClock.elapsedRealtime()
    }
    ensureSoundPool() // preload audio on board setup, not first move
    handleAudio(next)
    render()
    // Schedule the frame *after* the board state is valid, but before it is
    // displayed: the destination stays hidden beneath the traveling sprite.
    if (motion.isNotEmpty()) startPieceMotion(motion)
    notifyAssetsReadyIfLoaded()
    scheduleClockTick()
  }

  override fun onVisibilityAggregated(isVisible: Boolean) {
    super.onVisibilityAggregated(isVisible)
    if (isVisible) scheduleClockTick()
    else { uiHandler.removeCallbacks(clockTick); clockScheduled = false }
  }

  /** Local chess.js validated optimistic frames and authoritative deltas both
   * get one native animation. Equal predicted/confirmed FEN never replays. */
  private fun planPieceMotion(previous: NativeChessBoardState, next: NativeChessBoardState): List<ChessPieceMotionLeg> {
    if (previous.gameId != next.gameId || previous.orientation != next.orientation ||
        previous.status !in setOf("active", "syncing") || next.status !in setOf("active", "finished", "syncing") ||
        !isShown || boardSize <= 0) return emptyList()
    // The JS client has verified this exact predecessor and final FEN via
    // chess.js. When several turns were missed, animate only that proven last
    // move while snapping other pieces once to the final board. No fake replay.
    val recoveryBefore = next.motionFromFen?.takeIf { it != next.fen }
    if (recoveryBefore != null && next.optimisticMoveId == null &&
        next.revision > previous.revision && next.ply > previous.ply) {
      return ChessPieceMotionPlanner.plan(
        recoveryBefore, next.fen, next.lastFrom, next.lastTo,
        recoveryBefore.split(' ').getOrNull(1) ?: "", next.revision - 1, next.revision,
        next.ply - 1, next.ply,
      )
    }
    val optimistic = next.optimisticMoveId != null
    if (optimistic && (previous.optimisticMoveId != null ||
        !next.movePending || previous.revision != next.revision || previous.ply != next.ply)) return emptyList()
    return ChessPieceMotionPlanner.plan(
      previous.fen, next.fen, next.lastFrom, next.lastTo, previous.turn,
      previous.revision, if (optimistic) previous.revision + 1 else next.revision,
      previous.ply, if (optimistic) previous.ply + 1 else next.ply,
    )
  }

  private fun cancelPieceMotion() {
    ++motionGeneration
    for (sprite in motionSprites) {
      sprite.animate().cancel()
      sprite.visibility = View.INVISIBLE
      sprite.translationX = 0f
      sprite.translationY = 0f
    }
    val occupied = state?.fen?.let(::parseFen).orEmpty()
    for (square in motionTargets) {
      if (square in occupied) pieces[square]?.visibility = View.VISIBLE
    }
    motionTargets.clear()
    movingLegs = 0
  }

  private fun startPieceMotion(legs: List<ChessPieceMotionLeg>) {
    if (!isShown || boardSize <= 0 || legs.isEmpty()) return
    val generation = ++motionGeneration
    movingLegs = legs.size
    // All sprite coordinates use the one native board coordinate system.
    for ((index, leg) in legs.withIndex()) {
      val fromHolder = cells[leg.from] ?: run { cancelPieceMotion(); return }
      val toHolder = cells[leg.to] ?: run { cancelPieceMotion(); return }
      val from = fromHolder.layoutParams as? LayoutParams ?: run { cancelPieceMotion(); return }
      val to = toHolder.layoutParams as? LayoutParams ?: run { cancelPieceMotion(); return }
      val squarePiece = pieces[leg.from] ?: run { cancelPieceMotion(); return }
      val size = squarePiece.layoutParams ?: run { cancelPieceMotion(); return }
      val fromX = from.leftMargin + (from.width - size.width) / 2
      val fromY = from.topMargin + (from.height - size.height) / 2
      val toX = to.leftMargin + (to.width - size.width) / 2
      val toY = to.topMargin + (to.height - size.height) / 2
      val sprite = motionSprites[index]
      sprite.animate().cancel()
      sprite.translationX = 0f
      sprite.translationY = 0f
      sprite.setImageResource(pieceDrawable(leg.piece))
      sprite.layoutParams = LayoutParams(size.width, size.height).apply {
        leftMargin = fromX
        topMargin = fromY
      }
      motionTargets += leg.to
      pieces[leg.to]?.visibility = View.INVISIBLE
      sprite.visibility = View.VISIBLE
      sprite.bringToFront()
      sprite.animate()
        .translationX((toX - fromX).toFloat())
        .translationY((toY - fromY).toFloat())
        .setInterpolator(PathInterpolator(0.22f, 0f, 0.20f, 1f))
        .setDuration(if (legs.size == 2) 178L else 168L)
        .withEndAction {
          if (generation != motionGeneration) return@withEndAction
          sprite.visibility = View.INVISIBLE
          sprite.translationX = 0f
          sprite.translationY = 0f
          motionTargets.remove(leg.to)
          if (state?.let { parseFen(it.fen).containsKey(leg.to) } == true) {
            pieces[leg.to]?.visibility = View.VISIBLE
          }
          movingLegs--
        }
        .start()
    }
  }

  override fun onDetachedFromWindow() {
    cancelPieceMotion()
    uiHandler.removeCallbacks(clockTick)
    clockScheduled = false
    super.onDetachedFromWindow()
  }

  fun destroy() {
    cancelPieceMotion()
    uiHandler.removeCallbacks(clockTick)
    clockScheduled = false
    waitingCue = null
    soundPool?.release()
    soundPool = null
    loadedSounds.clear()
    loadedSoundIds.clear()
  }

  private fun scheduleClockTick() {
    if (clockScheduled || (state?.status != "active" && state?.status != "waiting") || !isShown) return
    clockScheduled = true
    uiHandler.postDelayed(clockTick, 200L)
  }

  private fun updateClocks() {
    val current = state ?: return
    val elapsed = if (current.status == "active") (SystemClock.elapsedRealtime() - clockAnchorElapsed).coerceAtLeast(0L) else 0L
    val white = current.whiteRemainingMs?.let { (it - if (current.turn == "w") elapsed else 0L).coerceAtLeast(0L) }
    val black = current.blackRemainingMs?.let { (it - if (current.turn == "b") elapsed else 0L).coerceAtLeast(0L) }
    val mineBlack = current.meColor == "b"
    val top = clock(if (mineBlack) white else black)
    val bottom = clock(if (mineBlack) black else white)
    if (topClock.text != top) topClock.text = top
    if (bottomClock.text != bottom) bottomClock.text = bottom
    if (current.status == "active" && current.meColor == current.turn) {
      val myRemaining = if (mineBlack) black else white
      val warningKey = "${current.gameId}:${current.turn}:${current.ply}"
      if (myRemaining != null && myRemaining in 1..10_000L && lastTenSecondWarningKey != warningKey) {
        lastTenSecondWarningKey = warningKey
        playSound("tenseconds")
      }
    }
  }

  private fun ensureSoundPool() {
    if (soundPool != null) return
    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_GAME)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    val pool = SoundPool.Builder().setMaxStreams(3).setAudioAttributes(attrs).build()
    soundPool = pool
    pool.setOnLoadCompleteListener { readyPool, sampleId, status ->
      // SoundPool's load callback is not guaranteed to run on the same
      // thread that owns the board View. Never mutate the sound cache off UI.
      uiHandler.post {
        if (status != 0) return@post
        loadedSoundIds.add(sampleId)
        notifyAssetsReadyIfLoaded()
        if (waitingCue != null && loadedSounds[waitingCue] == sampleId) {
          waitingCue = null
          readyPool.play(sampleId, 0.85f, 0.85f, 1, 0, 1f)
        }
      }
    }
    val bank = mapOf(
      "game-start" to R.raw.fb_board_game_start,
      "move-self" to R.raw.fb_board_move_self,
      "move-opponent" to R.raw.fb_board_move_opponent,
      "capture" to R.raw.fb_board_capture,
      "move-check" to R.raw.fb_board_move_check,
      "castle" to R.raw.fb_board_castle,
      "promote" to R.raw.fb_board_promote,
      "premove" to R.raw.fb_board_premove,
      "illegal" to R.raw.fb_board_illegal,
      "tenseconds" to R.raw.fb_board_tenseconds,
      "game-end" to R.raw.fb_board_game_end,
    )
    for ((cue, resId) in bank) loadedSounds[cue] = pool.load(context, resId, 1)
  }

  private fun emitGameAction(action: String) {
    // Use the board snapshot id, NEVER the rail's last provisional gameId.
    // H11 could send READY under the old optimistic preview id during promotion.
    val boundGameId = state?.gameId ?: return
    onGameAction(action, boundGameId)
  }

  private fun notifyAssetsReadyIfLoaded() {
    val next = state ?: return
    if (next.status != "waiting" || next.gameId.startsWith("pending-chess:")) return
    val now = SystemClock.elapsedRealtime()
    if (next.gameId == audioReadySentForGame && now - lastAssetsReadySignalElapsed < 5_000L) return
    if (loadedSounds.size != 11 || !loadedSoundIds.containsAll(loadedSounds.values)) return
    // The decor rail starts at 1x1 while IDLE. A tiny cached layout is NOT
    // visual readiness (video 6451: pieces rendered at thumbnail size).
    if (width < dp(200f) || height < dp(300f)) return
    if (boardSize < dp(180f) || pieces.size != 64 || paintedCells.size != 64) return
    audioReadySentForGame = next.gameId
    lastAssetsReadySignalElapsed = now
    emitGameAction("assetsReady")
  }

  private fun playSound(cue: String) {
    if (cue.isBlank()) return
    ensureSoundPool()
    val sample = loadedSounds[cue] ?: return
    if (sample in loadedSoundIds) soundPool?.play(sample, 0.85f, 0.85f, 1, 0, 1f)
    else waitingCue = cue
  }

  private fun buildPromotionPicker() {
    promotionBackdrop.visibility = View.GONE
    promotionBackdrop.setBackgroundColor(Color.parseColor("#BAFFF1F8"))
    promotionBackdrop.isClickable = true
    promotionBackdrop.setOnClickListener { onPromotion("cancel") }
    promotionRow.orientation = LinearLayout.HORIZONTAL
    promotionRow.gravity = Gravity.CENTER
    promotionRow.setPadding(dp(6f), dp(6f), dp(6f), dp(6f))
    promotionRow.background = roundedStroke("#FFF5FA", 20f, "#F3B7D2", 2f)
    val labels = listOf("q" to "Hậu", "r" to "Xe", "b" to "Tượng", "n" to "Mã")
    labels.forEach { (name, caption) ->
      val column = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        background = rounded("#FFEAF3", 13f)
        isClickable = true
        setOnClickListener { onPromotion(name) }
      }
      val image = ImageView(context).apply {
        scaleType = ImageView.ScaleType.FIT_CENTER
        val p = if (state?.meColor == "b") name[0] else name[0].uppercaseChar()
        setImageResource(pieceDrawable(p))
      }
      val text = TextView(context).apply {
        this.text = caption
        textSize = 11f
        gravity = Gravity.CENTER
        setTextColor(Color.parseColor("#8C3B64"))
        setTypeface(typeface, Typeface.BOLD)
      }
      column.addView(image, LinearLayout.LayoutParams(dp(48f), dp(50f)))
      column.addView(text, LinearLayout.LayoutParams(-1, dp(24f)))
      promotionRow.addView(column, LinearLayout.LayoutParams(0, dp(80f), 1f).apply {
        leftMargin = dp(3f); rightMargin = dp(3f)
      })
    }
    promotionBackdrop.addView(promotionRow, FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(94f), Gravity.CENTER).apply {
      leftMargin = dp(18f); rightMargin = dp(18f)
    })
    addView(promotionBackdrop, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  /** A clearly tappable two-action rail, never confused with a passive status. */
  private fun configureAction(textView: TextView, label: String, strong: Boolean, action: String) {
    textView.text = label
    textView.textSize = 13f
    textView.gravity = Gravity.CENTER
    textView.setTypeface(textView.typeface, Typeface.BOLD)
    textView.setTextColor(Color.parseColor(if (strong) "#FFFFFF" else "#87375C"))
    textView.background = GradientDrawable(
      GradientDrawable.Orientation.TL_BR,
      if (strong) intArrayOf(Color.parseColor("#BC3A7A"), Color.parseColor("#8E2E6B"))
      else intArrayOf(Color.parseColor("#FFF8EB"), Color.parseColor("#FFE9F1")),
    ).apply {
      cornerRadius = dp(16f).toFloat()
      setStroke(dp(1f), Color.parseColor(if (strong) "#DA8CAD" else "#E4B2C5"))
    }
    textView.elevation = dp(2f).toFloat()
    textView.isClickable = true
    textView.isFocusable = true
    textView.setOnClickListener { askConfirmation(action) }
  }

  private fun buildBloomActionRow() {
    actionRow.orientation = LinearLayout.HORIZONTAL
    actionRow.gravity = Gravity.CENTER
    actionRow.visibility = View.GONE
    configureAction(drawButton, "🤝  Cầu hòa", false, "confirmDraw")
    configureAction(resignButton, "🏳  Xin thua", true, "confirmResign")
    actionRow.addView(drawButton, LinearLayout.LayoutParams(0, dp(42f), 1f).apply { rightMargin = dp(5f) })
    actionRow.addView(resignButton, LinearLayout.LayoutParams(0, dp(42f), 1f).apply { leftMargin = dp(5f) })
    addView(actionRow)
  }

  private fun buildBloomDialog() {
    // H13: a luminous veil instead of the former charcoal overlay. The overlay
    // still consumes taps while native assets are preparing or a decision is open.
    bloomBackdrop.visibility = View.VISIBLE
    bloomBackdrop.setBackgroundColor(Color.parseColor("#D8FFF3F9"))
    bloomBackdrop.isClickable = true
    bloomBackdrop.isFocusable = true
    bloomPanel.orientation = LinearLayout.VERTICAL
    bloomPanel.gravity = Gravity.CENTER_HORIZONTAL
    bloomPanel.setPadding(dp(19f), dp(90f), dp(19f), dp(24f))
    bloomPanel.elevation = dp(9f).toFloat()

    fun configureLabel(view: TextView, size: Float, color: String, bold: Boolean) {
      view.textSize = size
      view.gravity = Gravity.CENTER
      view.setTextColor(Color.parseColor(color))
      if (bold) view.setTypeface(view.typeface, Typeface.BOLD)
    }
    configureLabel(bloomEyebrow, 10.5f, "#A85180", true)
    bloomEyebrow.letterSpacing = 0.12f
    // H22R7: one physical King in every Chess modal, anchored at the upper
    // panel rim. The upper half floats outside; the lower half overlaps inside.
    bloomBackdrop.clipChildren = false
    bloomBackdrop.clipToPadding = false
    bloomEmblem.setImageResource(R.drawable.wk)
    bloomEmblem.scaleType = ImageView.ScaleType.FIT_CENTER
    bloomEmblem.setPadding(dp(9f), dp(9f), dp(9f), dp(9f))
    bloomEmblem.background = roundedStroke("#FFF8FC", 999f, "#F5D2E4", 2f)
    bloomEmblem.elevation = dp(16f).toFloat()
    configureLabel(bloomHeadline, 22f, "#812855", true)
    bloomHeadline.maxLines = 2
    configureLabel(bloomDivider, 12f, "#D9A0BE", false)
    bloomDivider.text = "✦   ─────   ✦"
    configureLabel(bloomMessage, 14f, "#75445F", false)
    bloomMessage.maxLines = 5
    bloomMessage.setLineSpacing(dp(3f).toFloat(), 1f)
    configureLabel(bloomStatus, 12f, "#9A5378", true)
    bloomStatus.background = roundedStroke("#FFFAFD", 999f, "#EFC9DC", 1f)
    bloomStatus.isClickable = false
    bloomStatus.isFocusable = false
    configureLabel(bloomCountdown, 19f, "#9C3169", true)
    bloomCountdown.visibility = View.GONE
    configureLabel(bloomPrimary, 14f, "#FFFFFF", true)
    configureLabel(bloomSecondary, 13f, "#873B62", true)
    bloomSecondary.background = roundedStroke("#FFF0F6", 16f, "#ECC6D8", 1f)

    bloomPanel.addView(bloomEyebrow, LinearLayout.LayoutParams(-1, dp(26f)))
    bloomPanel.addView(bloomHeadline, LinearLayout.LayoutParams(-1, dp(56f)).apply { topMargin = dp(5f) })
    bloomPanel.addView(bloomDivider, LinearLayout.LayoutParams(-1, dp(18f)))
    bloomPanel.addView(bloomMessage, LinearLayout.LayoutParams(-1, dp(101f)))
    bloomPanel.addView(bloomStatus, LinearLayout.LayoutParams(-1, dp(37f)).apply { topMargin = dp(3f) })
    bloomPanel.addView(bloomCountdown, LinearLayout.LayoutParams(-1, dp(38f)).apply { topMargin = dp(2f) })
    bloomPanel.addView(bloomPrimary, LinearLayout.LayoutParams(-1, dp(51f)).apply { topMargin = dp(11f) })
    bloomPanel.addView(bloomSecondary, LinearLayout.LayoutParams(-1, dp(44f)).apply { topMargin = dp(8f) })
    bloomBackdrop.addView(bloomPanel, FrameLayout.LayoutParams(
      LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER
    ).apply { leftMargin = dp(17f); rightMargin = dp(17f) })
    bloomBackdrop.addView(bloomEmblem, FrameLayout.LayoutParams(dp(112f), dp(112f), Gravity.CENTER))
    bloomPanel.addOnLayoutChangeListener { _, _, top, _, _, _, _, _, _ ->
      // Badge centre follows the actual panel top across dynamic copy/CTA
      // heights; avoids hardcoded coordinates on smaller Android screens.
      bloomEmblem.translationY = top.toFloat() - bloomBackdrop.height / 2f
    }
    bloomHeadline.text = "🌸 Đang chuẩn bị" // initial mask for the first native frame
    bloomMessage.text = "Bàn cờ và âm thanh đang sẵn sàng…"
    bloomPrimary.visibility = View.GONE // waiting has no fake CTA
    bloomSecondary.visibility = View.GONE
    addView(bloomBackdrop, LayoutParams(-1, -1))
  }

  private fun bloomGradient(vararg colorHex: String): GradientDrawable = GradientDrawable(
    GradientDrawable.Orientation.TL_BR,
    colorHex.map(Color::parseColor).toIntArray(),
  ).apply { cornerRadius = dp(28f).toFloat(); setStroke(dp(1.5f), Color.parseColor("#F1CBDE")) }

  // H15 outcome design: three visually distinct palettes, not one rose card
  // with a different emoji. Gold = champion, blue/teal = draw, sage = growth.
  // The backdrop is a pale tinted veil, never a dark alpha overlay.
  private fun styleBloomDialog(theme: String) {
    val colors: Array<String>
    val border: String
    val accent: String
    val emblemBase: String
    val emblemBorder: String
    val actionColors: Array<String>
    val veil: String
    when (theme) {
      "victory" -> {
        colors = arrayOf("#FFF9DF", "#FFE1A3", "#FFF0CA")
        border = "#D5A33D"; accent = "#814A13"
        emblemBase = "#FFF5CB"; emblemBorder = "#DFAE45"
        actionColors = arrayOf("#A95F19", "#814014")
        veil = "#C8FFF4D5"
      }
      "draw" -> {
        colors = arrayOf("#E8FAFF", "#C9E6FA", "#E6F9F2")
        border = "#79AED0"; accent = "#215F87"
        emblemBase = "#DCF6F8"; emblemBorder = "#6DB7C0"
        actionColors = arrayOf("#318EAD", "#266B99")
        veil = "#C9E5F4FF"
      }
      "loss" -> {
        colors = arrayOf("#F1F8EC", "#DAEBD7", "#F6F5E8")
        border = "#9AB995"; accent = "#426B4A"
        emblemBase = "#E7F2DE"; emblemBorder = "#91B58D"
        actionColors = arrayOf("#6C9369", "#426C58")
        veil = "#D3F0F6EA"
      }
      "waiting" -> {
        colors = arrayOf("#FFFFFF", "#FFF9FC", "#FDEDF5")
        border = "#F1CBDE"; accent = "#873B62"
        emblemBase = "#FCE5F0"; emblemBorder = "#F0D4E2"
        actionColors = arrayOf("#C73D82", "#A22C6D")
        veil = "#D8FFF3F9"
      }
      else -> {
        colors = arrayOf("#FFFFFF", "#FFF2F8", "#FCECF4")
        border = "#E5AFC9"; accent = "#81355D"
        emblemBase = "#FCE5F0"; emblemBorder = "#F0D4E2"
        actionColors = arrayOf("#C73D82", "#A22C6D")
        veil = "#D8FFF3F9"
      }
    }
    bloomBackdrop.setBackgroundColor(Color.parseColor(veil))
    bloomPanel.background = bloomGradient(*colors).apply {
      setStroke(dp(2f), Color.parseColor(border))
    }
    bloomEmblem.background = roundedStroke(emblemBase, 999f, emblemBorder, 2f)
    bloomEyebrow.setTextColor(Color.parseColor(accent))
    bloomHeadline.setTextColor(Color.parseColor(accent))
    bloomMessage.setTextColor(Color.parseColor(accent))
    bloomDivider.setTextColor(Color.parseColor(border))
    bloomPrimary.background = bloomGradient(*actionColors)
    bloomStatus.visibility = View.GONE
    bloomCountdown.visibility = View.GONE
    bloomStatus.isClickable = false
    bloomPrimary.visibility = View.VISIBLE
    bloomPrimary.isEnabled = true
    bloomPrimary.isClickable = true
    bloomSecondary.visibility = View.VISIBLE
    bloomPrimary.setOnClickListener(null)
    bloomSecondary.setOnClickListener(null)
  }

  private fun updateWaitingStatus(current: NativeChessBoardState) {
    val status = current.waitingMessage.ifBlank { "Đang chờ đối thủ và máy chủ xác nhận…" }
    val remaining = current.waitingRemainingMs
    // Monotonic client animation, anchored to each authoritative serverNowMs.
    // A local timer is display-only: only the server cancels/starts a game.
    val next = "●  $status"
    if (bloomStatus.text != next) bloomStatus.text = next
    if (remaining != null) {
      val elapsed = (SystemClock.elapsedRealtime() - clockAnchorElapsed).coerceAtLeast(0L)
      val seconds = ((remaining - elapsed).coerceAtLeast(0L) + 999L) / 1000L
      val countdown = if (seconds > 0L)
        "Thời gian chuẩn bị  ${String.format(java.util.Locale.US, "%02d:%02d", seconds / 60, seconds % 60)}"
      else "Đang xác nhận hết hạn…"
      if (bloomCountdown.text != countdown) bloomCountdown.text = countdown
      bloomCountdown.visibility = View.VISIBLE
    } else bloomCountdown.visibility = View.GONE
  }

  private fun renderBloomDialog(current: NativeChessBoardState) {
    val mine = current.meColor
    val winner = if (mine == "w") "white" else "black"
    val incomingDraw = current.status == "active" && current.drawOfferByUid != null &&
      current.drawOfferByUid != current.myUid
    val phase = when {
      current.status == "finished" -> "finished:${current.gameId}:${current.revision}"
      current.status == "waiting" -> "waiting:${current.gameId}"
      incomingDraw -> "drawIncoming:${current.gameId}"
      pendingConfirmation?.startsWith("confirmResign") == true -> pendingConfirmation!!
      pendingConfirmation?.startsWith("confirmDraw") == true -> pendingConfirmation!!
      else -> ""
    }
    if (phase.isBlank()) { bloomBackdrop.visibility = View.GONE; bloomPhase = ""; return }
    if (phase == bloomPhase) {
      if (phase.startsWith("waiting") || phase.startsWith("syncing")) updateWaitingStatus(current)
      return
    }
    bloomPhase = phase
    if (!phase.startsWith("confirm")) pendingConfirmation = null
    bloomBackdrop.visibility = View.VISIBLE
    bloomBackdrop.bringToFront()
    styleBloomDialog(when {
      phase.startsWith("finished") && current.result == winner -> "victory"
      phase.startsWith("finished") && current.result == "draw" -> "draw"
      phase.startsWith("finished") -> "loss"
      phase.startsWith("waiting") || phase.startsWith("syncing") -> "waiting"
      else -> "action"
    })
    when {
      phase.startsWith("finished") -> {
        val win = current.result == winner
        val draw = current.result == "draw"
        bloomEyebrow.text = if (win) "✦  BẢNG VÀNG BLOOM ARENA  ✦" else if (draw) "✦  FAIR PLAY · BLOOM ARENA  ✦" else "✦  HÀNH TRÌNH BLOOM ARENA  ✦"

        bloomHeadline.text = if (win) "NHÀ VÔ ĐỊCH BLOOM!" else if (draw) "MỘT TRẬN CẦU CÂN TÀI" else "MỖI VÁN LÀ MỘT BƯỚC TIẾN"
        bloomMessage.text = if (win)
          "🏅 Bạn đã giành chiến thắng xứng đáng! Sự tập trung, kiên nhẫn và những quyết định đầy bản lĩnh đã làm nên khoảnh khắc tỏa sáng này. Cả nhà Bloom tự hào về bạn! ✨"
        else if (draw)
          "🤝 Không ai bị bỏ lại phía sau. Hai kỳ thủ đã chơi một ván cờ cân bằng, đẹp và đầy tôn trọng. Cảm ơn bạn vì tinh thần thể thao tuyệt vời!"
        else
          "🌿 Thắng thua chỉ là một đoạn đường. Sự dũng cảm thử sức, học hỏi và trở lại còn đáng quý hơn. Bloom luôn cổ vũ bạn ở ván tiếp theo!"
        bloomPrimary.text = "Về sảnh trò chơi  →"
        bloomPrimary.setOnClickListener { emitGameAction("resultAck") }
        bloomSecondary.visibility = View.GONE
        if (win) {
          launchBloomFireworks()
          bloomPanel.animate().cancel()
          bloomPanel.scaleX = 0.94f; bloomPanel.scaleY = 0.94f
          bloomPanel.animate().scaleX(1f).scaleY(1f).setDuration(380L).start()
        }
      }
      phase.startsWith("waiting") || phase.startsWith("syncing") -> {
        val syncing = phase.startsWith("syncing")
        bloomEyebrow.text = "✦   BLOOM ARENA   ✦"

        bloomHeadline.text = if (syncing) "ĐANG ĐỒNG BỘ BÀN CỜ" else "CHUẨN BỊ VÁN CỜ"
        bloomMessage.text = if (syncing)
          "Một thông tin về lượt đi chưa khớp. Bloom đang hỏi lại máy chủ để mọi nước cờ đều đúng và công bằng."
        else "Bàn cờ, những quân cờ và âm thanh đang được sắp xếp thật chỉn chu. Chúng mình sẽ bắt đầu khi tất cả đã sẵn sàng nhé."
        // H13: passive status text only. Not a pink CTA, never an enabled button.
        bloomPrimary.visibility = View.GONE
        bloomPrimary.isClickable = false
        bloomPrimary.isEnabled = false
        bloomSecondary.visibility = View.GONE
        bloomStatus.visibility = View.VISIBLE
        bloomCountdown.visibility = View.VISIBLE
        updateWaitingStatus(current)
      }
      phase.startsWith("drawIncoming") -> {
        bloomEyebrow.text = "✦   LỜI ĐỀ NGHỊ   ✦"

        bloomHeadline.text = "MÌNH HÒA NHÉ?"
        bloomMessage.text = "Đối thủ muốn khép lại ván cờ trong sự trân trọng. Bạn có đồng ý với một kết quả hòa không?"
        bloomPrimary.text = "Đồng ý hòa"
        bloomSecondary.text = "Tiếp tục thi đấu"
        bloomPrimary.setOnClickListener { emitGameAction("drawAccept") }
        bloomSecondary.setOnClickListener { emitGameAction("drawReject"); bloomBackdrop.visibility = View.GONE; bloomPhase = "" }
      }
      phase.startsWith("confirmResign") -> {
        bloomEyebrow.text = "✦   MỘT LỰA CHỌN DŨNG CẢM   ✦"

        bloomHeadline.text = "DỪNG VÁN TẠI ĐÂY?"
        bloomMessage.text = "Bạn có chắc muốn xin thua không? Dù kết quả ra sao, Bloom luôn chào đón bạn ở ván tiếp theo."
        bloomPrimary.text = "Xác nhận xin thua"
        bloomSecondary.text = "Tiếp tục chơi"
        bloomPrimary.setOnClickListener { pendingConfirmation = null; emitGameAction("resign"); bloomBackdrop.visibility = View.GONE; bloomPhase = "" }
        bloomSecondary.setOnClickListener { pendingConfirmation = null; bloomBackdrop.visibility = View.GONE; bloomPhase = "" }
      }
      else -> {
        bloomEyebrow.text = "✦   TÔN TRỌNG ĐỐI THỦ   ✦"

        bloomHeadline.text = "MỘT LỜI CẦU HÒA"
        bloomMessage.text = "Bạn muốn gửi lời đề nghị hòa tới đối thủ? Ván cờ chỉ kết thúc khi cả hai cùng đồng ý."
        bloomPrimary.text = "Gửi lời đề nghị"
        bloomSecondary.text = "Tiếp tục chơi"
        bloomPrimary.setOnClickListener { pendingConfirmation = null; emitGameAction("drawOffer"); bloomBackdrop.visibility = View.GONE; bloomPhase = "" }
        bloomSecondary.setOnClickListener { pendingConfirmation = null; bloomBackdrop.visibility = View.GONE; bloomPhase = "" }
      }
    }
  }

  /** Short fireworks burst runs only at a terminal win, never during Mini play. */
  private fun launchBloomFireworks() {
    val stars = arrayOf("✦", "✧", "✨", "🌸", "✷", "💫", "✦", "✨")
    for ((i, emoji) in stars.withIndex()) {
      val star = TextView(context)
      star.text = emoji
      star.textSize = if (i % 2 == 0) 34f else 27f
      star.gravity = Gravity.CENTER
      bloomBackdrop.addView(star, FrameLayout.LayoutParams(dp(49f), dp(49f), Gravity.CENTER))
      val angle = i * Math.PI / 4.0
      star.alpha = 1f
      star.translationX = 0f
      star.translationY = 0f
      val distance = dp(if (i % 2 == 0) 145f else 95f).toDouble()
      star.animate().translationX((kotlin.math.cos(angle) * distance).toFloat())
        .translationY((kotlin.math.sin(angle) * distance).toFloat())
        .alpha(0f).setDuration(1150L)
        .withEndAction { bloomBackdrop.removeView(star) }.start()
    }
  }

  private fun askConfirmation(action: String) {
    val current = state ?: return
    if (current.status != "active") return
    pendingConfirmation = "${action}:${current.gameId}"
    bloomPhase = ""
    renderBloomDialog(current)
  }

  private var pendingConfirmation: String? = null

  private fun buildCells() {
    val files = "abcdefgh"
    for (rank in 1..8) {
      for (fileIndex in files.indices) {
        val square = "${files[fileIndex]}$rank"
        val cell = FrameLayout(context)
        cell.isClickable = true
        cell.clipChildren = false
        cell.clipToPadding = false
        cell.isFocusable = true
        cell.setOnClickListener {
          // JS enforces the server-assigned UID/color at selection and Socket
          // enforces it again on submit. Native only checks readiness here:
          // never drop a fast second tap waiting for a selectedSquare repaint.
          val current = state ?: return@setOnClickListener
          if (current.status !in setOf("active", "syncing") || current.meColor == null || (!current.canMove && !current.canPremove)) return@setOnClickListener
          onSquareTap(square)
        }


        val hint = View(context)
        hint.visibility = View.INVISIBLE
        cell.addView(hint)

        val piece = ImageView(context)
        piece.scaleType = ImageView.ScaleType.FIT_CENTER
        piece.isClickable = false
        piece.isFocusable = false
        cell.addView(piece)

        cells[square] = cell
        hints[square] = hint
        pieces[square] = piece
        board.addView(cell)
      }
    }
    for (sprite in motionSprites) {
      sprite.scaleType = ImageView.ScaleType.FIT_CENTER
      sprite.isClickable = false
      sprite.isFocusable = false
      sprite.visibility = View.INVISIBLE
      board.addView(sprite, LayoutParams(1, 1))
    }
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    layoutChildren(w, h)
  }

  private fun layoutChildren(w: Int, h: Int) {
    cancelPieceMotion()
    // Do not build a 72dp board inside the hidden 1x1 decor rail.
    if (w < dp(200f) || h < dp(300f)) return
    val margin = dp(2f)
    val gap = dp(7f)
    val barH = dp(52f)
    val headingH = dp(52f)
    val statusH = dp(0f) // no separate Ready/turn banner; status sits beside opponent name
    val footerH = dp(66f)
    val cardW = (w - margin * 2).coerceAtLeast(dp(180f))
    // Reserve all controls before sizing the board. The entire stage is then
    // centered as one group, preventing the huge empty lower half in H9A.
    val fixedH = headingH + barH * 2 + statusH + footerH + gap * 5
    boardSize = min(w - margin * 2 - dp(4f), h - fixedH - dp(4f)).coerceAtLeast(dp(72f))
    val stageH = fixedH + boardSize
    val startY = ((h - stageH) / 2f).roundToInt().coerceAtLeast(0)
    val boardLeft = ((w - boardSize) / 2f).roundToInt()
    val avatarSide = dp(36f)
    val avatarOffset = dp(9f)
    val clockW = dp(76f)
    val clockH = dp(36f)

    heroEyebrow.layoutParams = LayoutParams(cardW, dp(20f)).apply {
      leftMargin = margin
      topMargin = startY
    }
    heroTitle.layoutParams = LayoutParams(cardW, dp(30f)).apply {
      leftMargin = margin
      topMargin = startY + dp(19f)
    }
    val opponentY = startY + headingH + gap
    topBar.layoutParams = LayoutParams(cardW, barH).apply {
      leftMargin = margin
      topMargin = opponentY
    }
    topAvatar.layoutParams = LayoutParams(avatarSide, avatarSide).apply {
      leftMargin = margin + avatarOffset
      topMargin = opponentY + (barH - avatarSide) / 2
    }
    topClock.layoutParams = LayoutParams(clockW, clockH).apply {
      leftMargin = margin + cardW - clockW - dp(7f)
      topMargin = opponentY + (barH - clockH) / 2
    }
    val statusY = opponentY + barH + gap
    statusBadge.layoutParams = LayoutParams(dp(130f).coerceAtMost(cardW - dp(110f)), statusH).apply {
      leftMargin = margin
      topMargin = statusY
    }
    readyButton.layoutParams = LayoutParams(dp(106f), statusH).apply {
      leftMargin = margin + cardW - dp(106f)
      topMargin = statusY
    }
    val boardY = statusY + statusH + gap
    boardMat.layoutParams = LayoutParams(boardSize, boardSize).apply {
      leftMargin = boardLeft
      topMargin = boardY
    }
    board.layoutParams = LayoutParams(boardSize, boardSize).apply {
      leftMargin = boardLeft
      topMargin = boardY
    }
    val meY = boardY + boardSize + gap
    bottomBar.layoutParams = LayoutParams(cardW, barH).apply {
      leftMargin = margin
      topMargin = meY
    }
    bottomAvatar.layoutParams = LayoutParams(avatarSide, avatarSide).apply {
      leftMargin = margin + avatarOffset
      topMargin = meY + (barH - avatarSide) / 2
    }
    bottomClock.layoutParams = LayoutParams(clockW, clockH).apply {
      leftMargin = margin + cardW - clockW - dp(7f)
      topMargin = meY + (barH - clockH) / 2
    }
    footerHint.layoutParams = LayoutParams(cardW, footerH).apply {
      leftMargin = margin
      topMargin = meY + barH + gap
    }
    actionRow.layoutParams = LayoutParams(cardW, dp(44f)).apply {
      leftMargin = margin
      topMargin = meY + barH + gap + dp(19f)
    }
    layoutSquares()
    paintedCells.clear()
    render()
    notifyAssetsReadyIfLoaded()
  }

  /** H19: after a cold-start Full restore, wait for actual decor geometry.
   * The first board bind may have arrived while the native rail was 1x1.
   * Re-lay out the retained 64 cells exactly once if measured bounds differ.
   */
  fun ensureRecoveredGeometry() {
    if (width < dp(200f) || height < dp(300f)) return
    val expected = min(width - dp(8f), height - (dp(52f) + dp(52f) * 2 + dp(66f) + dp(7f) * 5) - dp(4f))
      .coerceAtLeast(dp(72f))
    if (boardSize != expected || board.width != expected || board.height != expected || paintedCells.size != 64) {
      layoutChildren(width, height)
      requestLayout()
    }
  }

  private fun layoutSquares() {
    lastBoardPaintKey = ""
    val current = state
    if (boardSize <= 0) return
    val cell = boardSize / 8
    val files = if (current?.orientation == "b") "hgfedcba" else "abcdefgh"
    val ranks = if (current?.orientation == "b") (1..8).toList() else (8 downTo 1).toList()
    for ((row, rank) in ranks.withIndex()) {
      for ((col, file) in files.withIndex()) {
        val square = "$file$rank"
        val holder = cells[square] ?: continue
        holder.layoutParams = LayoutParams(
          if (col == 7) boardSize - cell * 7 else cell,
          if (row == 7) boardSize - cell * 7 else cell,
        ).apply {
          leftMargin = col * cell
          topMargin = row * cell
        }
        val pieceInset = (cell * 0.08f).roundToInt()
        pieces[square]?.layoutParams = LayoutParams(cell - pieceInset * 2, cell - pieceInset * 2, Gravity.CENTER)
        val hintSize = maxOf(dp(10f), (cell * 0.24f).roundToInt())
        hints[square]?.layoutParams = LayoutParams(hintSize, hintSize, Gravity.CENTER)
      }
    }
  }

  private fun render() {
    val current = state ?: run {
      topBar.text = "Đang đồng bộ bàn cờ…"
      bottomBar.text = "Người chơi"
      topClock.text = "--:--"
      bottomClock.text = "--:--"
      statusBadge.text = "Đang kết nối"
      statusBadge.visibility = View.GONE
      readyButton.visibility = View.GONE
      return
    }
    val piecesBySquare = parseFen(current.fen)
    val mine = current.meColor
    val myTurn = current.status == "active" && mine != null && current.turn == mine

    val opponentName = current.opponentLabel.ifBlank { "Người chơi" }
    val waitingStatus = when {
      current.status == "waiting" -> current.waitingMessage.ifBlank { "Đang đợi $opponentName sẵn sàng" }
      current.status == "paused" || current.status == "syncing" -> current.waitingMessage.ifBlank { "Đang kết nối lại…" }
      current.status == "active" && current.waitingMessage.isNotBlank() -> current.waitingMessage
      else -> ""
    }
    val opponentLineKey = "$opponentName:$waitingStatus"
    if (opponentLineKey != lastOpponentLineKey) {
      lastOpponentLineKey = opponentLineKey
      topBar.text = if (waitingStatus.isBlank()) opponentName else SpannableStringBuilder().apply {
        append(opponentName)
        append("\n")
        val start = length
        append(waitingStatus)
        setSpan(RelativeSizeSpan(0.72f), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        setSpan(ForegroundColorSpan(Color.parseColor("#9F7D8E")), start, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
      topBar.alpha = if (waitingStatus.isNotBlank()) 0.72f else 1f
      topBar.maxLines = 2
    }
    val meLine = current.meLabel.takeUnless { it.isBlank() || it == "Bạn" } ?: "Người chơi"
    if (bottomBar.text.toString() != meLine) bottomBar.text = meLine
    updateClocks()
    val paintChrome = "$myTurn:${current.status}"
    if (chromePaintKey != paintChrome) {
      chromePaintKey = paintChrome
      bottomBar.background = roundedStroke(if (myTurn) "#C13574" else "#AD6481", 16f,
        if (myTurn) "#FFE3EA" else "#E4ABBD", 1f)
      bottomClock.background = rounded(if (myTurn) "#FFE3A6" else "#FFEACF", 12f)
      topBar.background = roundedStroke("#FFF9F4", 16f,
        if (current.status == "active" && !myTurn) "#BD6990" else "#F4CAD8", 1f)
    }

    statusBadge.visibility = View.GONE
    statusBadge.text = when {
      current.movePending -> "Đang xác nhận…"
      current.premoveCount > 0 -> "Đi trước ${current.premoveCount}/1"
      current.canPremove -> "Có thể đi trước"
      current.status == "waiting" -> "Chờ sẵn sàng"
      current.status == "paused" || current.status == "syncing" -> "Đang đồng bộ"
      current.status == "finished" -> "Đã kết thúc"
      current.canMove -> "Lượt của bạn"
      else -> "Lượt đối thủ"
    }
    readyButton.visibility = View.GONE // local auto-READY is sent only after board asset bind
    readyButton.text = if (current.readyPending) "Đang chờ…" else "Sẵn sàng"
    readyButton.isEnabled = !current.readyPending
    readyButton.alpha = if (current.readyPending) 0.65f else 1f
    actionRow.visibility = if (current.status == "active") View.VISIBLE else View.GONE
    renderBloomDialog(current)

    promotionBackdrop.visibility = if (current.promotionPending) View.VISIBLE else View.GONE
    if (current.promotionPending) {
      val letters = if (current.meColor == "b") "qrbn" else "QRBN"
      for (i in 0 until promotionRow.childCount) {
        val column = promotionRow.getChildAt(i) as? LinearLayout ?: continue
        val piece = column.getChildAt(0) as? ImageView ?: continue
        piece.setImageResource(pieceDrawable(letters[i]))
      }
      promotionBackdrop.bringToFront()
    }
    // Keep all 64 retained cell views untouched for clock/status/socket
    // frames. Repaint only on an actual visual input or position change.
    val boardPaintKey = buildString {
      append(current.gameId).append('|').append(current.fen).append('|')
      append(current.orientation).append('|').append(current.selectedSquare).append('|')
      append(current.lastFrom).append('|').append(current.lastTo).append('|')
      append(current.checkSquare).append('|').append(current.queuedPremoveSquares).append('|')
      append(current.legalTargets).append('|').append(current.captureTargets).append('|')
      append(current.status).append('|').append(current.canMove).append('|').append(current.canPremove)
    }
    if (boardPaintKey == lastBoardPaintKey) return
    lastBoardPaintKey = boardPaintKey
    val files = "abcdefgh"
    for (rank in 1..8) {
      for (fileIndex in files.indices) {
        val square = "${files[fileIndex]}$rank"
        val holder = cells[square] ?: continue
        val isLight = (fileIndex + rank) % 2 == 1
        val base = if (isLight) "#FFF0E7" else "#C77A9A"
        // Every branch is a Boolean condition. Mixing a String subject with
        // Set.contains(square): Boolean makes Kotlin compilation fail.
        val background = when {
          square == current.selectedSquare -> "#F4B740"
          square == current.checkSquare -> "#D94D4D"
          square in current.queuedPremoveSquares -> "#D7B0F5"
          square == current.lastFrom || square == current.lastTo -> "#F5C277"
          else -> base
        }
        val piece = piecesBySquare[square]
        val hintKind = when {
          current.captureTargets.contains(square) -> "capture"
          current.legalTargets.contains(square) -> "quiet"
          else -> "none"
        }
        val paintKey = "$background:${piece ?: '-'}:$hintKind"
        if (paintedCells[square] != paintKey) {
          paintedCells[square] = paintKey
          if (holder.background == null || holder.tag != background) {
            holder.background = squareBackground(background)
            holder.tag = background
          }
          val image = pieces[square]
          if (piece == null) image?.visibility = View.INVISIBLE
          else {
            if (image?.tag != piece) { image?.setImageResource(pieceDrawable(piece)); image?.tag = piece }
            image?.visibility = View.VISIBLE
          }
          val hint = hints[square]
          when (hintKind) {
            "capture" -> { hint?.background = captureRing(); hint?.visibility = View.VISIBLE }
            "quiet" -> { hint?.background = dot("#B43F72"); hint?.visibility = View.VISIBLE }
            else -> hint?.visibility = View.INVISIBLE
          }
        }
        // A late same-FEN hint/selection bind must not reveal a piece that is
        // currently represented by the moving board-level sprite.
        if (square in motionTargets) pieces[square]?.visibility = View.INVISIBLE
        holder.isEnabled = current.status in setOf("active", "syncing") && (current.canMove || current.canPremove)
      }
    }
  }

  private fun parseFen(fen: String): Map<String, Char> {
    val placement = fen.substringBefore(' ')
    val rows = placement.split('/')
    if (rows.size != 8) return emptyMap()
    val result = LinkedHashMap<String, Char>()
    val files = "abcdefgh"
    rows.forEachIndexed { rowIndex, row ->
      var file = 0
      val rank = 8 - rowIndex
      row.forEach { token ->
        if (token.isDigit()) {
          file += token.digitToInt()
        } else if (file in 0..7) {
          result["${files[file]}$rank"] = token
          file += 1
        }
      }
    }
    return result
  }

  private fun pieceDrawable(piece: Char): Int = when (piece) {
    'K' -> R.drawable.wk
    'Q' -> R.drawable.wq
    'R' -> R.drawable.wr
    'B' -> R.drawable.wb
    'N' -> R.drawable.wn
    'P' -> R.drawable.wp
    'k' -> R.drawable.bk
    'q' -> R.drawable.bq
    'r' -> R.drawable.br
    'b' -> R.drawable.bb
    'n' -> R.drawable.bn
    else -> R.drawable.bp
  }

  private fun clock(value: Long?): String {
    if (value == null) return "∞"
    val safe = value.coerceAtLeast(0L)
    val totalSeconds = safe / 1000L
    val minutes = totalSeconds / 60L
    val seconds = totalSeconds % 60L
    return "%d:%02d".format(minutes, seconds)
  }

  private fun rounded(color: String, radiusDp: Float): GradientDrawable = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = dp(radiusDp).toFloat()
    setColor(Color.parseColor(color))
  }

  private fun roundedStroke(color: String, radiusDp: Float, strokeColor: String, strokeWidthDp: Float): GradientDrawable =
    rounded(color, radiusDp).apply { setStroke(dp(strokeWidthDp), Color.parseColor(strokeColor)) }

  private fun squareBackground(color: String): GradientDrawable = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    setColor(Color.parseColor(color))
  }

  private fun dot(color: String): GradientDrawable = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(Color.parseColor(color))
  }

  private fun captureRing(): GradientDrawable = GradientDrawable().apply {
    shape = GradientDrawable.OVAL
    setColor(Color.TRANSPARENT)
    setStroke(dp(3f), Color.parseColor("#8B2E58"))
  }

  private fun dp(value: Float): Int = (value * density).roundToInt()
}
