import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryProvider } from "@/shared/api/query-provider";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { LocaleSync } from "./locale-sync";

const { api, router, cookie } = vi.hoisted(() => ({
  api: { GET: vi.fn() },
  router: { refresh: vi.fn() },
  cookie: { write: vi.fn() },
}));
vi.mock("@/shared/api/client", () => ({ api }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/shared/i18n/locale-cookie", () => ({
  writeLocaleCookie: cookie.write,
}));

function signedInAs(locale: string) {
  api.GET.mockResolvedValue({
    data: { id: "u1", name: "An", locale },
    response: new Response(),
  });
}

function renderSync() {
  return renderWithIntl(
    <QueryProvider>
      <LocaleSync />
    </QueryProvider>,
  );
}

describe("LocaleSync", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("adopts the account's language once when the cookie disagrees", async () => {
    signedInAs("en");
    renderSync();

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(cookie.write).toHaveBeenCalledWith("en");
  });

  it("does nothing when the cookie already matches", async () => {
    signedInAs("vi");
    renderSync();

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(cookie.write).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("ignores a value it does not know", async () => {
    signedInAs("fr");
    renderSync();

    await waitFor(() => expect(api.GET).toHaveBeenCalled());
    expect(cookie.write).not.toHaveBeenCalled();
  });
});
