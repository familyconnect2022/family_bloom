/** Avatar progress is intentionally separate from Moment. No secrets or URLs in UI. */
export type AvatarStage = "preparing" | "uploading" | "confirming" | "saving";
export const avatarStageLabel: Record<AvatarStage, string> = {
  preparing: "Đang chuẩn bị ảnh...",
  uploading: "Đang lưu ảnh đại diện...",
  confirming: "Đang hoàn tất ảnh đại diện...",
  saving: "Đang lưu ảnh vào hồ sơ...",
};
export function avatarFailureMessage(error: unknown): string {
  let candidate = error;
  for (let i = 0; i < 4; i += 1) {
    const e = candidate as { message?: unknown; cause?: unknown; code?: unknown } | null;
    const message = typeof e?.message === "string" ? e.message : "";
    const code = typeof e?.code === "string" ? e.code : "";
    if (/MOMENT_MEDIA_API_NOT_CONFIGURED/.test(message)) return "Hiện chưa thể lưu ảnh. Bạn có thể thử lại sau.";
    if (/MOMENT_MEDIA_API_HTTP_403/.test(message) || /permission-denied/i.test(message + code)) return "Chưa thể lưu ảnh này. Vui lòng thử lại sau.";
    if (/MOMENT_MEDIA_API_HTTP_(404|405)/.test(message)) return "Chức năng lưu ảnh đang tạm gián đoạn. Vui lòng thử lại sau.";
    if (/CLOUDINARY_UPLOAD_HTTP_403/.test(message)) return "Chưa thể lưu ảnh này. Vui lòng chọn ảnh khác hoặc thử lại.";
    if (/MOMENT_MEDIA_(API_NETWORK|BAD_SIGNATURE_RESPONSE|BAD_CONFIRMATION)/.test(message)) return "Chưa hoàn tất lưu ảnh. Vui lòng thử lại.";
    if (/CLOUDINARY_UPLOAD_NETWORK/.test(message)) return "Kết nối bị gián đoạn khi lưu ảnh. Vui lòng thử lại.";
    candidate = e?.cause;
  }
  return "Không lưu được avatar. Bạn có thể thử lại; thông tin hồ sơ cũ không bị mất.";
}
