import { z } from "zod";
import type { Translator } from "@/shared/i18n/translator";

/**
 * Mirrors the backend rules for PATCH /users/me. `t` gives the messages in the
 * language of the page.
 */
export function profileSchema(t: Translator<"profile.validation">) {
  return z
    .object({
      deliveryLocation: z
        .string()
        .trim()
        .max(120, t("maxLength", { max: 120 })),
      bankBin: z.string(),
      bankAccountNumber: z.string().trim(),
      bankAccountName: z.string().trim(),
    })
    .superRefine((value, context) => {
      const filled = [
        value.bankBin,
        value.bankAccountNumber,
        value.bankAccountName,
      ].filter((field) => field !== "").length;
      if (filled === 0) {
        return;
      }
      if (filled < 3) {
        context.addIssue({
          code: "custom",
          path: ["bankBin"],
          message: t("bankIncomplete"),
        });
        return;
      }
      if (!/^[A-Za-z0-9]{4,24}$/.test(value.bankAccountNumber)) {
        context.addIssue({
          code: "custom",
          path: ["bankAccountNumber"],
          message: t("accountNumber"),
        });
      }
      if (
        value.bankAccountName.length < 2 ||
        value.bankAccountName.length > 120
      ) {
        context.addIssue({
          code: "custom",
          path: ["bankAccountName"],
          message: t("accountName"),
        });
      }
    });
}

export type ProfileFormValues = z.infer<ReturnType<typeof profileSchema>>;

/** Form values -> request body. An empty bank section clears the bank. */
export function toProfileUpdate(values: ProfileFormValues) {
  const hasBank = values.bankBin !== "";
  return {
    deliveryLocation: values.deliveryLocation || null,
    bankBin: hasBank ? values.bankBin : null,
    bankAccountNumber: hasBank ? values.bankAccountNumber : null,
    bankAccountName: hasBank ? values.bankAccountName : null,
  };
}

/**
 * Only same-site paths are accepted as a post-save destination, so a crafted
 * link cannot send someone to another website.
 */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next.includes("\\") ? null : next;
}
