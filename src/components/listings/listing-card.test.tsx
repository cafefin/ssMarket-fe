import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ListingSummary } from "@/lib/api/use-listings";
import { ListingCard } from "./listing-card";

const listing = (overrides: Partial<ListingSummary> = {}): ListingSummary => ({
  id: "abc",
  title: "Loa bluetooth cũ",
  mode: "in_stock",
  category: { id: 4, slug: "dien-tu", name: "Điện tử" },
  seller: { id: "u1", name: "Nguyen Van A", avatarUrl: null },
  thumbnailUrl: "/api/media/listings/abc/x_thumb.webp",
  minUnitPrice: 500000,
  minPriceUnit: "cái",
  orderDeadline: null,
  deliveryDate: null,
  publishedAt: "2026-10-05T03:00:00.000Z",
  orderCount: 0,
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
});
