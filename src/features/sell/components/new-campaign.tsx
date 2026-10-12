"use client";

import { emptyCampaign } from "../lib/campaign-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";
import { CampaignForm } from "./campaign-form";

/** Opening a pre-order round: the form, with what was typed before kept. */
export function NewCampaign() {
  const setCampaignValues = useSellDraftStore((state) => state.setCampaignValues);
  const reset = useSellDraftStore((state) => state.reset);

  return (
    <CampaignForm
      initialValues={
        useSellDraftStore.getState().campaignValues ?? emptyCampaign()
      }
      onValuesChange={setCampaignValues}
      onSaved={reset}
    />
  );
}
