"use client";

import { useTranslations } from "next-intl";
import { useRef } from "react";
import { MESSAGES } from "@/shared/i18n/messages";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { type ItemFormValues, MAX_ITEMS, invalidItemCount } from "../lib/campaign-schema";
import { parseItemRows } from "../lib/parse-item-rows";
import { readXlsx, xlsxProblem } from "../lib/read-xlsx";
import { LISTING_UNITS } from "../lib/units";

/** Each stored unit with its singular and plural names in both languages. */
const UNIT_LABELS: Record<string, string[]> = Object.fromEntries(
  LISTING_UNITS.map((unit) => [
    unit,
    [MESSAGES.vi, MESSAGES.en].flatMap((messages) => {
      const names = (messages.units as Record<string, { one: string; other: string }>)[unit];
      return names ? [names.one, names.other] : [];
    }),
  ]),
);

interface ImportItemsButtonProps {
  /** Asked once the file has been read, so edits made meanwhile count. */
  defaultUnit: () => string;
  /** How many more products the round can take; asked once the file has been read. */
  room: () => number;
  onImport: (items: ItemFormValues[]) => void;
  /** The outcome of the import, or why the file was refused. */
  onSummary: (text: string) => void;
}

/** The template link and the button that fills the products from an Excel file. */
export function ImportItemsButton({
  defaultUnit,
  room,
  onImport,
  onSummary,
}: ImportItemsButtonProps) {
  const t = useTranslations("sell.campaign.import");
  const tv = useTranslations("sell.validation");
  const input = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    const problem = xlsxProblem(file);
    if (problem) {
      onSummary(t(problem));
      return;
    }
    let rows;
    try {
      rows = await readXlsx(file);
    } catch {
      onSummary(t("unreadable"));
      return;
    }

    const { items, unknownUnits, dropped } = parseItemRows(rows, {
      defaultUnit: defaultUnit(),
      room: room(),
      unitLabels: UNIT_LABELS,
    });
    if (items.length === 0) {
      onSummary(dropped > 0 ? t("full", { max: MAX_ITEMS }) : t("noRows"));
      return;
    }
    onImport(items);
    onSummary(
      t("summary", {
        added: items.length,
        invalid: invalidItemCount(items, tv),
        unknown: unknownUnits,
        dropped,
        max: MAX_ITEMS,
      }),
    );
  };

  return (
    <>
      <a
        href="/templates/campaign-items.xlsx"
        download
        className={buttonVariants({ variant: "link" })}
      >
        {t("template")}
      </a>
      <Button type="button" variant="outline" onClick={() => input.current?.click()}>
        {t("button")}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".xlsx"
        aria-label={t("fileLabel")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Clear it so choosing the same file again still fires a change.
          event.target.value = "";
          if (file) {
            void importFile(file);
          }
        }}
      />
    </>
  );
}
