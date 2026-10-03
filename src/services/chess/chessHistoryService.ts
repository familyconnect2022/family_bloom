import firestore from "@react-native-firebase/firestore";
import type { ChessFinishReason, ChessResult, ChessTimeControl } from "../../types/chess";

export type ChessHistoryItem = {
  id: string; familyId: string; whiteUid: string; blackUid: string; playerUids: string[];
  result: ChessResult; finishReason: ChessFinishReason; timeControl: ChessTimeControl;
  fen: string; pgn: string; startedAt: string | null; endedAt: string | null; testBotUid?: string | null; isTestGame?: boolean;
};

export type ChessHistoryPage = { items: ChessHistoryItem[]; cursor: unknown | null; hasMore: boolean };

export const chessHistoryService = {
  async list(familyId: string, uid: string, cursor?: unknown | null): Promise<ChessHistoryPage> {
    let query = firestore().collection("families").doc(familyId).collection("chessGames")
      .where("playerUids", "array-contains", uid).where("status", "==", "finished")
      .orderBy("endedAt", "desc").limit(20);
    if (cursor) query = query.startAfter(cursor as never);
    const snap = await query.get();
    return {
      items: snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ChessHistoryItem, "id">) })),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.size === 20,
    };
  },
};
