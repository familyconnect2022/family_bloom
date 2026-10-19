package expo.modules.familybloomoverlay

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Rect
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import android.graphics.LinearGradient
import android.graphics.Shader
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Independent Xiangqi Full renderer. Never calls Chess code or Chess renderer. */
internal class XiangqiNativeBoardView(
  context: Context,
  private val onSquareTap: (Int, Int) -> Unit,
  private val onAction: (String, String) -> Unit,
  private val onAssetsReady: (String) -> Unit,
) : View(context) {
  private val d = resources.displayMetrics.density
  private fun dp(n: Float) = n * d
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
  private val pieceBitmaps: Map<String, Bitmap?> = buildMap {
    for (side in listOf("red", "black")) for (piece in listOf("general", "advisor", "elephant", "horse", "chariot", "cannon", "soldier")) {
      val id = resources.getIdentifier("fb_xiangqi_${side}_${piece}", "drawable", context.packageName)
      put("${side}_${piece}", if (id == 0) null else BitmapFactory.decodeResource(resources, id, BitmapFactory.Options().apply { inSampleSize = 2 }))
    }
  }
  private var state: NativeXiangqiBoardState? = null
  private var boardLeft = 0f
  private var boardTop = 0f
  private var cell = 1f
  private var boardBottom = 0f
  private var lastClockKey = ""
  private var clockAnchor = SystemClock.elapsedRealtime()
  private var readySentFor: String? = null
  private var resignConfirmUntil = 0L
  private var lastRenderSeq = -1
  private var lastSoundToken = 0
  private var lastSoundGameId: String? = null
  private var audio: SoundPool? = null
  private val samples = HashMap<String, Int>()
  private val loaded = HashSet<Int>()
  private val ui = Handler(Looper.getMainLooper())
  private var pendingCue: String? = null
  // Xiangqi-only retained motion. All coordinates and winner come from server.
  private var moveSpriteId: String? = null
  private var moveSpriteFrom: XiangqiNativePoint? = null
  private var moveSpriteTo: XiangqiNativePoint? = null
  private var moveStartedAt = 0L
  private val moveDurationMs = 205L
  private var resultSparklesStarted = 0L
  private var resultRevealAt = 0L
  private var resultEndCueKey: String? = null
  private val avatarImages = HashMap<String, Bitmap>()
  private val avatarRequested = HashSet<String>()
  private var drawOfferConfirmUntil = 0L
  private fun preloadAvatar(url: String?) {
    if (url.isNullOrBlank() || !url.startsWith("https://") || !avatarRequested.add(url)) return
    // Photo download happens off the Android UI thread, once per profile URL.
    Thread({
      try {
        val connection = URL(url).openConnection() as HttpsURLConnection
        connection.connectTimeout = 4000; connection.readTimeout = 4000
        connection.instanceFollowRedirects = true
        val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) }
        connection.disconnect()
        if (bitmap != null) {
          val small = Bitmap.createScaledBitmap(bitmap, dp(64f).toInt().coerceAtLeast(1), dp(64f).toInt().coerceAtLeast(1), true)
          if (small !== bitmap) bitmap.recycle()
          ui.post { if (avatarRequested.contains(url)) { avatarImages[url] = small; invalidate() } else small.recycle() }
        }
      } catch (_: Exception) { /* Initials stay visible if offline/private. */ }
    }, "FB-Xiangqi-Avatar").start()
  }
  private var lastOutcomeKey: String? = null
  private fun clearMove() {
    moveSpriteId = null; moveSpriteFrom = null; moveSpriteTo = null
  }
  private fun prepareVerifiedMotion(old: NativeXiangqiBoardState?, next: NativeXiangqiBoardState) {
    clearMove()
    if (old == null || old.gameId != next.gameId || old.status != "active" ||
        next.revision != old.revision + 1 || next.pieces == old.pieces) return
    val from = next.lastFrom ?: return
    val to = next.lastTo ?: return
    if (from == to || from.col !in 0..8 || from.row !in 0..9 ||
        to.col !in 0..8 || to.row !in 0..9) return
    // Same stable id must travel from authoritative source to destination.
    val moved = old.pieces.singleOrNull { it.col == from.col && it.row == from.row } ?: return
    val after = next.pieces.singleOrNull { it.id == moved.id && it.col == to.col && it.row == to.row } ?: return
    if (after.color != moved.color || after.type != moved.type) return
    moveSpriteId = moved.id
    moveSpriteFrom = from
    moveSpriteTo = to
    moveStartedAt = SystemClock.uptimeMillis()
  }
  private fun gradientBox(c: Canvas, l: Float,t: Float,r: Float,b: Float,rad: Float,
                          top: Int,bottom: Int,stroke: Int) {
    paint.style = Paint.Style.FILL
    paint.shader = LinearGradient(l,t,r,b,top,bottom,Shader.TileMode.CLAMP)
    c.drawRoundRect(RectF(l,t,r,b),rad,rad,paint)
    paint.shader = null
    paint.color=stroke;paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(1.6f)
    c.drawRoundRect(RectF(l,t,r,b),rad,rad,paint)
    paint.style=Paint.Style.FILL
  }
  private fun centerText(c: Canvas, v:String, x:Float,y:Float, size:Float,shade:Int,bold:Boolean=false) =
    text(c,v,x,y,size,shade,bold,true)
  private val audioMap = mapOf(
    "game-start" to R.raw.fb_board_game_start,
    "move-self" to R.raw.fb_board_move_self,
    "move-opponent" to R.raw.fb_board_move_opponent,
    "capture" to R.raw.fb_board_capture,
    "move-check" to R.raw.fb_board_move_check,
    "premove" to R.raw.fb_board_premove,
    "illegal" to R.raw.fb_board_illegal,
    "game-end" to R.raw.fb_board_game_end,
  )
  private fun ensureAudio() {
    if (audio != null) return
    val attrs=AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
    val pool=SoundPool.Builder().setMaxStreams(3).setAudioAttributes(attrs).build()
    audio=pool
    pool.setOnLoadCompleteListener { _, sampleId, result ->
      ui.post {
        if (result==0) {
          loaded.add(sampleId)
          if (pendingCue != null && samples[pendingCue] == sampleId) { pendingCue=null;pool.play(sampleId,.85f,.85f,1,0,1f) }
          maybeSendReady()
        }
      }
    }
    for ((key,res) in audioMap) samples[key]=pool.load(context,res,1)
  }
  private fun playCue(cue:String){
    if(cue.isBlank())return
    ensureAudio()
    val id=samples[cue]?:return
    if(loaded.contains(id)) audio?.play(id,.85f,.85f,1,0,1f)
    else pendingCue=cue
  }
  private val boardInk = Color.rgb(123, 72, 38)
  private val paleGold = Color.rgb(255, 235, 191)
  private val roseRed = Color.rgb(156, 46, 55)
  private val darker = Color.rgb(63, 40, 27)
  private fun color(hex: String) = Color.parseColor(hex)
  private fun box(c: Canvas, l: Float, t: Float, r: Float, b: Float, rad: Float, fill: Int, stroke: Int? = null, width: Float = dp(1f)) {
    paint.style = Paint.Style.FILL; paint.color = fill
    c.drawRoundRect(RectF(l,t,r,b),rad,rad,paint)
    if (stroke != null) { paint.style=Paint.Style.STROKE; paint.strokeWidth=width;paint.color=stroke;c.drawRoundRect(RectF(l,t,r,b),rad,rad,paint);paint.style=Paint.Style.FILL }
  }
  private fun line(c: Canvas, x1: Float,y1:Float,x2:Float,y2:Float, shade:Int=boardInk, thickness:Float=dp(.9f)) {
    paint.color=shade;paint.style=Paint.Style.STROKE;paint.strokeWidth=thickness
    c.drawLine(x1,y1,x2,y2,paint);paint.style=Paint.Style.FILL
  }
  private fun text(c: Canvas, value: String, x: Float,y:Float,size:Float,shade:Int, bold:Boolean=false, center:Boolean=false) {
    paint.style=Paint.Style.FILL;paint.color=shade;paint.textSize=dp(size)
    paint.typeface=if(bold) android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.BOLD) else android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
    paint.textAlign=if(center)Paint.Align.CENTER else Paint.Align.LEFT
    c.drawText(value,x,y,paint)
  }
  private fun toScreen(col:Int,row:Int,s:NativeXiangqiBoardState):Pair<Float,Float> {
    val flip=s.orientation=="black"
    return Pair(boardLeft+cell*(if(flip)8-col else col),boardTop+cell*(if(flip)9-row else row))
  }
  private fun drawPiece(c:Canvas,p:XiangqiNativePiece,x:Float,y:Float) {
    val radius=cell*.47025f // +10% vs H22R7; board hit cells never grow
    val bmp=pieceBitmaps["${p.color}_${p.type}"]
    if(bmp!=null) {
      // Original 384px PNG contains ~65% painted width. A tight crop plus
      // 0.855-cell destination reduces H22R5 sprite scale by exactly 25%. Keep the
      // underlying 9x10 cell/touch geometry unchanged for legal moves.
      val src=Rect((bmp.width*.16f).toInt(),(bmp.height*.12f).toInt(),
        (bmp.width*.85f).toInt(),(bmp.height*.86f).toInt())
      paint.alpha=255
      c.drawBitmap(bmp,src,RectF(x-radius,y-radius,x+radius,y+radius),paint)
    } else {
      paint.color=paleGold;c.drawCircle(x,y,radius,paint)
      paint.style=Paint.Style.STROKE;paint.color=boardInk;paint.strokeWidth=dp(1.4f);c.drawCircle(x,y,radius,paint);paint.style=Paint.Style.FILL
      val red=mapOf("general" to "帥","advisor" to "仕","elephant" to "相","horse" to "傌","chariot" to "俥","cannon" to "炮","soldier" to "兵")
      val black=mapOf("general" to "將","advisor" to "士","elephant" to "象","horse" to "馬","chariot" to "車","cannon" to "砲","soldier" to "卒")
      val glyph=(if(p.color=="red")red else black)[p.type]?:"棋"
      text(c,glyph,x,y+dp(8f),min(22f,cell/d*0.55f),if(p.color=="red")roseRed else darker,true,true)
    }
  }
  private fun clock(millis:Long?):String { if(millis==null)return "∞";val s=max(0L,millis)/1000;return "%02d:%02d".format(s/60,s%60) }
  private fun timeLeft(s:NativeXiangqiBoardState, side:String):Long? {
    val baseline=if(side=="red")s.redRemainingMs else s.blackRemainingMs
    if(baseline==null)return null
    return if(s.status=="active"&&s.turn==side)max(0L,baseline-(SystemClock.elapsedRealtime()-clockAnchor)) else baseline
  }
  fun bind(next:NativeXiangqiBoardState) {
    ensureAudio()
    if(state?.gameId==next.gameId && next.renderSequence<lastRenderSeq)return
    val key="${next.gameId}:${next.revision}:${next.turn}:${next.status}:${next.redRemainingMs}:${next.blackRemainingMs}:${next.serverNowMs}"
    if(key!=lastClockKey){lastClockKey=key;clockAnchor=SystemClock.elapsedRealtime()}
    if(state?.gameId!=next.gameId){readySentFor=null; clearMove(); lastOutcomeKey=null; resultRevealAt=0L;resultEndCueKey=null}
    // Plan from the previous authoritative position BEFORE overwriting it.
    // Selection, retry, stale ACKs, and multi-ply resyncs do not animate.
    if(state?.gameId != next.gameId || next.revision != state?.revision) prepareVerifiedMotion(state,next)
    if (lastSoundGameId!=next.gameId) {lastSoundGameId=next.gameId;lastSoundToken=next.soundToken;pendingCue=null}
    else if(next.soundToken!=lastSoundToken) {lastSoundToken=next.soundToken;playCue(next.soundCue)}
    lastRenderSeq=next.renderSequence;state=next
    preloadAvatar(next.meAvatarUrl);preloadAvatar(next.opponentAvatarUrl)
    if ((next.status == "finished" || next.status == "cancelled") && lastOutcomeKey != "${next.gameId}:${next.revision}") {
      lastOutcomeKey = "${next.gameId}:${next.revision}"
      // Only delay an authoritative LAST MOVE. Timeout, resign, recovery and
      // agreed draw must show immediately: they do not have a move to animate.
      val winningMove = next.status == "finished" && moveSpriteId != null &&
        moveSpriteFrom != null && moveSpriteTo != null
      resultRevealAt = if(winningMove) SystemClock.uptimeMillis()+1700L else 0L
      resultEndCueKey = if(winningMove) "${next.gameId}:${next.revision}" else null
      resultSparklesStarted = if(winningMove) resultRevealAt else SystemClock.uptimeMillis()
    }
    invalidate()
    maybeSendReady()
  }
  fun destroy() {
    ui.removeCallbacksAndMessages(null)
    audio?.release(); audio=null; samples.clear(); loaded.clear(); pendingCue=null
    for (bmp in pieceBitmaps.values) if (bmp != null && !bmp.isRecycled) bmp.recycle()
    for (bmp in avatarImages.values) if (!bmp.isRecycled) bmp.recycle()
    avatarImages.clear();avatarRequested.clear()
  }
  fun showConnectingPreview() { state = null; lastRenderSeq = -1; clearMove(); invalidate() }
  fun ensureRecoveredGeometry(){maybeSendReady();invalidate()}
  private fun maybeSendReady() {
    val s=state?:return
    if(!s.gameId.startsWith("pending-") && width>=dp(200f) && height>=dp(300f) && loaded.size==audioMap.size && readySentFor!=s.gameId) {
      readySentFor=s.gameId
      // Native view and all PNGs have been decoded, measured, and painted. Wait
      // two choreographer frames before making the first server readiness intent.
      post { post { if(state?.gameId==s.gameId)onAssetsReady(s.gameId) } }
    }
  }
  override fun onSizeChanged(w:Int,h:Int,oldw:Int,oldh:Int){super.onSizeChanged(w,h,oldw,oldh);maybeSendReady()}
  override fun onDraw(c:Canvas) {
    super.onDraw(c)
    val s=state
    c.drawColor(color("#FFFAEF"))
    val contentW=width.toFloat();val contentH=height.toFloat()
    if(s==null||s.gameId.startsWith("pending-")){
      drawConnectingBloom(c,contentW,contentH)
      return
    }
    // Preserve room for upper/lower player names, clocks and result notice.
    val topPadding=dp(147f)
    val bottomReserve=dp(178f)
    cell=min((contentW-dp(58f))/8f,(contentH-topPadding-bottomReserve)/9f).coerceAtLeast(dp(14f))
    boardLeft=(contentW-cell*8)/2f
    boardTop=topPadding+max(0f,(contentH-topPadding-bottomReserve-cell*9)/2f)
    boardBottom=boardTop+cell*9f
    val boardRight=boardLeft+cell*8f
    box(c,boardLeft-cell*.48f,boardTop-cell*.48f,boardRight+cell*.48f,boardBottom+cell*.48f,dp(8f),color("#F8DFAF"),boardInk,dp(1.5f))
    val me=s.meColor;val enemy=if(me=="red")"black" else "red"
    drawBloomHub(c,s,contentW,boardTop,boardBottom,me,enemy)
    for(row in 0..9){val y=boardTop+cell*row;line(c,boardLeft,y,boardRight,y)}
    for(col in 0..8){val x=boardLeft+cell*col
      line(c,x,boardTop,x,boardTop+cell*4)
      line(c,x,boardTop+cell*5,x,boardBottom)
    }
    // The two outer files cross the river, while the seven inner files break.
    for(col in listOf(0,8)){val x=boardLeft+cell*col;line(c,x,boardTop+cell*4,x,boardTop+cell*5)}
    for(base in listOf(0,7)){
      line(c,boardLeft+cell*3,boardTop+cell*base,boardLeft+cell*5,boardTop+cell*(base+2))
      line(c,boardLeft+cell*5,boardTop+cell*base,boardLeft+cell*3,boardTop+cell*(base+2))
    }
    text(c,"楚 河",boardLeft+cell*2,boardTop+cell*4.71f,min(17f,cell/d*.47f),boardInk,true,true)
    text(c,"漢 界",boardLeft+cell*6,boardTop+cell*4.71f,min(17f,cell/d*.47f),boardInk,true,true)
    // Two distinct filled squares + a directional stroke identify the last
    // move even when the landing piece is now covered by an opponent's piece.
    val lastOpponent = s.pieces.firstOrNull { it.col == s.lastTo?.col && it.row == s.lastTo?.row }?.color != s.meColor
    val moveAccent = color(if(lastOpponent)"#512C83C9" else "#55A1CA4B")
    for(p in listOf(s.lastFrom,s.lastTo)) if(p!=null){
      val(x,y)=toScreen(p.col,p.row,s)
      paint.color=moveAccent
      c.drawRoundRect(RectF(x-cell*.45f,y-cell*.45f,x+cell*.45f,y+cell*.45f),dp(6f),dp(6f),paint)
    }
    if(s.lastFrom!=null && s.lastTo!=null){
      val(fx,fy)=toScreen(s.lastFrom.col,s.lastFrom.row,s)
      val(tx,ty)=toScreen(s.lastTo.col,s.lastTo.row,s)
      val dx=tx-fx;val dy=ty-fy;val length=kotlin.math.sqrt(dx*dx+dy*dy).coerceAtLeast(1f)
      paint.color=color(if(lastOpponent)"#8742C0" else "#77A431");paint.strokeWidth=dp(3f)
      paint.style=Paint.Style.STROKE
      c.drawLine(fx+dx*.23f,fy+dy*.23f,tx-dx*.23f,ty-dy*.23f,paint)
      paint.style=Paint.Style.FILL
    }
    val selected=s.pieces.firstOrNull{it.id==s.selectedPieceId}
    if(selected!=null){val(x,y)=toScreen(selected.col,selected.row,s);paint.color=color("#E0A838");paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(3f);c.drawCircle(x,y,cell*.47f,paint);paint.style=Paint.Style.FILL}
    s.premoveTarget?.let { point ->
      val(x,y)=toScreen(point.col,point.row,s)
      paint.style=Paint.Style.STROKE;paint.color=color("#8A4DB7");paint.strokeWidth=dp(3f)
      c.drawCircle(x,y,cell*.31f,paint);paint.style=Paint.Style.FILL
    }
    for(p in s.legalTargets){val(x,y)=toScreen(p.col,p.row,s)
      if(s.captureTargets.any{it.col==p.col&&it.row==p.row}){
        paint.color=color("#32E34F77");c.drawCircle(x,y,cell*.45f,paint)
        paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(3.5f);paint.color=color("#C52352");c.drawCircle(x,y,cell*.42f,paint)
        paint.style=Paint.Style.FILL
      } else {
        paint.color=color("#CC2B995C");c.drawCircle(x,y,cell*.16f,paint)
        paint.color=color("#F1FDF9");c.drawCircle(x,y,cell*.075f,paint)
      }
    }
    val moving = moveSpriteId?.takeIf { moveSpriteFrom != null && moveSpriteTo != null }
    val elapsedMs = SystemClock.uptimeMillis() - moveStartedAt
    val showingMotion = moving != null && elapsedMs >= 0L && elapsedMs < moveDurationMs
    for(p in s.pieces){
      if(showingMotion && p.id==moving) continue
      val(x,y)=toScreen(p.col,p.row,s);drawPiece(c,p,x,y)
    }
    if(showingMotion) {
      val piece=s.pieces.firstOrNull{it.id==moving}
      val from=moveSpriteFrom!!;val to=moveSpriteTo!!
      val t=(elapsedMs.toFloat()/moveDurationMs).coerceIn(0f,1f)
      // Ease in/out with zero end velocity, no overshoot or path drift.
      val smooth=t*t*(3f-2f*t)
      val (fx,fy)=toScreen(from.col,from.row,s)
      val (tx,ty)=toScreen(to.col,to.row,s)
      if(piece!=null) drawPiece(c,piece,fx+(tx-fx)*smooth,fy+(ty-fy)*smooth)
      postInvalidateOnAnimation()
    } else if (moving != null) clearMove()
    s.lastTo?.let { p ->
      val(x,y)=toScreen(p.col,p.row,s)
      paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(3.1f)
      paint.color=color(if(lastOpponent)"#8843BC" else "#4A9D53")
      c.drawCircle(x,y,cell*.49f,paint);paint.style=Paint.Style.FILL
    }
    if(s.status=="waiting"){
      val remaining=s.waitingRemainingMs?.let{max(0L,it-(SystemClock.elapsedRealtime()-clockAnchor))}
      val message=if(s.waitingMessage.isNotBlank())s.waitingMessage else "Đang chuẩn bị bàn cờ…"
      box(c,dp(16f),contentH-dp(67f),contentW-dp(16f),contentH-dp(23f),dp(12f),color("#FFEDCF"),color("#DCA45D"))
      text(c,message.take(46),contentW/2,contentH-dp(49f),11f,boardInk,true,true)
      text(c,"${clock(remaining)} · Đợi hai người sẵn sàng",contentW/2,contentH-dp(31f),10f,darker,false,true)
    } else if(s.status=="active") {
      drawBloomActions(c,s,contentW,boardBottom)
      if(s.drawOfferByUid != null) drawBloomDrawProposal(c,s,contentW,contentH)
    }
    if(s.status=="finished"||s.status=="cancelled") {
      if (resultRevealAt == 0L || SystemClock.uptimeMillis() >= resultRevealAt) {
        if (resultEndCueKey != null) {resultEndCueKey=null;playCue("game-end")}
        drawBloomResult(c,s,contentW,contentH)
      } else {
        // Server already ended the game. Keep only its decisive move visible.
        centerText(c,"✦  NƯỚC CỜ QUYẾT ĐỊNH  ✦",contentW/2f,contentH-dp(38f),12f,color("#95396E"),true)
        postInvalidateOnAnimation()
      }
    }
    if(s.status=="waiting") drawBloomPreparation(c,s,contentW,contentH)
    if(s.status=="waiting"||s.status=="active"){
      if(isShown)postInvalidateDelayed(850L)
    }
  }
  // H22R7: persistent king motif. The red General straddles the top rim of
  // each Xiangqi modal; the top half is OUTSIDE the modal and the lower half
  // is INSIDE. PNG bitmap is decoded once with the rest of the Xiangqi assets.
  private fun drawBloomKing(c:Canvas,x:Float,cardTop:Float,accent:Int,border:Int) {
    val r=dp(53f)
    paint.shader=null
    paint.style=Paint.Style.FILL
    paint.color=color("#FFFFFAFC")
    c.drawCircle(x,cardTop,r,paint)
    paint.style=Paint.Style.STROKE
    paint.strokeWidth=dp(3f)
    paint.color=border
    c.drawCircle(x,cardTop,r,paint)
    paint.style=Paint.Style.FILL
    val bmp=pieceBitmaps["red_general"]
    if(bmp != null && !bmp.isRecycled) {
      val src=Rect((bmp.width*.16f).toInt(),(bmp.height*.12f).toInt(),
        (bmp.width*.85f).toInt(),(bmp.height*.86f).toInt())
      paint.alpha=255
      c.drawBitmap(bmp,src,RectF(x-dp(46f),cardTop-dp(46f),x+dp(46f),cardTop+dp(46f)),paint)
    } else {
      centerText(c,"帥",x,cardTop+dp(16f),44f,accent,true)
    }
    paint.alpha=255
  }
  private fun drawConnectingBloom(c:Canvas,w:Float,h:Float) {
    paint.color=color("#FFF7F9FB");c.drawRoundRect(RectF(0f,0f,w,h),dp(26f),dp(26f),paint)
    val cardW=min(w-dp(38f),dp(320f));val cardH=dp(310f)
    val left=(w-cardW)/2f;val top=(h-cardH)/2f
    gradientBox(c,left,top,left+cardW,top+cardH,dp(27f),color("#FFFFFFFF"),color("#FFF8EAF3"),color("#EFCDDD"))
    drawBloomKing(c,w/2f,top,color("#AA477A"),color("#EFCDDD"))
    centerText(c,"✦  BLOOM ARENA  ✦",w/2,top+dp(77f),11f,color("#934269"),true)
    centerText(c,"CỜ TƯỚNG SUPER BLOOM",w/2,top+dp(151f),18f,color("#793253"),true)
    centerText(c,"Bàn cờ đang được kết nối",w/2,top+dp(206f),13f,color("#8F6578"))
    box(c,left+dp(22f),top+dp(250f),left+cardW-dp(22f),top+dp(288f),dp(18f),color("#FFF1F7"),color("#EFCEE0"))
    centerText(c,"●  Đang chuẩn bị những nước cờ đẹp…",w/2,top+dp(274f),11f,color("#934B74"),true)
  }
  private fun drawBloomHub(c:Canvas,s:NativeXiangqiBoardState,w:Float,top:Float,bottom:Float,
                           me:String?,enemy:String) {
    val center=w/2f
    if(top>dp(126f)) {
      centerText(c,"✦  BLOOM SUPER HERO  ✦",center,top-dp(143f),10f,color("#A26084"),true)
      centerText(c,"ĐẤU TRƯỜNG CỜ TƯỚNG",center,top-dp(120f),18f,color("#833D5C"),true)
    }
    fun card(y:Float,label:String, side:String,opponent:Boolean, avatarUrl:String?) {
      val l=dp(9f);val r=w-dp(9f);val h=dp(57f)
      val active=s.status=="active" && s.turn==side
      box(c,l,y,r,y+h,dp(17f),color("#FFFBF7"),color(if(active)"#E8B0CC" else "#EED8DE"),dp(if(active)1.9f else 1f))
      box(c,l+dp(7f),y+dp(7f),l+dp(49f),y+dp(49f),dp(13f),
        color(if(opponent)"#F9E0EC" else "#FFE7BC"))
      val avatar=avatarUrl?.let{avatarImages[it]}
      if(avatar != null && !avatar.isRecycled) {
        val path=Path().apply{addCircle(l+dp(28f),y+dp(28f),dp(20f),Path.Direction.CW)}
        val save=c.save();c.clipPath(path)
        paint.alpha=255
        c.drawBitmap(avatar,null,RectF(l+dp(8f),y+dp(8f),l+dp(48f),y+dp(48f)),paint)
        c.restoreToCount(save)
      } else {
        // Person's initials/Bloom Bot's "B"; NEVER a Chinese piece glyph.
        val mark=if(opponent && label=="Bloom Bot") "B" else label.trim().take(1).uppercase().ifBlank{"B"}
        centerText(c,mark,l+dp(28f),y+dp(35f),20f,
          color(if(opponent)"#8D4174" else "#A74B40"),true)
      }
      val name=if(label.length>18)label.take(17)+"…" else label
      text(c,name,l+dp(56f),y+dp(26f),14f,color("#673751"),true)
      text(c,when {
        s.status=="waiting" -> "Đang chuẩn bị…"
        s.status=="active"&&active -> "Đang tới lượt"
        s.status=="active" -> "Đang chờ lượt"
        s.status=="finished" -> "Ván cờ đã kết thúc"
        else -> "Cùng chơi thật vui"
      },l+dp(56f),y+dp(43f),10f,color("#AD7791"))
      val clockW=dp(76f)
      box(c,r-clockW-dp(7f),y+dp(10f),r-dp(7f),y+dp(47f),dp(12f),
        color(if(active)"#9E356D" else if(opponent)"#F9E8EE" else "#FFF0D6"))
      centerText(c,clock(timeLeft(s,side)),r-clockW/2-dp(7f),y+dp(35f),16f,
        if(active)Color.WHITE else color("#7B3959"),true)
    }
    card(top-dp(86f),s.opponentLabel.ifBlank{"Đối thủ"},enemy,true,s.opponentAvatarUrl)
    card(bottom+dp(37f),s.meLabel.ifBlank{"Bạn"},me?:"red",false,s.meAvatarUrl)
    val bottomHint=bottom+dp(115f)
    if(bottomHint<h()-dp(69f)) {
      val movedByOpponent=s.pieces.firstOrNull{it.col==s.lastTo?.col&&it.row==s.lastTo?.row}?.color != s.meColor
      val notice=if(s.status=="active" && s.lastTo!=null)
        if(movedByOpponent) "✦  ${s.opponentLabel} vừa đi · Xem viền tím  ✦" else "✦  Nước của bạn · Xem viền xanh  ✦"
        else "✦  Chạm quân để chọn · Chạm ô để đi  ✦"
      centerText(c,notice.take(44),center,bottomHint,10f,color(if(movedByOpponent)"#7D4FB1" else "#995B77"))
    }
  }
  private fun drawBloomActions(c:Canvas,s:NativeXiangqiBoardState,w:Float,boardBottom:Float) {
    val gap=dp(10f);val left=dp(25f);val right=w-dp(25f)
    val half=(right-left-gap)/2f;val y=boardBottom+dp(128f)
    val offered=s.drawOfferByUid!=null && s.drawOfferByUid==s.myUid
    box(c,left,y,left+half,y+dp(43f),dp(14f),color("#FFF3F7"),color("#E2B7CC"))
    box(c,left+half+gap,y,right,y+dp(43f),dp(14f),color("#FFF4E5"),color("#DAB89A"))
    centerText(c,when {offered->"RÚT ĐỀ NGHỊ";SystemClock.elapsedRealtime()<drawOfferConfirmUntil->"XÁC NHẬN HÒA?";else->"XIN HÒA"},left+half/2f,y+dp(27f),11.5f,color("#93476E"),true)
    centerText(c,if(SystemClock.elapsedRealtime()<resignConfirmUntil)"XÁC NHẬN ĐẦU HÀNG?" else "ĐẦU HÀNG",left+half+gap+half/2f,y+dp(27f),11.5f,color("#955334"),true)
  }
  private fun drawBloomDrawProposal(c:Canvas,s:NativeXiangqiBoardState,w:Float,h:Float) {
    val mine=s.drawOfferByUid==s.myUid
    paint.color=color("#D5FFF7FC");c.drawRoundRect(RectF(0f,0f,w,h),dp(24f),dp(24f),paint)
    val pw=min(w-dp(32f),dp(330f));val ph=if(mine)dp(265f) else dp(316f)
    val l=(w-pw)/2f;val top=(h-ph)/2f;val x=w/2f
    gradientBox(c,l,top,l+pw,top+ph,dp(27f),color("#FFFFFFFF"),color("#FFF4E8F2"),color("#E8BAD4"))
    drawBloomKing(c,x,top,color("#934775"),color("#E3BFD2"))
    centerText(c,"✦  BLOOM ARENA · XIN HÒA  ✦",x,top+dp(82f),11f,color("#8D476F"),true)
    centerText(c,if(mine)"ĐÃ GỬI LỜI XIN HÒA" else "ĐỐI THỦ XIN HÒA",x,top+dp(131f),18f,color("#823D64"),true)
    centerText(c,if(mine)"Chờ đối thủ trả lời nhé!" else "Bạn muốn kết thúc ván hòa chứ?",x,top+dp(161f),13f,color("#9A6580"))
    if(mine){
      box(c,l+dp(30f),top+ph-dp(70f),l+pw-dp(30f),top+ph-dp(20f),dp(16f),color("#F5E4EF"),color("#E4BCD0"))
      centerText(c,"RÚT LỜI XIN HÒA",x,top+ph-dp(39f),12f,color("#8F4571"),true)
    } else {
      box(c,l+dp(20f),top+ph-dp(116f),l+pw-dp(20f),top+ph-dp(68f),dp(15f),color("#9A3974"))
      centerText(c,"ĐỒNG Ý HÒA",x,top+ph-dp(86f),13f,Color.WHITE,true)
      box(c,l+dp(20f),top+ph-dp(61f),l+pw-dp(20f),top+ph-dp(13f),dp(15f),color("#FFF8FA"),color("#E7C7D8"))
      centerText(c,"TIẾP TỤC CHƠI",x,top+ph-dp(31f),13f,color("#945073"),true)
    }
  }
  private fun h():Float = height.toFloat()
  private fun drawBloomResult(c:Canvas,s:NativeXiangqiBoardState,w:Float,h:Float) {
    val win=s.status=="finished" && s.result==s.meColor
    val draw=s.status=="finished" && s.result=="draw"
    val cancelled=s.status=="cancelled"
    val topColor=color(if(win)"#FFF9DF" else if(draw)"#E8FAFF" else if(cancelled)"#FFF8FB" else "#F1F8EC")
    val bottomColor=color(if(win)"#FFE5B3" else if(draw)"#CEE9F9" else if(cancelled)"#FFF0F7" else "#DAEBD7")
    val accent=color(if(win)"#885018" else if(draw)"#266D89" else if(cancelled)"#934B73" else "#466A50")
    val border=color(if(win)"#E4B85E" else if(draw)"#80B8D0" else if(cancelled)"#E9B7D0" else "#9EC39A")
    val action=color(if(win)"#96551B" else if(draw)"#347FA1" else if(cancelled)"#A53677" else "#608F65")
    paint.color=color("#DFFCF1F8");c.drawRoundRect(RectF(0f,0f,w,h),dp(25f),dp(25f),paint)
    val pw=min(w-dp(27f),dp(342f));val ph=min(dp(379f),h-dp(45f));val l=(w-pw)/2f;val top=(h-ph)/2f;val x=w/2f
    gradientBox(c,l,top,l+pw,top+ph,dp(27f),topColor,bottomColor,border)
    drawBloomKing(c,x,top,accent,border)
    centerText(c,if(win)"✦  BẢNG VÀNG BLOOM ARENA  ✦" else if(draw)"✦  FAIR PLAY · BLOOM ARENA  ✦" else "✦  HÀNH TRÌNH BLOOM ARENA  ✦",x,top+dp(77f),11f,accent,true)
    val title=when {win->"NHÀ VÔ ĐỊCH BLOOM!";draw->"MỘT VÁN CỜ ĐẸP!";cancelled->"MÌNH HẸN LẠI NHÉ!";else->"MỘT BƯỚC TIẾN MỚI"}
    centerText(c,title,x,top+dp(141f),if(win)18f else 19f,accent,true)
    val reason=when(s.finishReason){"away_timeout"->"Hết thời gian vắng mặt";"timeout"->"Hết giờ";"resignation"->"Đầu hàng";"checkmate"->"Chiếu bí";"abandoned"->"Chưa kịp chuẩn bị bàn cờ";"general_captured"->"Tướng đã bị bắt";else->""}
    if(reason.isNotBlank())centerText(c,reason,x,top+dp(166f),12f,accent)
    val lines=when {win->listOf("Bạn đã tạo nên một chiến thắng", "thật xứng đáng. Bloom tự hào", "về những nước đi bản lĩnh!");draw->listOf("Hai kỳ thủ đã tạo nên một", "trận đấu cân tài, đẹp và", "đầy tinh thần fair play!");cancelled->listOf("Ván cờ đã được khép lại.","Mình sẽ cùng chơi khi tất cả", "đều đã sẵn sàng nhé!");else->listOf("Mỗi ván là một trải nghiệm.", "Cảm ơn bạn đã kiên nhẫn", "và cùng Bloom tiến bộ!")}
    for((i,v) in lines.withIndex()) centerText(c,v,x,top+dp(203f)+i*dp(21f),13f,accent)
    val buttonTop=top+ph-dp(66f)
    box(c,l+dp(26f),buttonTop,l+pw-dp(26f),buttonTop+dp(47f),dp(15f),action)
    centerText(c,"VỀ SẢNH TRÒ CHƠI  →",x,buttonTop+dp(30f),14f,Color.WHITE,true)
    if(win && SystemClock.uptimeMillis()-resultSparklesStarted<1400L) {
      val elapsed=(SystemClock.uptimeMillis()-resultSparklesStarted)/1400f
      for(i in 0..15){
        val a=i*2f*Math.PI.toFloat()/16f
        val radius=dp(52f)+dp(38f)*elapsed
        paint.color=if(i%2==0)border else accent
        paint.alpha=((1f-elapsed)*190f).toInt().coerceIn(0,255)
        c.drawCircle(x+radius*kotlin.math.cos(a),top+radius*kotlin.math.sin(a),dp(2.4f),paint)
      }
      paint.alpha=255;postInvalidateOnAnimation()
    }
  }
  private fun drawBloomPreparation(c:Canvas,s:NativeXiangqiBoardState,w:Float,h:Float) {
    // Xiangqi-owned Super Bloom waiting sheet. Keep the authoritative board
    // already painted underneath, but make it clear that movement is locked
    // until the server confirms BOTH players are ready.
    paint.style=Paint.Style.FILL
    paint.color=color("#E8FFF8FC")
    c.drawRoundRect(RectF(0f,0f,w,h),dp(25f),dp(25f),paint)
    val panelW=min(w-dp(34f),dp(322f))
    val panelH=min(h-dp(70f),dp(360f))
    val left=(w-panelW)/2f;val top=(h-panelH)/2f
    gradientBox(c,left,top,left+panelW,top+panelH,dp(27f),color("#FFFFFFFF"),color("#FFF7E9F3"),color("#ECC5DB"))
    val center=w/2f
    drawBloomKing(c,center,top,color("#A52F70"),color("#EFD0E0"))
    val eyebrowY=top+dp(78f)
    text(c,"✦   BLOOM ARENA   ✦",center,eyebrowY,12f,color("#843F69"),true,true)
    val awaitingColors=s.preparationPhase=="colors"
    val awaitingPlay=s.preparationPhase=="play"
    text(c,if(awaitingPlay)"SẴN SÀNG VÀO TRẬN" else "CHUẨN BỊ VÁN CỜ",center,top+dp(141f),20f,color("#7B3867"),true,true)
    line(c,center-dp(42f),top+dp(159f),center+dp(42f),top+dp(159f),color("#E8C5D8"),dp(1f))
    val lines=when {
      awaitingPlay -> listOf("Màu quân đã được xác nhận.","Đang đợi người chơi còn lại", "sẵn sàng để bắt đầu đồng hồ.")
      awaitingColors -> listOf("Hai bên đã sẵn sàng bàn cờ.", "Bloom đang xác nhận lượt bắt đầu", "để trận đấu luôn công bằng.")
      else -> listOf("Bàn cờ, quân cờ và âm thanh", "đang được chuẩn bị thật chỉn chu.", "Chúng mình sẽ bắt đầu ngay nhé.")
    }
    for((i,lineText) in lines.withIndex())
      text(c,lineText,center,top+dp(191f)+i*dp(23f),13f,color("#8B4A74"),false,true)
    val statusTop=top+panelH-dp(63f)
    box(c,left+dp(19f),statusTop,left+panelW-dp(19f),statusTop+dp(43f),dp(21f),color("#FFF7FB"),color("#E9CCDC"),dp(1f))
    val deadline=s.waitingRemainingMs?.let {max(0L,it-(SystemClock.elapsedRealtime()-clockAnchor))}
    val status=if(awaitingPlay)"Chờ xác nhận sẵn sàng" else if(awaitingColors)"Đợi xác nhận màu quân" else "Đang sắp xếp bàn cờ"
    text(c,"●  $status   ${clock(deadline)}",center,statusTop+dp(26f),11f,color("#95517B"),true,true)
  }
  override fun onTouchEvent(event:MotionEvent):Boolean{
    if(event.action!=MotionEvent.ACTION_UP)return true
    val s=state?:return true
    val x=event.x;val y=event.y
    if(s.status=="finished"||s.status=="cancelled"){
      if (resultRevealAt != 0L && SystemClock.uptimeMillis() < resultRevealAt) return true
      val panelH=min(dp(379f),height-dp(45f));val panelTop=(height-panelH)/2f
      val buttonTop=panelTop+panelH-dp(66f)
      if(y in buttonTop..(buttonTop+dp(49f)) &&
         abs(x-width/2f)<(min(width-dp(27f),dp(342f))/2f-dp(23f)))onAction("resultAck",s.gameId)
      return true
    }
    if(s.status=="active" && s.drawOfferByUid!=null) {
      val mine=s.drawOfferByUid==s.myUid
      val panelH=if(mine)dp(265f) else dp(316f)
      val top=(height-panelH)/2f
      if(mine) {
        if(y >= top+panelH-dp(76f) && y<=top+panelH-dp(12f))onAction("drawDecline",s.gameId)
      } else {
        if(y>=top+panelH-dp(122f) && y<=top+panelH-dp(65f))onAction("drawAccept",s.gameId)
        else if(y>=top+panelH-dp(64f) && y<=top+panelH)onAction("drawDecline",s.gameId)
      }
      return true
    }
    if(s.status=="active" && y>=boardBottom+dp(123f) && y<=boardBottom+dp(178f)) {
      val now=SystemClock.elapsedRealtime()
      if(x<width/2f) {
        if(now<drawOfferConfirmUntil){drawOfferConfirmUntil=0L;onAction("drawOffer",s.gameId)}
        else {drawOfferConfirmUntil=now+5000L;invalidate();postInvalidateDelayed(5100L)}
      } else {
        if(now<resignConfirmUntil){resignConfirmUntil=0L;onAction("resign",s.gameId)}
        else {resignConfirmUntil=now+5000L;invalidate();postInvalidateDelayed(5100L)}
      }
      return true
    }
    resignConfirmUntil=0L;drawOfferConfirmUntil=0L
    if((!s.canMove&&!s.canPremove)||s.movePending)return true
    val colOnBoard=((x-boardLeft)/cell).roundToInt().coerceIn(0,8)
    val rowOnBoard=((y-boardTop)/cell).roundToInt().coerceIn(0,9)
    val expectedX=boardLeft+colOnBoard*cell;val expectedY=boardTop+rowOnBoard*cell
    if(abs(x-expectedX)>cell*.48f||abs(y-expectedY)>cell*.48f)return true
    val flip=s.orientation=="black"
    onSquareTap(if(flip)8-colOnBoard else colOnBoard,if(flip)9-rowOnBoard else rowOnBoard)
    return true
  }
}
