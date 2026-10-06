import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-error";
import {
  emptyListing,
  type ListingFormValues,
} from "@/lib/listings/listing-schema";
import { QueryProvider } from "@/lib/query/query-provider";
import { ListingForm } from "./listing-form";

const { api, router, toast, submitListing } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  submitListing: vi.fn(),
}));
vi.mock("@/lib/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/sell/new",
}));
vi.mock("@/lib/listings/submit-listing", () => ({ submitListing }));

const categories = [
  { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi" },
  { id: 4, slug: "dien-tu", name: "Điện tử" },
];

const saved = (overrides: object = {}) => ({
  id: "l1",
  failedImages: [],
  publishError: null,
  published: false,
  ...overrides,
});

async function renderForm(
  props: Partial<Parameters<typeof ListingForm>[0]> = {},
) {
  render(
    <QueryProvider>
      <ListingForm mode="in_stock" initialValues={emptyListing()} {...props} />
    </QueryProvider>,
  );
  await screen.findByRole("option", { name: "Điện tử" });
}

const field = (name: string | RegExp) => screen.getByLabelText(name);
const item = (n: number) => screen.getByRole("group", { name: `Mặt hàng ${n}` });
const click = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

async function fillInStock() {
  await userEvent.type(field("Tiêu đề"), "Loa bluetooth cũ");
  await userEvent.selectOptions(field("Loại hàng"), "4");
  await userEvent.type(within(item(1)).getByLabelText("Tên"), "Loa JBL");
  await userEvent.type(within(item(1)).getByLabelText("Đơn giá (đ)"), "500.000");
  await userEvent.type(within(item(1)).getByLabelText("Số lượng có"), "1");
}

const photo = (name: string, type = "image/jpeg", size = 10) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("ListingForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.GET.mockResolvedValue({ data: categories, response: new Response() });
    submitListing.mockResolvedValue(saved());
  });

  describe("fields per mode", () => {
    it("asks for stock, not dates, when selling in-stock goods", async () => {
      await renderForm({ mode: "in_stock" });

      expect(screen.getByText("Hàng có sẵn")).toBeInTheDocument();
      expect(within(item(1)).getByLabelText("Số lượng có")).toBeInTheDocument();
      expect(screen.queryByLabelText("Hạn chốt đơn")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Ngày giao")).not.toBeInTheDocument();
    });

    it("asks for dates, not stock, when taking pre-orders", async () => {
      await renderForm({ mode: "preorder" });

      expect(screen.getByText("Đặt trước")).toBeInTheDocument();
      expect(field("Hạn chốt đơn")).toBeInTheDocument();
      expect(field("Ngày giao")).toBeInTheDocument();
      expect(
        within(item(1)).queryByLabelText("Số lượng có"),
      ).not.toBeInTheDocument();
    });
  });

  describe("items", () => {
    it("adds rows and never removes the last one", async () => {
      await renderForm();

      expect(screen.getByRole("button", { name: "Xóa mặt hàng 1" })).toBeDisabled();

      await click("Thêm mặt hàng");

      expect(item(2)).toBeInTheDocument();
      await click("Xóa mặt hàng 1");
      expect(screen.queryByRole("group", { name: "Mặt hàng 2" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Xóa mặt hàng 1" })).toBeDisabled();
    });
  });

  describe("saving", () => {
    it("shows field errors and saves nothing when the form is invalid", async () => {
      await renderForm();

      await click("Đăng bán");

      await screen.findByText("Tiêu đề gồm 5–120 ký tự");
      const messages = screen
        .getAllByRole("alert")
        .map((alert) => alert.textContent);
      expect(messages).toEqual(
        expect.arrayContaining([
          "Tiêu đề gồm 5–120 ký tự",
          "Chọn loại hàng",
          "Tên mặt hàng gồm 1–120 ký tự",
          "Đơn giá từ 1.000 đ đến 1.000.000.000 đ",
          "Nhập số lượng lớn hơn 0",
        ]),
      );
      expect(field("Tiêu đề")).toHaveAttribute("aria-invalid", "true");
      expect(submitListing).not.toHaveBeenCalled();
    });

    it("publishes a new listing and opens it", async () => {
      submitListing.mockResolvedValue(saved({ published: true }));
      const onSaved = vi.fn();
      await renderForm({ onSaved });
      await fillInStock();

      await click("Đăng bán");

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/listings/l1"));
      expect(submitListing).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: undefined,
          publish: true,
          newImages: [],
          removedImageIds: [],
          body: expect.objectContaining({
            mode: "in_stock",
            title: "Loa bluetooth cũ",
            categoryId: 4,
            orderDeadline: null,
            items: [
              { name: "Loa JBL", unit: "cái", unitPrice: 500000, stockQuantity: "1" },
            ],
          }),
        }),
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Đã đăng bán");
    });

    it("saves a draft and goes to the drafts tab", async () => {
      await renderForm();
      await fillInStock();

      await click("Lưu nháp");

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/sell?tab=draft"),
      );
      expect(submitListing).toHaveBeenCalledWith(
        expect.objectContaining({ publish: false }),
      );
      expect(toast.success).toHaveBeenCalledWith("Đã lưu bản nháp");
    });

    it("points to the profile when QR needs bank details, keeping the form", async () => {
      submitListing.mockRejectedValue(
        new ApiError(422, "BANK_PROFILE_REQUIRED", "Add bank"),
      );
      const onSaved = vi.fn();
      await renderForm({ onSaved });
      await fillInStock();
      await userEvent.click(field(/Chuyển khoản trước qua mã QR/));

      await click("Đăng bán");

      const link = await screen.findByRole("link", {
        name: "Thêm thông tin ngân hàng",
      });
      expect(link).toHaveAttribute("href", "/profile?next=%2Fsell%2Fnew");
      expect(field("Tiêu đề")).toHaveValue("Loa bluetooth cũ");
      expect(onSaved).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it("shows a translated message for other failures", async () => {
      submitListing.mockRejectedValue(
        new ApiError(429, "TOO_MANY_REQUESTS", "ThrottlerException"),
      );
      await renderForm();
      await fillInStock();

      await click("Đăng bán");

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
        ),
      );
    });

    it("names the photos that failed and continues on the edit page", async () => {
      submitListing.mockResolvedValue(saved({ failedImages: ["hong.jpg"] }));
      await renderForm();
      await fillInStock();

      await click("Đăng bán");

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith("/listings/l1/edit"),
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("hong.jpg"),
      );
    });

    it("explains when the listing was saved but could not be published", async () => {
      submitListing.mockResolvedValue(
        saved({ publishError: new ApiError(400, "BAD_REQUEST", "deadline") }),
      );
      await renderForm();
      await fillInStock();

      await click("Đăng bán");

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith("/listings/l1/edit"),
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Đã lưu bản nháp nhưng chưa đăng được."),
      );
    });

    it("reports every change so the caller can keep a draft", async () => {
      const onValuesChange = vi.fn();
      await renderForm({ onValuesChange });

      await userEvent.type(field("Tiêu đề"), "Loa");

      await waitFor(() =>
        expect(onValuesChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ title: "Loa" }),
        ),
      );
    });
  });

  describe("photos", () => {
    it("adds chosen photos to the save and lets one be removed", async () => {
      await renderForm();
      await fillInStock();

      await userEvent.upload(field("Thêm ảnh"), [photo("a.jpg"), photo("b.png", "image/png")]);
      expect(screen.getByAltText("Ảnh 1: a.jpg")).toBeInTheDocument();
      await click("Xóa ảnh 1");
      await click("Lưu nháp");

      await waitFor(() => expect(submitListing).toHaveBeenCalled());
      const [{ newImages }] = submitListing.mock.calls[0] as [{ newImages: File[] }];
      expect(newImages.map((file) => file.name)).toEqual(["b.png"]);
    });

    it("refuses a file that is too large or of the wrong type", async () => {
      await renderForm();

      await userEvent.upload(
        field("Thêm ảnh"),
        [photo("to.jpg", "image/jpeg", 5 * 1024 * 1024 + 1)],
      );
      expect(screen.getByRole("alert")).toHaveTextContent("to.jpg: Ảnh lớn hơn 5 MB.");

      await userEvent.upload(field("Thêm ảnh"), [photo("anh.gif", "image/gif")], {
        applyAccept: false,
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "anh.gif: Ảnh phải là file JPEG, PNG hoặc WebP.",
      );
      expect(screen.queryByAltText(/Ảnh 1/)).not.toBeInTheDocument();
    });

    it("stops at five photos", async () => {
      await renderForm();

      await userEvent.upload(
        field("Thêm ảnh"),
        Array.from({ length: 6 }, (_, i) => photo(`${i + 1}.jpg`)),
      );

      expect(screen.getAllByRole("listitem")).toHaveLength(5);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "6.jpg: Mỗi bài đăng có tối đa 5 ảnh.",
      );
      expect(field("Thêm ảnh")).toBeDisabled();
    });
  });

  describe("editing", () => {
    const values: ListingFormValues = {
      ...emptyListing(),
      title: "Loa bluetooth cũ",
      categoryId: "4",
      items: [{ name: "Loa JBL", unit: "cái", unitPrice: "500.000", stockQuantity: "2" }],
    };
    const images = [
      { id: "img-1", url: "/api/media/a.webp", thumbnailUrl: "/api/media/a_thumb.webp" },
      { id: "img-2", url: "/api/media/b.webp", thumbnailUrl: "/api/media/b_thumb.webp" },
    ];

    it("saves an open listing with one button and returns to it", async () => {
      await renderForm({
        initialValues: values,
        listing: { id: "l1", status: "open", images },
      });

      expect(screen.queryByRole("button", { name: "Đăng bán" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lưu nháp" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Xóa ảnh 1" }));
      await click("Lưu thay đổi");

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/listings/l1"));
      expect(submitListing).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: "l1",
          publish: false,
          removedImageIds: ["img-1"],
        }),
      );
      expect(toast.success).toHaveBeenCalledWith("Đã lưu thay đổi");
    });

    it("keeps a listing in a hidden category selectable as hidden", async () => {
      await renderForm({
        initialValues: { ...values, categoryId: "9" },
        listing: {
          id: "l1",
          status: "open",
          images: [],
          category: { id: 9, slug: "sach", name: "Sách", nameEn: "Books" },
        },
      });

      expect(field("Loại hàng")).toHaveValue("9");
      expect(
        screen.getByRole("option", { name: "Sách (đã ẩn)" }),
      ).toBeInTheDocument();
      await click("Lưu thay đổi");

      await waitFor(() =>
        expect(submitListing).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.objectContaining({ categoryId: 9 }),
          }),
        ),
      );
    });

    it("adds no hidden option when the category is still offered", async () => {
      await renderForm({
        initialValues: values,
        listing: {
          id: "l1",
          status: "open",
          images: [],
          category: { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics" },
        },
      });

      expect(screen.queryByText(/đã ẩn/)).not.toBeInTheDocument();
    });

    it("keeps the selected category once the options load", async () => {
      await renderForm({
        initialValues: values,
        listing: { id: "l1", status: "draft", images: [] },
      });

      expect(field("Loại hàng")).toHaveValue("4");
      expect(screen.getByRole("button", { name: "Đăng bán" })).toBeInTheDocument();
    });
  });
});
