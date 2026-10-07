import { screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { CategoryAdmin } from "./category-admin";

const { api, router, toast } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
  router: { replace: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const rows = [
  {
    id: 2,
    slug: "thuc-pham-tuoi",
    name: "Thực phẩm tươi",
    nameEn: "Fresh food",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 4,
    slug: "dien-tu",
    name: "Điện tử",
    nameEn: "Electronics",
    sortOrder: 4,
    isActive: false,
  },
];

function setup(role: "admin" | "user" = "admin", locale: "vi" | "en" = "vi") {
  api.GET.mockImplementation(async (path: string) => {
    if (path === "/users/me") {
      return { data: { id: "u1", name: "An", role } };
    }
    return { data: rows };
  });
  api.POST.mockResolvedValue({ data: { ...rows[0], id: 9 } });
  api.PATCH.mockResolvedValue({ data: rows[0] });
  renderWithIntl(
    <QueryProvider>
      <CategoryAdmin />
    </QueryProvider>,
    { locale },
  );
}

const rowOf = (name: string) =>
  screen.getByRole("row", { name: new RegExp(name) });

describe("CategoryAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every category with its status", async () => {
    setup();
    const table = await screen.findByRole("table");
    for (const h of ["Tên", "Tên tiếng Anh", "Thứ tự", "Trạng thái"]) {
      expect(
        within(table).getByRole("columnheader", { name: h }),
      ).toBeInTheDocument();
    }
    expect(within(rowOf("Điện tử")).getByText("Đang ẩn")).toBeInTheDocument();
    expect(
      within(rowOf("Thực phẩm tươi")).getByText("Đang hiện"),
    ).toBeInTheDocument();
  });

  it("works in English and names rows by their English name", async () => {
    setup("admin", "en");

    const table = await screen.findByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "English name" }),
    ).toBeInTheDocument();
    expect(within(rowOf("Electronics")).getByText("Hidden")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Fresh food" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Electronics" })).toBeInTheDocument();
  });

  it("adds a category and clears the form", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Tên danh mục"), "Sách");
    await user.type(screen.getByLabelText("Tên tiếng Anh"), "Books");
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/admin/categories", {
        body: { name: "Sách", nameEn: "Books", isPerishable: false },
      }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã thêm danh mục"),
    );
    expect(screen.getByLabelText("Tên danh mục")).toHaveValue("");
    expect(screen.getByLabelText("Tên tiếng Anh")).toHaveValue("");
  });

  it("validates the add form", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(await screen.findByText("Nhập tên danh mục")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tên danh mục"), "a".repeat(41));
    await user.type(screen.getByLabelText("Tên tiếng Anh"), "Books");
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(await screen.findByText("Tối đa 40 ký tự")).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the category exists", async () => {
    setup();
    api.POST.mockResolvedValue({
      error: { code: "CATEGORY_EXISTS", message: "x" },
      response: new Response(null, { status: 409 }),
    });
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Tên danh mục"), "Sách");
    await user.type(screen.getByLabelText("Tên tiếng Anh"), "Books");
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Đã có danh mục với tên này."),
    );
  });

  it("hides and shows a category", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Ẩn Thực phẩm tươi" }));
    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith("/admin/categories/{id}", {
        params: { path: { id: 2 } },
        body: { isActive: false },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã ẩn danh mục");
    await user.click(screen.getByRole("button", { name: "Hiện Điện tử" }));
    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith("/admin/categories/{id}", {
        params: { path: { id: 4 } },
        body: { isActive: true },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã hiện danh mục");
  });

  it("shows an error when toggling fails", async () => {
    setup();
    api.PATCH.mockResolvedValue({
      error: { code: "NOT_FOUND", message: "x" },
      response: new Response(null, { status: 404 }),
    });
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Ẩn Thực phẩm tươi" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Không tìm thấy nội dung bạn yêu cầu.",
      ),
    );
  });

  it("edits a category in place", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    const row = screen.getByRole("row", { name: /Lưu/ });
    const name = within(row).getByLabelText("Tên");
    expect(name).toHaveValue("Điện tử");
    expect(within(row).getByLabelText("Tên tiếng Anh")).toHaveValue(
      "Electronics",
    );
    expect(within(row).getByLabelText("Thứ tự")).toHaveValue(4);
    await user.clear(name);
    await user.type(name, "Đồ điện tử");
    await user.click(within(row).getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith("/admin/categories/{id}", {
        params: { path: { id: 4 } },
        body: {
          name: "Đồ điện tử",
          nameEn: "Electronics",
          sortOrder: 4,
          isPerishable: false,
        },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã lưu danh mục");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull(),
    );
  });

  it("validates the edit row and can cancel", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    const sort = screen.getByLabelText("Thứ tự");
    await user.clear(sort);
    await user.type(sort, "-1");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(
      await screen.findByText("Thứ tự là số nguyên từ 0"),
    ).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("keeps editing and reports an error when saving fails", async () => {
    setup();
    api.PATCH.mockResolvedValue({
      error: { code: "CATEGORY_EXISTS", message: "x" },
      response: new Response(null, { status: 409 }),
    });
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Đã có danh mục với tên này."),
    );
    expect(screen.getByRole("button", { name: "Lưu" })).toBeInTheDocument();
  });

  it("rejects an empty sort order", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    await user.clear(screen.getByLabelText("Thứ tự"));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(
      await screen.findByText("Thứ tự là số nguyên từ 0"),
    ).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("shows the error and retries when the list cannot load", async () => {
    setup();
    let fail = true;
    api.GET.mockImplementation(async (path: string) => {
      if (path === "/users/me") {
        return { data: { id: "u1", name: "An", role: "admin" } };
      }
      return fail
        ? {
            error: { code: "FORBIDDEN", message: "x" },
            response: new Response(null, { status: 403 }),
          }
        : { data: rows };
    });
    const user = userEvent.setup();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Bạn không có quyền thực hiện thao tác này.",
    );
    fail = false;
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("moves focus into the row when editing and back when done", async () => {
    setup();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    expect(screen.getByLabelText("Tên")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByRole("button", { name: "Sửa Điện tử" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Sửa Điện tử" }));
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sửa Điện tử" })).toHaveFocus(),
    );
  });

  it("has an accessible table caption", async () => {
    setup();
    expect(
      await screen.findByRole("table", { name: "Danh sách danh mục" }),
    ).toBeInTheDocument();
  });

  it("sends non-admins home without fetching admin data", async () => {
    setup("user");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("table")).toBeNull();
    expect(api.GET).not.toHaveBeenCalledWith("/admin/categories");
  });

  it("shows a skeleton and fetches no admin data while the user loads", () => {
    api.GET.mockReturnValue(new Promise(() => {}));
    renderWithIntl(
      <QueryProvider>
        <CategoryAdmin />
      </QueryProvider>,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(api.GET).not.toHaveBeenCalledWith("/admin/categories");
    expect(router.replace).not.toHaveBeenCalled();
  });
});
