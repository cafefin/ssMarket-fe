"use client";

import { useTranslations } from "next-intl";
import { LOCALES } from "@/shared/i18n/config";
import { MESSAGES } from "@/shared/i18n/messages";
import { cn } from "@/shared/lib/utils";
import { useSwitchLocale } from "../lib/use-switch-locale";

/**
 * VI / EN as a two-segment pill. The codes stay the same in both languages so
 * someone who cannot read the current one still finds the switch; each button
 * is named in its own language.
 */
export function LocaleSwitch({ className }: { className?: string }) {
  const t = useTranslations("shell.language");
  const { locale, switchTo, isPending } = useSwitchLocale();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn("flex rounded-full border border-border p-0.5", className)}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-label={MESSAGES[code].shell.language.self}
            aria-pressed={active}
            disabled={isPending}
            onClick={() => void switchTo(code)}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
