"use client";

import { useParams } from "next/navigation";
import { CampaignPage } from "@/features/campaigns";
import { CampaignBuyBar } from "@/features/cart";

/** The only place the round page and the cart meet. */
export default function CampaignRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <CampaignPage
      id={id}
      renderBuy={({ campaign, lines, total, valid, clear }) => (
        <CampaignBuyBar
          sellerId={campaign.seller.id}
          lines={lines}
          total={total}
          valid={valid}
          onAdded={clear}
        />
      )}
    />
  );
}
