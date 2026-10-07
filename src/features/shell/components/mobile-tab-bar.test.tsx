import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileTabBar } from "./mobile-tab-bar";

const { location } = vi.hoisted(() => ({ location: { pathname: "/" } }));
vi.mock("next/navigation", () => ({
  usePathname: () => location.pathname,
}));

const bar = () => screen.getByRole("navigation", { name: "Điều hướng chính" });

describe("MobileTabBar", () => {
  beforeEach(() => {
    location.pathname = "/";
  });

  it("links to the five destinations in order", () => {
    renderWithIntl(<MobileTabBar />);

    expect(
      within(bar())
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Trang chủ", "/"],
      ["Đơn mua", "/orders"],
      ["Đăng bán", "/sell/new"],
      ["Bán hàng", "/sell"],
      ["Tôi", "/profile"],
    ]);
  });

  it("marks the tab of the current section", () => {
    location.pathname = "/sell/orders";

    renderWithIntl(<MobileTabBar />);

    expect(within(bar()).getByRole("link", { name: "Bán hàng" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(bar()).getByRole("link", { name: "Trang chủ" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the current tab by weight as well as colour", () => {
    location.pathname = "/orders";

    renderWithIntl(<MobileTabBar />);

    expect(within(bar()).getByRole("link", { name: "Đơn mua" })).toHaveClass(
      "font-semibold",
    );
    expect(
      within(bar()).getByRole("link", { name: "Trang chủ" }),
    ).not.toHaveClass("font-semibold");
  });

  it("is only shown below the desktop breakpoint", () => {
    renderWithIntl(<MobileTabBar />);

    expect(bar()).toHaveClass("md:hidden");
  });
});
