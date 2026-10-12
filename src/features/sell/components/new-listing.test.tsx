import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyListing } from "../lib/listing-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";
import { NewListing } from "./new-listing";

vi.mock("./listing-form", () => ({
  ListingForm: ({
    initialValues,
    onValuesChange,
    onSaved,
  }: {
    initialValues: { title: string; orderDeadline?: string };
    onValuesChange: (values: unknown) => void;
    onSaved: () => void;
  }) => (
    <div>
      <p>
        form:{initialValues.title}:{String("orderDeadline" in initialValues)}
      </p>
      <button
        type="button"
        onClick={() => onValuesChange({ ...emptyListing(), title: "Sách cũ" })}
      >
        typed
      </button>
      <button type="button" onClick={onSaved}>
        saved
      </button>
    </div>
  ),
}));

describe("NewListing", () => {
  beforeEach(() => {
    useSellDraftStore.getState().reset();
  });

  it("opens the form for a product in stock at once, without asking how to sell", () => {
    renderWithIntl(<NewListing />);

    expect(screen.getByRole("heading", { name: "Đăng bán" })).toBeInTheDocument();
    expect(screen.getByText("form::false")).toBeInTheDocument();
    expect(screen.queryByText("Bạn muốn bán theo cách nào?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Đặt trước/ }),
    ).not.toBeInTheDocument();
  });

  it("starts from what was typed before, dropping fields the form no longer has", () => {
    useSellDraftStore.getState().setValues({
      ...emptyListing(),
      title: "Loa cũ",
      // A draft written by an older version of the form.
      ...({ orderDeadline: "2026-10-09T17:00" } as object),
    });

    renderWithIntl(<NewListing />);

    expect(screen.getByText("form:Loa cũ:false")).toBeInTheDocument();
  });

  it("keeps what is typed as a draft", async () => {
    renderWithIntl(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "typed" }));

    expect(useSellDraftStore.getState().values?.title).toBe("Sách cũ");
  });

  it("clears the draft once the listing is saved", async () => {
    useSellDraftStore.getState().setValues({ ...emptyListing(), title: "Loa cũ" });
    renderWithIntl(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "saved" }));

    expect(useSellDraftStore.getState()).toMatchObject({ mode: null, values: null });
  });
});
