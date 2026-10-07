import type { CheckoutLine } from "../api/use-cart";

const LINE = /^([0-9a-f-]{36}):(\d{1,7}(?:\.\d{1,3})?)$/i;

/**
 * The checkout page link for some lines: `?items=<id>:<qty>,…`, plus
 * `from=cart` when bought lines should leave the cart. A link rather than
 * shared state, so "Buy now" from a card and the cart use the same page.
 */
export function checkoutHref(lines: CheckoutLine[], fromCart: boolean): string {
  const params = new URLSearchParams();
  params.set(
    "items",
    lines.map((line) => `${line.itemId}:${line.quantity}`).join(","),
  );
  if (fromCart) {
    params.set("from", "cart");
  }
  return `/checkout?${params.toString()}`;
}

/** Reads the lines back from the link, dropping anything malformed. */
export function parseCheckoutLink(params: URLSearchParams): {
  lines: CheckoutLine[];
  fromCart: boolean;
} {
  const seen = new Set<string>();
  const lines: CheckoutLine[] = [];
  for (const part of (params.get("items") ?? "").split(",")) {
    const match = LINE.exec(part.trim());
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      lines.push({ itemId: match[1], quantity: match[2] });
    }
  }
  return { lines, fromCart: params.get("from") === "cart" };
}
