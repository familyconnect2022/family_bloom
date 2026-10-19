package expo.modules.familybloomoverlay

import org.json.JSONObject

/** Xiangqi Mini transport only. No Chess controller/board/piece state is shared. */
internal data class NativeXiangqiMiniState(
  val gameId: String,
  val revision: Int,
  val status: String,
  val turn: String,
  val lastPieceGlyph: String,
  val redRemainingMs: Long?,
  val blackRemainingMs: Long?,
  val serverNowMs: Long,
) {
  companion object {
    fun fromJson(payload: String): NativeXiangqiMiniState {
      val j = JSONObject(payload)
      fun millis(key: String): Long? = if (j.isNull(key) || !j.has(key)) null else j.optLong(key)
      return NativeXiangqiMiniState(
        gameId = j.getString("gameId"),
        revision = j.optInt("revision", 0),
        status = j.optString("status", "waiting"),
        turn = j.optString("turn", "red"),
        lastPieceGlyph = j.optString("lastPieceGlyph", "將").take(2),
        redRemainingMs = millis("redRemainingMs"),
        blackRemainingMs = millis("blackRemainingMs"),
        serverNowMs = j.optLong("serverNowMs"),
      )
    }
  }
}
