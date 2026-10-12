import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { QueryProvider } from "@/shared/api/query-provider";
import type { CampaignDetail } from "../api/use-my-campaigns";
import {
  type CampaignFormValues,
  emptyCampaign,
  emptyItem,
  fromCampaign,
} from "../lib/campaign-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";
import type { SubmitCampaignInput } from "../lib/submit-campaign";
import { CampaignForm } from "./campaign-form";
import { NewCampaign } from "./new-campaign";

const { api, router, toast, submitCampaign, me } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  submitCampaign: vi.fn(),
  me: { bankAccountNumber: "0123456789" as string | null },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/sell/new",
}));
vi.mock("../lib/submit-campaign", () => ({ submitCampaign }));

const categories = [
  { id: 2, slug: "thuc-pham-tuoi", name: "Thực phẩm tươi", nameEn: "Fresh food", isPerishable: true },
  { id: 4, slug: "dien-tu", name: "Điện tử", nameEn: "Electronics", isPerishable: false },
];

const saved = (overrides: object = {}) => ({
  id: "c1",
  failedImages: [],
  failedRemovals: 0,
  publishError: null,
  published: false,
  ...overrides,
});

const image = (id: string) => ({
  id,
  url: `/api/media/${id}.jpg`,
  thumbnailUrl: `/api/media/${id}-thumb.jpg`,
});

const round = (overrides: Partial<CampaignDetail> = {}): CampaignDetail => ({
  id: "c1",
  title: "Bánh bao tuần này",
  seller: { id: "me", name: "Tôi", handle: "toi", avatarUrl: null },
  category: categories[0],
  orderDeadline: "2099-10-09T10:00:00.000Z",
  deliveryDate: "2099-10-12",
  itemCount: 2,
  minPrice: 15000,
  thumbnails: [],
  description: "Giao tại sảnh",
  status: "open",
  isOpen: true,
  acceptsPrepaidQr: false,
  acceptsPayOnDelivery: true,
  publishedAt: "2099-10-01T03:00:00.000Z",
  reopenedFromId: null,
  items: [
    {
      id: "i1",
      title: "Bánh bao chay",
      description: "",
      unit: "cái",
      unitPrice: 15000,
      combos: [],
      images: [image("p1"), image("p2")] as CampaignDetail["items"][number]["images"],
      selling: true,
      orderCount: 0,
      removable: true,
    },
    {
      id: "i2",
      title: "Chè khúc bạch",
      description: "",
      unit: "hộp",
      unitPrice: 20000,
      combos: [],
      images: [],
      selling: true,
      orderCount: 3,
      removable: false,
    },
  ],
  ...overrides,
});

async function renderForm(props: Partial<Parameters<typeof CampaignForm>[0]> = {}) {
  renderWithIntl(
    <QueryProvider>
      <CampaignForm initialValues={emptyCampaign()} {...props} />
    </QueryProvider>,
  );
  // By text, and with time to spare: a query by role walks every option of
  // every row, which is slow for a round of 50 products.
  await screen.findByText("Điện tử", {}, { timeout: 5000 });
}

const renderEdit = (campaign = round()) =>
  renderForm({ campaign, initialValues: fromCampaign(campaign) });

const field = (name: string | RegExp) => screen.getByLabelText(name);
const click = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));
const row = (number: number) =>
  screen.getByRole("listitem", { name: `Món ${number}` });

async function fillShared() {
  await userEvent.type(field("Tên đợt"), "Bánh bao tuần này");
  await userEvent.selectOptions(field("Loại hàng"), "2");
  fireEvent.change(field("Hạn chốt đơn"), { target: { value: "2099-10-09T17:00" } });
  fireEvent.change(field("Ngày giao"), { target: { value: "2099-10-12" } });
}

async function fillRow(number: number, title: string, price: string) {
  await userEvent.type(field(`Tên món ${number}`), title);
  await userEvent.type(field(`Giá món ${number} (đ)`), price);
}

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

const lastSubmit = () =>
  submitCampaign.mock.calls.at(-1)?.[0] as SubmitCampaignInput;

const items = (count: number): CampaignFormValues => ({
  ...emptyCampaign(),
  items: Array.from({ length: count }, (_, index) => ({
    ...emptyItem("cái"),
    title: `Bánh ${index + 1}`,
    unitPrice: "15.000",
  })),
});

