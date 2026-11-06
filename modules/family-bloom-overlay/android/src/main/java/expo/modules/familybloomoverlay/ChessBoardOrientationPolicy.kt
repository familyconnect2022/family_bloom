package expo.modules.familybloomoverlay

/** Actual retained 64-cell layout, distinct from the latest authoritative snapshot.
 * Mini/IDLE may update the snapshot without ever moving the cells. */
internal data class ChessSquareLayoutIdentity(
  val gameId: String,
  val orientation: String,
  val boardSize: Int,
)

/** The authenticated player's side (meColor) must win over a stale visual hint.
 * Before colors are revealed, a provisional white-facing board is harmless. */
internal fun chessFacingForPlayer(orientation: String, meColor: String?): String =
  when (meColor) {
    "w", "b" -> meColor
    else -> if (orientation == "b") "b" else "w"
  }

internal fun chessSquareLayoutIsStale(
  applied: ChessSquareLayoutIdentity?,
  gameId: String,
  orientation: String,
  boardSize: Int,
): Boolean = applied != ChessSquareLayoutIdentity(gameId, orientation, boardSize)

/** Pure mapping used by the renderer, unit tested for both colors. */
internal fun chessSquareAtScreenCell(orientation: String, row: Int, column: Int): String {
  require(row in 0..7 && column in 0..7)
  val black = orientation == "b"
  val file = if (black) 'h' - column else 'a' + column
  val rank = if (black) 1 + row else 8 - row
  return "$file$rank"
}
