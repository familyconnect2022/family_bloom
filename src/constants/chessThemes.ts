import type { ChessPieceThemeId } from "../types/chess";

export const DEFAULT_CHESS_PIECE_THEME: ChessPieceThemeId = "classic";

const CLASSIC_SOURCES: Record<string, number> = {
  wp: require("../../assets/images/chess/themes/classic/wp.png"),
  wn: require("../../assets/images/chess/themes/classic/wn.png"),
  wb: require("../../assets/images/chess/themes/classic/wb.png"),
  wr: require("../../assets/images/chess/themes/classic/wr.png"),
  wq: require("../../assets/images/chess/themes/classic/wq.png"),
  wk: require("../../assets/images/chess/themes/classic/wk.png"),
  bp: require("../../assets/images/chess/themes/classic/bp.png"),
  bn: require("../../assets/images/chess/themes/classic/bn.png"),
  bb: require("../../assets/images/chess/themes/classic/bb.png"),
  br: require("../../assets/images/chess/themes/classic/br.png"),
  bq: require("../../assets/images/chess/themes/classic/bq.png"),
  bk: require("../../assets/images/chess/themes/classic/bk.png"),
};

const DUOTONE_SOURCES: Record<string, number> = {
  wp: require("../../assets/images/chess/themes/duotone/wp.png"),
  wn: require("../../assets/images/chess/themes/duotone/wn.png"),
  wb: require("../../assets/images/chess/themes/duotone/wb.png"),
  wr: require("../../assets/images/chess/themes/duotone/wr.png"),
  wq: require("../../assets/images/chess/themes/duotone/wq.png"),
  wk: require("../../assets/images/chess/themes/duotone/wk.png"),
  bp: require("../../assets/images/chess/themes/duotone/bp.png"),
  bn: require("../../assets/images/chess/themes/duotone/bn.png"),
  bb: require("../../assets/images/chess/themes/duotone/bb.png"),
  br: require("../../assets/images/chess/themes/duotone/br.png"),
  bq: require("../../assets/images/chess/themes/duotone/bq.png"),
  bk: require("../../assets/images/chess/themes/duotone/bk.png"),
};

const BLOOM_SOURCES: Record<string, number> = {
  wp: require("../../assets/images/chess/themes/bloom/wp.png"),
  wn: require("../../assets/images/chess/themes/bloom/wn.png"),
  wb: require("../../assets/images/chess/themes/bloom/wb.png"),
  wr: require("../../assets/images/chess/themes/bloom/wr.png"),
  wq: require("../../assets/images/chess/themes/bloom/wq.png"),
  wk: require("../../assets/images/chess/themes/bloom/wk.png"),
  bp: require("../../assets/images/chess/themes/bloom/bp.png"),
  bn: require("../../assets/images/chess/themes/bloom/bn.png"),
  bb: require("../../assets/images/chess/themes/bloom/bb.png"),
  br: require("../../assets/images/chess/themes/bloom/br.png"),
  bq: require("../../assets/images/chess/themes/bloom/bq.png"),
  bk: require("../../assets/images/chess/themes/bloom/bk.png"),
};

export const CHESS_PIECE_THEME_SOURCES: Record<ChessPieceThemeId, Record<string, number>> = {
  classic: CLASSIC_SOURCES,
  duotone: DUOTONE_SOURCES,
  bloom: BLOOM_SOURCES,
};

export const CHESS_PIECE_THEME_OPTIONS: {
  id: ChessPieceThemeId;
  title: string;
  subtitle: string;
  previewPiece: number;
}[] = [
  {
    id: "classic",
    title: "Ngà & đen",
    subtitle: "Cổ điển, rõ nét, dễ nhìn.",
    previewPiece: CLASSIC_SOURCES.wn,
  },
  {
    id: "duotone",
    title: "Điêu khắc",
    subtitle: "Sắc sảo, hiện đại, tương phản tốt.",
    previewPiece: DUOTONE_SOURCES.wn,
  },
  {
    id: "bloom",
    title: "Bloom hồng",
    subtitle: "Mềm mại, sang và hợp tông app.",
    previewPiece: BLOOM_SOURCES.wn,
  },
];
