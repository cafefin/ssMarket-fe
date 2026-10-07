"use client";

import { ListingForm } from "./listing-form";
import { ModeStep } from "./mode-step";
import { emptyListing } from "../lib/listing-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";

/** "Đăng bán": choose the mode, then fill in the form for that mode. */
export function NewListing() {
  const mode = useSellDraftStore((state) => state.mode);
  const setMode = useSellDraftStore((state) => state.setMode);
  const setValues = useSellDraftStore((state) => state.setValues);
  const reset = useSellDraftStore((state) => state.reset);

  if (!mode) {
    return <ModeStep onChoose={setMode} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[28px] leading-tight font-semibold">Đăng bán</h1>
        <button
          type="button"
          onClick={() => setMode(null)}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Đổi hình thức
        </button>
      </div>
      <ListingForm
        // A different mode means different rules, so start a fresh form.
        key={mode}
        mode={mode}
        initialValues={useSellDraftStore.getState().values ?? emptyListing()}
        onValuesChange={setValues}
        onSaved={reset}
      />
    </div>
  );
}
