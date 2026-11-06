package expo.modules.familybloomoverlay

import kotlin.math.abs

/** No Android or Socket dependencies: deterministic source/target validation.
 * Server/chess.js owns legality. This planner ONLY decides if a visually safe
 * one-ply animation exists; everything else snaps to authoritative FEN. */
internal data class ChessPieceMotionLeg(val from: String, val to: String, val piece: Char)

internal object ChessPieceMotionPlanner {
  fun plan(
    beforeFen: String, afterFen: String, lastFrom: String?, lastTo: String?,
    previousTurn: String, oldRevision: Int, newRevision: Int, oldPly: Int, newPly: Int,
  ): List<ChessPieceMotionLeg> {
    if (newRevision != oldRevision + 1 || newPly != oldPly + 1 || beforeFen == afterFen) return emptyList()
    val from = lastFrom ?: return emptyList()
    val to = lastTo ?: return emptyList()
    if (!SQUARE.matches(from) || !SQUARE.matches(to) || from == to) return emptyList()
    val before = parseFen(beforeFen)
    val after = parseFen(afterFen)
    if (before.size < 2 || after.size < 2) return emptyList()
    val piece = before[from] ?: return emptyList()
    val landed = after[to] ?: return emptyList()
    val movingWhite = beforeFen.split(' ').getOrNull(1) == "w"
    val nextTurn = afterFen.split(' ').getOrNull(1)
    if (previousTurn != if (movingWhite) "w" else "b") return emptyList()
    if (nextTurn != if (movingWhite) "b" else "w") return emptyList()
    if (piece.isUpperCase() != movingWhite || after[from] == piece) return emptyList()

    val promotion = piece.lowercaseChar() == 'p' && landed.isUpperCase() == movingWhite &&
      to.last() == (if (movingWhite) '8' else '1')
    if (landed != piece && !promotion) return emptyList()
    val legs = mutableListOf(ChessPieceMotionLeg(from, to, piece))
    if (piece.lowercaseChar() == 'k' && abs(from[0].code - to[0].code) == 2 && from[1] == to[1]) {
      val kingSide = to[0] == 'g'
      if (!kingSide && to[0] != 'c') return emptyList()
      val rookFrom = "${if (kingSide) 'h' else 'a'}${from[1]}"
      val rookTo = "${if (kingSide) 'f' else 'd'}${from[1]}"
      val rook = if (movingWhite) 'R' else 'r'
      if (before[rookFrom] != rook || after[rookTo] != rook) return emptyList()
      legs += ChessPieceMotionLeg(rookFrom, rookTo, rook)
    }
    return legs
  }

  private val SQUARE = Regex("^[a-h][1-8]$")

  private fun parseFen(fen: String): Map<String, Char> {
    val rows = fen.substringBefore(' ').split('/')
    if (rows.size != 8) return emptyMap()
    val result = LinkedHashMap<String, Char>()
    for ((rowIndex, row) in rows.withIndex()) {
      var file = 0
      for (token in row) {
        if (token in '1'..'8') file += token.digitToInt()
        else if (token.isLetter() && file in 0..7) {
          result["${'a' + file}${8 - rowIndex}"] = token
          file++
        } else return emptyMap()
      }
      if (file != 8) return emptyMap()
    }
    return result
  }
}
