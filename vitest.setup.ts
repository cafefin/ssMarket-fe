import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom does not implement object URLs, which image previews use.
URL.createObjectURL ??= () => "blob:preview";
URL.revokeObjectURL ??= () => undefined;

// Server components call next-intl's async API, which needs a Next.js request.
// Tests render them with the Vietnamese messages instead.
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { MESSAGES } = await import("@/shared/i18n/messages");
  return {
    getLocale: async () => "vi",
    getTranslations: async (namespace?: string) =>
      createTranslator({
        locale: "vi",
        messages: MESSAGES.vi,
        // Any namespace of the messages; the typed key check happens in pages.
        namespace: namespace as never,
      }),
  };
});
