package expo.modules.familybloomoverlay

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
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
    val radius=cell*.45f
    val bmp=pieceBitmaps["${p.color}_${p.type}"]
    if(bmp!=null) {
      paint.alpha=255
      c.drawBitmap(bmp,null,RectF(x-radius,y-radius,x+radius,y+radius),paint)
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
    if(state?.gameId!=next.gameId){readySentFor=null}
    if (lastSoundGameId!=next.gameId) {lastSoundGameId=next.gameId;lastSoundToken=next.soundToken}
    else if(next.soundToken!=lastSoundToken) {lastSoundToken=next.soundToken;playCue(next.soundCue)}
    lastRenderSeq=next.renderSequence;state=next
    invalidate()
    maybeSendReady()
  }
  fun destroy() {
    ui.removeCallbacksAndMessages(null)
    audio?.release(); audio=null; samples.clear(); loaded.clear(); pendingCue=null
    for (bmp in pieceBitmaps.values) if (bmp != null && !bmp.isRecycled) bmp.recycle()
  }
  fun showConnectingPreview() { state = null; lastRenderSeq = -1; invalidate() }
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
      text(c,"CỜ TƯỚNG · FAMILY BLOOM",contentW/2,contentH*.4f,18f,boardInk,true,true)
      text(c,"Đang kết nối và chuẩn bị bàn cờ…",contentW/2,contentH*.47f,12f,darker,false,true)
      return
    }
    // Preserve room for upper/lower player names, clocks and result notice.
    val topPadding=dp(92f)
    val bottomReserve=dp(120f)
    cell=min((contentW-dp(58f))/8f,(contentH-topPadding-bottomReserve)/9f).coerceAtLeast(dp(14f))
    boardLeft=(contentW-cell*8)/2f
    boardTop=topPadding+max(0f,(contentH-topPadding-bottomReserve-cell*9)/2f)
    boardBottom=boardTop+cell*9f
    val boardRight=boardLeft+cell*8f
    box(c,boardLeft-cell*.48f,boardTop-cell*.48f,boardRight+cell*.48f,boardBottom+cell*.48f,dp(8f),color("#F6DDA4"),boardInk,dp(1.6f))
    val me=s.meColor;val enemy=if(me=="red")"black" else "red"
    val opponentClock=clock(timeLeft(s,enemy))
    val meClock=clock(timeLeft(s,me?:"red"))
    val opponentName=if(s.opponentLabel.isBlank())"Đối thủ" else s.opponentLabel.take(20)
    text(c,opponentName,dp(22f),dp(48f),16f,darker,true)
    text(c,opponentClock,contentW-dp(82f),dp(48f),19f,if(s.status=="active"&&s.turn==enemy)roseRed else darker,true)
    text(c,"Bạn",dp(22f),boardBottom+dp(54f),16f,darker,true)
    text(c,meClock,contentW-dp(80f),boardBottom+dp(54f),19f,if(s.status=="active"&&s.turn==me)roseRed else darker,true)
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
    for(p in listOf(s.lastFrom,s.lastTo))if(p!=null){val(x,y)=toScreen(p.col,p.row,s);paint.color=color("#55CA8F5E");c.drawCircle(x,y,cell*.45f,paint)}
    val selected=s.pieces.firstOrNull{it.id==s.selectedPieceId}
    if(selected!=null){val(x,y)=toScreen(selected.col,selected.row,s);paint.color=color("#E0A838");paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(3f);c.drawCircle(x,y,cell*.47f,paint);paint.style=Paint.Style.FILL}
    s.premoveTarget?.let { point ->
      val(x,y)=toScreen(point.col,point.row,s)
      paint.style=Paint.Style.STROKE;paint.color=color("#8A4DB7");paint.strokeWidth=dp(3f)
      c.drawCircle(x,y,cell*.31f,paint);paint.style=Paint.Style.FILL
    }
    for(p in s.legalTargets){val(x,y)=toScreen(p.col,p.row,s)
      if(s.captureTargets.any{it.col==p.col&&it.row==p.row}){paint.style=Paint.Style.STROKE;paint.strokeWidth=dp(4f);paint.color=color("#B93454");c.drawCircle(x,y,cell*.41f,paint);paint.style=Paint.Style.FILL}
      else {paint.color=color("#7CC58B39");c.drawCircle(x,y,cell*.13f,paint)}
    }
    for(p in s.pieces){val(x,y)=toScreen(p.col,p.row,s);drawPiece(c,p,x,y)}
    if(s.status=="waiting"){
      val remaining=s.waitingRemainingMs?.let{max(0L,it-(SystemClock.elapsedRealtime()-clockAnchor))}
      val message=if(s.waitingMessage.isNotBlank())s.waitingMessage else "Đang chuẩn bị bàn cờ…"
      box(c,dp(16f),contentH-dp(67f),contentW-dp(16f),contentH-dp(23f),dp(12f),color("#FFEDCF"),color("#DCA45D"))
      text(c,message.take(46),contentW/2,contentH-dp(49f),11f,boardInk,true,true)
      text(c,"${clock(remaining)} · Đợi hai người sẵn sàng",contentW/2,contentH-dp(31f),10f,darker,false,true)
    } else if(s.status=="active"){
      box(c,contentW/2-dp(68f),contentH-dp(54f),contentW/2+dp(68f),contentH-dp(16f),dp(11f),color("#FBE6D8"),color("#CB9A79"))
      text(c,if(SystemClock.elapsedRealtime()<resignConfirmUntil)"XÁC NHẬN ĐẦU HÀNG?" else "ĐẦU HÀNG",contentW/2,contentH-dp(30f),12f,roseRed,true,true)
    }
    if(s.status=="finished"||s.status=="cancelled"){
      paint.color=color("#BB331D14");c.drawRect(0f,0f,contentW,contentH,paint)
      val outcome=if(s.status=="cancelled")"PHIÊN ĐÃ KẾT THÚC" else when(s.result){"draw"->"HÒA CỜ";me->"CHIẾN THẮNG";else->"THUA CUỘC"}
      val back=if(s.result==me&&s.status=="finished")color("#FFF4D7")else if(s.result=="draw")color("#F6F0E9")else color("#FFE5DD")
      box(c,dp(24f),contentH/2-dp(108f),contentW-dp(24f),contentH/2+dp(108f),dp(24f),back,color("#B9956C"),dp(2f))
      text(c,outcome,contentW/2,contentH/2-dp(30f),22f,if(s.result==me)color("#B5771E")else roseRed,true,true)
      val reason=when(s.finishReason){"away_timeout"->"Hết thời gian vắng mặt";"timeout"->"Hết giờ";"resignation"->"Đầu hàng";"checkmate"->"Chiếu bí";"abandoned"->"Chưa kịp chuẩn bị bàn cờ";else->"Cảm ơn đã cùng chơi"}
      text(c,reason,contentW/2,contentH/2+dp(8f),13f,darker,false,true)
      box(c,contentW/2-dp(92f),contentH/2+dp(38f),contentW/2+dp(92f),contentH/2+dp(84f),dp(14f),color("#A12C67"))
      text(c,"ĐỒNG Ý",contentW/2,contentH/2+dp(67f),15f,Color.WHITE,true,true)
    }
    if(s.status=="waiting"||s.status=="active"){
      if(isShown)postInvalidateDelayed(850L)
    }
  }
  override fun onTouchEvent(event:MotionEvent):Boolean{
    if(event.action!=MotionEvent.ACTION_UP)return true
    val s=state?:return true
    val x=event.x;val y=event.y
    if(s.status=="finished"||s.status=="cancelled"){
      onAction("resultAck",s.gameId)
      return true
    }
    if(s.status=="active"&&y>=height-dp(64f)&&abs(x-width/2f)<=dp(95f)){
      if(SystemClock.elapsedRealtime()<resignConfirmUntil){resignConfirmUntil=0L;onAction("resign",s.gameId)}
      else {resignConfirmUntil=SystemClock.elapsedRealtime()+5000L;invalidate();postInvalidateDelayed(5100L)}
      return true
    }
    resignConfirmUntil=0L
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
