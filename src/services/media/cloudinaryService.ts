import axios, { AxiosError } from "axios";
import { APP_CONFIG, getCloudinaryFolder, MediaFolderContext } from "../../constants/appPaths";
import { AppError } from "../../types/errors";
import { MediaFile, UploadResult } from "../../types";
import { momentMediaApi } from "./momentMediaApi";

const delay = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) { reject(Object.assign(new Error("Moment đã hủy"), { name: "AbortError" })); return; }
  const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
  const abort = () => { clearTimeout(timer); reject(Object.assign(new Error("Moment đã hủy"), { name: "AbortError" })); };
  signal?.addEventListener("abort", abort, { once: true });
});

const getPreset = (type: MediaFile["type"]) =>
  type === "video" ? APP_CONFIG.CLOUDINARY.uploadPresets.video : APP_CONFIG.CLOUDINARY.uploadPresets.image;

export const cloudinaryService = {
  async upload(
    file: MediaFile,
    context: MediaFolderContext,
    onProgress?: (value: number) => void,
    options?: { signal?: AbortSignal; assetId?: string },
  ): Promise<UploadResult> {
    const preset = getPreset(file.type);
    if (!APP_CONFIG.CLOUDINARY.cloudName || !preset) throw new AppError("MEDIA_CONFIG_MISSING", "MEDIA");
    const resourceType = file.type === "video" ? "video" : "image";
    const uploadUrl = `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.cloudName}/${resourceType}/upload`;
    let folder: string;
    try { folder = getCloudinaryFolder(context); }
    catch (error) {
      if (String(error).includes("FAMILY_CONTEXT_REQUIRED")) throw new AppError("FAMILY_CONTEXT_REQUIRED", "MEDIA");
      throw error;
    }

    // Signed, deterministic Moment uploads are enabled only when a verified Vercel API
    // is configured. The server records the exact publicId BEFORE the binary transfer,
    // so cron can clean late Cloudinary completions even if the phone is killed.
    // The legacy unsigned path remains for other features / until Vercel is deployed.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (options?.signal?.aborted) throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
      try {
        const signed = context.purpose === "moment" && options?.assetId && momentMediaApi.configured
          ? await momentMediaApi.signUpload(options.assetId, options.signal)
          : null;
        const formData = new FormData();
        formData.append("file", { uri: file.uri, type: file.mimeType, name: file.fileName } as unknown as Blob);
        if (signed) {
          formData.append("api_key", signed.apiKey);
          formData.append("timestamp", String(signed.timestamp));
          formData.append("signature", signed.signature);
          formData.append("folder", signed.folder);
          formData.append("public_id", signed.publicId);
          formData.append("overwrite", "false");
          formData.append("return_delete_token", "true");
        } else {
          formData.append("upload_preset", preset);
          formData.append("folder", folder);
          // Unsigned uploads cannot request return_delete_token themselves.
          // For the legacy preset, Cloudinary must enable the option in its preset.
        }
        const response = await axios.post(uploadUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: file.type === "video" ? 120_000 : 60_000,
          signal: options?.signal,
          onUploadProgress: (event) => {
            if (event.total) onProgress?.(Math.min(100, Math.round(event.loaded * 100 / event.total)));
          },
        });
        const secureUrl = String(response.data?.secure_url ?? "");
        const publicId = String(response.data?.public_id ?? "");
        if (!secureUrl || !publicId) throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA", undefined, { cause: response.data });
        return {
          secureUrl, publicId,
          thumbnailUrl: file.type === "video" ? secureUrl.replace(/\.[^/.]+$/, ".jpg") : secureUrl,
          resourceType: file.type,
          deleteToken: typeof response.data?.delete_token === "string" ? response.data.delete_token : undefined,
        };
      } catch (error) {
        if (options?.signal?.aborted || axios.isCancel(error) || (error as Error)?.name === "AbortError") {
          throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
        }
        const status = (error as AxiosError).response?.status;
        const retryable = !status || status === 408 || status === 429 || status >= 500;
        if (!retryable || attempt === 3) {
          if (error instanceof AppError) throw error;
          if (status === 413) throw new AppError("MEDIA_FILE_TOO_LARGE", "MEDIA", undefined, { cause: error });
          throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA", undefined, { retryable, cause: error });
        }
        await delay(700 * 2 ** (attempt - 1), options?.signal);
      }
    }
    throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA");
  },

  async deleteWithToken(token: string): Promise<boolean> {
    if (!token || !APP_CONFIG.CLOUDINARY.cloudName) return false;
    try {
      const body = new FormData();
      body.append("token", token);
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.cloudName}/delete_by_token`,
        body, { timeout: 12_000 },
      );
      return response.data?.result === "ok";
    } catch { return false; }
  },
};
