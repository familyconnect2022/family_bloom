/** Optional Vercel Media API. Never forwards actual images/videos to Vercel. */
import { getAuth } from "@react-native-firebase/auth";

const baseUrl = (process.env.EXPO_PUBLIC_MOMENT_MEDIA_API_URL || "").trim().replace(/\/$/, "");

export const momentMediaApi = {
  configured: !!baseUrl && /^https:\/\//.test(baseUrl),

  async request(path: string, payload: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
    if (!this.configured) throw new Error("MOMENT_MEDIA_API_NOT_CONFIGURED");
    const user = getAuth().currentUser;
    if (!user) throw new Error("MOMENT_MEDIA_AUTH_REQUIRED");
    const token = await user.getIdToken();
    if (signal?.aborted) throw Object.assign(new Error("Moment đã hủy"), { name: "AbortError" });
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal,
    });
    if (!response.ok) throw new Error(`MOMENT_MEDIA_API_${response.status}`);
    return response.json();
  },

  async signUpload(assetId: string, signal?: AbortSignal): Promise<{
    cloudName: string; folder: string; publicId: string; apiKey: string;
    timestamp: number; signature: string; returnDeleteToken: boolean;
  }> {
    return this.request("/api/media/sign", { assetId }, signal);
  },

  async requestCleanup(assetIds: string[]): Promise<void> {
    if (!this.configured || !assetIds.length) return;
    await this.request("/api/media/cleanup", { assetIds: [...new Set(assetIds)].slice(0, 10) });
  },
};
