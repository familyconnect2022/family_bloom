import axios, { AxiosError } from "axios";
import { APP_CONFIG, getCloudinaryFolder, MediaFolderContext } from "../../constants/appPaths";
import { AppError } from "../../types/errors";
import { MediaFile, UploadResult } from "../../types";
import { momentMediaApi } from "./momentMediaApi";
import { extractCloudinaryFailure } from "./momentUploadDiagnostic";

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
    const isMoment = context.purpose === "moment";
    const isUserAvatar = context.purpose === "avatar" && context.entityType === "user" && context.familyId == null;
    // Moment and user avatar must never silently fall back to an unsigned preset.
    const isPersonAvatar = context.purpose === "avatar" && context.entityType === "person" && !!context.familyId;
    const signedManaged = isMoment || isUserAvatar || isPersonAvatar;
    if (signedManaged && !momentMediaApi.configured) throw new Error("MOMENT_MEDIA_API_NOT_CONFIGURED");
    if (signedManaged && !options?.assetId) throw new Error("MOMENT_MEDIA_ASSET_REQUIRED");
    // Both signed flows receive Cloudinary cloud details from the trusted Vercel signer.
    if (!signedManaged && (!APP_CONFIG.CLOUDINARY.cloudName || !preset))
      throw new AppError("MEDIA_CONFIG_MISSING", "MEDIA");
    const resourceType = file.type === "video" ? "video" : "image";
    let folder: string;
    try { folder = getCloudinaryFolder(context); }
    catch (error) {
      if (String(error).includes("FAMILY_CONTEXT_REQUIRED")) throw new AppError("FAMILY_CONTEXT_REQUIRED", "MEDIA");
      throw error;
    }

    // Signed, deterministic Moment uploads are enabled only when a verified Vercel API
    // is configured. The server records the exact publicId BEFORE the binary transfer,
    // so cron can clean late Cloudinary completions even if the phone is killed.
    // The legacy unsigned path remains only for other features. Avatar must be signed.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (options?.signal?.aborted) throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
      let selectedCloudName = APP_CONFIG.CLOUDINARY.cloudName;
      let usedSignedUpload = false;
      try {
        const signed = signedManaged && options?.assetId
          ? await momentMediaApi.signUpload(options.assetId, options.signal)
          : null;
        // A changed Cloudinary environment on Vercel must never be paired with the
        // legacy cloudName compiled into an older APK: the signature is cloud-specific.
        const cloudName = signed?.cloudName ?? APP_CONFIG.CLOUDINARY.cloudName;
        selectedCloudName = cloudName;
        usedSignedUpload = !!signed;
        const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        const formData = new FormData();
        formData.append("file", { uri: file.uri, type: file.mimeType, name: file.fileName } as unknown as Blob);
        if (signed) {
          formData.append("api_key", signed.apiKey);
          formData.append("timestamp", String(signed.timestamp));
          formData.append("signature", signed.signature);
          formData.append("folder", signed.folder);
          formData.append("public_id", signed.publicId);
          formData.append("overwrite", "false");
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
          secureUrl, publicId, cloudName: selectedCloudName,
          thumbnailUrl: file.type === "video" ? secureUrl.replace(/\.[^/.]+$/, ".jpg") : secureUrl,
          resourceType: file.type,
          // Ignore legacy deletion capabilities; cancellation is reconciled by the Gateway.
        };
      } catch (error) {
        if (options?.signal?.aborted || axios.isCancel(error) || (error as Error)?.name === "AbortError") {
          throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
        }
        // Auth or signer errors are deterministic, not transient provider failures.
        // Preserve a short origin/status code so the Moment UI can identify the failing service.
        if ((error as Error)?.message?.startsWith("MOMENT_MEDIA_") ||
            (error as Error)?.message === "MEDIA_CONFIG_MISSING") throw error;
        const status = (error as AxiosError).response?.status;
        const retryable = !status || status === 408 || status === 429 || status >= 500;
        if (!retryable || attempt === 3) {
          if (error instanceof AppError) throw error;
          if (status) {
            const safeFailure = extractCloudinaryFailure(error, {
              cloudName: typeof selectedCloudName === "string" ? selectedCloudName : "",
              resourceType,
              signed: usedSignedUpload,
            });
            // Never attach the Axios error, raw response or multipart FormData:
            // they can contain upload credentials, signed IDs and media paths.
            throw Object.assign(new Error(`CLOUDINARY_UPLOAD_HTTP_${status}`), {
              momentCloudinaryFailure: safeFailure ?? undefined,
            });
          }
          throw new Error("CLOUDINARY_UPLOAD_NETWORK");
        }
        await delay(700 * 2 ** (attempt - 1), options?.signal);
      }
    }
    throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA");
  },

};
