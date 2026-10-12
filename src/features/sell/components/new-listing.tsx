"use client";

import { useTranslations } from "next-intl";
import { ListingForm } from "./listing-form";
import { ModeStep } from "./mode-step";
import { NewCampaign } from "./new-campaign";
import { emptyListing, withListingDefaults } from "../lib/listing-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";

/**
 * Selling: choose between a product in stock and a pre-order round, then
 * fill in the form of that choice.
 */
export function NewListing() {
  const mode = useSellDraftStore((state) => state.mode);
  const setMode = useSellDraftStore((state) => state.setMode);
  const setValues = useSellDraftStore((state) => state.setValues);
  const reset = useSellDraftStore((state) => state.reset);
  const t = useTranslations("sell");

  if (!mode) {
    return <ModeStep onChoose={setMode} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold">
          {mode === "campaign" ? t("campaign.new.title") : t("title")}
        </h1>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t("changeMode")}
        </button>
      </div>
      {mode === "campaign" ? (
        <NewCampaign />
      ) : (
        <ListingForm
          initialValues={withListingDefaults(
            useSellDraftStore.getState().values ?? emptyListing(),
          )}
          onValuesChange={setValues}
          onSaved={reset}
        />
      )}
    </div>
  );
}
