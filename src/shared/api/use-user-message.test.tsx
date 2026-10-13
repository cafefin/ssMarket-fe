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

  // The backend uses these codes for a product in stock and for a pre-order
  // round alike, so the words must be true of both.
  it.each([
    [
      "INVALID_LISTING_STATE",
      "Trạng thái đã thay đổi nên chưa thực hiện được. Hãy tải lại trang rồi thử lại.",
      "The status has changed, so this could not be done. Reload the page and try again.",
    ],
    [
      "LISTING_NOT_OPEN",
      "Sản phẩm hoặc đợt đặt trước này không còn nhận đơn.",
      "This product or pre-order round is no longer taking orders.",
    ],
    [
      "OWN_LISTING",
      "Bạn không thể đặt hàng của chính mình.",
      "You cannot order your own products.",
    ],
    [
      "ALREADY_ORDERED",
      "Bạn đã có đơn trong đợt đặt trước này.",
      "You already have an order in this pre-order round.",
    ],
  ])("words %s for a product and for a round", (code, vi, en) => {
    expect(messageFor(new ApiError(409, code, "x"))).toBe(vi);
    expect(messageFor(new ApiError(409, code, "x"), "en")).toBe(en);
    expect(vi).not.toMatch(/bài đăng/i);
    expect(en).not.toMatch(/listing/i);
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
