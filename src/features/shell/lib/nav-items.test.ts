import { describe, expect, it } from "vitest";
import { isActive, NAV_ITEMS, PROFILE_ITEM } from "./nav-items";

describe("navigation items", () => {
  it("lists the three main destinations and the profile", () => {
    expect(NAV_ITEMS.map((item) => [item.labelKey, item.href])).toEqual([
      ["home", "/"],
      ["orders", "/orders"],
      ["selling", "/sell"],
    ]);
    expect([PROFILE_ITEM.labelKey, PROFILE_ITEM.href]).toEqual(["me", "/profile"]);
  });

  it.each([
    ["/", "/", true],
    ["/listings/abc", "/", true],
    ["/orders", "/", false],
    ["/orders", "/orders", true],
    ["/orders/123", "/orders", true],
    ["/sell/new", "/sell", true],
    ["/sell/orders", "/sell", true],
    ["/seller", "/sell", false],
    ["/profile", "/profile", true],
  ])("on %s the %s item is active: %s", (pathname, href, expected) => {
    expect(isActive(pathname, href)).toBe(expected);
  });
});
