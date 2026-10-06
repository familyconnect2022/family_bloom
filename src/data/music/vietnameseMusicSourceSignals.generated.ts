import type { VietnameseMusicSignal } from "./vietnameseMusicCatalogV1";

/** Latest dynamic source signals. The refresh script rewrites this file only when a public source fingerprint changes. */
export const VIETNAMESE_MUSIC_SOURCE_SIGNALS_GENERATED_AT = "2026-09-30T07:48:00.000Z" as const;

export const VIETNAMESE_MUSIC_DYNAMIC_SIGNALS: Record<string, VietnameseMusicSignal[]> = {
  "tim-em-hngle-bao-anh": [{ kind: "nct_home_top50_vi", rank: 2 }],
  "cho-chut-tinh-ha-say-hi-congb": [{ kind: "nct_home_top50_vi", rank: 5 }, { kind: "nct_home_trending", rank: 2 }],
  "theu-hoa-det-gam-tinh-ha-say-hi": [{ kind: "nct_home_trending", rank: 3 }],
  "tre-gio-com-tinh-ha-say-hi": [{ kind: "nct_home_trending", rank: 5 }],
  "luu-nien-jack-j97": [{ kind: "nct_home_top50_vi", rank: 3 }],
  "nguoi-dung-jack-j97": [{ kind: "nct_home_top50_vi", rank: 4 }],
  "co-khi-atvncg": [{ kind: "nct_home_single_new", rank: 3 }],
  "mot-ke-dang-thuong-mot-nguoi-dang-trach": [{ kind: "nct_home_single_new", rank: 7 }],
};
