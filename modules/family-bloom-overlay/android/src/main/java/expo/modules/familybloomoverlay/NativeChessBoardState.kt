package expo.modules.familybloomoverlay

import org.json.JSONArray
import org.json.JSONObject

internal data class NativeChessBoardState(
  val gameId: String,
  val fen: String,
  val optimisticMoveId: String?,
  val motionFromFen: String?,
  val renderSequence: Int,
  val orientation: String,
  val status: String,
  val turn: String,
  val selectedSquare: String?,
  val legalTargets: Set<String>,
  val captureTargets: Set<String>,
  val promotionTargets: Set<String>,
  val lastFrom: String?,
  val lastTo: String?,
  val checkSquare: String?,
  val canMove: Boolean,
  val canPremove: Boolean,
  val queuedPremoveSquares: Set<String>,
  val premoveCount: Int,
  val promotionPending: Boolean,
  val soundCue: String,
  val soundToken: Int,
  val serverNowMs: Long,
  val movePending: Boolean,
  val readyPending: Boolean,
  val waitingForMe: Boolean,
  val whiteRemainingMs: Long?,
  val blackRemainingMs: Long?,
  val result: String?,
  val finishReason: String?,
  val drawOfferByUid: String?,
  val meColor: String?,
  val myUid: String?,
  val meLabel: String,
  val opponentLabel: String,
  val waitingMessage: String,
  val waitingRemainingMs: Long?,
  val revision: Int,
  val ply: Int,
) {
  companion object {
    fun fromJson(payloadJson: String): NativeChessBoardState {
      val json = JSONObject(payloadJson)
      return NativeChessBoardState(
        gameId = json.getString("gameId"),
        fen = json.getString("fen"),
        optimisticMoveId = json.optNullableString("optimisticMoveId"),
        motionFromFen = json.optNullableString("motionFromFen"),
        renderSequence = json.optInt("renderSequence", 0),
        orientation = json.optString("orientation", "w").let { if (it == "b") "b" else "w" },
        status = json.optString("status", "waiting"),
        turn = json.optString("turn", "w").let { if (it == "b") "b" else "w" },
        selectedSquare = json.optNullableString("selectedSquare"),
        legalTargets = json.optStringSet("legalTargets"),
        captureTargets = json.optStringSet("captureTargets"),
        promotionTargets = json.optStringSet("promotionTargets"),
        lastFrom = json.optNullableString("lastFrom"),
        lastTo = json.optNullableString("lastTo"),
        checkSquare = json.optNullableString("checkSquare"),
        canMove = json.optBoolean("canMove", false),
        canPremove = json.optBoolean("canPremove", false),
        queuedPremoveSquares = json.optStringSet("queuedPremoveSquares"),
        premoveCount = json.optInt("premoveCount", 0),
        promotionPending = json.optBoolean("promotionPending", false),
        soundCue = json.optString("soundCue", ""),
        soundToken = json.optInt("soundToken", 0),
        serverNowMs = json.optLong("serverNowMs", 0L),
        movePending = json.optBoolean("movePending", false),
        readyPending = json.optBoolean("readyPending", false),
        waitingForMe = json.optBoolean("waitingForMe", false),
        whiteRemainingMs = json.optNullableLong("whiteRemainingMs"),
        blackRemainingMs = json.optNullableLong("blackRemainingMs"),
        result = json.optNullableString("result"),
        finishReason = json.optNullableString("finishReason"),
        drawOfferByUid = json.optNullableString("drawOfferByUid"),
        meColor = json.optNullableString("meColor"),
        myUid = json.optNullableString("myUid"),
        meLabel = json.optString("meLabel", "Bạn"),
        opponentLabel = json.optString("opponentLabel", "Đối thủ"),
        waitingMessage = json.optString("waitingMessage", ""),
        waitingRemainingMs = json.optNullableLong("waitingRemainingMs"),
        revision = json.optInt("revision", 0),
        ply = json.optInt("ply", 0),
      )
    }
  }
}

private fun JSONObject.optNullableString(key: String): String? {
  if (!has(key) || isNull(key)) return null
  return optString(key).takeIf { it.isNotBlank() && it != "null" }
}

private fun JSONObject.optNullableLong(key: String): Long? {
  if (!has(key) || isNull(key)) return null
  return when (val value = opt(key)) {
    is Number -> value.toLong()
    is String -> value.toDoubleOrNull()?.toLong()
    else -> null
  }
}

private fun JSONObject.optStringSet(key: String): Set<String> {
  val array = optJSONArray(key) ?: JSONArray()
  val result = LinkedHashSet<String>()
  for (index in 0 until array.length()) {
    val value = array.optString(index)
    if (value.isNotBlank()) result += value
  }
  return result
}
