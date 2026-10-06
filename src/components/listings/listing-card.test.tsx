import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
  it("is one link to the listing with title, price and seller", () => {
    render(<ListingCard listing={listing()} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/listings/abc");
    expect(link).toHaveTextContent("Loa bluetooth cũ");
    expect(link).toHaveTextContent("từ 500.000 đ/cái");
    expect(link).toHaveTextContent("Nguyen Van A");
  });

  it("marks an in-stock listing in green and shows its photo", () => {
    const { container } = render(<ListingCard listing={listing()} />);

    expect(screen.getByText("Có sẵn")).toHaveClass(
      "bg-positive-soft",
      "text-positive-deep",
    );
    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", "/api/media/listings/abc/x_thumb.webp");
    // Decorative: the title next to it already names the listing.
    expect(image).toHaveAttribute("alt", "");
    expect(screen.queryByText(/Chốt đơn/)).not.toBeInTheDocument();
  });

  it("marks a pre-order in blue with its order deadline", () => {
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

    expect(screen.getByText("Đặt trước")).toHaveClass(
      "bg-primary-soft",
      "text-primary",
    );
    expect(screen.getByText(/^Chốt đơn \d{2}:\d{2} \d{2}\/10\/2026$/)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveTextContent("từ 35.000 đ/kg");
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
