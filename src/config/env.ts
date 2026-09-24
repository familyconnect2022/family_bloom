import Constants from "expo-constants";

type CloudinaryExtra = {
  cloudName?: string;
  uploadPresets?: {
    image?: string;
    video?: string;
  };
};

type ExpoExtra = {
  googleWebClientId?: string;
  cloudinary?: CloudinaryExtra;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const cloudinary = extra.cloudinary ?? {};
const uploadPresets = cloudinary.uploadPresets ?? {};

export const ENV = {
  googleWebClientId: extra.googleWebClientId ?? "",
  cloudinary: {
    cloudName: cloudinary.cloudName ?? "",
    uploadPresets: {
      image: uploadPresets.image ?? "",
      video: uploadPresets.video ?? "",
    },
  },
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
