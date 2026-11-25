/** Optional Vercel Media API. Never forwards actual images/videos to Vercel. */
import { getAuth } from "@react-native-firebase/auth";
import { ENV } from "../../config/env";

const baseUrl = ENV.momentMediaApiUrl.trim().replace(/\/+$/, "");

export const momentMediaApi = {
  configured: !!baseUrl && /^https:\/\//.test(baseUrl),

  async request(path: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
    if (!this.configured) throw new Error("MOMENT_MEDIA_API_NOT_CONFIGURED");
    const user = getAuth().currentUser;
    if (!user) throw new Error("MOMENT_MEDIA_AUTH_REQUIRED");
    const token = await user.getIdToken();
    if (signal?.aborted) throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (error) {
      if (signal?.aborted || (error as Error)?.name === "AbortError") throw error;
      throw new Error("MOMENT_MEDIA_API_NETWORK");
    }
    // Never surface raw server output, Firebase IDs or HTML pages in the app.
    if (!response.ok) throw new Error(`MOMENT_MEDIA_API_HTTP_${response.status}`);
    try { return await response.json(); }
    catch { throw new Error("MOMENT_MEDIA_BAD_SIGNATURE_RESPONSE"); }
  },

  async signUpload(assetId: string, signal?: AbortSignal): Promise<{
    cloudName: string; folder: string; publicId: string; apiKey: string;
    timestamp: number; signature: string; returnDeleteToken: false;
  }> {
    const signed = await this.request("/api/media/sign", { assetId, cleanupMode: "review-v1" }, signal);
    if (!signed || typeof signed.cloudName !== "string" || !/^[\w-]+$/.test(signed.cloudName) ||
        typeof signed.apiKey !== "string" || typeof signed.folder !== "string" ||
        typeof signed.publicId !== "string" || !/^[A-Za-z0-9_-]{1,180}$/.test(signed.publicId) ||
        signed.returnDeleteToken !== false ||
        typeof signed.signature !== "string" || !/^[a-f0-9]{40}$/i.test(signed.signature) ||
        !Number.isSafeInteger(Number(signed.timestamp)) || signed.timestamp < 1) {
      throw new Error("MOMENT_MEDIA_BAD_SIGNATURE_RESPONSE");
    }
    return signed;
  },

  /** Server reads Cloudinary and verifies exact signed asset identity before Moment publication. */
  async confirmUpload(assetId: string): Promise<{
    secureUrl: string; publicId: string; resourceType: "image" | "video";
  }> {
    const result = await this.request("/api/media/confirm", { assetId });
    if (!result || result.verified !== true ||
        typeof result.publicId !== "string" || !result.publicId ||
        typeof result.secureUrl !== "string" || !result.secureUrl.startsWith("https://res.cloudinary.com/") ||
        (result.resourceType !== "image" && result.resourceType !== "video")) {
      throw new Error("MOMENT_MEDIA_BAD_CONFIRMATION");
    }
    return result;
  },

  async requestCleanup(assetIds: string[]): Promise<void> {
    if (!this.configured || !assetIds.length) return;
    const uniqueIds = [...new Set(assetIds)];
    for (let i = 0; i < uniqueIds.length; i += 10) {
      const result = await this.request("/api/media/cleanup", { assetIds: uniqueIds.slice(i, i + 10) });
      // A denied cleanup must not be misreported as completed; backend will never
      // erase attached media just because an APK requested it.
      if (!Array.isArray(result?.results)) throw new Error("MOMENT_MEDIA_BAD_CLEANUP_RESPONSE");
    }
  },
};
