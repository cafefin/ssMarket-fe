import { describe, expect, it } from "vitest";
import { checkoutHref, parseCheckoutLink } from "./checkout-link";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("checkout links", () => {
  it("round-trips lines and the cart flag", () => {
    const href = checkoutHref(
      [
        { itemId: A, quantity: "2" },
        { itemId: B, quantity: "1.5" },
      ],
      true,
    );
    expect(href).toBe(`/checkout?items=${A}%3A2%2C${B}%3A1.5&from=cart`);
    expect(parseCheckoutLink(new URL(href, "http://x").searchParams)).toEqual({
      lines: [
        { itemId: A, quantity: "2" },
        { itemId: B, quantity: "1.5" },
      ],
      fromCart: true,
    });
  });

  it("drops malformed and repeated lines", () => {
    expect(
      parseCheckoutLink(
        new URLSearchParams(`items=${A}:2,${A}:3,nope:1,${B}:-1,${B}:abc`),
      ),
    ).toEqual({ lines: [{ itemId: A, quantity: "2" }], fromCart: false });
    expect(parseCheckoutLink(new URLSearchParams(""))).toEqual({
      lines: [],
      fromCart: false,
    });
  });
});
