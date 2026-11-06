package expo.modules.familybloomoverlay

import org.json.JSONObject

/** Xiangqi-owned wire state. It never imports a Chess piece, controller or FEN. */
internal data class XiangqiNativePiece(
  val id: String, val color: String, val type: String, val col: Int, val row: Int,
)
internal data class XiangqiNativePoint(val col: Int, val row: Int)
internal data class NativeXiangqiBoardState(
  val gameId: String,
  val revision: Int,
  val renderSequence: Int,
  val status: String,
  val preparationPhase: String,
  val turn: String,
  val orientation: String,
  val meColor: String?,
  val pieces: List<XiangqiNativePiece>,
  val lastFrom: XiangqiNativePoint?,
  val lastTo: XiangqiNativePoint?,
  val selectedPieceId: String?,
  val legalTargets: List<XiangqiNativePoint>,
  val captureTargets: List<XiangqiNativePoint>,
  val redRemainingMs: Long?,
  val blackRemainingMs: Long?,
  val serverNowMs: Long,
  val canMove: Boolean,
  val movePending: Boolean,
  val actionPending: String,
  val actionError: String,
  val opponentLabel: String,
  val meLabel: String,
  val opponentAvatarUrl: String?,
  val meAvatarUrl: String?,
  val myUid: String?,
  val drawOfferByUid: String?,
  val waitingMessage: String,
  val waitingRemainingMs: Long?,
  val result: String?,
  val finishReason: String?,
  val canPremove: Boolean, val premoveTarget: XiangqiNativePoint?,
  val soundCue: String, val soundToken: Int,
) {
  companion object {
    fun fromJson(raw: String): NativeXiangqiBoardState {
      val j = JSONObject(raw)
      fun nullable(key: String) = if (!j.has(key) || j.isNull(key)) null else j.optString(key)
      fun longOrNull(key: String) = if (!j.has(key) || j.isNull(key)) null else j.optLong(key)
      fun pointOrNull(obj: JSONObject?): XiangqiNativePoint? = obj?.let { XiangqiNativePoint(it.optInt("col", -1), it.optInt("row", -1)) }
      val pieces = j.optJSONArray("pieces")
      val targets = j.optJSONArray("legalTargets")
      val captures = j.optJSONArray("captureTargets")
      return NativeXiangqiBoardState(
        gameId = j.getString("gameId"),
        revision = j.optInt("revision"), renderSequence = j.optInt("renderSequence"),
        status = j.optString("status", "waiting"), preparationPhase = j.optString("preparationPhase", "board"),
        turn = j.optString("turn", "red"), orientation = j.optString("orientation", "red"),
        meColor = nullable("meColor"),
        pieces = (0 until (pieces?.length() ?: 0)).mapNotNull { i ->
          pieces?.optJSONObject(i)?.let { XiangqiNativePiece(it.optString("id"), it.optString("color"), it.optString("type"), it.optInt("col"), it.optInt("row")) }
        },
        lastFrom = pointOrNull(j.optJSONObject("lastFrom")),
        lastTo = pointOrNull(j.optJSONObject("lastTo")),
        selectedPieceId = nullable("selectedPieceId"),
        legalTargets = (0 until (targets?.length() ?: 0)).mapNotNull { targets?.optJSONObject(it)?.let { p -> pointOrNull(p) } },
        captureTargets = (0 until (captures?.length() ?: 0)).mapNotNull { captures?.optJSONObject(it)?.let { p -> pointOrNull(p) } },
        redRemainingMs = longOrNull("redRemainingMs"), blackRemainingMs = longOrNull("blackRemainingMs"),
        serverNowMs = j.optLong("serverNowMs"), canMove = j.optBoolean("canMove"), movePending = j.optBoolean("movePending"),
        actionPending = j.optString("actionPending", ""), actionError = j.optString("actionError", ""),
        opponentLabel = j.optString("opponentLabel", "Đối thủ"), meLabel = j.optString("meLabel", "Bạn"),
        opponentAvatarUrl = nullable("opponentAvatarUrl"), meAvatarUrl = nullable("meAvatarUrl"),
        myUid = nullable("myUid"), drawOfferByUid = nullable("drawOfferByUid"), waitingMessage = j.optString("waitingMessage", ""),
        waitingRemainingMs = longOrNull("waitingRemainingMs"),
        result = nullable("result"), finishReason = nullable("finishReason"),
        canPremove = j.optBoolean("canPremove"), premoveTarget = pointOrNull(j.optJSONObject("premoveTarget")),
        soundCue = j.optString("soundCue", ""), soundToken = j.optInt("soundToken"),
      )
    }
  }
}
