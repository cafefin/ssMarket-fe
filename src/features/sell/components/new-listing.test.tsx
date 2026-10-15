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
vi.mock("./new-campaign", () => ({
  NewCampaign: () => <p>round form</p>,
}));

const choose = (name: RegExp) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("NewListing", () => {
  beforeEach(() => {
    useSellDraftStore.getState().reset();
  });

  it("first asks how to sell: in stock, or a pre-order round", () => {
    renderWithIntl(<NewListing />);

    expect(screen.getByRole("heading", { name: "Đăng bán" })).toBeInTheDocument();
    expect(screen.getByText("Bạn muốn bán theo cách nào?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hàng có sẵn/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mở đợt đặt trước/ }),
    ).toHaveTextContent("Nhiều món, một hạn chốt và một ngày giao.");
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
    expect(screen.queryByText("round form")).not.toBeInTheDocument();
  });

  it("opens the form of a product in stock", async () => {
    renderWithIntl(<NewListing />);

    await choose(/Hàng có sẵn/);

    expect(screen.getByRole("heading", { name: "Đăng bán" })).toBeInTheDocument();
    expect(screen.getByText("form::false")).toBeInTheDocument();
    expect(useSellDraftStore.getState().mode).toBe("in_stock");
  });

  it("opens the form of a pre-order round", async () => {
    renderWithIntl(<NewListing />);

    await choose(/Mở đợt đặt trước/);

    expect(
      screen.getByRole("heading", { name: "Mở đợt đặt trước" }),
    ).toBeInTheDocument();
    expect(screen.getByText("round form")).toBeInTheDocument();
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
    expect(useSellDraftStore.getState().mode).toBe("campaign");
  });

  it("returns to the first step with “Đổi cách bán”, keeping what was typed", async () => {
    useSellDraftStore.getState().setMode("campaign");
    useSellDraftStore.getState().setValues({ ...emptyListing(), title: "Loa cũ" });
    renderWithIntl(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "Đổi cách bán" }));

    expect(screen.getByText("Bạn muốn bán theo cách nào?")).toBeInTheDocument();
    await choose(/Hàng có sẵn/);
    expect(screen.getByText("form:Loa cũ:false")).toBeInTheDocument();
  });

  it("speaks English", async () => {
    renderWithIntl(<NewListing />, { locale: "en" });

    await choose(/Open a pre-order round/);

    expect(
      screen.getByRole("button", { name: "Change how you sell" }),
    ).toBeInTheDocument();
  });

  it("starts from what was typed before, dropping fields the form no longer has", () => {
    useSellDraftStore.getState().setMode("in_stock");
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
    useSellDraftStore.getState().setMode("in_stock");
    renderWithIntl(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "typed" }));

    expect(useSellDraftStore.getState().values?.title).toBe("Sách cũ");
  });

  it("clears the draft once the listing is saved", async () => {
    useSellDraftStore.getState().setMode("in_stock");
    useSellDraftStore.getState().setValues({ ...emptyListing(), title: "Loa cũ" });
    renderWithIntl(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "saved" }));

    expect(useSellDraftStore.getState()).toMatchObject({ mode: null, values: null });
  });
});
