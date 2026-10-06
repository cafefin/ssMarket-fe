import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/lib/api/client";
import { QueryProvider } from "@/lib/query/query-provider";
import { ProfileForm } from "./profile-form";
import { safeNextPath } from "./profile-schema";

const { api, push, toast, search } = vi.hoisted(() => ({
  api: { GET: vi.fn(), PATCH: vi.fn() },
  push: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
  search: { value: "" },
}));
vi.mock("@/lib/api/client", () => ({ api }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

const banks = [
  { bin: "970436", code: "VCB", shortName: "Vietcombank", name: "Ngoại thương" },
  { bin: "970422", code: "MB", shortName: "MBBank", name: "Quân đội" },
];

const user = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  id: "1",
  email: "an@example.com",
  name: "An",
  avatarUrl: null,
  role: "user",
  locale: "vi",
  deliveryLocation: null,
  bankBin: null,
  bankAccountNumber: null,
  bankAccountName: null,
  ...overrides,
});

async function renderForm(current: CurrentUser = user()) {
  render(
    <QueryProvider>
      <ProfileForm user={current} />
    </QueryProvider>,
  );
  await screen.findByRole("option", { name: /Vietcombank/ });
}

const save = () =>
  userEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ" }));

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    search.value = "";
    api.GET.mockResolvedValue({ data: banks, response: new Response() });
    api.PATCH.mockResolvedValue({ data: user(), response: new Response() });
  });

  it("is pre-filled from the current user", async () => {
    await renderForm(
      user({
        deliveryLocation: "Tầng 7",
        bankBin: "970422",
        bankAccountNumber: "0123456789",
        bankAccountName: "NGUYEN VAN AN",
      }),
    );

    expect(screen.getByLabelText("Vị trí nhận hàng")).toHaveValue("Tầng 7");
    expect(screen.getByLabelText("Ngân hàng")).toHaveValue("970422");
    expect(screen.getByLabelText("Số tài khoản")).toHaveValue("0123456789");
    expect(screen.getByLabelText("Tên chủ tài khoản")).toHaveValue(
      "NGUYEN VAN AN",
    );
  });

  it("saves only a delivery location, sending the bank fields as null", async () => {
    await renderForm();

    await userEvent.type(screen.getByLabelText("Vị trí nhận hàng"), " Tầng 7 ");
    await save();

    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith("/users/me", {
        body: {
          deliveryLocation: "Tầng 7",
          bankBin: null,
          bankAccountNumber: null,
          bankAccountName: null,
        },
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Đã lưu hồ sơ");
    expect(push).not.toHaveBeenCalled();
  });

  it("saves complete bank details", async () => {
    await renderForm();

    await userEvent.selectOptions(screen.getByLabelText("Ngân hàng"), "970436");
    await userEvent.type(screen.getByLabelText("Số tài khoản"), "0123456789");
    await userEvent.type(
      screen.getByLabelText("Tên chủ tài khoản"),
      "Nguyễn Văn An",
    );
    await save();

    await waitFor(() =>
      expect(api.PATCH).toHaveBeenCalledWith("/users/me", {
        body: {
          deliveryLocation: null,
          bankBin: "970436",
          bankAccountNumber: "0123456789",
          bankAccountName: "Nguyễn Văn An",
        },
      }),
    );
  });

  it("asks for all three bank fields when only some are filled", async () => {
    await renderForm();

    await userEvent.selectOptions(screen.getByLabelText("Ngân hàng"), "970436");
    await save();

    expect(
      await screen.findByText(
        "Điền đủ ngân hàng, số tài khoản và tên chủ tài khoản",
      ),
    ).toBeInTheDocument();
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("rejects a malformed account number before calling the API", async () => {
    await renderForm();

    await userEvent.selectOptions(screen.getByLabelText("Ngân hàng"), "970436");
    await userEvent.type(screen.getByLabelText("Số tài khoản"), "12 34");
    await userEvent.type(screen.getByLabelText("Tên chủ tài khoản"), "An");
    await save();

    expect(
      await screen.findByText(/Số tài khoản gồm 4–24 chữ cái hoặc chữ số/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Số tài khoản")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(api.PATCH).not.toHaveBeenCalled();
  });

  it("shows a translated message when the server refuses", async () => {
    api.PATCH.mockResolvedValue({
      error: { code: "TOO_MANY_REQUESTS", message: "ThrottlerException" },
      response: new Response(null, { status: 429 }),
    });
    await renderForm();

    await save();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
      ),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("returns to the page that sent the person here", async () => {
    search.value = "next=/sell/new";
    await renderForm();

    await save();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/sell/new"));
  });

  it("ignores a next parameter that points to another site", async () => {
    search.value = "next=//evil.example";
    await renderForm();

    await save();

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/sell/new", "/sell/new"],
    ["/listings/1/edit?x=1", "/listings/1/edit?x=1"],
    [null, null],
    ["", null],
    ["https://evil.example", null],
    ["//evil.example", null],
    ["/\\evil.example", null],
    ["javascript:alert(1)", null],
  ])("%j -> %j", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
