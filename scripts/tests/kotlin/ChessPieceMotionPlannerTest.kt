package expo.modules.familybloomoverlay

private fun verify(name: String, condition: Boolean) {
  check(condition) { "FAIL $name" }
  println("PASS $name")
}

fun main() {
  val opening = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  val whiteE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
  val blackE5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2"
  fun motion(a: String, b: String, from: String, to: String, turn: String = a.split(' ')[1],
             revBefore: Int = 1, revAfter: Int = 2, plyBefore: Int = 0, plyAfter: Int = 1) =
    ChessPieceMotionPlanner.plan(a,b,from,to,turn,revBefore,revAfter,plyBefore,plyAfter)
  verify("White e2-e4", motion(opening,whiteE4,"e2","e4") == listOf(ChessPieceMotionLeg("e2","e4",'P')))
  verify("Black e7-e5", motion(whiteE4,blackE5,"e7","e5") == listOf(ChessPieceMotionLeg("e7","e5",'p')))
  val capture0 = "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1"
  val capture1 = "4k3/8/8/3P4/8/8/8/4K3 b - - 0 1"
  verify("Capture uses server from/to, not wrong removed pawn",motion(capture0,capture1,"e4","d5").single().from=="e4")
  val castle0 = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"
  val castleK = "r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1"
  val castleQ = "r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1"
  verify("King-side castling animates king and rook",motion(castle0,castleK,"e1","g1").map { it.from to it.to }==listOf("e1" to "g1","h1" to "f1"))
  verify("Queen-side castling animates king and rook",motion(castle0,castleQ,"e1","c1").map { it.from to it.to }==listOf("e1" to "c1","a1" to "d1"))
  val enPassant0 = "4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"
  val enPassant1 = "4k3/8/3P4/8/8/8/8/4K3 b - - 0 1"
  verify("En passant animates pawn to actual destination",motion(enPassant0,enPassant1,"e5","d6").single().piece=='P')
  val promotion0 = "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"
  val promotion1 = "Q3k3/8/8/8/8/8/8/4K3 b - - 0 1"
  verify("Promotion animates pawn then reveals promoted piece",motion(promotion0,promotion1,"a7","a8").single().piece=='P')
  verify("Reject skipped revision: snap to true FEN",motion(opening,whiteE4,"e2","e4",revAfter=4).isEmpty())
  verify("Reject missed ply: snap to true FEN",motion(opening,whiteE4,"e2","e4",plyAfter=3).isEmpty())
  verify("Reject out-of-sync turn",motion(opening,whiteE4,"e2","e4",turn="b").isEmpty())
  verify("Reject incorrect source square",motion(opening,whiteE4,"a2","e4").isEmpty())
  verify("Reject destination whose FEN piece does not match",motion(opening,whiteE4,"e2","d4").isEmpty())
  verify("Reject same FEN clock/selection update",motion(opening,opening,"e2","e4").isEmpty())
  verify("Reject missing server metadata",ChessPieceMotionPlanner.plan(opening,whiteE4,null,null,"w",1,2,0,1).isEmpty())
  println("ChessPieceMotionPlanner: 14/14 PASS")
}
