declare const process: { env: Record<string, string | undefined> };

import Constants from "expo-constants";

type CloudinaryExtra = {
  cloudName?: string;
  uploadPresets?: {
    image?: string;
    video?: string;
  };
};


export const DEFAULT_CHESS_SOCKET_URL = "https://render-chess-xiangqi.onrender.com";
// Before S1 the app used a different Render deployment. Never silently route
// games to that retired backend when an old local .env survived AUTO_UPDATE.
const LEGACY_CHESS_SOCKET_URL = "https://family-bloom-chess.onrender.com";
const normalizedPublicUrl = (raw: string | undefined): string => (raw ?? "").trim().replace(/\/+$/, "");
const rawChessEnvUrl = normalizedPublicUrl(process.env.EXPO_PUBLIC_CHESS_SOCKET_URL);
const rawChessExtraUrl = normalizedPublicUrl(((Constants.expoConfig?.extra ?? {}) as {chessSocketUrl?:string}).chessSocketUrl);
const chessEnvUrl = rawChessEnvUrl === LEGACY_CHESS_SOCKET_URL ? "" : rawChessEnvUrl;
const chessExtraUrl = rawChessExtraUrl === LEGACY_CHESS_SOCKET_URL ? "" : rawChessExtraUrl;
const legacyEnvWasIgnored = rawChessEnvUrl === LEGACY_CHESS_SOCKET_URL;

export const DEFAULT_MOMENT_MEDIA_API_URL = "https://vercelfamilybloommedia.vercel.app";
// AUTO UPDATE preserves .env, so a stale former Vercel Media deployment must
// not silently override the new verified deployment in a local APK build.
const LEGACY_MOMENT_MEDIA_API_URL = "https://familybloom-vercel-media.vercel.app";
const rawMediaEnvUrl = normalizedPublicUrl(process.env.EXPO_PUBLIC_MOMENT_MEDIA_API_URL);
const rawMediaExtraUrl = normalizedPublicUrl(((Constants.expoConfig?.extra ?? {}) as {momentMediaApiUrl?:string}).momentMediaApiUrl);
const mediaEnvUrl = rawMediaEnvUrl === LEGACY_MOMENT_MEDIA_API_URL ? "" : rawMediaEnvUrl;
const mediaExtraUrl = rawMediaExtraUrl === LEGACY_MOMENT_MEDIA_API_URL ? "" : rawMediaExtraUrl;
const legacyMediaEnvWasIgnored = rawMediaEnvUrl === LEGACY_MOMENT_MEDIA_API_URL;

type ExpoExtra = {
  googleWebClientId?: string;
  chessSocketUrl?: string;
  momentMediaApiUrl?: string;
  cloudinary?: CloudinaryExtra;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const cloudinary = extra.cloudinary ?? {};
const uploadPresets = cloudinary.uploadPresets ?? {};

export const ENV = {
  chessSocketUrl: chessEnvUrl || chessExtraUrl || DEFAULT_CHESS_SOCKET_URL,
  momentMediaApiUrl: mediaEnvUrl || mediaExtraUrl || DEFAULT_MOMENT_MEDIA_API_URL,
  googleWebClientId: extra.googleWebClientId ?? "",
  cloudinary: {
    cloudName: cloudinary.cloudName ?? "",
    uploadPresets: {
      image: uploadPresets.image ?? "",
      video: uploadPresets.video ?? "",
    },
  },
} as const;

// Public URLs only. Source labels explain .env/EAS overrides versus baked-in fallbacks.
export const SERVER_CONFIG_SOURCES = {
  render: chessEnvUrl ? "EXPO_PUBLIC_CHESS_SOCKET_URL" : legacyEnvWasIgnored ? "URL .env cũ đã bỏ qua; dùng Render S1" : chessExtraUrl ? "Expo extra" : "Dự phòng tích hợp",
  media: mediaEnvUrl ? "EXPO_PUBLIC_MOMENT_MEDIA_API_URL" : legacyMediaEnvWasIgnored ? "URL Vercel cũ đã bỏ qua; dùng Media độc lập" : mediaExtraUrl ? "Expo extra" : "Dự phòng tích hợp",
} as const;

export const assertPublicConfig = () => {
  const missing = [
    ["googleWebClientId", ENV.googleWebClientId],
    ["cloudinary.cloudName", ENV.cloudinary.cloudName],
    ["cloudinary.uploadPresets.image", ENV.cloudinary.uploadPresets.image],
    ["cloudinary.uploadPresets.video", ENV.cloudinary.uploadPresets.video],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing Expo public configuration: ${missing.join(", ")}`);
  }
};
