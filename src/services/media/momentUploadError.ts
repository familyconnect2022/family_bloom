/** User-facing copy only. Provider diagnostics are recorded separately. */
export function momentUploadErrorMessage(error: unknown, phase: "upload" | "publish"): string {
  const raw = error as { message?: unknown; code?: unknown } | null;
  const message = typeof raw?.message === "string" ? raw.message : String(error ?? "");
  const combined = `${typeof raw?.code === "string" ? raw.code : ""} ${message}`.toLowerCase();
  if (message === "PUBLISH_PREVIOUS_UNCONFIRMED") return "Có bài đăng trước chưa xác nhận. Hãy kiểm tra trước khi tiếp tục.";
  if (message === "AUTH_CHANGED") return "Tài khoản đã thay đổi. Hãy đăng nhập lại để tiếp tục.";
  const api = message.match(/^MOMENT_MEDIA_API_HTTP_(\d{3})$/);
  const cloud = message.match(/^CLOUDINARY_UPLOAD_HTTP_(\d{3})$/);
  if (api?.[1] === '401' || message === 'MOMENT_MEDIA_AUTH_REQUIRED') return "Vui lòng đăng nhập lại để tiếp tục.";
  if (api?.[1] === '403' || /permission.denied|insufficient.permissions/.test(combined)) return phase === 'upload' ? "Bạn chưa có quyền tải ảnh hoặc video." : "Bạn chưa có quyền đăng kỷ niệm.";
  if (cloud?.[1] === '413') return "Ảnh hoặc video vượt quá dung lượng cho phép.";
  if (api?.[1] === '429' || cloud?.[1] === '429') return "Bạn đã thử nhiều lần. Vui lòng thử lại sau.";
  if (message === 'MOMENT_MEDIA_API_NOT_CONFIGURED' || message === 'MEDIA_CONFIG_MISSING') return "Tính năng tải ảnh và video hiện chưa sẵn sàng.";
  if (/unavailable|deadline.exceeded|network|timeout/i.test(combined)) return "Kết nối đang gián đoạn. Bạn thử lại nhé.";
  if (phase === 'publish') return "Chưa thể lưu kỷ niệm. Bạn thử lại nhé.";
  return "Chưa tải được ảnh hoặc video. Bạn thử lại nhé.";
}
