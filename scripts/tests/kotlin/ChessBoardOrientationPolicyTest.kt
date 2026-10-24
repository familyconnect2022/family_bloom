package expo.modules.familybloomoverlay

private fun assertThat(condition: Boolean, name: String) {
  if (!condition) error("FAIL: $name")
  println("PASS: $name")
}

fun main() {
  val white = (0..7).flatMap { r -> (0..7).map { c -> chessSquareAtScreenCell("w", r, c) } }
  val black = (0..7).flatMap { r -> (0..7).map { c -> chessSquareAtScreenCell("b", r, c) } }
  assertThat(white.size == 64 && white.toSet().size == 64, "64 unique white-facing squares")
  assertThat(black.size == 64 && black.toSet().size == 64, "64 unique black-facing squares")
  assertThat(white.first() == "a8" && white.last() == "h1", "white owns bottom rank 1")
  assertThat(black.first() == "h1" && black.last() == "a8", "black owns bottom rank 8")
  assertThat(white[56] == "a1" && black[56] == "h8", "white vs black bottom-left cell")
  assertThat(chessFacingForPlayer("b", "w") == "w", "verified white overrides stale black UI hint")
  assertThat(chessFacingForPlayer("w", "b") == "b", "verified black overrides stale white UI hint")
  assertThat(chessFacingForPlayer("b", null) == "b", "pre-color waiting snapshot may face black")
  assertThat(chessFacingForPlayer("w", null) == "w", "pre-color waiting snapshot defaults white")
  val applied = ChessSquareLayoutIdentity("oldGame", "b", 320)
  // Reproduce the actual bug: Mini parks new authoritative 'w' while the
  // physical 64 squares are still positioned for black; bind sees same JSON
  // but MUST compare the physical identity.
  assertThat(chessSquareLayoutIsStale(applied, "newGame", "w", 320), "new game white flip after Mini park")
  assertThat(chessSquareLayoutIsStale(applied, "oldGame", "w", 320), "same game color update while Mini")
  assertThat(chessSquareLayoutIsStale(applied, "oldGame", "b", 304), "board resize also requires 64 square relayout")
  assertThat(!chessSquareLayoutIsStale(applied, "oldGame", "b", 320), "unchanged turn/FEN does not relayout")
  assertThat(chessSquareLayoutIsStale(null, "initial", "w", 320), "cold start lays out squares")
  assertThat((0..7).flatMap { r -> (0..7).map { c -> chessSquareAtScreenCell("w",r,c) } }
    .toSet() == black.toSet(), "orientation alters view coordinates only, not logical FEN squares")
  println("CHESS NATIVE ORIENTATION POLICY 15/15 PASS")
}
