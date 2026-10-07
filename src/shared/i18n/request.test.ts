import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieValue } = vi.hoisted(() => ({
  cookieValue: { current: undefined as string | undefined },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "NEXT_LOCALE" && cookieValue.current !== undefined
        ? { value: cookieValue.current }
        : undefined,
  }),
}));

// getRequestConfig only wraps the function; call the function directly.
vi.mock("next-intl/server", () => ({
  getRequestConfig: (create: unknown) => create,
}));

const { default: requestConfig } = await import("./request");
const run = requestConfig as unknown as () => Promise<{
  locale: string;
  timeZone: string;
  messages: { metadata: { description: string } };
}>;

describe("request config", () => {
  beforeEach(() => {
    cookieValue.current = undefined;
  });

  it("renders in Vietnamese without a cookie", async () => {
    const config = await run();
    expect(config.locale).toBe("vi");
    expect(config.timeZone).toBe("Asia/Ho_Chi_Minh");
  });

  it("renders in the language of the cookie", async () => {
    cookieValue.current = "en";
    const config = await run();
    expect(config.locale).toBe("en");
    expect(config.messages.metadata.description).toBe(
      "An internal marketplace for employees.",
    );
  });

  it("ignores an unknown value", async () => {
    cookieValue.current = "fr";
    expect((await run()).locale).toBe("vi");
  });
});
