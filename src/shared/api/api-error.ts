/** A failed API call, carrying the backend's stable error code. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Structured data for some codes, e.g. which items ran out. */
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Builds an ApiError from the `error` body and `response` of the typed client. */
export function toApiError(body: unknown, response: Response): ApiError {
  const fields = (body ?? {}) as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
  return new ApiError(
    response.status,
    typeof fields.code === "string" ? fields.code : "UNKNOWN",
    typeof fields.message === "string"
      ? fields.message
      : `Request failed (${response.status})`,
    typeof fields.details === "object" && fields.details !== null
      ? (fields.details as Record<string, unknown>)
      : {},
  );
}
