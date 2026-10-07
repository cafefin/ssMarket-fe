"use client";

import { ClockIcon, PackageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingMode } from "../lib/listing-schema";

const CHOICES = [
  { mode: "in_stock", icon: PackageIcon },
  { mode: "preorder", icon: ClockIcon },
] as const;

/** The first step of selling: what kind of sale is this? */
export function ModeStep({ onChoose }: { onChoose: (mode: ListingMode) => void }) {
  const t = useTranslations("sell");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("modeStep.question")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            onClick={() => onChoose(choice.mode)}
            className="flex flex-col items-start gap-2 rounded-lg border border-border bg-card p-6 text-left outline-none hover:border-primary hover:bg-primary-soft focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <choice.icon aria-hidden="true" className="size-6 text-primary" />
            <span className="text-lg font-semibold">{t(`modeStep.${choice.mode}.title`)}</span>
            <span>{t(`modeStep.${choice.mode}.description`)}</span>
            <span className="text-sm text-muted-foreground">{t(`modeStep.${choice.mode}.example`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
