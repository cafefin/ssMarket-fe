import { afterEach, describe, expect, it, vi } from "vitest";
import { writeLocaleCookie } from "./locale-cookie";

describe("writeLocaleCookie", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes NEXT_LOCALE for the whole site for a year", () => {
    const set = vi.spyOn(document, "cookie", "set");

    writeLocaleCookie("en");

    expect(set).toHaveBeenCalledWith(
      "NEXT_LOCALE=en; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });
});
