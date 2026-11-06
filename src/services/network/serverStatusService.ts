/**
 * Developer-only, manual HTTP status probes. No Socket.IO connection, auth token,
 * media mutation, Firebase write, or background polling. Never call Cron with a secret.
 */
export type ProbeState = "healthy" | "limited" | "offline";
export type ServerProbeResult = {
  state: ProbeState;
  summary: string;
  detail: string;
  elapsedMs: number;
  checkedAt: string;
  httpStatuses: string;
  endpoint: string;
};

function cleanBase(raw: string): string {
  const text = raw.trim();
  if (!/^https:\/\//i.test(text)) throw new Error("Chỉ chấp nhận địa chỉ HTTPS của server.");
  let url: URL;
  try { url = new URL(text); } catch { throw new Error("URL không hợp lệ."); }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      (url.pathname !== "/" && url.pathname !== "") || url.search || url.hash) {
    throw new Error("Chỉ nhập URL gốc, ví dụ https://ten-server.onrender.com (không kèm /health). ");
  }
  return url.origin;
}

async function requestStatus(url: string, timeoutMs: number): Promise<{status: number; json: unknown}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    // Avoid leaking HTML/cloud infrastructure trace text into the report.
    let json: unknown = null;
    if (response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      try { json = await response.json(); } catch { /* invalid payload is a limited response */ }
    }
    return {status: response.status, json};
  } finally { clearTimeout(timer); }
}

function fail(e: unknown, started: number, endpoint: string): ServerProbeResult {
  const message = e instanceof Error ? e.message : String(e);
  const timeout = e instanceof Error && e.name === "AbortError";
  return {state: "offline", summary: timeout ? "Hết thời gian phản hồi" : "Không kết nối được",
    detail: timeout ? "Server có thể đang khởi động sau thời gian ngủ. Thử lại sau khi Render hoạt động." : message,
    elapsedMs: Date.now() - started, checkedAt: new Date().toISOString(), httpStatuses: "—", endpoint};
}

function result(state: ProbeState, summary: string, detail: string, started: number, codes: string, endpoint: string): ServerProbeResult {
  return {state, summary, detail, elapsedMs: Date.now()-started, checkedAt: new Date().toISOString(), httpStatuses: codes, endpoint};
}

export async function probeRenderChessXiangqi(input: string): Promise<ServerProbeResult> {
  const started = Date.now(); let endpoint = input.trim();
  try {
    endpoint = `${cleanBase(input)}/health`;
    // Render Free may cold start. This is only a manually triggered request.
    const {status, json} = await requestStatus(endpoint, 65_000);
    if (status !== 200) return result("offline", `HTTP ${status}`,
      status === 404 ? "Không tìm thấy /health. Kiểm tra đúng Render Chess/Xiangqi và phiên bản S1." : "Server trả HTTP lỗi. Kiểm tra Render Logs.", started, String(status), endpoint);
    if (!json || typeof json !== "object" || (json as {ok?:unknown}).ok !== true)
      return result("limited", "Đã kết nối nhưng health không đạt", "HTTP 200 nhưng JSON thiếu ok:true. Có thể đang trỏ nhầm server.", started, "200", endpoint);
    const protocol = (json as {chessSessionProtocol?:unknown}).chessSessionProtocol;
    return result("healthy", "Health OK", "Render phản hồi ok:true" + (typeof protocol === "string" ? ` · giao thức ${protocol}` : "") + ". Chưa kiểm thử đăng nhập Socket.IO hay ván cờ.", started, "200", endpoint);
  } catch(e) { return fail(e, started, endpoint); }
}

export async function probeVercelMedia(input: string): Promise<ServerProbeResult> {
  const started=Date.now(); let endpoint = input.trim();
  try {
    const base=cleanBase(input);
    endpoint=`${base}/api/media/sign`;
    // GET against POST-only route: verifies routing without any auth, asset or write.
    const sign=await requestStatus(endpoint, 15_000);
    if(sign.status!==405){
      const summary = sign.status===404 ? "Không tìm thấy API ký upload" : `API sign trả HTTP ${sign.status}`;
      return result(sign.status===404 || sign.status>=500 ? "offline":"limited",summary,
        "Dự kiến GET /api/media/sign trả 405 (API chỉ nhận POST). Kiểm tra Root Directory / API route / Deployment Protection.",started,String(sign.status),endpoint);
    }
    endpoint=`${base}/api/cron/cleanup`;
    // Never send CRON_SECRET. 401 confirms this endpoint is protected.
    const cron=await requestStatus(endpoint,15_000);
    if(cron.status!==401){
      return result("limited",cron.status===200 ? "CẢNH BÁO: Cron không được bảo vệ" : "Cron cần kiểm tra",
        cron.status===200 ? "GET Cron không có khóa nhưng trả 200. Kiểm tra CRON_SECRET ngay." : "Cron phải trả 401 khi không có khóa. Kiểm tra code và biến CRON_SECRET trên Vercel.",
        started, `sign 405 · cron ${cron.status}`,endpoint);
    }
    return result("healthy", "Các route có phản hồi đúng", "Sign trả 405; Cron trả 401 khi không có khóa. Chưa xác nhận Firebase Admin, Cloudinary hoặc POST upload/xóa.", started,"sign 405 · cron 401", `${base}/api/media/sign`);
  } catch(e) { return fail(e,started,endpoint); }
}
