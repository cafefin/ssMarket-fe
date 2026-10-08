import { renderWithIntl } from "@/shared/i18n/test-utils";
import { describe, expect, it } from "vitest";
import { Price } from "./price";

describe("Price", () => {
  it("writes the amount in the body typeface, semibold, at the chosen size", () => {
    const { container } = renderWithIntl(<Price amount={500000} size="lg" />);
    const price = container.firstElementChild;
    expect(price?.tagName).toBe("SPAN");
    expect(price).toHaveClass("font-sans", "font-semibold", "tabular-nums", "text-xl");
    expect(price).not.toHaveClass("font-bold");
    expect(price).toHaveTextContent(/^500\.000\s?đ$/);
  });

  it("is the size of the text around it by default", () => {
    const { container } = renderWithIntl(<Price amount={35000} />);
    expect(container.firstElementChild).toHaveClass("text-base");
  });

  it("has a small size for cards", () => {
    const { container } = renderWithIntl(<Price amount={35000} size="sm" />);
    expect(container.firstElementChild).toHaveClass("text-[15px]");
  });
});
