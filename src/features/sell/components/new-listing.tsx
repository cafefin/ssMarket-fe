"use client";

import { useTranslations } from "next-intl";
import { ListingForm } from "./listing-form";
import { emptyListing, withListingDefaults } from "../lib/listing-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";

/** Selling a product in stock: the form, with what was typed before kept. */
export function NewListing() {
  const setValues = useSellDraftStore((state) => state.setValues);
  const reset = useSellDraftStore((state) => state.reset);
  const t = useTranslations("sell");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-semibold">{t("title")}</h1>
      <ListingForm
        initialValues={withListingDefaults(
          useSellDraftStore.getState().values ?? emptyListing(),
        )}
        onValuesChange={setValues}
        onSaved={reset}
      />
    </div>
  );
}
