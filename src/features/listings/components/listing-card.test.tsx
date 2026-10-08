import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListingSummary } from "../api/use-listings";
import { ListingCard } from "./listing-card";

const listing = (overrides: Partial<ListingSummary> = {}): ListingSummary => ({
  id: "abc",
  title: "Loa bluetooth cũ",
  mode: "in_stock",
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
  seller: { id: "u1", name: "Nguyen Van A", handle: "an.nguyen", avatarUrl: null },
  thumbnailUrl: "/api/media/listings/abc/x_thumb.webp",
  unitPrice: 500000,
  unit: "cái",
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
  stockQuantity: 3,
  hasCombos: false,
  condition: null,
  conditionPercent: null,
  ...overrides,
});

describe("ListingCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is one link with the title, the plain price and the seller's handle", () => {
    renderWithIntl(<ListingCard listing={listing()} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/listings/abc");
    expect(link).toHaveTextContent("Loa bluetooth cũ");
    expect(link).toHaveTextContent("@an.nguyen");
    expect(link).not.toHaveTextContent("Nguyen Van A");
    // No "from", no "/unit": one product, one price.
    expect(screen.getByText("500.000 đ")).toHaveClass("font-semibold", "text-[15px]");
    expect(link).not.toHaveTextContent(/từ|\/cái/);
  });

  it("has no avatar and a square, lazily loaded photo", () => {
    const { container } = renderWithIntl(<ListingCard listing={listing()} />);

    expect(container.querySelector('[data-slot="avatar"]')).toBeNull();
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/media/listings/abc/x_thumb.webp");
    expect(image).toHaveAttribute("loading", "lazy");
    // Decorative: the title next to it already names the listing.
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveClass("aspect-square");
  });

  it("shows how much is left, the Vietnamese way", () => {
    const { rerender } = renderWithIntl(
      <ListingCard listing={listing({ stockQuantity: 24, unit: "hũ" })} />,
    );
    expect(screen.getByText("Còn 24 hũ")).toHaveClass("text-positive-deep");

    rerender(<ListingCard listing={listing({ stockQuantity: 2.5, unit: "kg" })} />);
    expect(screen.getByText("Còn 2,5 kg")).toBeInTheDocument();
  });

  it("says Hết hàng, not in green, when nothing is left", () => {
    renderWithIntl(<ListingCard listing={listing({ stockQuantity: 0 })} />);
    const soldOut = screen.getByText("Hết hàng");
    expect(soldOut).toHaveClass("text-muted-foreground");
    expect(soldOut).not.toHaveClass("text-positive-deep");
  });

  it("says Đặt trước for a pre-order without a closing time", () => {
    renderWithIntl(
      <ListingCard
        listing={listing({ mode: "preorder", orderDeadline: null, stockQuantity: null })}
      />,
    );

    expect(screen.getByText("Đặt trước")).toBeInTheDocument();
    expect(screen.queryByText(/^Còn/)).not.toBeInTheDocument();
  });

  it("shows a pre-order's closing time on soft orange", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));

    renderWithIntl(
      <ListingCard
        listing={listing({
          mode: "preorder",
          unitPrice: 35000,
          unit: "kg",
          stockQuantity: null,
          orderDeadline: "2026-10-10T10:00:00.000Z",
        })}
      />,
    );

    const closing = screen.getByText(/^Chốt \d{2}:\d{2} .+, \d{1,2}\/10$/);
    expect(closing.closest("p")).toHaveClass("bg-deadline-soft", "text-deadline-deep");
    expect(screen.getByRole("link")).toHaveTextContent("35.000 đ");
  });

  it("uses solid orange when a pre-order closes today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));

    renderWithIntl(
      <ListingCard
        listing={listing({
          mode: "preorder",
          stockQuantity: null,
          // One minute later: the same calendar day in every time zone.
          orderDeadline: "2026-10-06T12:01:00.000Z",
        })}
      />,
    );

    expect(screen.getByText(/^Chốt \d{2}:\d{2} hôm nay$/).closest("p")).toHaveClass(
      "bg-deadline",
      "text-foreground",
    );
  });

  it("shows how many people ordered a pre-order, but not zero", () => {
    const { rerender } = renderWithIntl(
      <ListingCard listing={listing({ mode: "preorder", orderCount: 7 })} />,
    );
    expect(screen.getByText("7 người đã đặt")).toBeInTheDocument();

    rerender(<ListingCard listing={listing({ mode: "preorder", orderCount: 0 })} />);
    expect(screen.queryByText(/người đã đặt/)).not.toBeInTheDocument();
  });

  it("shows the condition and combo deals in neutral text", () => {
    renderWithIntl(
      <ListingCard
        listing={listing({ condition: "like_new", conditionPercent: 99, hasCombos: true })}
      />,
    );
    expect(screen.getByText("Như mới 99%").closest("p")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Có combo")).toBeInTheDocument();
  });

  it("puts actions outside the link", () => {
    renderWithIntl(
      <ListingCard listing={listing()} actions={<button type="button">Mua</button>} />,
    );
    const link = screen.getByRole("link");
    expect(link).not.toContainElement(screen.getByRole("button", { name: "Mua" }));
  });

  it("shows a placeholder when there is no photo", () => {
    const { container } = renderWithIntl(
      <ListingCard listing={listing({ thumbnailUrl: null })} />,
    );

    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("speaks English when the page is in English", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));

    const { rerender } = renderWithIntl(
      <ListingCard listing={listing({ stockQuantity: 0 })} />,
      { locale: "en" },
    );
    expect(screen.getByRole("link")).toHaveTextContent("500,000 VND");
    expect(screen.getByText("Sold out")).toBeInTheDocument();

    rerender(
      <ListingCard
        listing={listing({
          mode: "preorder",
          orderDeadline: "2026-10-06T12:01:00.000Z",
          orderCount: 1,
        })}
      />,
    );
    expect(screen.getByText(/^Closes \d{2}:\d{2} today$/)).toBeInTheDocument();
    expect(screen.getByText("1 person ordered")).toBeInTheDocument();
  });
});
