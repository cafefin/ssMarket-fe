import { z, type ZodType } from "zod";
import type { Translator } from "@/shared/i18n/translator";
import type { components } from "@/shared/api/schema";

export const WEBHOOK_PREFIX = "https://chat.googleapis.com/v1/spaces/";

export interface ChatSettingsValues {
  enabled: boolean;
  unlimited: boolean;
  /** Text input; ignored when unlimited. */
  maxPerHour: string;
  sellerCooldownMinutes: string;
  /** "" keeps the stored webhook; only used while replacing it. */
  webhookUrl: string;
  removeWebhook: boolean;
}

function wholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Number(trimmed);
}

export function chatSettingsSchema(
  t: Translator<"admin.chat.validation">,
  hasStoredWebhook: boolean,
): ZodType<ChatSettingsValues, ChatSettingsValues> {
  return z
    .object({
      enabled: z.boolean(),
      unlimited: z.boolean(),
      maxPerHour: z.string(),
      sellerCooldownMinutes: z.string(),
      webhookUrl: z.string(),
      removeWebhook: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (!values.unlimited) {
        const max = wholeNumber(values.maxPerHour);
        if (max === null || max < 1 || max > 60) {
          ctx.addIssue({
            code: "custom",
            path: ["maxPerHour"],
            message: t("maxPerHour"),
          });
        }
      }
      const cooldown = wholeNumber(values.sellerCooldownMinutes);
      if (cooldown === null || cooldown > 1440) {
        ctx.addIssue({
          code: "custom",
          path: ["sellerCooldownMinutes"],
          message: t("cooldown"),
        });
      }
      const url = values.webhookUrl.trim();
      if (url !== "") {
        if (!url.startsWith(WEBHOOK_PREFIX)) {
          ctx.addIssue({
            code: "custom",
            path: ["webhookUrl"],
            message: t("webhook"),
          });
        }
      } else if (values.enabled && (!hasStoredWebhook || values.removeWebhook)) {
        ctx.addIssue({
          code: "custom",
          path: ["webhookUrl"],
          message: t("webhookRequired"),
        });
      }
    }) as ZodType<ChatSettingsValues, ChatSettingsValues>;
}

/** Form values → request body (webhookUrl left out when unchanged, null when removed). */
export function toSettingsUpdate(
  values: ChatSettingsValues,
): components["schemas"]["UpdateChatSettingsDto"] {
  const body: components["schemas"]["UpdateChatSettingsDto"] = {
    enabled: values.enabled,
    maxPerHour: values.unlimited ? null : Number(values.maxPerHour.trim()),
    sellerCooldownMinutes: Number(values.sellerCooldownMinutes.trim()),
  };
  const url = values.webhookUrl.trim();
  if (url !== "") {
    body.webhookUrl = url;
  } else if (values.removeWebhook) {
    body.webhookUrl = null;
  }
  return body;
}
