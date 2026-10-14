import axios, { AxiosError } from "axios";
import { APP_CONFIG, getCloudinaryFolder, MediaFolderContext } from "../../constants/appPaths";
import { AppError } from "../../types/errors";
import { MediaFile, UploadResult } from "../../types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getPreset = (type: MediaFile["type"]) =>
  type === "video"
    ? APP_CONFIG.CLOUDINARY.uploadPresets.video
    : APP_CONFIG.CLOUDINARY.uploadPresets.image;

export const cloudinaryService = {
  async upload(
    file: MediaFile,
    context: MediaFolderContext,
    onProgress?: (value: number) => void,
  ): Promise<UploadResult> {
    const preset = getPreset(file.type);
    if (!APP_CONFIG.CLOUDINARY.cloudName || !preset) {
      throw new AppError("MEDIA_CONFIG_MISSING", "MEDIA");
    }

    const resourceType = file.type === "video" ? "video" : "image";
    const uploadUrl = `https://api.cloudinary.com/v1_1/${APP_CONFIG.CLOUDINARY.cloudName}/${resourceType}/upload`;

    let folder: string;
    try {
      folder = getCloudinaryFolder(context);
    } catch (error) {
      if (String(error).includes("FAMILY_CONTEXT_REQUIRED")) {
        throw new AppError("FAMILY_CONTEXT_REQUIRED", "MEDIA");
      }
      throw error;
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const formData = new FormData();
        formData.append(
          "file",
          { uri: file.uri, type: file.mimeType, name: file.fileName } as unknown as Blob,
        );
        formData.append("upload_preset", preset);
        formData.append("folder", folder);

        const response = await axios.post(uploadUrl, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          // Video uploads can legitimately take longer; keeping concurrency bounded
          // in useMediaUpload prevents this longer timeout from multiplying memory pressure.
          timeout: file.type === "video" ? 120_000 : 60_000,
          onUploadProgress: (event) => {
            if (event.total) {
              onProgress?.(Math.min(100, Math.round((event.loaded * 100) / event.total)));
            }
          },
        });

        const secureUrl = String(response.data?.secure_url ?? "");
        const publicId = String(response.data?.public_id ?? "");
        if (!secureUrl || !publicId) {
          throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA", undefined, { cause: response.data });
        }

        return {
          secureUrl,
          publicId,
          thumbnailUrl:
            file.type === "video"
              ? secureUrl.replace(/\.[^/.]+$/, ".jpg")
              : secureUrl,
          resourceType: file.type,
        };
      } catch (error) {
        const status = (error as AxiosError).response?.status;
        const retryable = !status || status === 408 || status === 429 || status >= 500;

        if (!retryable || attempt === 3) {
          if (error instanceof AppError) throw error;
          if (status === 413) {
            throw new AppError("MEDIA_FILE_TOO_LARGE", "MEDIA", undefined, { cause: error });
          }
          throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA", undefined, {
            retryable,
            cause: error,
          });
        }

        await sleep(700 * 2 ** (attempt - 1));
      }
    }

    throw new AppError("MEDIA_UPLOAD_FAILED", "MEDIA");
  },
};
