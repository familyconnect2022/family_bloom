package expo.modules.familybloomoverlay

import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private const val FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY = "P2.37R2C-H22-native-1"

private data class PresentationCommand(
  val mode: String,
  val kind: String?,
  val gameId: String?,
  val widthDp: Double,
  val heightDp: Double,
  val insetTopDp: Double,
  val insetBottomDp: Double,
)

/**
 * H6 native presentation architecture.
 *
 * Full/Mini are NOT exported as an Expo View and never enter the React/Yoga
 * hierarchy. A single persistent rail is attached directly to
 * Activity.window.decorView. Therefore MATCH_PARENT/requestLayout/bringToFront
 * cannot participate in react-native-screens measurement.
 */
class FamilyBloomOverlayModule : Module() {
  private var rail: FamilyBloomOverlayRail? = null
  private var railActivity: Activity? = null
  private var lastCommand: PresentationCommand? = null
  private var lastChessBoardState: NativeChessBoardState? = null
  private var lastXiangqiMiniState: NativeXiangqiMiniState? = null
  private var lastXiangqiBoardState: NativeXiangqiBoardState? = null
  private var diagnosticSeq = 0

  override fun definition() = ModuleDefinition {
    Name("FamilyBloomOverlay")
    Events("onDiagnostic", "onAction", "onChessAction", "onXiangqiAction")

    OnCreate {
      emit("MODULE_CREATED", "H9B Bloom Super Hero native decor module initialized")
    }

    AsyncFunction("setPresentation") { mode: String, kind: String?, gameId: String?, widthDp: Double, heightDp: Double, insetTopDp: Double, insetBottomDp: Double ->
      val command = PresentationCommand(mode, kind, gameId, widthDp, heightDp, insetTopDp, insetBottomDp)
      lastCommand = command
      val host = railFor(requireActivity())
      host.applyCommand(command)
      mapOf(
        "accepted" to true,
        "mode" to command.mode,
        "kind" to command.kind,
        "railAttached" to host.isAttachedToWindow,
        "railLocation" to "Activity.window.decorView",
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setChessBoardState") { payloadJson: String ->
      val state = NativeChessBoardState.fromJson(payloadJson)
      if (lastChessBoardState?.gameId != state.gameId ||
          state.renderSequence >= (lastChessBoardState?.renderSequence ?: 0)) {
        lastChessBoardState = state
      }
      if (lastChessBoardState === state) rail?.applyChessBoardState(state)
      mapOf(
        "accepted" to true,
        "gameId" to state.gameId,
        "cached" to (rail == null),
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setXiangqiBoardState") { payloadJson: String ->
      val state = NativeXiangqiBoardState.fromJson(payloadJson)
      if (lastXiangqiBoardState?.gameId != state.gameId ||
          state.renderSequence >= (lastXiangqiBoardState?.renderSequence ?: -1)) {
        lastXiangqiBoardState = state
      }
      if (lastXiangqiBoardState === state) rail?.applyXiangqiBoardState(state)
      mapOf("accepted" to true, "gameId" to state.gameId, "cached" to (rail == null))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setXiangqiMiniState") { payloadJson: String ->
      val state = NativeXiangqiMiniState.fromJson(payloadJson)
      if (lastXiangqiMiniState?.gameId != state.gameId || state.revision >= (lastXiangqiMiniState?.revision ?: -1)) {
        lastXiangqiMiniState = state
        rail?.applyXiangqiMiniState(state)
      }
      mapOf("accepted" to true)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("getNativeIdentity") {
      mapOf(
        "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY,
        "module" to "FamilyBloomOverlay",
        "hostMounted" to (rail != null),
        "railLocation" to "Activity.window.decorView",
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("proveHost") {
      val activity = appContext.currentActivity
      if (activity == null) {
        mapOf("accepted" to false, "reason" to "NO_FOREGROUND_ACTIVITY", "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY)
      } else {
        railFor(activity).runNativeProof()
      }
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("getHostStatus") {
      rail?.statusPayload() ?: mapOf(
        "mounted" to false,
        "attached" to false,
        "mode" to (lastCommand?.mode ?: "idle"),
        "railLocation" to "Activity.window.decorView",
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("probe") { kind: String ->
      val activity = appContext.currentActivity
      if (activity == null) {
        mapOf("accepted" to false, "reason" to "NO_FOREGROUND_ACTIVITY")
      } else {
        railFor(activity).runProbe(kind)
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityEntersBackground {
      rail?.suspendForBackground()
      emit("ACTIVITY_BACKGROUND", "Decor rail hidden; persistent Full/Mini containers retained")
    }

    OnActivityEntersForeground {
      val command = lastCommand ?: return@OnActivityEntersForeground
      val activity = appContext.currentActivity ?: return@OnActivityEntersForeground
      emit("ACTIVITY_FOREGROUND", "Reattaching/reapplying retained ${command.mode} presentation")
      railFor(activity).applyCommand(command)
    }

    OnDestroy {
      destroyRail("module-destroy")
      emit("MODULE_DESTROYED", "H9B native decor rail destroyed")
    }
  }

  private fun requireActivity(): Activity = appContext.currentActivity
    ?: throw IllegalStateException("FamilyBloomOverlay requires a foreground Activity")

  private fun railFor(activity: Activity): FamilyBloomOverlayRail {
    if (rail == null || railActivity !== activity) {
      destroyRail("activity-changed")
      val next = FamilyBloomOverlayRail(
        activity = activity,
        diagnostic = { payload -> sendDiagnostic(payload) },
        action = { action, source -> sendEvent("onAction", mapOf("action" to action, "source" to source)) },
        chessAction = { payload -> sendEvent("onChessAction", payload) },
        xiangqiAction = { payload -> sendEvent("onXiangqiAction", payload) },
      )
      val decor = activity.window.decorView as ViewGroup
      // The rail is mounted in an invisible 1px parking slot. Do not insert
      // MATCH_PARENT into DecorView during the first Login -> Home transition:
      // it can trigger a second measurement pass behind the visual tab chrome.
      next.x = activity.resources.displayMetrics.widthPixels.toFloat() + 128f
      decor.addView(next, FrameLayout.LayoutParams(1, 1))
      rail = next
      railActivity = activity
      lastChessBoardState?.let { next.applyChessBoardState(it) }
      lastXiangqiBoardState?.let { next.applyXiangqiBoardState(it) }
      lastXiangqiMiniState?.let { next.applyXiangqiMiniState(it) }
      emit("DECOR_RAIL_ATTACHED", "Persistent native rail attached directly to Activity.window.decorView", extra = next.statusPayload())
    }
    return requireNotNull(rail)
  }

  private fun destroyRail(reason: String) {
    val current = rail ?: return
    (current.parent as? ViewGroup)?.removeView(current)
    current.destroy()
    rail = null
    railActivity = null
    emit("DECOR_RAIL_REMOVED", "Native decor rail removed · $reason")
  }

  private fun sendDiagnostic(payload: Map<String, Any?>) {
    val outgoing = payload.toMutableMap()
    if (!outgoing.containsKey("seq")) outgoing["seq"] = ++diagnosticSeq
    else diagnosticSeq += 1
    sendEvent("onDiagnostic", outgoing)
  }

  private fun emit(stage: String, detail: String, command: PresentationCommand? = lastCommand, extra: Map<String, Any?> = emptyMap()) {
    val payload = mutableMapOf<String, Any?>(
      "seq" to ++diagnosticSeq,
      "stage" to stage,
      "detail" to detail,
      "mode" to command?.mode,
      "kind" to command?.kind,
      "gameId" to command?.gameId,
      "railLocation" to "Activity.window.decorView",
    )
    payload.putAll(extra)
    sendEvent("onDiagnostic", payload)
  }
}

private class FamilyBloomOverlayRail(
  private val activity: Activity,
  private val diagnostic: (Map<String, Any?>) -> Unit,
  private val action: (String, String) -> Unit,
  private val chessAction: (Map<String, Any>) -> Unit,
  private val xiangqiAction: (Map<String, Any>) -> Unit,
) : FrameLayout(activity) {
  private val density = resources.displayMetrics.density
  private val overlayRoot = FrameLayout(context)
  private val fullContainer = FrameLayout(context)
  private val miniContainer = FrameLayout(context)
  private val chessLayer = FrameLayout(context)
  private val xiangqiLayer = FrameLayout(context)
  private val xiangqiBoard = XiangqiNativeBoardView(
    context = context,
    onSquareTap = { col, row ->
      val bound = gameId
      if (bound != null && kind == "xiangqi")
        xiangqiAction(mapOf("action" to "square", "gameId" to bound, "col" to col, "row" to row, "source" to "decor-rail-xiangqi-board"))
    },
    onAction = { action, boundId ->
      xiangqiAction(mapOf("action" to action, "gameId" to boundId, "source" to "decor-rail-xiangqi-action"))
    },
    onAssetsReady = { boundId ->
      xiangqiAction(mapOf("action" to "assetsReady", "gameId" to boundId, "source" to "decor-rail-xiangqi-board"))
    },
  )
  private val chessBoard = ChessNativeBoardView(
    context = context,
    onSquareTap = { square ->
      val activeGameId = gameId
      if (activeGameId != null) {
        chessAction(mapOf("action" to "square", "gameId" to activeGameId, "square" to square, "source" to "decor-rail-chess-board"))
        emit("NATIVE_CHESS_SQUARE_TAP", "$square tapped", mapOf("square" to square))
      }
    },
    onGameAction = { action, boundGameId ->
      chessAction(mapOf("action" to action, "gameId" to boundGameId, "source" to "decor-rail-chess-action"))
    },
    onPromotion = { piece ->
      val activeGameId = gameId
      if (activeGameId != null) {
        chessAction(mapOf("action" to "promotion", "gameId" to activeGameId, "promotion" to piece, "source" to "decor-rail-chess-promotion"))
      }
    },
    onReady = {
      val activeGameId = gameId
      if (activeGameId != null) {
        chessAction(mapOf("action" to "ready", "gameId" to activeGameId, "source" to "decor-rail-chess-ready"))
        emit("NATIVE_CHESS_READY_TAP", "Ready pressed", mapOf("gameId" to activeGameId))
      }
    },
  )
  private val gameLabel = TextView(context)
  private val bottomBrand = TextView(context)
  private val minimizeButton = TextView(context)
  private val miniLabel = TextView(context)
  private val miniTimeLabel = TextView(context)
  private val miniClockHandler = Handler(Looper.getMainLooper())
  private var miniClockAnchor = 0L
  private var miniClockSignature = ""
  private var xiangqiMiniState: NativeXiangqiMiniState? = null
  private val miniTick = object : Runnable {
    override fun run() {
      if (mode != "mini" || !isAttachedToWindow) return
      refreshMiniText()
      miniClockHandler.postDelayed(this, 1_000L)
    }
  }
  private val proofBadge = TextView(context)

  private var mode: String = "idle"
  private var kind: String? = null
  private var gameId: String? = null
  private var insetTopDp = 0.0
  private var insetBottomDp = 0.0
  // H9A keeps the logical viewport separate from this View's actual bounds.
  // FULL/MINI resize this native decor child to only the pixels they need, so
  // the compositor never carries a transparent full-screen layer for Mini.
  private var viewportWidthPx = 0
  private var viewportHeightPx = 0
  private var eventSequence = 0
  private var applyScheduled = false
  private var probeGeneration = 0
  private var presentationGeneration = 0
  private var firstLayoutEmitted = false
  private var probeState: ProbeState? = null
  private var nativeProofVisible = false

  private data class ProbeState(
    val generation: Int,
    val previousMode: String,
    val previousKind: String?,
    val previousGameId: String?,
  )

  private var miniDockRight = true
  private var miniY = 0f
  private var miniTouchStartX = 0f
  private var miniTouchStartY = 0f
  private var miniStartX = 0f
  private var miniStartY = 0f
  private var miniMoved = false
  private var latestChessState: NativeChessBoardState? = null
  private var latestXiangqiState: NativeXiangqiBoardState? = null

  init {
    // The host itself is transparent and fills the authenticated app shell.
    // Its children own only the Full/Mini rectangles. React sets pointerEvents
    // to box-none so taps outside those children continue to the ScreenStack.
    clipChildren = false
    clipToPadding = false
    isClickable = false
    isFocusable = false
    setBackgroundColor(Color.TRANSPARENT)
    elevation = 0f
    translationZ = 0f
    visibility = View.INVISIBLE

    overlayRoot.clipChildren = false
    overlayRoot.clipToPadding = false
    overlayRoot.setBackgroundColor(Color.TRANSPARENT)
    overlayRoot.visibility = View.INVISIBLE
    overlayRoot.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    addView(overlayRoot)

    buildFullSurface()
    buildMiniSurface()
    buildNativeProofBadge()
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.INVISIBLE

    emit("NATIVE_HOST_CONTAINERS_CREATED", "Native decor rail created persistent Full + Mini containers")
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    ensureTransparentHost()
    if (mode == "idle") hideHostRoot("attach-idle")
    emit("NATIVE_HOST_ATTACHED", "Native presentation host attached inside authenticated shell without promotion", siblingPayload())
    post {
      if (hasHostSize()) {
        emitLayoutReady("post-attach")
        applyPresentation()
      } else {
        emit("NATIVE_HOST_WAITING_LAYOUT", "Decor rail attached but still has 0x0 size", siblingPayload())
        requestLayout()
      }
    }
  }

  override fun onDetachedFromWindow() {
    emit("NATIVE_HOST_DETACHED", "Authenticated native host detached; Surface cannot outlive login session", siblingPayload())
    super.onDetachedFromWindow()
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (viewportWidthPx <= 0 && w > dp(200f)) viewportWidthPx = w
    if (viewportHeightPx <= 0 && h > dp(300f)) viewportHeightPx = h
    emit("NATIVE_HOST_SIZE_CHANGED", "Rail ${oldw}x${oldh}px -> ${w}x${h}px", mapOf(
      "widthDp" to pxToDp(w),
      "heightDp" to pxToDp(h),
      "viewportWidthDp" to pxToDp(viewportWidth()),
      "viewportHeightDp" to pxToDp(viewportHeight()),
    ))
    if (w > 0 && h > 0) emitLayoutReady("size-changed")
  }

  private fun hasHostSize(): Boolean = width > 0 && height > 0
  // Native rail is mounted in Activity.window.decorView. RN useWindowDimensions
  // may be smaller than the decor content after inset/padding adjustments.
  // Always use the actual parent measured bounds for edge docking.
  private fun viewportWidth(): Int = (parent as? ViewGroup)?.width?.takeIf { it > 0 }
    ?: viewportWidthPx.takeIf { it > 0 } ?: resources.displayMetrics.widthPixels
  private fun viewportHeight(): Int = (parent as? ViewGroup)?.height?.takeIf { it > 0 }
    ?: viewportHeightPx.takeIf { it > 0 } ?: resources.displayMetrics.heightPixels
  private fun hasViewportSize(): Boolean = viewportWidth() > 0 && viewportHeight() > 0

  private fun emitLayoutReady(reason: String) {
    val payload = siblingPayload() + mapOf(
      "widthDp" to pxToDp(width),
      "heightDp" to pxToDp(height),
      "shown" to isShown,
    )
    if (!firstLayoutEmitted) {
      firstLayoutEmitted = true
      emit("NATIVE_HOST_FIRST_LAYOUT", "Host first non-zero layout ${width}x${height}px · $reason", payload)
    }
    emit("NATIVE_HOST_LAYOUT_READY", "Decor rail layout ready ${width}x${height}px · $reason", payload)
  }

  override fun onInterceptTouchEvent(ev: MotionEvent?): Boolean = false

  override fun onTouchEvent(event: MotionEvent?): Boolean = false

  fun setMode(value: String) {
    mode = when (value) {
      "full", "mini" -> value
      else -> "idle"
    }
    scheduleApply()
  }

  fun setKind(value: String?) {
    kind = if (value == "chess" || value == "xiangqi") value else null
    scheduleApply()
  }

  fun setGameId(value: String?) {
    gameId = value
    scheduleApply()
  }

  fun setInsetTop(value: Double) {
    insetTopDp = value
    scheduleApply()
  }

  fun setInsetBottom(value: Double) {
    insetBottomDp = value
    scheduleApply()
  }

  fun applyCommand(command: PresentationCommand) {
    mode = when (command.mode) {
      "full", "mini" -> command.mode
      else -> "idle"
    }
    kind = if (command.kind == "chess" || command.kind == "xiangqi") command.kind else null
    gameId = command.gameId
    insetTopDp = command.insetTopDp
    insetBottomDp = command.insetBottomDp
    if (command.widthDp > 0.0) viewportWidthPx = dp(command.widthDp.toFloat())
    if (command.heightDp > 0.0) viewportHeightPx = dp(command.heightDp.toFloat())
    emit("DECOR_RAIL_COMMAND_RECEIVED", "Applying ${mode.uppercase()} · ${kind ?: "none"} · ${gameId ?: "no-game"}", siblingPayload())
    if (isAttachedToWindow && hasViewportSize()) applyPresentation() else requestLayout()
  }

  fun suspendForBackground() {
    miniClockHandler.removeCallbacks(miniTick)
    ensureTransparentHost()
    overlayRoot.visibility = View.INVISIBLE
    visibility = View.INVISIBLE
    elevation = 0f
    translationZ = 0f
    setRailBounds(viewportWidth() + dp(64f), 0, 1, 1)
    emit("DECOR_RAIL_BACKGROUND_HIDDEN", "Decor rail hidden + parked off-screen while Activity is backgrounded; Full/Mini containers retained", siblingPayload())
  }

  fun statusPayload(): Map<String, Any?> = siblingPayload() + mapOf(
    "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY,
    "mounted" to true,
    "attached" to isAttachedToWindow,
    "shown" to isShown,
    "mode" to mode,
    "kind" to kind,
    "gameId" to gameId,
    "widthDp" to pxToDp(width),
    "heightDp" to pxToDp(height),
    "xDp" to pxToDp(x.roundToInt()),
    "yDp" to pxToDp(y.roundToInt()),
    "viewportWidthDp" to pxToDp(viewportWidth()),
    "viewportHeightDp" to pxToDp(viewportHeight()),
    "railLocation" to "Activity.window.decorView",
  )

  fun runNativeProof(): Map<String, Any?> {
    if (!isAttachedToWindow) {
      return mapOf("accepted" to false, "reason" to "HOST_NOT_ATTACHED", "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY)
    }
    nativeProofVisible = true
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.INVISIBLE
    setRailBounds(0, 0, viewportWidth(), viewportHeight())
    revealHostForPresentation("native-proof")
    proofBadge.visibility = View.VISIBLE
    proofBadge.bringToFront()
    emit("NATIVE_BINARY_PROOF_VISIBLE", "NATIVE HOST OK · $FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY", siblingPayload() + mapOf(
      "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY,
    ))
    postDelayed({
      proofBadge.visibility = View.INVISIBLE
      nativeProofVisible = false
      applyPresentation()
      emit("NATIVE_BINARY_PROOF_HIDDEN", "Native proof badge hidden after 2200ms; canonical bounds restored", siblingPayload())
    }, 2200L)
    return mapOf("accepted" to true, "identity" to FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY, "attached" to isAttachedToWindow, "shown" to isShown)
  }

  fun runProbe(probeKind: String): Map<String, Any?> {
    if (!isAttachedToWindow) {
      return mapOf("accepted" to false, "reason" to "HOST_NOT_ATTACHED")
    }
    val generation = ++probeGeneration
    probeState = ProbeState(
      generation = generation,
      previousMode = mode,
      previousKind = kind,
      previousGameId = gameId,
    )
    mode = "full"
    kind = if (probeKind == "xiangqi") "xiangqi" else "chess"
    gameId = "P2.37-AUTH-HOST-PROBE"
    if (hasHostSize()) {
      applyPresentation()
    } else {
      emit("NATIVE_HOST_PROBE_WAITING_LAYOUT", "Probe accepted but waiting for decor rail layout", siblingPayload())
      scheduleApply()
    }
    return mapOf(
      "accepted" to true,
      "kind" to kind,
      "mode" to mode,
      "pendingLayout" to !hasHostSize(),
      "hostWidthDp" to pxToDp(width),
      "hostHeightDp" to pxToDp(height),
    )
  }

  fun destroy() {
    miniClockHandler.removeCallbacks(miniTick)
    ++probeGeneration
    ++presentationGeneration
    probeState = null
    nativeProofVisible = false
    mode = "idle"
    kind = null
    gameId = null
    proofBadge.visibility = View.INVISIBLE
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.INVISIBLE
    hideHostRoot("react-destroy")
    chessBoard.destroy()
    xiangqiBoard.destroy()
    emit("NATIVE_HOST_DESTROYED", "Native decor rail destroyed; persistent game content cleared")
  }

  private fun scheduleApply() {
    if (applyScheduled) return
    applyScheduled = true
    post {
      applyScheduled = false
      applyPresentation()
    }
  }

  private fun applyPresentation() {
    if (mode != "mini") miniClockHandler.removeCallbacks(miniTick)
    if (!hasViewportSize()) {
      emit("NATIVE_HOST_WAITING_LAYOUT", "Presentation received before viewport geometry was known", siblingPayload())
      requestLayout()
      return
    }

    val generation = ++presentationGeneration
    emit("NATIVE_HOST_COMMAND_RECEIVED", "Applying ${mode.uppercase()} · ${kind ?: "none"} · ${gameId ?: "no-game"}", siblingPayload())

    when (mode) {
      "full" -> showFull(generation)
      "mini" -> showMini(generation)
      else -> hideAll()
    }
  }

  private fun setRailBounds(left: Int, top: Int, railWidth: Int, railHeight: Int) {
    val safeWidth = railWidth.coerceAtLeast(1)
    val safeHeight = railHeight.coerceAtLeast(1)
    val lp = layoutParams
    if (lp == null || lp.width != safeWidth || lp.height != safeHeight) {
      layoutParams = FrameLayout.LayoutParams(safeWidth, safeHeight)
    }
    x = left.toFloat()
    y = top.toFloat()
    overlayRoot.layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  private fun showFull(generation: Int) {
    if (kind == null) {
      emit("NATIVE_HOST_COMMAND_REJECTED", "FULL requires chess/xiangqi content", siblingPayload())
      hideAll()
      return
    }
    val viewportW = viewportWidth()
    val viewportH = viewportHeight()
    // H9B design contract: actual Full rail fills 90% of each viewport axis.
    // Never let min widths expand the rail beyond a small physical display.
    val fullW = (viewportW * 0.90f).roundToInt().coerceIn(1, viewportW)
    val fullH = (viewportH * 0.90f).roundToInt().coerceIn(1, viewportH)
    val x = ((viewportW - fullW) / 2f).roundToInt()
    val y = ((viewportH - fullH) / 2f).roundToInt()

    setRailBounds(x, y, fullW, fullH)
    fullContainer.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    updateFullGeometry(fullW, fullH)
    applyKind()
    if (kind == "chess") latestChessState?.let { chessBoard.bind(it) }
    if (kind == "xiangqi") {
      if (gameId?.startsWith("pending-xiangqi:") == true) xiangqiBoard.showConnectingPreview()
      else latestXiangqiState?.takeIf { it.gameId == gameId }?.let { xiangqiBoard.bind(it) }
    }
    fullContainer.visibility = View.VISIBLE
    miniContainer.visibility = View.INVISIBLE
    revealHostForPresentation("presentation-full")
    fullContainer.bringToFront()
    fullContainer.requestLayout()
    confirmFullVisible(generation, x, y, fullW, fullH, 0)
  }

  private fun confirmFullVisible(generation: Int, x: Int, y: Int, requestedW: Int, requestedH: Int, attempt: Int) {
    fullContainer.post {
      if (generation != presentationGeneration || mode != "full") return@post
      val ready = isShown && hasHostSize() && fullContainer.isShown && fullContainer.width > 0 && fullContainer.height > 0
      if (ready) {
        // The first authoritative bind can precede native size measurement on
        // process recovery. Fix geometry before accepting input, without
        // unmounting/creating a second Chess board.
        if (kind == "chess") chessBoard.post { chessBoard.ensureRecoveredGeometry() }
        if (kind == "xiangqi") xiangqiBoard.post { xiangqiBoard.ensureRecoveredGeometry() }
        emit("NATIVE_HOST_FULL_VISIBLE", "Full Surface confirmed visible on bounded native decor rail", siblingPayload() + mapOf(
          "xDp" to pxToDp(x),
          "yDp" to pxToDp(y),
          "widthDp" to pxToDp(fullContainer.width),
          "heightDp" to pxToDp(fullContainer.height),
          "requestedWidthDp" to pxToDp(requestedW),
          "requestedHeightDp" to pxToDp(requestedH),
        ))
        completeProbeIfVisible()
      } else if (attempt < 8) {
        postDelayed({ confirmFullVisible(generation, x, y, requestedW, requestedH, attempt + 1) }, 16L)
      } else {
        emit("NATIVE_HOST_SURFACE_LAYOUT_TIMEOUT", "Full Surface requested but did not obtain visible non-zero layout", siblingPayload() + mapOf(
          "containerWidthDp" to pxToDp(fullContainer.width),
          "containerHeightDp" to pxToDp(fullContainer.height),
        ))
      }
    }
  }

  private fun completeProbeIfVisible() {
    val state = probeState ?: return
    if (state.generation != probeGeneration || gameId != "P2.37-AUTH-HOST-PROBE") return
    probeState = null
    emit("NATIVE_HOST_PROBE_VISIBLE", "Probe is truly visible with non-zero Full Surface layout", siblingPayload() + mapOf(
      "surfaceWidthDp" to pxToDp(fullContainer.width),
      "surfaceHeightDp" to pxToDp(fullContainer.height),
    ))
    postDelayed({
      if (state.generation != probeGeneration) return@postDelayed
      mode = state.previousMode
      kind = state.previousKind
      gameId = state.previousGameId
      applyPresentation()
      emit("NATIVE_HOST_PROBE_RESTORED", "Probe ended; restored canonical presentation", siblingPayload())
    }, 1800L)
  }

  private fun showMini(generation: Int) {
    if (kind == null) {
      emit("NATIVE_HOST_COMMAND_REJECTED", "MINI requires chess/xiangqi content", siblingPayload())
      hideAll()
      return
    }
    val viewportW = viewportWidth()
    val viewportH = viewportHeight()
    val miniW = dp(96f)
    val miniH = dp(52f)
    val gap = 0 // H14: edge-to-edge horizontal docking, no Full/padding-derived margin
    val verticalGap = dp(10f)
    val insetTop = dp(insetTopDp.toFloat())
    val insetBottom = dp(insetBottomDp.toFloat())
    val minY = max(verticalGap, insetTop + verticalGap)
    val maxY = max(minY, viewportH - insetBottom - miniH - verticalGap)
    if (miniY <= 0f) miniY = min(maxY, max(minY, (viewportH * 0.64f).roundToInt())).toFloat()
    miniY = miniY.coerceIn(minY.toFloat(), maxY.toFloat())
    val x = if (miniDockRight) (viewportW - miniW).coerceAtLeast(0) else 0

    setRailBounds(x, miniY.roundToInt(), miniW, miniH)
    miniContainer.layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    miniContainer.x = 0f
    miniContainer.y = 0f
    miniContainer.background = roundedStroke(if (kind == "xiangqi") "#B78832" else "#B83773", 20f,
      if (kind == "xiangqi") "#FFE2A5" else "#FFD9A4", 2f)
    miniLabel.setTextColor(Color.WHITE)
    miniTimeLabel.setTextColor(Color.WHITE)
    refreshMiniText()
    miniClockHandler.removeCallbacks(miniTick)
    miniClockHandler.postDelayed(miniTick, 1_000L)
    updateChessMiniOpacity()
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.VISIBLE
    revealHostForPresentation("presentation-mini-bounded")
    miniContainer.bringToFront()
    miniContainer.requestLayout()
    emit("NATIVE_HOST_MINI_RAIL_BOUNDED", "Mini decor rail shrunk to ${miniW}x${miniH}px; no transparent full-screen native layer remains", siblingPayload() + mapOf(
      "xDp" to pxToDp(x),
      "yDp" to pxToDp(miniY.roundToInt()),
      "widthDp" to pxToDp(miniW),
      "heightDp" to pxToDp(miniH),
    ))
    confirmMiniVisible(generation, x, miniY.roundToInt(), miniW, miniH, 0)
  }

  private fun confirmMiniVisible(generation: Int, x: Int, y: Int, requestedW: Int, requestedH: Int, attempt: Int) {
    miniContainer.post {
      if (generation != presentationGeneration || mode != "mini") return@post
      val ready = isShown && hasHostSize() && miniContainer.isShown && miniContainer.width > 0 && miniContainer.height > 0
      if (ready) {
        emit("NATIVE_HOST_MINI_VISIBLE", "Mini confirmed visible on bounded decor rail", siblingPayload() + mapOf(
          "xDp" to pxToDp(x),
          "yDp" to pxToDp(y),
          "widthDp" to pxToDp(miniContainer.width),
          "heightDp" to pxToDp(miniContainer.height),
          "requestedWidthDp" to pxToDp(requestedW),
          "requestedHeightDp" to pxToDp(requestedH),
        ))
      } else if (attempt < 8) {
        postDelayed({ confirmMiniVisible(generation, x, y, requestedW, requestedH, attempt + 1) }, 16L)
      } else {
        emit("NATIVE_HOST_SURFACE_LAYOUT_TIMEOUT", "Mini requested but did not obtain visible non-zero layout", siblingPayload())
      }
    }
  }

  private fun hideAll() {
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.INVISIBLE
    if (!nativeProofVisible) hideHostRoot("presentation-idle")
    emit("NATIVE_HOST_IDLE", "Full + Mini hidden; authenticated native host remains mounted", siblingPayload())
    emit("NATIVE_HOST_IDLE_HIDDEN", "Idle host root is parked off-screen and cannot cover React/Yoga navigation", siblingPayload())
  }

  private fun ensureTransparentHost() {
    setBackgroundColor(Color.TRANSPARENT)
    overlayRoot.setBackgroundColor(Color.TRANSPARENT)
  }

  private fun revealHostForPresentation(reason: String) {
    ensureTransparentHost()
    visibility = View.VISIBLE
    overlayRoot.visibility = View.VISIBLE
    elevation = dp(40f).toFloat()
    translationZ = dp(40f).toFloat()
    promoteAboveScreenStack(reason)
    emit("NATIVE_HOST_PRESENTATION_VISIBLE", "Bounded host VISIBLE only for active presentation/proof · $reason", siblingPayload())
  }

  private fun hideHostRoot(reason: String) {
    ensureTransparentHost()
    fullContainer.visibility = View.INVISIBLE
    miniContainer.visibility = View.INVISIBLE
    overlayRoot.visibility = View.INVISIBLE
    visibility = View.INVISIBLE
    elevation = 0f
    translationZ = 0f
    setRailBounds(viewportWidth() + dp(64f), 0, 1, 1)
    emit("NATIVE_HOST_ROOT_HIDDEN", "Host root INVISIBLE + parked off-screen · $reason", siblingPayload())
  }

  private fun promoteAboveScreenStack(reason: String) {
    // Never call this from onAttachedToWindow/idle. Only an active Surface or
    // explicit native proof is allowed to rise above React/Yoga navigation.
    bringToFront()
    (parent as? ViewGroup)?.let { parentGroup ->
      parentGroup.clipChildren = false
      // H9A bounds are already final before promotion. Avoid a full decor
      // requestLayout here; it needlessly competes with React tab animations.
      parentGroup.invalidate()
    }
    emit("NATIVE_HOST_PROMOTED", "bringToFront native decor rail · $reason", siblingPayload())
  }

  private fun siblingPayload(): Map<String, Any?> {
    val p = parent as? ViewGroup
    val siblings = if (p != null) {
      (0 until p.childCount).map { index -> "${index}:${p.getChildAt(index).javaClass.name}" }
    } else emptyList<String>()
    return mapOf(
      "parentClass" to (p?.javaClass?.name ?: "none"),
      "childIndex" to (p?.indexOfChild(this) ?: -1),
      "childCount" to (p?.childCount ?: 0),
      "siblings" to siblings,
      "attached" to isAttachedToWindow,
      "shown" to isShown,
      "mode" to mode,
      "kind" to kind,
      "gameId" to gameId,
      "elevationDp" to if (visibility == View.VISIBLE) 40 else 0,
      "railXdp" to pxToDp(x.roundToInt()),
      "railYdp" to pxToDp(y.roundToInt()),
      "railWidthDp" to pxToDp(width),
      "railHeightDp" to pxToDp(height),
      "viewportWidthDp" to pxToDp(viewportWidth()),
      "viewportHeightDp" to pxToDp(viewportHeight()),
      "hostVisibility" to visibilityName(visibility),
      "overlayVisibility" to visibilityName(overlayRoot.visibility),
      "backgroundTransparent" to true,
      "railLocation" to "Activity.window.decorView",
    )
  }

  private fun visibilityName(value: Int): String = when (value) {
    View.VISIBLE -> "VISIBLE"
    View.INVISIBLE -> "INVISIBLE"
    View.GONE -> "GONE"
    else -> value.toString()
  }

  private fun buildNativeProofBadge() {
    proofBadge.text = "NATIVE HOST OK\n$FAMILY_BLOOM_OVERLAY_NATIVE_IDENTITY"
    proofBadge.setTextColor(Color.WHITE)
    proofBadge.textSize = 11f
    proofBadge.gravity = Gravity.CENTER
    proofBadge.setTypeface(proofBadge.typeface, android.graphics.Typeface.BOLD)
    proofBadge.setPadding(dp(12f), dp(8f), dp(12f), dp(8f))
    proofBadge.background = rounded("#B43F72", 16f)
    proofBadge.elevation = dp(48f).toFloat()
    proofBadge.translationZ = dp(48f).toFloat()
    proofBadge.visibility = View.INVISIBLE
    overlayRoot.addView(proofBadge, FrameLayout.LayoutParams(dp(176f), dp(58f), Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
      topMargin = dp(24f)
    })
  }

  private fun buildFullSurface() {
    fullContainer.background = roundedStroke("#FFF8F5", 30f, "#FFFFFF", 2f)
    fullContainer.elevation = dp(22f).toFloat()
    fullContainer.translationZ = dp(22f).toFloat()
    fullContainer.isClickable = true
    fullContainer.isFocusable = true
    fullContainer.clipChildren = false
    fullContainer.clipToPadding = false
    overlayRoot.addView(fullContainer, FrameLayout.LayoutParams(dp(220f), dp(300f)))

    // Each game retains its own layer, with no shared game state or renderer.
    configureChessLayer()
    configureXiangqiLayer()
    fullContainer.addView(chessLayer)
    fullContainer.addView(xiangqiLayer)

    gameLabel.apply {
      setTextColor(Color.parseColor("#8C345D"))
      textSize = 12f
      letterSpacing = 0.05f
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(12f), dp(6f), dp(6f), dp(6f))
    }
    fullContainer.addView(gameLabel, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(38f), Gravity.TOP or Gravity.START).apply {
      leftMargin = dp(12f)
      topMargin = dp(4f)
    })

    bottomBrand.apply {
      text = "✦  FAMILY BLOOM  ·  PLAY TOGETHER  ✦"
      setTextColor(Color.parseColor("#A35B76"))
      gravity = Gravity.CENTER
      textSize = 9f
      letterSpacing = 0.06f
    }
    fullContainer.addView(bottomBrand, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(24f), Gravity.BOTTOM).apply {
      bottomMargin = dp(1f)
    })

    configureActionButton(minimizeButton, "−", "minimize")
    // No X during waiting/active/paused matches. Server terminal state cleans up.
    fullContainer.addView(minimizeButton, actionLayout(11f))
  }

  private fun buildMiniSurface() {
    miniContainer.elevation = dp(22f).toFloat()
    miniContainer.translationZ = dp(22f).toFloat()
    miniContainer.isClickable = true
    miniLabel.textSize = 11f
    miniLabel.gravity = Gravity.CENTER
    miniLabel.setPadding(dp(2f), dp(1f), dp(2f), 0)
    miniLabel.setTypeface(miniLabel.typeface, android.graphics.Typeface.BOLD)
    miniTimeLabel.textSize = 13f
    miniTimeLabel.gravity = Gravity.CENTER
    miniTimeLabel.setTextColor(Color.WHITE)
    miniTimeLabel.setTypeface(miniTimeLabel.typeface, android.graphics.Typeface.BOLD)
    miniContainer.addView(miniLabel, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(26f), Gravity.TOP))
    miniContainer.addView(miniTimeLabel, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(23f), Gravity.BOTTOM).apply {
      bottomMargin = dp(1f)
    })
    // Tap anywhere to restore, pan to dock. No close/exit in Mini.
    overlayRoot.addView(miniContainer, FrameLayout.LayoutParams(dp(96f), dp(52f)))
    installMiniGesture()
  }

  private fun updateFullGeometry(fullW: Int, fullH: Int) {
    // One 10dp outer inset; do not apply 90% + 7dp + board inner padding.
    val innerW = (fullW - dp(20f)).coerceAtLeast(1)
    val innerH = (fullH - dp(20f)).coerceAtLeast(1)
    val lp = FrameLayout.LayoutParams(innerW, innerH, Gravity.CENTER)
    chessLayer.layoutParams = FrameLayout.LayoutParams(lp)
    xiangqiLayer.layoutParams = FrameLayout.LayoutParams(lp)
    gameLabel.text = if (kind == "xiangqi") "✦  BLOOM ARENA · CỜ TƯỚNG" else "✦  BLOOM ARENA · CỜ VUA"
    emit("NATIVE_HOST_CONTENT_GEOMETRY", "H9B Full=90% viewport; each game stage=90% Full", mapOf(
      "fullWidthDp" to pxToDp(fullW), "fullHeightDp" to pxToDp(fullH),
      "innerWidthDp" to pxToDp(innerW), "innerHeightDp" to pxToDp(innerH),
    ))
  }

  private fun applyKind() {
    val chessActive = kind != "xiangqi"
    chessLayer.alpha = if (chessActive) 1f else 0f
    xiangqiLayer.alpha = if (chessActive) 0f else 1f
    chessLayer.isClickable = chessActive
    xiangqiLayer.isClickable = !chessActive
    if (chessActive) chessLayer.bringToFront() else xiangqiLayer.bringToFront()
    gameLabel.visibility = View.VISIBLE
    gameLabel.bringToFront()
    bottomBrand.bringToFront()
    minimizeButton.bringToFront()
    // No X close control in Full.
    emit("NATIVE_HOST_KIND_RAISED", "${if (chessActive) "Chess pink" else "Xiangqi gold"} native layer raised", siblingPayload())
  }

  /** The mini ticker ONLY changes miniLabel text. Never bind Chess board,
   * request a React render, emit a network event, or touch activity chrome.
   * No network-driven timer intervals are created for Full/hidden surfaces.
   */
  private fun noteMiniClockSource(sourceKey: String) {
    if (sourceKey == miniClockSignature) return
    miniClockSignature = sourceKey
    miniClockAnchor = SystemClock.elapsedRealtime()
  }

  private fun chessClockSource(s: NativeChessBoardState) =
    "chess:${s.gameId}:${s.revision}:${s.turn}:${s.status}:${s.serverNowMs}:${s.whiteRemainingMs}:${s.blackRemainingMs}"

  private fun xiangqiClockSource(s: NativeXiangqiMiniState) =
    "xiangqi:${s.gameId}:${s.revision}:${s.turn}:${s.status}:${s.serverNowMs}:${s.redRemainingMs}:${s.blackRemainingMs}"

  private fun activeMiniClock(remaining: Long?, active: Boolean, sourceKey: String): String {
    if (remaining == null) return "∞"
    noteMiniClockSource(sourceKey)
    val elapsed = if (active) (SystemClock.elapsedRealtime() - miniClockAnchor).coerceAtLeast(0L) else 0L
    val totalSeconds = ((remaining - elapsed).coerceAtLeast(0L) + 999L) / 1000L
    return "%02d:%02d".format(java.util.Locale.US, totalSeconds / 60, totalSeconds % 60)
  }

  private fun chessLastGlyph(s: NativeChessBoardState): String {
    val square = s.lastTo ?: return "♙"
    if (square.length != 2 || square[0] !in 'a'..'h' || square[1] !in '1'..'8') return "♙"
    val rows = s.fen.substringBefore(' ').split('/')
    if (rows.size != 8) return "♙"
    val rank = 8 - square[1].digitToInt()
    var file = 0
    for (symbol in rows[rank]) {
      if (symbol.isDigit()) { file += symbol.digitToInt(); continue }
      if (file == square[0] - 'a') return when (symbol) {
        'K' -> "♔"; 'Q' -> "♕"; 'R' -> "♖"; 'B' -> "♗"; 'N' -> "♘"; 'P' -> "♙"
        'k' -> "♚"; 'q' -> "♛"; 'r' -> "♜"; 'b' -> "♝"; 'n' -> "♞"; 'p' -> "♟"
        else -> "♟"
      }
      file++
    }
    return "♟"
  }

  private fun refreshMiniText() {
    if (mode != "mini") return
    val (pieceText, clockText) = if (kind == "chess") {
      val s = latestChessState
      if (s == null || s.gameId != gameId) Pair("♙  ·", "--:--")
      else {
        // Show the clock of the side TO MOVE (the running clock), not a
        // fictitious countdown attached to the last piece that moved.
        val remaining = if (s.turn == "w") s.whiteRemainingMs else s.blackRemainingMs
        val clock = activeMiniClock(remaining, s.status == "active" || s.status == "syncing", chessClockSource(s))
        Pair("${chessLastGlyph(s)}  ${s.lastFrom ?: "–"}→${s.lastTo ?: "–"}", clock)
      }
    } else {
      val s = xiangqiMiniState
      if (s == null || s.gameId != gameId) Pair("將  ·", "--:--")
      else {
        val remaining = if (s.turn == "red") s.redRemainingMs else s.blackRemainingMs
        val clock = activeMiniClock(remaining, s.status == "active", xiangqiClockSource(s))
        Pair(s.lastPieceGlyph, clock)
      }
    }
    // Move sprite label is NOT touched by second ticks; only miniTimeLabel
    // invalidates its own tiny rectangle. Full chess board and app never repaint.
    if (miniLabel.text.toString() != pieceText) miniLabel.text = pieceText
    if (miniTimeLabel.text.toString() != clockText) miniTimeLabel.text = clockText
  }

  fun applyXiangqiMiniState(s: NativeXiangqiMiniState) {
    if (xiangqiMiniState?.gameId == s.gameId && s.revision < (xiangqiMiniState?.revision ?: -1)) return
    xiangqiMiniState = s
    if (kind == "xiangqi") noteMiniClockSource(xiangqiClockSource(s))
    if (kind == "xiangqi" && mode == "mini") refreshMiniText()
  }

  private fun updateChessMiniOpacity() {
    // Dimming must not disable tap-to-restore or change any server-side clock;
    // keep existing H19 dimming contract unchanged.
    val s = latestChessState
    miniContainer.alpha = if (kind == "chess" && s != null && s.status == "active" && s.meColor != null && s.turn != s.meColor) 0.2f else 1f
  }

  fun applyChessBoardState(state: NativeChessBoardState) {
    if (latestChessState?.gameId == state.gameId &&
        state.renderSequence < (latestChessState?.renderSequence ?: 0)) return
    latestChessState = state
    if (kind == "chess") noteMiniClockSource(chessClockSource(state))
    if (mode == "full" && kind == "chess") chessBoard.bind(state)
    else chessBoard.parkForMini(state)
    updateChessMiniOpacity()
    if (mode == "mini" && kind == "chess") refreshMiniText()
    if (mode != "mini") emit("NATIVE_CHESS_BOARD_STATE", "Chess board state ${state.gameId} · rev ${state.revision}", mapOf(
      "gameId" to state.gameId,
      "revision" to state.revision,
      "status" to state.status,
      "turn" to state.turn,
      "selectedSquare" to state.selectedSquare,
      "legalCount" to state.legalTargets.size,
    ))
  }

  private fun configureChessLayer() {
    // Chess arena is neutral/transparent; do not paint the former pink stage.
    chessLayer.setBackgroundColor(Color.TRANSPARENT)
    chessLayer.addView(chessBoard, FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    ).apply {
      leftMargin = 0
      rightMargin = 0
      topMargin = 0
      bottomMargin = 0
    })
  }

  fun applyXiangqiBoardState(state: NativeXiangqiBoardState) {
    if (latestXiangqiState?.gameId == state.gameId && state.renderSequence < (latestXiangqiState?.renderSequence ?: -1)) return
    latestXiangqiState = state
    if (kind == "xiangqi") xiangqiBoard.bind(state)
  }

  private fun configureXiangqiLayer() {
    xiangqiLayer.setBackgroundColor(Color.TRANSPARENT)
    xiangqiLayer.addView(xiangqiBoard, FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    ))
  }

  private fun configureGameLayer(layer: FrameLayout, color: String, badge: String, title: String, textColor: Int) {
    // Decorative Xiangqi preview only. The native Xiangqi protocol/board is
    // intentionally NOT presented as playable in the H9B visual pass.
    layer.background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(
      Color.parseColor("#805124"), Color.parseColor(color), Color.parseColor("#DDBF76"),
    )).apply {
      cornerRadius = dp(25f).toFloat()
      setStroke(dp(2f), Color.parseColor("#FFE6AC"))
    }
    val badgeView = TextView(context).apply {
      text = "✦  BLOOM SUPER HERO  ✦"
      setTextColor(Color.parseColor("#FFEDD3"))
      textSize = 12f
      gravity = Gravity.CENTER
      letterSpacing = 0.08f
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    }
    layer.addView(badgeView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(35f), Gravity.TOP).apply {
      topMargin = dp(100f)
    })
    val titleView = TextView(context).apply {
      text = "楚  ·  漢\n$title"
      setTextColor(Color.WHITE)
      textSize = 32f
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    }
    layer.addView(titleView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(132f), Gravity.CENTER))
    val subtitle = TextView(context).apply {
      text = "Đang chuẩn bị giao diện bàn cờ"
      setTextColor(Color.parseColor("#4E3215"))
      textSize = 12f
      gravity = Gravity.CENTER
      background = rounded("#FFF3D4", 999f)
    }
    layer.addView(subtitle, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(38f), Gravity.BOTTOM).apply {
      leftMargin = dp(22f)
      rightMargin = dp(22f)
      bottomMargin = dp(96f)
    })
  }

  private fun configureActionButton(view: TextView, value: String, action: String) {
    view.text = value
    view.textSize = 24f
    view.gravity = Gravity.CENTER
    view.setTextColor(Color.parseColor("#8C345D"))
    view.background = roundedStroke("#FFFDF9", 999f, "#F2C8D8", 1f)
    view.isClickable = true
    view.setOnClickListener {
      emit("NATIVE_HOST_ACTION", "$action pressed", siblingPayload())
      this.action(action, "decor-rail-full-button")
    }
  }

  private fun actionLayout(rightDp: Float) = FrameLayout.LayoutParams(dp(38f), dp(38f), Gravity.TOP or Gravity.END).apply {
    topMargin = dp(5f)
    rightMargin = dp(rightDp)
  }

  private fun installMiniGesture() {
    miniContainer.setOnTouchListener { _, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          miniTouchStartX = event.rawX
          miniTouchStartY = event.rawY
          miniStartX = this@FamilyBloomOverlayRail.x
          miniStartY = this@FamilyBloomOverlayRail.y
          miniMoved = false
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - miniTouchStartX
          val dy = event.rawY - miniTouchStartY
          if (kotlin.math.abs(dx) > dp(4f) || kotlin.math.abs(dy) > dp(4f)) miniMoved = true
          val w = width.coerceAtLeast(1)
          val h = height.coerceAtLeast(1)
          val verticalGap = dp(10f)
          val viewportW = viewportWidth()
          val viewportH = viewportHeight()
          val minY = max(verticalGap, dp(insetTopDp.toFloat()) + verticalGap)
          val maxY = max(minY, viewportH - dp(insetBottomDp.toFloat()) - h - verticalGap)
          val nextX = (miniStartX + dx).coerceIn(0f, (viewportW - w).coerceAtLeast(0).toFloat())
          val nextY = (miniStartY + dy).coerceIn(minY.toFloat(), maxY.toFloat())
          this@FamilyBloomOverlayRail.x = nextX
          this@FamilyBloomOverlayRail.y = nextY
          true
        }
        MotionEvent.ACTION_UP -> {
          if (!miniMoved) {
            action("restore", "decor-rail-mini-tap")
            emit("NATIVE_HOST_ACTION", "restore from Mini tap", siblingPayload())
          } else {
            val w = width.coerceAtLeast(1)
            val viewportW = viewportWidth()
            miniDockRight = this@FamilyBloomOverlayRail.x + w / 2f >= viewportW / 2f
            miniY = this@FamilyBloomOverlayRail.y
            val targetX = if (miniDockRight) (viewportW - w).coerceAtLeast(0) else 0
            this@FamilyBloomOverlayRail.animate().x(targetX.toFloat()).setDuration(180L).start()
            emit("NATIVE_HOST_MINI_SNAPPED", "Mini snapped to ${if (miniDockRight) "right" else "left"} edge", siblingPayload() + mapOf(
              "miniYDp" to pxToDp(miniY.roundToInt()),
            ))
          }
          true
        }
        MotionEvent.ACTION_CANCEL -> true
        else -> false
      }
    }
  }

  private fun emit(stage: String, detail: String, extra: Map<String, Any?> = emptyMap()) {
    // Expo SDK 57 EventDispatcher expects Map<String, Any> (non-null values).
    // Keep nullable presentation metadata out of the event payload until it has a value.
    val payload = mutableMapOf<String, Any>(
      "seq" to ++eventSequence,
      "stage" to stage,
      "detail" to detail,
      "mode" to mode,
    )
    kind?.let { payload["kind"] = it }
    gameId?.let { payload["gameId"] = it }
    extra.forEach { (key, value) ->
      if (value != null) payload[key] = value
    }
    diagnostic(payload)
  }

  private fun rounded(color: String, radiusDp: Float): GradientDrawable = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = dp(radiusDp).toFloat()
    setColor(Color.parseColor(color))
  }

  private fun roundedStroke(color: String, radiusDp: Float, strokeColor: String, strokeWidthDp: Float): GradientDrawable =
    rounded(color, radiusDp).apply { setStroke(dp(strokeWidthDp), Color.parseColor(strokeColor)) }

  private fun dp(value: Float): Int = (value * density).roundToInt()
  private fun pxToDp(value: Int): Double = if (density == 0f) value.toDouble() else value / density.toDouble()
}
