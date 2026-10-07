import { renderWithIntl } from "@/shared/i18n/test-utils";
import { describe, expect, it } from "vitest";
import { LogoMark } from "./logo-mark";

describe("LogoMark", () => {
  it("is decorative, so the link around it names the destination", () => {
    const { container } = renderWithIntl(<LogoMark />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("draws the bag in brand blue with a green handle", () => {
    const { container } = renderWithIntl(<LogoMark />);

    expect(container.querySelector("rect")).toHaveClass("fill-primary");
    expect(container.querySelector("path")).toHaveClass("stroke-positive-deep");
  });

  it("accepts extra classes for sizing", () => {
    const { container } = renderWithIntl(<LogoMark className="size-8" />);

    expect(container.querySelector("svg")).toHaveClass("size-8");
  });
});
