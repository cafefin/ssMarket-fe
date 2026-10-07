import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Locale } from "@/shared/i18n/config";
import { intlWrapper } from "@/shared/i18n/test-utils";
import { ApiError } from "./api-error";
import { useUserMessage } from "./use-user-message";

function messageFor(error: unknown, locale: Locale = "vi"): string {
  const { result } = renderHook(() => useUserMessage(), {
    wrapper: intlWrapper(locale),
  });
  return result.current(error);
}

describe("useUserMessage", () => {
  it("translates known codes to Vietnamese", () => {
    expect(messageFor(new ApiError(409, "TOO_MANY_IMAGES", "x"))).toBe(
      "Mỗi bài đăng có tối đa 5 ảnh.",
    );
  });

  it("translates known codes to English", () => {
    expect(messageFor(new ApiError(409, "TOO_MANY_IMAGES", "x"), "en")).toBe(
      "A listing can have at most 5 images.",
    );
  });

  it.each([
    ["CATEGORY_EXISTS", "Đã có danh mục với tên này."],
    [
      "CATEGORY_INACTIVE",
      "Danh mục này đã ngừng nhận bài đăng. Hãy chọn danh mục khác.",
    ],
  ])("explains %s", (code, text) => {
    expect(messageFor(new ApiError(400, code, "x"))).toBe(text);
  });

  it("never shows a raw backend or runtime message", () => {
    expect(
      messageFor(new ApiError(500, "INTERNAL_SERVER_ERROR", "stack")),
    ).toBe("Đã có lỗi xảy ra. Vui lòng thử lại.");
    expect(messageFor(new TypeError("Failed to fetch"))).toBe(
      "Đã có lỗi xảy ra. Vui lòng thử lại.",
    );
    expect(messageFor(new ApiError(400, "toString", "x"), "en")).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
