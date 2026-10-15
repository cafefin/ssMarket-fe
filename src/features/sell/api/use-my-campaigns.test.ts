import { describe, expect, it } from "vitest";
import { campaignKeysToInvalidate } from "./use-my-campaigns";

describe("campaignKeysToInvalidate", () => {
  it("names everything that shows the round: lists, the page and the seller's summary", () => {
    expect(campaignKeysToInvalidate("c1")).toEqual([
      ["my-campaigns"],
      ["campaigns"],
      ["campaign", "c1"],
      ["campaign-summary", "c1"],
      ["listings"],
    ]);
  });
});
