// The query keys of pre-order rounds. Three features read or refresh them
// (`campaigns` shows rounds, `orders` the seller's summary, `sell` the
// seller's own rounds) and may not all import each other, so the keys live
// here, in one place.

/** Lists of open rounds: browse, closing soon, a seller's page. */
export const CAMPAIGNS_QUERY_KEY = ["campaigns"] as const;

/** One round with its products; the viewer's order in it sits under it. */
export const campaignQueryKey = (id: string) => ["campaign", id] as const;

/** The seller's table of who ordered what in a round. */
export const campaignSummaryQueryKey = (id: string) =>
  ["campaign-summary", id] as const;

/** The seller's own rounds, each with its number of orders. */
export const MY_CAMPAIGNS_QUERY_KEY = ["my-campaigns"] as const;
