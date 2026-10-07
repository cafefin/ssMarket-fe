import { z } from "zod";

const BANK_INCOMPLETE = "Điền đủ ngân hàng, số tài khoản và tên chủ tài khoản";

/** Mirrors the backend rules for PATCH /users/me. */
export const profileSchema = z
  .object({
    deliveryLocation: z.string().trim().max(120, "Tối đa 120 ký tự"),
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
        message: BANK_INCOMPLETE,
      });
      return;
    }
    if (!/^[A-Za-z0-9]{4,24}$/.test(value.bankAccountNumber)) {
      context.addIssue({
        code: "custom",
        path: ["bankAccountNumber"],
        message: "Số tài khoản gồm 4–24 chữ cái hoặc chữ số, không có dấu cách",
      });
    }
    if (
      value.bankAccountName.length < 2 ||
      value.bankAccountName.length > 120
    ) {
      context.addIssue({
        code: "custom",
        path: ["bankAccountName"],
        message: "Tên chủ tài khoản gồm 2–120 ký tự",
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileSchema>;

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
