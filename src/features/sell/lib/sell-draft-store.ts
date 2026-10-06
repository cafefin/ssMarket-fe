import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ListingFormValues, ListingMode } from "./listing-schema";

interface SellDraftState {
  /** Chosen in the first step of "Đăng bán"; null until then. */
  mode: ListingMode | null;
  /** What has been typed so far, so it survives a detour to the profile page. */
  values: ListingFormValues | null;
  setMode: (mode: ListingMode | null) => void;
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
      setMode: (mode) =>
        set((state) => ({
          mode,
          // Stock and dates belong to one mode only; do not carry them over.
          values:
            state.values && mode !== state.mode
              ? {
                  ...state.values,
                  orderDeadline: "",
                  deliveryDate: "",
                  items: state.values.items.map((item) => ({
                    ...item,
                    stockQuantity: "",
                  })),
                }
              : state.values,
        })),
      setValues: (values) => set({ values }),
      reset: () => set({ mode: null, values: null }),
    }),
    {
      name: "ssmarket-sell-draft",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
