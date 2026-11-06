/**
 * A3R4 — Local-only Moment upload diagnostics.
 * Never persist or transmit provider error bodies, upload signatures, Firebase ID tokens,
 * media paths, public_ids or request payloads. Only a sanitized, bounded summary lives
 * in memory until this JS runtime exits. This is NOT a privileged network endpoint.
 */
export type MomentFailurePhase = "upload" | "publish";

export type CloudinaryFailureInfo = {
  status: number;
  providerMessage: string;
  providerHeader: string;
  cloudName: string;
  resourceType: "image" | "video";
  signed: boolean;
};

export type MomentUploadDiagnostic = {
  at: string;
  phase: MomentFailurePhase;
  service: "Cloudinary" | "Vercel Media" | "Firestore/Android";
  httpStatus: number | null;
  providerMessage: string;
  providerHeader: string;
  cloudName: string;
  resourceType: string;
  signed: boolean | null;
  shortCode: string;
};

// Redact before keeping strings in memory — NOT only at clipboard/export time.
// Allow simple human-readable provider messages while masking opaque identifiers.
export function safeProviderText(input: unknown): string {
  if (typeof input !== "string") return "";
  const cleaned = input.slice(0, 4000)
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[ĐÃ ẨN]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [ĐÃ ẨN]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[ĐÃ ẨN]")
    .replace(/(?:api[_ -]?key|api[_ -]?secret|access[_ -]?token|refresh[_ -]?token|id[_ -]?token|authorization|signature|private[_ -]?key|public[_ -]?id|asset[_ -]?id|folder)\s*[:=]\s*(?:["'][^"']*["']|[^\s,;&]+)/gi, "[THAM SỐ ĐÃ ẨN]")
    .replace(/https?:\/\/[^\s<>"']+/gi, "[URL ĐÃ ẨN]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL ĐÃ ẨN]")
    .replace(/(?:[A-Za-z]:\\|\/storage\/|\/data\/)[^\s,;]+/g, "[ĐƯỜNG DẪN ĐÃ ẨN]")
    .replace(/\b[A-Za-z0-9_-]{30,}\b/g, "[MÃ ĐÃ ẨN]")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 280);
}

function field(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string" && value.length <= 12000 && value.trimStart().startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown> : null;
    } catch { return null; }
  }
  return null;
}

function headerValue(headers: unknown, name: string): unknown {
  if (!headers || typeof headers !== "object") return null;
  const h = headers as { get?: (key: string) => unknown; [key: string]: unknown };
  try {
    if (typeof h.get === "function") return h.get(name);
    return Object.entries(h).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  } catch { return null; }
}

/** Extract ONLY Cloudinary's documented error.message and x-cld-error. */
export function extractCloudinaryFailure(error: unknown, options: {
  cloudName: string;
  resourceType: "image" | "video";
  signed: boolean;
}): CloudinaryFailureInfo | null {
  const response = (error as { response?: { status?: unknown; data?: unknown; headers?: unknown } } | null)?.response;
  const status = response?.status;
  if (typeof status !== "number" || !Number.isInteger(status) || status < 400 || status > 599) return null;
  const body = field(response?.data);
  const nestedError = field(body?.error);
  const providerMessage = safeProviderText(nestedError?.message ?? body?.message);
  const header = safeProviderText(headerValue(response?.headers, "x-cld-error"));
  return {
    status,
    providerMessage,
    providerHeader: header,
    cloudName: /^[a-z0-9_-]{1,64}$/i.test(options.cloudName) ? options.cloudName : "[KHÔNG HIỂN THỊ]",
    resourceType: options.resourceType,
    signed: options.signed,
  };
}

let latest: MomentUploadDiagnostic | null = null;

export function recordMomentUploadFailure(error: unknown, phase: MomentFailurePhase): void {
  const err = error as { message?: unknown; momentCloudinaryFailure?: CloudinaryFailureInfo } | null;
  const code = typeof err?.message === "string" ? err.message : "";
  const info = err?.momentCloudinaryFailure;
  const mediaStatus = code.match(/^MOMENT_MEDIA_API_HTTP_(\d{3})$/);
  const cloudStatus = code.match(/^CLOUDINARY_UPLOAD_HTTP_(\d{3})$/);
  const status = info?.status ?? (cloudStatus ? Number(cloudStatus[1]) : mediaStatus ? Number(mediaStatus[1]) : null);
  latest = {
    at: new Date().toISOString(),
    phase,
    service: info || cloudStatus ? "Cloudinary" : mediaStatus || code.startsWith("MOMENT_MEDIA_") ? "Vercel Media" : "Firestore/Android",
    httpStatus: status,
    providerMessage: info?.providerMessage || "Chưa có thông báo chi tiết trong phản hồi.",
    providerHeader: info?.providerHeader || "Không có header X-Cld-Error.",
    cloudName: info?.cloudName ?? "—",
    resourceType: info?.resourceType ?? "—",
    signed: typeof info?.signed === "boolean" ? info.signed : null,
    shortCode: /^(?:CLOUDINARY_UPLOAD_|MOMENT_MEDIA_|MEDIA_CONFIG_MISSING)/.test(code)
      ? code.slice(0, 80) : "OTHER_MOMENT_ERROR",
  };
}

export function getLatestMomentUploadDiagnostic(): MomentUploadDiagnostic | null {
  return latest ? { ...latest } : null;
}

export function clearMomentUploadDiagnostic(): void { latest = null; }

export function formatMomentUploadDiagnosticReport(d: MomentUploadDiagnostic): string {
  return [
    "FAMILY BLOOM · MOMENT UPLOAD (ĐÃ LỌC THÔNG TIN NHẠY CẢM)",
    `Thời gian: ${d.at}`,
    `Giai đoạn: ${d.phase}`,
    `Dịch vụ: ${d.service}`,
    `HTTP: ${d.httpStatus ?? "Không có"}`,
    `Mã lỗi: ${d.shortCode}`,
    `Thông báo Cloudinary: ${d.providerMessage}`,
    `X-Cld-Error: ${d.providerHeader}`,
    `Cloud: ${d.cloudName}`,
    `Loại media: ${d.resourceType}`,
    `Signed upload: ${d.signed === null ? "Không xác định" : d.signed ? "Có" : "Không"}`,
    "Không kèm token, chữ ký, public_id, ảnh hoặc nội dung request.",
  ].join("\n");
}