describe("CampaignForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    me.bankAccountNumber = "0123456789";
    api.GET.mockImplementation((path: string) =>
      Promise.resolve({
        data: path === "/users/me" ? { id: "me", ...me } : categories,
        response: new Response(),
      }),
    );
    submitCampaign.mockResolvedValue(saved());
    useSellDraftStore.getState().reset();
  });

  describe("a new round", () => {
    it("saves the shared part and two products as a draft", async () => {
      const onSaved = vi.fn();
      await renderForm({ onSaved });
      await fillShared();
      await userEvent.type(field("Mô tả"), "Giao tại sảnh");
      await fillRow(1, "Bánh bao chay", "15.000");
      await click("Thêm món");
      await fillRow(2, "Chè khúc bạch", "20000");
      await userEvent.selectOptions(field("Đơn vị món 2"), "hộp");

      await click("Lưu nháp");

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/sell?tab=draft"),
      );
      expect(submitCampaign).toHaveBeenCalledTimes(1);
      expect(lastSubmit()).toMatchObject({
        campaignId: undefined,
        publish: false,
        photos: [
          { newImages: [], removedImageIds: [] },
          { newImages: [], removedImageIds: [] },
        ],
      });
      expect(lastSubmit().body).toEqual({
        title: "Bánh bao tuần này",
        categoryId: 2,
        description: "Giao tại sảnh",
        orderDeadline: new Date("2099-10-09T17:00").toISOString(),
        deliveryDate: "2099-10-12",
        acceptsPrepaidQr: false,
        acceptsPayOnDelivery: true,
        items: [
          {
            title: "Bánh bao chay",
            description: "",
            unit: "cái",
            unitPrice: 15000,
            combos: [],
            selling: true,
          },
          {
            title: "Chè khúc bạch",
            description: "",
            unit: "hộp",
            unitPrice: 20000,
            combos: [],
            selling: true,
          },
        ],
      });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith("Đã lưu bản nháp");
    });

    it("publishes with “Đăng đợt” and opens the round", async () => {
      submitCampaign.mockResolvedValue(saved({ published: true }));
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Đăng đợt");

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/campaigns/c1"),
      );
      expect(lastSubmit().publish).toBe(true);
      expect(toast.success).toHaveBeenCalledWith("Đã đăng đợt");
    });

    it("saves a draft when Enter is pressed in a text field, and does not publish", async () => {
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await userEvent.type(field("Tên đợt"), "{Enter}");

      await waitFor(() => expect(submitCampaign).toHaveBeenCalledTimes(1));
      expect(lastSubmit().publish).toBe(false);
    });

    it("shows each problem next to its field and sends nothing", async () => {
      await renderForm();
      await click("Thêm món");
      await userEvent.type(field("Tên món 2"), "Chè");

      await click("Đăng đợt");

      await screen.findByText("Tên đợt gồm 5–120 ký tự");
      expect(
        screen.getAllByRole("alert").map((alert) => alert.textContent),
      ).toContain("Chọn loại hàng");
      expect(screen.getByText("Chọn hạn chốt đơn")).toBeInTheDocument();
      expect(screen.getByText("Chọn ngày giao")).toBeInTheDocument();
      expect(row(1)).toHaveTextContent("Tên món gồm 2–120 ký tự");
      expect(row(1)).toHaveTextContent("Đơn giá từ 1.000 đ đến 1.000.000.000 đ");
      expect(row(2)).not.toHaveTextContent("Tên món gồm 2–120 ký tự");
      expect(row(2)).toHaveTextContent("Đơn giá từ 1.000 đ đến 1.000.000.000 đ");
      expect(field("Tên món 1")).toHaveAttribute("aria-invalid", "true");
      expect(submitCampaign).not.toHaveBeenCalled();
    });

    it("says that a round needs a product when the last one is removed", async () => {
      await renderForm();
      await fillShared();
      await click("Xóa món 1");
      expect(screen.getByText("0/50")).toBeInTheDocument();

      await click("Lưu nháp");

      expect(await screen.findByText("Thêm ít nhất một món")).toBeInTheDocument();
      expect(submitCampaign).not.toHaveBeenCalled();
    });

    it("adds a product in the default unit and counts the products", async () => {
      await renderForm();
      expect(screen.getByText("1/50")).toBeInTheDocument();
      expect(field("Đơn vị món 1")).toHaveValue("cái");

      await userEvent.selectOptions(field("Đơn vị mặc định"), "hộp");
      await click("Thêm món");

      expect(screen.getByText("2/50")).toBeInTheDocument();
      expect(field("Đơn vị món 2")).toHaveValue("hộp");
      expect(field("Đơn vị món 1")).toHaveValue("cái");
    });

    it("removes a product and renumbers the rest", async () => {
      await renderForm({ initialValues: items(3) });

      await click("Xóa món 2");

      expect(screen.getByText("2/50")).toBeInTheDocument();
      expect(field("Tên món 1")).toHaveValue("Bánh 1");
      expect(field("Tên món 2")).toHaveValue("Bánh 3");
      expect(screen.queryByLabelText("Tên món 3")).not.toBeInTheDocument();
    });

    it("stops at 50 products and says why", async () => {
      await renderForm({ initialValues: items(50) });

      expect(screen.getByText("50/50")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Thêm món" })).toBeDisabled();
      expect(screen.getByText("Mỗi đợt tối đa 50 món.")).toBeInTheDocument();
    }, 15_000);

    it("does not show the limit while products can still be added", async () => {
      await renderForm({ initialValues: items(2) });

      expect(screen.getByRole("button", { name: "Thêm món" })).toBeEnabled();
      expect(screen.queryByText("Mỗi đợt tối đa 50 món.")).not.toBeInTheDocument();
    });

    it("opens a row to its description, combos and photos", async () => {
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");
      expect(screen.queryByLabelText("Mô tả món 1")).not.toBeInTheDocument();

      await click("Mở rộng món 1");
      await userEvent.type(field("Mô tả món 1"), "Nhân nấm");
      await click("Thêm combo");
      await userEvent.type(field("Số lượng combo 1"), "10");
      await userEvent.type(field("Giá cả combo 1 (đ)"), "120.000");
      await userEvent.upload(field("Thêm ảnh"), [photo("a.jpg"), photo("b.jpg")]);
      expect(screen.getByAltText("Ảnh 1: a.jpg")).toBeInTheDocument();
      await click("Xóa ảnh 1");

      await click("Thu gọn món 1");
      expect(screen.queryByLabelText("Mô tả món 1")).not.toBeInTheDocument();
      // The first photo is the row's thumbnail, also while closed.
      expect(screen.getByAltText("Ảnh món 1")).toBeInTheDocument();

      await click("Lưu nháp");

      await waitFor(() => expect(submitCampaign).toHaveBeenCalled());
      expect(lastSubmit().body.items[0]).toMatchObject({
        description: "Nhân nấm",
        combos: [{ quantity: "10", price: 120000 }],
      });
      expect(lastSubmit().photos[0].newImages.map((file) => file.name)).toEqual([
        "b.jpg",
      ]);
    });

    it("opens the photos from the “+” of a row without a photo", async () => {
      await renderForm();

      await click("Thêm ảnh cho món 1");

      expect(field("Thêm ảnh")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Thu gọn món 1" }),
      ).toHaveAttribute("aria-expanded", "true");
    });

    it("opens a closed row whose hidden fields are wrong", async () => {
      const values = items(1);
      values.items[0].combos = [{ quantity: "1", price: "10.000" }];
      await renderForm({ initialValues: values });
      await fillShared();

      await click("Lưu nháp");

      expect(
        await screen.findByText(
          "Số lượng combo phải lớn hơn 1 và chia hết cho bước bán (kg: bước 0,1)",
        ),
      ).toBeInTheDocument();
      expect(submitCampaign).not.toHaveBeenCalled();
    });

    it("keeps the photos with their row when an earlier row is removed", async () => {
      await renderForm({ initialValues: items(2) });
      await fillShared();
      await click("Mở rộng món 2");
      await userEvent.upload(field("Thêm ảnh"), [photo("che.jpg")]);

      await click("Xóa món 1");
      await click("Lưu nháp");

      await waitFor(() => expect(submitCampaign).toHaveBeenCalled());
      expect(lastSubmit().body.items.map((item) => item.title)).toEqual(["Bánh 2"]);
      expect(lastSubmit().photos).toHaveLength(1);
      expect(lastSubmit().photos[0].newImages.map((file) => file.name)).toEqual([
        "che.jpg",
      ]);
    });

    it("points to the profile when QR is chosen without bank details", async () => {
      me.bankAccountNumber = null;
      await renderForm();
      expect(
        screen.queryByRole("link", { name: "Thêm thông tin ngân hàng" }),
      ).not.toBeInTheDocument();

      await userEvent.click(field(/Chuyển khoản trước qua mã QR/));

      expect(
        await screen.findByRole("link", { name: "Thêm thông tin ngân hàng" }),
      ).toHaveAttribute("href", "/profile?next=%2Fsell%2Fnew");
    });

    it("does not mention the bank when the seller has bank details", async () => {
      await renderForm();

      await userEvent.click(field(/Chuyển khoản trước qua mã QR/));

      expect(
        screen.queryByRole("link", { name: "Thêm thông tin ngân hàng" }),
      ).not.toBeInTheDocument();
    });

    it("points to the profile when the server asks for bank details", async () => {
      submitCampaign.mockRejectedValue(
        new ApiError(422, "BANK_PROFILE_REQUIRED", "Add bank"),
      );
      const onSaved = vi.fn();
      await renderForm({ onSaved });
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Đăng đợt");

      expect(
        await screen.findByRole("link", { name: "Thêm thông tin ngân hàng" }),
      ).toBeInTheDocument();
      expect(field("Tên đợt")).toHaveValue("Bánh bao tuần này");
      expect(onSaved).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });

    it("names the photos that failed and continues on the edit page", async () => {
      submitCampaign.mockResolvedValue(saved({ failedImages: ["hong.jpg"] }));
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Đăng đợt");

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith("/campaigns/c1/edit"),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Đã lưu đợt nhưng chưa tải được ảnh: hong.jpg. Hãy thử thêm lại ảnh.",
      );
    });

    it("tells the seller when a photo could not be removed, and still publishes", async () => {
      submitCampaign.mockResolvedValue(saved({ published: true, failedRemovals: 2 }));
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Đăng đợt");

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/campaigns/c1"),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Không xóa được 2 ảnh. Hãy mở món và xóa lại.",
      );
    });

    it("explains when the round was saved but could not be published", async () => {
      submitCampaign.mockResolvedValue(
        saved({ publishError: new ApiError(400, "BAD_REQUEST", "deadline") }),
      );
      await renderForm();
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Đăng đợt");

      await waitFor(() =>
        expect(router.replace).toHaveBeenCalledWith("/campaigns/c1/edit"),
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Đã lưu bản nháp nhưng chưa đăng được."),
      );
    });

    it("speaks English", async () => {
      renderWithIntl(
        <QueryProvider>
          <CampaignForm initialValues={emptyCampaign()} />
        </QueryProvider>,
        { locale: "en" },
      );
      await screen.findByRole("option", { name: "Electronics" });

      await userEvent.click(screen.getByRole("button", { name: "Publish round" }));

      expect(
        await screen.findByText("The round name has 5–120 characters"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Product 1 name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add a product" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    });
  });

  describe("the draft", () => {
    it("is written to the draft store while typing, and starts the next visit", async () => {
      const first = renderWithIntl(
        <QueryProvider>
          <NewCampaign />
        </QueryProvider>,
      );
      await screen.findByRole("option", { name: "Điện tử" });

      await userEvent.type(field("Tên đợt"), "Hoa quả");
      await userEvent.type(field("Tên món 1"), "Cam");

      await waitFor(() =>
        expect(useSellDraftStore.getState().campaignValues).toMatchObject({
          title: "Hoa quả",
          items: [{ title: "Cam" }],
        }),
      );

      first.unmount();
      renderWithIntl(
        <QueryProvider>
          <NewCampaign />
        </QueryProvider>,
      );

      expect(field("Tên đợt")).toHaveValue("Hoa quả");
      expect(field("Tên món 1")).toHaveValue("Cam");
    });

    it("is cleared once the round is saved", async () => {
      useSellDraftStore.getState().setMode("campaign");
      renderWithIntl(
        <QueryProvider>
          <NewCampaign />
        </QueryProvider>,
      );
      await screen.findByRole("option", { name: "Điện tử" });
      await fillShared();
      await fillRow(1, "Bánh bao chay", "15.000");

      await click("Lưu nháp");

      await waitFor(() => expect(router.push).toHaveBeenCalled());
      expect(useSellDraftStore.getState()).toMatchObject({
        mode: null,
        campaignValues: null,
      });
    });

    it("is not written while editing a saved round", async () => {
      await renderEdit();

      await userEvent.type(field("Tên đợt"), " mới");

      expect(field("Tên đợt")).toHaveValue("Bánh bao tuần này mới");
      expect(useSellDraftStore.getState().campaignValues).toBeNull();
    });
  });

  describe("editing", () => {
    it("offers one “Lưu thay đổi” for an open round and sends each product's id", async () => {
      await renderEdit();
      expect(screen.queryByRole("button", { name: "Đăng đợt" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lưu nháp" })).not.toBeInTheDocument();

      await click("Lưu thay đổi");

      await waitFor(() =>
        expect(router.push).toHaveBeenCalledWith("/campaigns/c1"),
      );
      expect(lastSubmit()).toMatchObject({ campaignId: "c1", publish: false });
      expect(lastSubmit().body.items).toMatchObject([
        { id: "i1", title: "Bánh bao chay", selling: true },
        { id: "i2", title: "Chè khúc bạch", selling: true },
      ]);
      expect(toast.success).toHaveBeenCalledWith("Đã lưu thay đổi");
    });

    it("offers both buttons for a draft", async () => {
      await renderEdit(round({ status: "draft", isOpen: false, publishedAt: null }));

      expect(screen.getByRole("button", { name: "Đăng đợt" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Lưu nháp" })).toBeInTheDocument();
    });

    it("lets a product with orders stop selling instead of being removed", async () => {
      await renderEdit();

      expect(within(row(1)).getByRole("button", { name: "Xóa món 1" })).toBeInTheDocument();
      expect(within(row(1)).queryByRole("switch")).not.toBeInTheDocument();
      expect(
        within(row(2)).queryByRole("button", { name: "Xóa món 2" }),
      ).not.toBeInTheDocument();
      const stop = within(row(2)).getByRole("switch", { name: "Ngừng bán" });
      expect(stop).not.toBeChecked();
      expect(row(2)).toHaveTextContent("3 đơn");

      await userEvent.click(stop);
      expect(stop).toBeChecked();
      await click("Lưu thay đổi");

      await waitFor(() => expect(submitCampaign).toHaveBeenCalled());
      expect(lastSubmit().body.items).toMatchObject([
        { id: "i1", selling: true },
        { id: "i2", selling: false },
      ]);
    });

    it("shows a stopped product as stopped", async () => {
      const campaign = round();
      campaign.items[1].selling = false;
      await renderEdit(campaign);

      expect(within(row(2)).getByRole("switch", { name: "Ngừng bán" })).toBeChecked();
    });

    it("shows the saved photos and removes the ones crossed out", async () => {
      await renderEdit();
      expect(within(row(1)).getByAltText("Ảnh món 1")).toHaveAttribute(
        "src",
        "/api/media/p1-thumb.jpg",
      );

      await click("Mở rộng món 1");
      await click("Xóa ảnh 1");
      await click("Lưu thay đổi");

      await waitFor(() => expect(submitCampaign).toHaveBeenCalled());
      expect(lastSubmit().photos).toEqual([
        { newImages: [], removedImageIds: ["p1"] },
        { newImages: [], removedImageIds: [] },
      ]);
    });

    it("tells the seller to stop selling when a removed product has orders", async () => {
      submitCampaign.mockRejectedValue(
        new ApiError(409, "CAMPAIGN_ITEM_HAS_ORDERS", "has orders"),
      );
      await renderEdit();

      await click("Xóa món 1");
      await click("Lưu thay đổi");

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Món này đã có người đặt nên không xóa được. Hãy bật “Ngừng bán” cho món đó thay vì xóa.",
        ),
      );
      expect(router.push).not.toHaveBeenCalled();
    });

    it("keeps a category that was hidden after the round was created", async () => {
      await renderEdit(
        round({
          category: { id: 9, slug: "cu", name: "Đồ cũ", nameEn: "Used", isPerishable: false },
        }),
      );

      expect(
        await screen.findByRole("option", { name: "Đồ cũ (đã ẩn)" }),
      ).toBeInTheDocument();
      expect(field("Loại hàng")).toHaveValue("9");
    });
  });
});
