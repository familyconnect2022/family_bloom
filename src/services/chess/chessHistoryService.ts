import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "@react-native-firebase/firestore";
import type { ChessFinishReason, ChessResult, ChessTimeControl } from "../../types/chess";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

export type ChessHistoryItem = {
  id: string;
  familyId: string;
  whiteUid: string;
  blackUid: string;
  playerUids: string[];
  result: ChessResult;
  finishReason: ChessFinishReason;
  timeControl: ChessTimeControl;
  fen: string;
  pgn: string;
  startedAt: string | null;
  endedAt: string | null;
  testBotUid?: string | null;
  isTestGame?: boolean;
};

export type ChessHistoryPage = {
  items: ChessHistoryItem[];
  cursor: unknown | null;
  hasMore: boolean;
};

export const chessHistoryService = {
  async list(familyId: string, uid: string, cursor?: unknown | null): Promise<ChessHistoryPage> {
    const games = collection(getFirestore(), FIRESTORE_PATHS.familyChessGames(familyId));
    const gamesQuery = cursor
      ? query(
        games,
        where("playerUids", "array-contains", uid),
        where("status", "==", "finished"),
        orderBy("endedAt", "desc"),
        startAfter(cursor as never),
        limit(20),
      )
      : query(
        games,
        where("playerUids", "array-contains", uid),
        where("status", "==", "finished"),
        orderBy("endedAt", "desc"),
        limit(20),
      );

    const snap = await getDocs(gamesQuery);
    return {
      items: snap.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...(docSnapshot.data() as Omit<ChessHistoryItem, "id">),
      })),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.size === 20,
    };
  },
};
