import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListingSummary } from "@/lib/api/use-listings";
import { ListingCard } from "./listing-card";

const listing = (overrides: Partial<ListingSummary> = {}): ListingSummary => ({
  id: "abc",
  title: "Loa bluetooth cũ",
  mode: "in_stock",
  category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics" },
  seller: { id: "u1", name: "Nguyen Van A", avatarUrl: null },
  thumbnailUrl: "/api/media/listings/abc/x_thumb.webp",
  minUnitPrice: 500000,
  minPriceUnit: "cái",
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
  stockQuantity: null,
  ...overrides,
});

describe("ListingCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is one link to the listing with title, price and seller", () => {
    render(<ListingCard listing={listing()} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/listings/abc");
    expect(link).toHaveTextContent("Loa bluetooth cũ");
    expect(link).toHaveTextContent("từ 500.000 đ/cái");
    expect(link).toHaveTextContent("Nguyen Van A");
  });

  it("sets the price in the heading typeface at its normal width", () => {
    render(<ListingCard listing={listing()} />);

    const price = screen.getByText("500.000 đ");
    expect(price).toHaveClass("font-heading");
    // Prices look the same on the card, the item table and the order total.
    expect(price).not.toHaveClass("[font-stretch:75%]");
  });

  it("keeps the seller's initials out of the link's name", () => {
    render(<ListingCard listing={listing()} />);

    const link = screen.getByRole("link");
    const avatar = link.querySelector('[data-slot="avatar"]');
    expect(avatar).not.toBeNull();
    expect(avatar).toHaveAttribute("aria-hidden", "true");
  });

  it("says Đặt trước for a pre-order without a closing time", () => {
    render(
      <ListingCard listing={listing({ mode: "preorder", orderDeadline: null })} />,
    );

    expect(screen.getByText("Đặt trước")).toBeInTheDocument();
  });

  it("marks an in-stock listing in green and shows its photo", () => {
    const { container } = render(<ListingCard listing={listing()} />);

    expect(screen.getByText("Có sẵn")).toHaveClass("text-positive-deep");
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/media/listings/abc/x_thumb.webp");
    // Decorative: the title next to it already names the listing.
    expect(image).toHaveAttribute("alt", "");
    expect(screen.queryByText(/^Chốt/)).not.toBeInTheDocument();
  });

  it("shows a pre-order's closing time on soft orange", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));

    render(
      <ListingCard
        listing={listing({
          mode: "preorder",
          minUnitPrice: 35000,
          minPriceUnit: "kg",
          orderDeadline: "2026-10-10T10:00:00.000Z",
        })}
      />,
    );

    const closing = screen.getByText(/^Chốt \d{2}:\d{2} .+, \d{1,2}\/10$/);
    expect(closing.closest("p")).toHaveClass(
      "bg-deadline-soft",
      "text-deadline-deep",
    );
    expect(screen.getByRole("link")).toHaveTextContent("từ 35.000 đ/kg");
    expect(screen.queryByText("Có sẵn")).not.toBeInTheDocument();
  });

  it("uses solid orange when a pre-order closes today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T12:00:00.000Z"));

    render(
      <ListingCard
        listing={listing({
          mode: "preorder",
          // One minute later: the same calendar day in every time zone.
          orderDeadline: "2026-10-06T12:01:00.000Z",
        })}
      />,
    );

    expect(
      screen.getByText(/^Chốt \d{2}:\d{2} hôm nay$/).closest("p"),
    ).toHaveClass("bg-deadline", "text-foreground");
  });

  it("stacks the photo above the text when asked, for the carousel", () => {
    const { rerender } = render(<ListingCard listing={listing()} />);
    expect(screen.getByRole("link")).toHaveClass("grid");

    rerender(<ListingCard listing={listing()} layout="stacked" />);
    expect(screen.getByRole("link")).toHaveClass("flex-col");
    expect(screen.getByRole("link")).not.toHaveClass("grid");
  });

  it("shows how many people ordered a pre-order, but not zero and not for in-stock", () => {
    const { rerender } = render(
      <ListingCard
        listing={listing({ mode: "preorder", orderCount: 7 })}
      />,
    );
    expect(screen.getByText("7 người đã đặt")).toBeInTheDocument();

    rerender(<ListingCard listing={listing({ mode: "preorder", orderCount: 0 })} />);
    expect(screen.queryByText(/người đã đặt/)).not.toBeInTheDocument();

    rerender(<ListingCard listing={listing({ mode: "in_stock", orderCount: 3 })} />);
    expect(screen.queryByText(/người đã đặt/)).not.toBeInTheDocument();
  });

  it("shows a placeholder when there is no photo", () => {
    const { container } = render(
      <ListingCard listing={listing({ thumbnailUrl: null })} />,
    );

    expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows how much is left of a single in-stock item", () => {
    render(
      <ListingCard
        listing={listing({ stockQuantity: 24, minPriceUnit: "hũ" })}
      />,
    );
    const foot = screen.getByText("Có sẵn").closest("p");
    expect(foot).toHaveTextContent("Có sẵn còn 24 hũ");
  });

  it("writes decimal stock the Vietnamese way", () => {
    render(
      <ListingCard
        listing={listing({ stockQuantity: 2.5, minPriceUnit: "kg" })}
      />,
    );
    expect(screen.getByText("còn 2,5 kg")).toBeInTheDocument();
  });

  it("says Hết hàng, not in green, when nothing is left", () => {
    render(<ListingCard listing={listing({ stockQuantity: 0 })} />);
    const foot = screen.getByText("Hết hàng");
    expect(foot.closest("p")).not.toHaveClass("text-positive-deep");
    expect(foot.closest("p")).toHaveClass("text-muted-foreground");
    expect(screen.queryByText("Có sẵn")).not.toBeInTheDocument();
  });

  it("shows only Có sẵn when the stock is not known", () => {
    render(<ListingCard listing={listing({ stockQuantity: null })} />);
    expect(screen.getByText("Có sẵn").closest("p")).toHaveTextContent(/^Có sẵn$/);
  });
});
