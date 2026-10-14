import { ToastType } from "@/components/ui/BloomToast";
import { AppError, AppErrorCode, ErrorCategory } from "../../types/errors";
import axios from "axios";

export interface FriendlyError { title: string; message: string; type: ToastType; }

const CATALOG: Record<AppErrorCode, FriendlyError> = {
  VALIDATION_REQUIRED: { title: "Thiếu thông tin ✍️", message: "Vui lòng điền đầy đủ các trường thông tin bắt buộc.", type: "warning" },
  VALIDATION_EMAIL: { title: "Email không hợp lệ ✉️", message: "Định dạng email chưa đúng.", type: "warning" },
  VALIDATION_PASSWORD_SHORT: { title: "Mật khẩu quá ngắn 🛡️", message: "Mật khẩu phải có tối thiểu 6 ký tự.", type: "warning" },
  VALIDATION_PASSWORD_MISMATCH: { title: "Mật khẩu không khớp 🔑", message: "Mật khẩu xác nhận không trùng khớp.", type: "warning" },
  GOOGLE_CLIENT_ID_MISSING: { title: "Bloom chưa mở được lối vào Google 🌿", message: "Phần đăng nhập này đang được chuẩn bị. Bạn thử cách đăng nhập khác trước nhé.", type: "error" },
  AUTH_GOOGLE_CANCELLED: { title: "Đã hủy đăng nhập 🌿", message: "Bạn vừa hủy thao tác đăng nhập bằng Google.", type: "info" },
  AUTH_GOOGLE_IN_PROGRESS: { title: "Bloom đang mở cửa… ⏳", message: "Chờ thêm một chút để Bloom đưa bạn vào nhà nhé.", type: "info" },
  AUTH_GOOGLE_PLAY_SERVICES: { title: "Cần cập nhật Google Play 📲", message: "Thiết bị cần Google Play Services để dùng tính năng này.", type: "error" },
  AUTH_GOOGLE_FAILED: { title: "Đăng nhập Google thất bại 🌐", message: "Không thể đăng nhập bằng Google. Bạn thử lại nhé.", type: "error" },
  AUTH_INVALID_PHONE: { title: "Số điện thoại chưa đúng 📞", message: "Định dạng số điện thoại không hợp lệ.", type: "warning" },
  AUTH_INVALID_CODE: { title: "Mã OTP chưa chính xác 🔐", message: "Mã xác thực bạn nhập không đúng.", type: "warning" },
  AUTH_CODE_EXPIRED: { title: "Mã OTP đã hết hạn ⏳", message: "Bạn hãy yêu cầu một mã mới.", type: "info" },
  AUTH_TOO_MANY_REQUESTS: { title: "Gửi SMS quá nhiều lần 🚫", message: "Vui lòng thử lại sau ít phút.", type: "error" },
  PROFILE_NOT_FOUND: { title: "Chưa thấy hồ sơ này", message: "Bloom chưa tìm thấy thông tin của người này. Bạn thử mở lại nhé.", type: "error" },
  PROFILE_SAVE_FAILED: { title: "Không thể lưu hồ sơ", message: "Không thể lưu thông tin hồ sơ. Bạn thử lại nhé.", type: "error" },
  MEDIA_CONFIG_MISSING: { title: "Chưa thể gửi ảnh lúc này 🌿", message: "Phần lưu ảnh và video đang cần được chuẩn bị thêm. Bạn thử lại sau nhé.", type: "error" },
  MEDIA_UPLOAD_FAILED: { title: "Ảnh chưa kịp lên Bloom ☁️", message: "Có chút gián đoạn khi gửi ảnh hoặc video. Bạn thử lại nhé.", type: "error" },
  MEDIA_FILE_TOO_LARGE: { title: "Tệp này hơi lớn 📸", message: "Bạn chọn một ảnh hoặc video nhẹ hơn một chút nhé.", type: "error" },
  MEDIA_ATTACH_FAILED: { title: "Ảnh chưa ghép vào kỷ niệm", message: "Bloom đã nhận tệp nhưng chưa ghép được vào nội dung này. Bạn thử lại nhé.", type: "error" },
  MEDIA_CLEANUP_PENDING: { title: "Bloom đang thu xếp lại 🌿", message: "Những tệp chưa dùng sẽ được Bloom dọn gọn sau một chút.", type: "info" },
  FAMILY_CONTEXT_REQUIRED: { title: "Chọn một mái nhà trước nhé 🏡", message: "Ảnh hoặc video cần được gửi vào một gia đình cụ thể.", type: "error" },
  FAMILY_ID_REQUIRED: { title: "Bloom cần mã nhà 🏡", message: "Nhập mã mà người thân đã gửi cho bạn nhé.", type: "warning" },
  FAMILY_NOT_FOUND: { title: "Chưa tìm thấy mái nhà này 🔎", message: "Mã nhà có thể đã đổi. Bạn kiểm tra lại với người thân nhé.", type: "error" },
  FAMILY_CODE_GENERATION_FAILED: { title: "Chưa tạo được mã nhà", message: "Bloom chưa tạo được mã gia đình duy nhất. Bạn thử lại nhé.", type: "error" },
  ALREADY_FAMILY_MEMBER: { title: "Bạn đã ở trong nhà 🌸", message: "Tài khoản này đã là thành viên của gia đình.", type: "info" },
  JOIN_REQUEST_PENDING: { title: "Lời xin vào nhà đã được gửi ⏳", message: "Người quản lý gia đình sẽ thấy lời nhắn của bạn và trả lời sớm nhé.", type: "info" },
  JOIN_REQUEST_NOT_PENDING: { title: "Yêu cầu đã được xử lý", message: "Yêu cầu này không còn ở trạng thái chờ duyệt.", type: "info" },
  USER_PROFILE_NOT_FOUND: { title: "Không tìm thấy hồ sơ", message: "Không tìm thấy hồ sơ người dùng.", type: "error" },
  FAMILY_MEMBERSHIP_REQUIRED: { title: "Chưa vào gia đình", message: "Bạn cần là thành viên của gia đình trước.", type: "warning" },
  EVENT_INVALID_DATE: { title: "Ngày không hợp lệ", message: "Bạn kiểm tra lại ngày của sự kiện nhé.", type: "warning" },
  EVENT_DATE_IN_PAST: { title: "Ngày này đã qua rồi 🌿", message: "Sự kiện một lần phải từ hôm nay trở đi. Với sinh nhật/kỷ niệm, chọn “Mỗi năm” để lưu ngày gốc trong quá khứ.", type: "info" },
  EVENT_TIME_IN_PAST: { title: "Giờ này đã qua rồi 🌿", message: "Nếu chọn hôm nay, hãy chọn một giờ sau thời điểm hiện tại.", type: "info" },
  EVENT_TITLE_REQUIRED: { title: "Sự kiện cần một cái tên 🌸", message: "Hãy đặt tên để cả nhà dễ nhận ra sự kiện này.", type: "warning" },
  EVENT_PARTICIPANTS_REQUIRED: { title: "Chọn người tham gia", message: "Bạn đã chọn chế độ thành viên cụ thể, hãy chọn ít nhất một người nhé.", type: "info" },
  EVENT_PARTICIPANT_NOT_MEMBER: { title: "Thành viên không còn trong nhà", message: "Danh sách người tham gia có thành viên không còn thuộc gia đình này. Hãy chọn lại.", type: "warning" },
  EVENT_NOT_FOUND: { title: "Không tìm thấy sự kiện", message: "Sự kiện có thể đã được xóa hoặc bạn không còn quyền xem.", type: "error" },
  EVENT_NOT_OWNER: { title: "Chỉ người tạo mới được chỉnh", message: "Bạn chỉ có thể sửa hoặc xóa sự kiện do chính mình tạo.", type: "info" },
  EVENT_MODERATION_DENIED: { title: "Bạn chưa thể đổi phần này", message: "Chỉ người đang quản lý gia đình mới có thể ẩn hoặc đưa sự kiện trở lại.", type: "info" },
  COMMENT_EMPTY: { title: "Thiếu nội dung", message: "Bình luận không được để trống.", type: "warning" },
  MOMENT_NOT_FOUND: { title: "Không tìm thấy khoảnh khắc", message: "Bài viết có thể đã bị xóa.", type: "error" },
  MOMENT_NOT_OWNER: { title: "Đây là kỷ niệm của người khác", message: "Chỉ người tạo bài mới có thể sửa hoặc xóa nội dung của bài đó.", type: "info" },
  MOMENT_MODERATION_DENIED: { title: "Bạn chưa thể đổi phần này", message: "Chỉ người đang quản lý gia đình mới có thể ẩn hoặc đưa kỷ niệm trở lại.", type: "info" },
  PROPOSAL_CONFLICT: { title: "Câu chuyện này vừa có thay đổi", message: "Bạn xem lại thông tin mới nhất rồi gửi đề xuất một lần nữa nhé.", type: "warning" },
  PROPOSAL_ALREADY_REVIEWED: { title: "Đã xử lý", message: "Đề xuất này đã được xử lý. Hãy tải lại danh sách.", type: "info" },
  GRAPH_PERMISSION_DENIED: { title: "Không có quyền chỉnh phả hệ", message: "Chỉ quản trị viên của gia đình mới có thể thay đổi phả hệ.", type: "warning" },
  GRAPH_FAMILY_MISMATCH: { title: "Bạn đang ở một mái nhà khác", message: "Phần phả hệ này thuộc gia đình khác. Hãy mở đúng nhà rồi thử lại nhé.", type: "warning" },
  GRAPH_BACKEND_UNAVAILABLE: { title: "Phả hệ đang cần nghỉ một chút 🌿", message: "Bloom chưa kết nối được phần xử lý phả hệ. Bạn thử lại sau nhé.", type: "info" },
  PERSON_NOT_FOUND: { title: "Không tìm thấy thành viên phả hệ", message: "Người này có thể đã được xóa hoặc thay đổi.", type: "error" },
  PERSON_INVALID_DATA: { title: "Thông tin phả hệ chưa hợp lệ", message: "Bạn kiểm tra lại thông tin của người này nhé.", type: "warning" },
  PERSON_ALREADY_LINKED: { title: "Người này đã có tài khoản gắn cùng", message: "Hồ sơ phả hệ này đang đi cùng một thành viên khác trong nhà.", type: "info" },
  PERSON_HAS_RELATIONSHIPS: { title: "Chưa thể gỡ người này khỏi cây", message: "Hãy gỡ những mối quan hệ đang nối với người này trước nhé.", type: "info" },
  LINKED_UID_NOT_MEMBER: { title: "Người này chưa ở trong nhà", message: "Chỉ có thể nối hồ sơ phả hệ với một thành viên đang thuộc gia đình này.", type: "warning" },
  UID_ALREADY_LINKED: { title: "Thành viên này đã có chỗ trên cây", message: "Tài khoản này đang được nối với một hồ sơ khác trong phả hệ.", type: "info" },
  RELATIONSHIP_NOT_FOUND: { title: "Không tìm thấy mối quan hệ", message: "Mối quan hệ có thể đã được thay đổi hoặc xóa.", type: "error" },
  RELATIONSHIP_INVALID: { title: "Mối quan hệ này chưa khớp", message: "Bạn xem lại hai người và cách họ gắn với nhau nhé.", type: "warning" },
  RELATIONSHIP_DUPLICATE: { title: "Quan hệ đã tồn tại", message: "Mối quan hệ này đã có trong phả hệ.", type: "info" },
  RELATIONSHIP_SELF_REFERENCE: { title: "Không thể tự liên kết", message: "Một người không thể tự tạo quan hệ với chính mình.", type: "warning" },
  RELATIONSHIP_PARENT_CYCLE: { title: "Quan hệ tạo vòng lặp", message: "Quan hệ cha/mẹ - con này sẽ tạo vòng lặp trong phả hệ nên không thể lưu.", type: "warning" },
  NETWORK_UNAVAILABLE: { title: "Mất kết nối 📶", message: "Kiểm tra Wi-Fi hoặc 4G rồi thử lại.", type: "error" },
  UNKNOWN: { title: "Bloom vấp một nhịp nhỏ 🌸", message: "Mọi thứ chưa kịp hoàn tất. Bạn thử lại sau một chút nhé.", type: "error" },
};

