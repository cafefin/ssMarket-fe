import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyListing } from "../lib/listing-schema";
import { useSellDraftStore } from "../lib/sell-draft-store";
import { NewListing } from "./new-listing";

vi.mock("./listing-form", () => ({
  ListingForm: ({
    mode,
    initialValues,
    onSaved,
  }: {
    mode: string;
    initialValues: { title: string };
    onSaved: () => void;
  }) => (
    <div>
      <p>
        form:{mode}:{initialValues.title}
      </p>
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

  it("starts by asking how the person wants to sell", () => {
    render(<NewListing />);

    expect(screen.getByText("Bạn muốn bán theo cách nào?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hàng có sẵn/ })).toHaveTextContent(
      "Đồ bạn đang có, bán đến khi hết.",
    );
    expect(screen.getByRole("button", { name: /Đặt trước/ })).toHaveTextContent(
      "Nhận đăng ký đến hạn chốt, giao theo đợt.",
    );
    expect(screen.queryByText(/^form:/)).not.toBeInTheDocument();
  });

  it("shows the form for the chosen mode", async () => {
    render(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: /Đặt trước/ }));

    expect(screen.getByText("form:preorder:")).toBeInTheDocument();
    expect(useSellDraftStore.getState().mode).toBe("preorder");
  });

  it("goes back to the choice without losing what was typed", async () => {
    useSellDraftStore.getState().setMode("in_stock");
    useSellDraftStore.getState().setValues({ ...emptyListing(), title: "Loa cũ" });
    render(<NewListing />);
    expect(screen.getByText("form:in_stock:Loa cũ")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Đổi hình thức" }));
    await userEvent.click(screen.getByRole("button", { name: /Đặt trước/ }));

    expect(screen.getByText("form:preorder:Loa cũ")).toBeInTheDocument();
  });

  it("clears the draft once the listing is saved", async () => {
    useSellDraftStore.getState().setMode("in_stock");
    useSellDraftStore.getState().setValues({ ...emptyListing(), title: "Loa cũ" });
    render(<NewListing />);

    await userEvent.click(screen.getByRole("button", { name: "saved" }));

    expect(useSellDraftStore.getState()).toMatchObject({ mode: null, values: null });
    expect(screen.getByText("Bạn muốn bán theo cách nào?")).toBeInTheDocument();
  });
});
