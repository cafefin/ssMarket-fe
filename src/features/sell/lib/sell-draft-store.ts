import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ListingFormValues } from "./listing-schema";

/** What is being sold: a product in stock, or a pre-order round. */
export type SellMode = "in_stock" | "campaign";

interface SellDraftState {
  /** Chosen in the first step of selling; null until then. */
  mode: SellMode | null;
  /** What has been typed so far, so it survives a detour to the profile page. */
  values: ListingFormValues | null;
  setMode: (mode: SellMode | null) => void;
  setValues: (values: ListingFormValues) => void;
  reset: () => void;
}

/**
 * The unfinished new listing. Kept in sessionStorage: it survives navigation
 * and reloads in this tab, and disappears when the tab is closed. Photos are
 * not kept, because files cannot be stored there.
 */
export const useSellDraftStore = create<SellDraftState>()(
  persist(
    (set) => ({
      mode: null,
      values: null,
      setMode: (mode) => set({ mode }),
      setValues: (values) => set({ values }),
      reset: () => set({ mode: null, values: null }),
    }),
    {
      // "-2": drafts of the form that still had pre-order fields are not read.
      name: "ssmarket-sell-draft-2",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