const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

const fromProviderError = (error: unknown): AppErrorCode | null => {
  if (error instanceof AppError) return error.code;
  const candidate = error as { code?: unknown; message?: unknown; response?: { status?: number } } | null;
  const code = normalize(candidate?.code);
  const message = normalize(candidate?.message);
  const status = candidate?.response?.status;

  if (code === "validation_required") return "VALIDATION_REQUIRED";
  if (code === "validation_email") return "VALIDATION_EMAIL";
  if (code === "validation_password_short") return "VALIDATION_PASSWORD_SHORT";
  if (code === "validation_password_mismatch") return "VALIDATION_PASSWORD_MISMATCH";
  if (code === "google_client_id_missing") return "GOOGLE_CLIENT_ID_MISSING";
  if (code.includes("sign_in_cancelled") || code.includes("cancelled") || code === "12501" || message.includes("sign_in_cancelled") || message.includes("sign-in-cancelled")) return "AUTH_GOOGLE_CANCELLED";
  if (code.includes("in_progress") || code === "12502") return "AUTH_GOOGLE_IN_PROGRESS";
  if (code.includes("play_services_not_available") || code === "12500") return "AUTH_GOOGLE_PLAY_SERVICES";
  if (code === "auth/invalid-phone-number") return "AUTH_INVALID_PHONE";
  if (code === "auth/invalid-verification-code") return "AUTH_INVALID_CODE";
  if (code === "auth/code-expired") return "AUTH_CODE_EXPIRED";
  if (code === "auth/too-many-requests") return "AUTH_TOO_MANY_REQUESTS";
  if (code === "cloudinary_config_missing") return "MEDIA_CONFIG_MISSING";
  if (code === "media_attach_failed") return "MEDIA_ATTACH_FAILED";
  if (code === "media_cleanup_pending") return "MEDIA_CLEANUP_PENDING";
  if (code === "family_context_required") return "FAMILY_CONTEXT_REQUIRED";
  if (code === "media_upload_failed" || code === "upload_failed") return status === 413 ? "MEDIA_FILE_TOO_LARGE" : "MEDIA_UPLOAD_FAILED";
  if (code === "profile_not_found") return "PROFILE_NOT_FOUND";
  if (code === "profile_save_failed") return "PROFILE_SAVE_FAILED";
  if (code === "family_id_required") return "FAMILY_ID_REQUIRED";
  if (code === "family_not_found") return "FAMILY_NOT_FOUND";
  if (code === "family_code_generation_failed") return "FAMILY_CODE_GENERATION_FAILED";
  if (code === "already_family_member") return "ALREADY_FAMILY_MEMBER";
  if (code === "join_request_pending") return "JOIN_REQUEST_PENDING";
  if (code === "join_request_not_pending") return "JOIN_REQUEST_NOT_PENDING";
  if (code === "user_profile_not_found") return "USER_PROFILE_NOT_FOUND";
  if (code === "family_membership_required") return "FAMILY_MEMBERSHIP_REQUIRED";
  if (code === "event_invalid_date") return "EVENT_INVALID_DATE";
  if (code === "event_date_in_past") return "EVENT_DATE_IN_PAST";
  if (code === "event_time_in_past") return "EVENT_TIME_IN_PAST";
  if (code === "event_title_required") return "EVENT_TITLE_REQUIRED";
  if (code === "event_participants_required") return "EVENT_PARTICIPANTS_REQUIRED";
  if (code === "event_participant_not_member") return "EVENT_PARTICIPANT_NOT_MEMBER";
  if (code === "event_not_found") return "EVENT_NOT_FOUND";
  if (code === "event_not_owner") return "EVENT_NOT_OWNER";
  if (code === "event_moderation_denied") return "EVENT_MODERATION_DENIED";
  if (code === "comment_empty") return "COMMENT_EMPTY";
  if (code === "moment_not_found") return "MOMENT_NOT_FOUND";
  if (code === "moment_not_owner") return "MOMENT_NOT_OWNER";
  if (code === "moment_moderation_denied") return "MOMENT_MODERATION_DENIED";
  if (code === "graph_permission_denied") return "GRAPH_PERMISSION_DENIED";
  if (code === "graph_family_mismatch") return "GRAPH_FAMILY_MISMATCH";
  if (code === "graph_backend_unavailable") return "GRAPH_BACKEND_UNAVAILABLE";
  if (code === "person_not_found") return "PERSON_NOT_FOUND";
  if (code === "person_invalid_data") return "PERSON_INVALID_DATA";
  if (code === "person_already_linked") return "PERSON_ALREADY_LINKED";
  if (code === "person_has_relationships") return "PERSON_HAS_RELATIONSHIPS";
  if (code === "linked_uid_not_member") return "LINKED_UID_NOT_MEMBER";
  if (code === "uid_already_linked") return "UID_ALREADY_LINKED";
  if (code === "relationship_not_found") return "RELATIONSHIP_NOT_FOUND";
  if (code === "relationship_invalid") return "RELATIONSHIP_INVALID";
  if (code === "relationship_duplicate") return "RELATIONSHIP_DUPLICATE";
  if (code === "relationship_self_reference") return "RELATIONSHIP_SELF_REFERENCE";
  if (code === "relationship_parent_cycle") return "RELATIONSHIP_PARENT_CYCLE";
  if (code.includes("network-request-failed") || message.includes("network error")) return "NETWORK_UNAVAILABLE";
  if (axios.isAxiosError(error) && (!status || status === 408 || status === 429 || status >= 500)) return "NETWORK_UNAVAILABLE";
  return null;
};

