/** Safe user-facing upload diagnostics. No IDs, access tokens or request bodies in UI. */
export function momentUploadErrorMessage(error: unknown, phase: "upload" | "publish"): string {
  const raw = error as { message?: unknown; code?: unknown; cause?: unknown } | null;
  const message = typeof raw?.message === "string" ? raw.message : String(error ?? "");
  const code = typeof raw?.code === "string" ? raw.code : "";
  const combined = `${code} ${message}`.toLowerCase();

  if (message === "PUBLISH_PREVIOUS_UNCONFIRMED") return "Có bài đăng trước chưa xác nhận. Hãy kiểm tra bài đăng chưa xác nhận trước khi tiếp tục.";
  if (message === "AUTH_CHANGED") return "Tài khoản đã thay đổi. Giữ nguyên dữ liệu để kiểm tra lại.";
  const apiStatus = message.match(/^MOMENT_MEDIA_API_HTTP_(\d{3})$/);
  if (apiStatus) {
    const status = Number(apiStatus[1]);
    if (status === 401) return "Vercel Media HTTP 401: phiên đăng nhập không được xác thực. Hãy đăng nhập lại.";
    if (status === 403) return "Vercel Media HTTP 403: tài khoản chưa được phép ký upload.";
    if (status === 404) return "Vercel Media HTTP 404: không tìm thấy API ký upload hoặc hồ sơ media.";
    if (status === 409) return "Vercel Media HTTP 409: hồ sơ media không còn ở trạng thái tải lên.";
    if (status >= 500) return `Vercel Media HTTP ${status}: lỗi cấu hình Firebase Admin/Cloudinary hoặc máy chủ. Xem Vercel Logs.`;
    return `Vercel Media HTTP ${status}: máy chủ từ chối yêu cầu ký upload.`;
  }
  const cloudStatus = message.match(/^CLOUDINARY_UPLOAD_HTTP_(\d{3})$/);
  if (cloudStatus) {
    const status = Number(cloudStatus[1]);
    if (status === 400 || status === 401)
      return `Cloudinary HTTP ${status}: tham số/chữ ký upload không hợp lệ. Kiểm tra Cloudinary ENV trên Vercel.`;
    if (status === 413) return "Cloudinary HTTP 413: ảnh/video vượt giới hạn dung lượng.";
    if (status === 429) return "Cloudinary HTTP 429: quá nhiều yêu cầu, hãy thử lại sau.";
    return `Cloudinary HTTP ${status}: tải media bị từ chối.`;
  }
  if (message === "MOMENT_MEDIA_API_NOT_CONFIGURED") return "Chưa cấu hình địa chỉ Vercel Media trong APK.";
  if (message === "MOMENT_MEDIA_AUTH_REQUIRED") return "Chưa đăng nhập Firebase để ký tải ảnh/video.";
  if (message === "MOMENT_MEDIA_API_NETWORK") return "Không kết nối được Vercel Media. Kiểm tra Internet hoặc URL Vercel.";
  if (message === "MOMENT_MEDIA_BAD_SIGNATURE_RESPONSE") return "Vercel Media trả thông tin ký upload không hợp lệ. Kiểm tra deploy API.";
  if (message === "CLOUDINARY_UPLOAD_NETWORK") return "Không kết nối được Cloudinary. Kiểm tra mạng rồi thử lại.";
  if (message === "MEDIA_CONFIG_MISSING") return "Thiếu cấu hình Cloudinary trên ứng dụng hoặc Vercel Media.";
  if (/permission.denied|insufficient.permissions|missing.or.insufficient.permissions/i.test(combined))
    return phase === "upload"
      ? "Firebase Firestore từ chối tạo/cập nhật media_assets (permission-denied). Kiểm tra Rules đã deploy."
      : "Firebase Firestore từ chối đăng Moment (permission-denied). Kiểm tra Rules và quyền gia đình.";
  if (/unavailable|deadline.exceeded|network.request.failed|network.error|timeout/i.test(combined))
    return "Firebase hoặc mạng đang gián đoạn. Ảnh đã hoàn tất sẽ được giữ để thử lại.";
  if (phase === "publish") return "Không ghi được Moment lên Firestore. Ảnh đã tải thành công vẫn được giữ để thử lại.";
  return "Tải Moment chưa thành công. Mở Vercel Logs và kiểm tra media_assets trong Firestore.";
}
