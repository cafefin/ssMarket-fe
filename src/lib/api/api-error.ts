/** A failed API call, carrying the backend's stable error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Builds an ApiError from the `error` body and `response` of the typed client. */
export function toApiError(body: unknown, response: Response): ApiError {
  const fields = (body ?? {}) as { code?: unknown; message?: unknown };
  return new ApiError(
    response.status,
    typeof fields.code === "string" ? fields.code : "UNKNOWN",
    typeof fields.message === "string"
      ? fields.message
      : `Request failed (${response.status})`,
  );
}

const MESSAGES: Record<string, string> = {
  BANK_PROFILE_REQUIRED:
    "Bạn cần thêm thông tin ngân hàng trước khi nhận thanh toán qua QR.",
  INVALID_IMAGE: "Ảnh phải là file JPEG, PNG hoặc WebP.",
  PAYLOAD_TOO_LARGE: "Ảnh lớn hơn 5 MB.",
  TOO_MANY_IMAGES: "Mỗi bài đăng có tối đa 5 ảnh.",
  INVALID_LISTING_STATE:
    "Bài đăng đã đổi trạng thái. Hãy tải lại trang rồi thử lại.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  NOT_FOUND: "Không tìm thấy nội dung bạn yêu cầu.",
  TOO_MANY_REQUESTS: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  VALIDATION_FAILED: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  BAD_REQUEST: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
};

const GENERIC = "Đã có lỗi xảy ra. Vui lòng thử lại.";

/**
 * The text to show a person for a failed action. Backend messages are written
 * for developers, in English, so they are never shown directly.
 */
export function userMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return MESSAGES[error.code] ?? GENERIC;
  }
  return GENERIC;
}
