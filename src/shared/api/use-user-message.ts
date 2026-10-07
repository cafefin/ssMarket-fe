import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { MESSAGES } from "@/shared/i18n/messages";
import { ApiError } from "./api-error";

type ErrorCode = keyof (typeof MESSAGES)["vi"]["errors"]["codes"];

function isKnownCode(code: string): code is ErrorCode {
  return Object.hasOwn(MESSAGES.vi.errors.codes, code);
}

/**
 * Returns a function giving the text to show a person for a failed action.
 * Backend messages are written for developers, in English, so they are never
 * shown directly; the text comes from `errors` in the message files.
 */
export function useUserMessage(): (error: unknown) => string {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown) =>
      error instanceof ApiError && isKnownCode(error.code)
        ? t(`codes.${error.code}`)
        : t("generic"),
    [t],
  );
}
