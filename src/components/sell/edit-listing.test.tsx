import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ListingDetail } from "@/features/listings";
import { EditListing, toFormValues } from "./edit-listing";

const { listingState, meState } = vi.hoisted(() => ({
  listingState: { data: undefined as unknown, isPending: false, isError: false },
  meState: { data: undefined as unknown },
}));
vi.mock("@/features/listings/api/use-listings", () => ({ useListing: () => listingState }));
vi.mock("@/shared/api/use-current-user", () => ({ useCurrentUser: () => meState }));
const { location } = vi.hoisted(() => ({ location: { search: "" } }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(location.search),
}));
vi.mock("@/components/sell/listing-form", () => ({
  ListingForm: ({ mode, initialValues }: { mode: string; initialValues: { title: string } }) => (
    <p>
      form:{mode}:{initialValues.title}
    </p>
  ),
}));

const listing = (overrides: Partial<ListingDetail> = {}): ListingDetail => ({
  id: "l1",
  title: "Hoa quả tuần 41",
  description: "Giao tận tầng",
  mode: "preorder",
  status: "draft",
  isOpen: false,
  category: { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food" },
  seller: { id: "me", name: "Tôi", avatarUrl: null },
  acceptsPrepaidQr: true,
  acceptsPayOnDelivery: false,
  orderDeadline: "2026-10-09T10:00:00.000Z",
  deliveryDate: "2026-10-12",
  publishedAt: null,
  orderCount: 0,
  reopenedFromId: null,
  items: [
    { id: "i1", name: "Cam sành", unit: "kg", unitPrice: 35000, stockQuantity: null },
  ],
  images: [],
  ...overrides,
});

describe("EditListing", () => {
  beforeEach(() => {
    listingState.data = listing();
    listingState.isPending = false;
    listingState.isError = false;
    meState.data = { id: "me" };
  });

  it("shows a loading state until the listing and the viewer are known", () => {
    listingState.isPending = true;
    listingState.data = undefined;

    render(<EditListing id="l1" />);

    expect(screen.getByLabelText("Đang tải bài đăng")).toBeInTheDocument();
  });

  it("shows the form pre-filled for the seller", () => {
    render(<EditListing id="l1" />);

    expect(screen.getByRole("heading", { name: "Sửa bài đăng" })).toBeInTheDocument();
    expect(screen.getByText("form:preorder:Hoa quả tuần 41")).toBeInTheDocument();
  });

  it("reminds the seller to check a reopened round before publishing", () => {
    location.search = "reopened=1";

    render(<EditListing id="l1" />);

    expect(
      screen.getByText(/Kiểm tra hạn chốt, ngày giao và giá/),
    ).toBeInTheDocument();
    location.search = "";
  });

  it.each([
    ["someone else's listing", () => (meState.data = { id: "other" })],
    ["a listing that cannot be loaded", () => {
      listingState.isError = true;
      listingState.data = undefined;
    }],
  ])("hides the form for %s", (_label, arrange) => {
    arrange();

    render(<EditListing id="l1" />);

    expect(
      screen.getByRole("heading", { name: "Không tìm thấy bài đăng" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
  });

  it("explains that a closed listing cannot be edited", () => {
    listingState.data = listing({ status: "closed" });

    render(<EditListing id="l1" />);

    expect(
      screen.getByRole("heading", { name: "Bài đăng đã đóng nên không sửa được" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về bài đăng của tôi" })).toHaveAttribute(
      "href",
      "/sell",
    );
  });
});

describe("toFormValues", () => {
  it("turns a pre-order listing into form values", () => {
    const values = toFormValues(listing());

    expect(values).toMatchObject({
      title: "Hoa quả tuần 41",
      categoryId: "2",
      acceptsPrepaidQr: true,
      acceptsPayOnDelivery: false,
      deliveryDate: "2026-10-12",
      items: [{ name: "Cam sành", unit: "kg", unitPrice: "35.000", stockQuantity: "" }],
    });
    expect(values.orderDeadline).toMatch(/^2026-10-(09|10)T\d{2}:00$/);
  });

  it("turns an in-stock listing into form values", () => {
    expect(
      toFormValues(
        listing({
          mode: "in_stock",
          orderDeadline: null,
          deliveryDate: null,
          items: [
            { id: "i1", name: "Cam", unit: "kg", unitPrice: 1250000, stockQuantity: 2.5 },
          ],
        }),
      ),
    ).toMatchObject({
      orderDeadline: "",
      deliveryDate: "",
      items: [{ unitPrice: "1.250.000", stockQuantity: "2.5" }],
    });
  });
});
