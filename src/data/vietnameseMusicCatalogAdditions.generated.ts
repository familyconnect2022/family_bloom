import type { VietnameseMusicSeed } from "./vietnameseMusicCatalogV1";

/**
 * Generated/append-only additions discovered after the Phase 14K bootstrap catalog.
 *
 * IMPORTANT:
 * - Only VERIFIED_VIETNAMESE additions are eligible for automatic family playlists.
 * - REVIEW_QUEUE items are discovery candidates only. They are never treated as
 *   Vietnamese-language content until a reviewer or a trusted language check promotes them.
 * - NCT/Zing are discovery/editorial signals only; audio still comes from MusicProvider.
 *
 * Initial Phase 14L snapshot: public NCT homepage, 2026-09-30.
 */
export const VIETNAMESE_MUSIC_ADDITIONS_GENERATED_AT = "2026-09-30T07:48:00.000Z" as const;

export const VERIFIED_VIETNAMESE_MUSIC_ADDITIONS: VietnameseMusicSeed[] = [
  {
    id: "cho-chut-tinh-ha-say-hi-congb",
    title: "chờ chút...",
    artists: ['TINH HÀ "SAY HI"', "CONGB"],
    language: "vi",
    buckets: ["trending", "chill"],
    signals: [{ kind: "nct_home_top50_vi", rank: 5 }, { kind: "nct_home_trending", rank: 2 }],
  },
  {
    id: "theu-hoa-det-gam-tinh-ha-say-hi",
    title: "THÊU HOA DỆT GẤM",
    artists: ['TINH HÀ "SAY HI"', "buitruonglinh", "HURRYKNG", "JSOL", "CONGB"],
    language: "vi",
    buckets: ["trending", "happy"],
    signals: [{ kind: "nct_home_trending", rank: 3 }],
  },
  {
    id: "tre-gio-com-tinh-ha-say-hi",
    title: "TRỄ GIỜ CƠM",
    artists: ['TINH HÀ "SAY HI"', "Quang Hùng MasterD", "Xuân Định K.Y", "WEAN", "Sơn.K"],
    language: "vi",
    buckets: ["trending", "happy"],
    signals: [{ kind: "nct_home_trending", rank: 5 }],
  },
  {
    id: "luu-nien-jack-j97",
    title: "Lưu Niên",
    artists: ["Jack - J97"],
    language: "vi",
    buckets: ["trending", "calm"],
    signals: [{ kind: "nct_home_top50_vi", rank: 3 }],
  },
  {
    id: "nguoi-dung-jack-j97",
    title: "Người Dưng",
    artists: ["Jack - J97", "Ling Yin", "YangT"],
    language: "vi",
    buckets: ["trending", "calm"],
    signals: [{ kind: "nct_home_top50_vi", rank: 4 }],
  },
  {
    id: "co-khi-atvncg",
    title: "CÓ KHI",
    artists: ["Anh Trai Vượt Ngàn Chông Gai", "Thanh Duy", "THỎ (Da LAB)", "Will", "K.O", "Cheng", "Duy Khánh"],
    language: "vi",
    buckets: ["recent", "happy"],
    signals: [{ kind: "nct_home_single_new", rank: 3 }],
  },
];

export type VietnameseMusicReviewCandidate = {
  id: string;
  title: string;
  artists: string[];
  sourceKinds: string[];
  firstSeenAt: string;
  reason: "language_needs_review";
};

export const VIETNAMESE_MUSIC_REVIEW_QUEUE: VietnameseMusicReviewCandidate[] = [
  {
    id: "laviem-tinh-ha-say-hi",
    title: "LAVIEM",
    artists: ['TINH HÀ "SAY HI"', "Quang Hùng MasterD", "CAPTAIN BOY", "Pháp Kiều", "CoolKid", "Danny Chung"],
    sourceKinds: ["nct_home_top50_vi", "nct_home_trending"],
    firstSeenAt: "2026-09-30T07:48:00.000Z",
    reason: "language_needs_review",
  },
  {
    id: "yeu-tinh-ha-say-hi",
    title: "YEU",
    artists: ['TINH HÀ "SAY HI"', "Wren Evans", "Itsnk"],
    sourceKinds: ["nct_home_trending", "nct_home_single_new"],
    firstSeenAt: "2026-09-30T07:48:00.000Z",
    reason: "language_needs_review",
  },
  {
    id: "casting-tinh-ha-say-hi",
    title: "CASTING",
    artists: ['TINH HÀ "SAY HI"', "Quang Hùng MasterD"],
    sourceKinds: ["nct_home_single_new"],
    firstSeenAt: "2026-09-30T07:48:00.000Z",
    reason: "language_needs_review",
  },
];
