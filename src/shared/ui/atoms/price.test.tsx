import { renderWithIntl } from "@/shared/i18n/test-utils";
import { describe, expect, it } from "vitest";
import { Price } from "./price";

describe("Price", () => {
  it("writes the amount in the heading typeface at the chosen size", () => {
    const { container } = renderWithIntl(<Price amount={500000} size={36} />);
    const price = container.firstElementChild;
    expect(price?.tagName).toBe("SPAN");
    expect(price).toHaveClass("font-heading", "font-bold", "text-4xl");
    expect(price).toHaveTextContent(/^500\.000\s?đ$/);
  });

  it("adds a muted 'từ' and unit, as on cards", () => {
    const { container } = renderWithIntl(<Price amount={500000} size={22} from unit="cái" />);
    expect(container.firstElementChild).toHaveClass("text-[22px]");
    expect(container).toHaveTextContent(/^từ 500\.000\s?đ\/cái$/);
    const muted = container.querySelectorAll("span span.text-muted-foreground");
    expect(muted).toHaveLength(2);
  });

  it("can keep the unit in the price's own style, as in the item table", () => {
    const { container } = renderWithIntl(
      <Price amount={35000} size={20} unit="kg" unitStyle="inline" />,
    );
    expect(container.firstElementChild).toHaveClass("text-xl");
    expect(container.querySelector(".text-muted-foreground")).toBeNull();
    expect(container).toHaveTextContent(/^35\.000\s?đ\/kg$/);
  });
});