export const toAppError = (error: unknown, fallback: AppErrorCode = "UNKNOWN"): AppError => {
  if (error instanceof AppError) return error;
  const mapped = fromProviderError(error) ?? fallback;
  const category: ErrorCategory = mapped.startsWith("AUTH_") || mapped.startsWith("GOOGLE_") ? "AUTH"
    : mapped.startsWith("PROFILE") ? "PROFILE"
    : mapped.startsWith("EVENT_") ? "EVENT"
    : mapped.startsWith("MOMENT_") ? "MOMENT"
    : mapped.startsWith("COMMENT_") ? "COMMENT"
    : mapped.startsWith("REACTION_") ? "REACTION"
    : mapped.startsWith("MEDIA") || mapped.includes("UPLOAD") || mapped === "FAMILY_CONTEXT_REQUIRED" ? "MEDIA"
    : mapped.startsWith("GRAPH_") ? "GRAPH"
    : mapped.startsWith("RELATIONSHIP_") ? "RELATIONSHIP"
    : mapped.startsWith("PERSON_") || mapped.startsWith("LINKED_UID_") || mapped.startsWith("UID_ALREADY_") ? "PERSON"
    : mapped.startsWith("FAMILY") || mapped.includes("JOIN") || mapped.includes("MEMBERSHIP") ? "FAMILY"
    : mapped.startsWith("VALIDATION") ? "VALIDATION"
    : mapped.startsWith("NETWORK") ? "NETWORK" : "UNKNOWN";
  return new AppError(mapped, category, undefined, { cause: error });
};

export const parseAppError = (error: unknown): FriendlyError => CATALOG[toAppError(error).code] ?? CATALOG.UNKNOWN;
export const errorService = { toAppError, parseAppError, catalog: CATALOG };
