import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "./api-error";

describe("toApiError", () => {
  it("keeps the status, code and message of a backend error", () => {
    const error = toApiError(
      { statusCode: 422, code: "BANK_PROFILE_REQUIRED", message: "Add bank" },
      new Response(null, { status: 422 }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: "BANK_PROFILE_REQUIRED",
      message: "Add bank",
    });
  });

  it.each([undefined, null, "Bad Gateway", { code: 42 }])(
    "falls back for the unexpected body %j",
    (body) => {
      const error = toApiError(body, new Response(null, { status: 502 }));

      expect(error).toMatchObject({
        status: 502,
        code: "UNKNOWN",
        message: "Request failed (502)",
      });
    },
  );
});

describe("details", () => {
  it("keeps structured details and defaults to an empty object", () => {
    const withDetails = toApiError(
      { code: "ALREADY_ORDERED", message: "x", details: { orderId: "o1" } },
      new Response(null, { status: 409 }),
    );
    const without = toApiError(
      { code: "X", message: "x", details: "nope" },
      new Response(null, { status: 409 }),
    );

    expect(withDetails.details).toEqual({ orderId: "o1" });
    expect(without.details).toEqual({});
  });
});
