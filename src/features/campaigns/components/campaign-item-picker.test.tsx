import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import type { PickerItem, Selection } from "../lib/selection";
import { CampaignItemPicker } from "./campaign-item-picker";

const item = (id: string, overrides: Partial<PickerItem> = {}): PickerItem => ({
  id,
  title: `Món ${id}`,
  description: "",
  unit: "cái",
  unitPrice: 18000,
  combos: [],
  thumbnailUrl: null,
  selling: true,
  max: null,
  ...overrides,
});

const ITEMS = [
  item("a", {
    title: "Xôi gà",
    description: "Xôi nếp cái hoa vàng, gà xé",
    combos: [{ quantity: "10", price: 160000 }],
    thumbnailUrl: "/xoi-thumb.webp",
  }),
  item("b", { title: "Cam sành", unit: "kg", unitPrice: 35000 }),
];

function renderPicker(
  selection: Selection = {},
  props: Partial<React.ComponentProps<typeof CampaignItemPicker>> = {},
) {
  const onChange = vi.fn();
  const view = renderWithIntl(
    <CampaignItemPicker
      items={ITEMS}
      selection={selection}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, ...view };
}

const row = (title: string) => {
  const found = screen.getByText(title).closest("li");
  if (!found) {
    throw new Error(`No row for ${title}`);
  }
  return within(found);
};

describe("CampaignItemPicker", () => {
  it("shows one row per product with its title, price, description and deals", () => {
    const { container } = renderPicker();

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const xoi = row("Xôi gà");
    expect(xoi.getByText("18.000 đ")).toBeInTheDocument();
    expect(xoi.getByText("Xôi nếp cái hoa vàng, gà xé")).toBeInTheDocument();
    expect(xoi.getByText("10 cái: 160.000 đ")).toBeInTheDocument();
    expect(row("Cam sành").getByText("35.000 đ")).toBeInTheDocument();
    expect(row("Cam sành").getByText("/kg")).toBeInTheDocument();
    // A photo when there is one, a placeholder otherwise.
    expect(container.querySelector("img")).toHaveAttribute("src", "/xoi-thumb.webp");
    expect(row("Cam sành").getByTestId("image-placeholder")).toBeInTheDocument();
  });

  it("suggests the combo a quantity is close to", () => {
    renderPicker({ a: "8" });
    expect(
      row("Xôi gà").getByText("Mua thêm 2 cái để được combo 10 cái giá 160.000 đ"),
    ).toBeInTheDocument();
    expect(row("Cam sành").queryByText(/Mua thêm/)).not.toBeInTheDocument();
  });

  it("labels each quantity with the product's title, empty until chosen", () => {
    renderPicker({ b: "1,5" });
    expect(screen.getByRole("textbox", { name: "Số lượng Xôi gà" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Số lượng Cam sành" })).toHaveValue(
      "1,5",
    );
  });

  it("answers a change with the new selection", async () => {
    const { onChange } = renderPicker({ b: "1" });

    await userEvent.click(
      row("Xôi gà").getByRole("button", { name: "Tăng số lượng" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ a: "1", b: "1" });

    await userEvent.click(
      row("Cam sành").getByRole("button", { name: "Giảm số lượng" }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ b: "0.5" });

    await userEvent.type(
      screen.getByRole("textbox", { name: "Số lượng Xôi gà" }),
      "4",
    );
    expect(onChange).toHaveBeenLastCalledWith({ a: "4", b: "1" });
  });

  it("explains a quantity that cannot be ordered", () => {
    renderPicker({ a: "1,5", b: "0,25" });
    expect(row("Xôi gà").getByRole("alert")).toHaveTextContent(
      "Nhập số nguyên từ 1",
    );
    expect(row("Cam sành").getByRole("alert")).toHaveTextContent(
      "Kg đặt theo bước 0,1, từ 0,1",
    );
  });

  it("marks a stopped product and never lets it go above its limit", () => {
    renderWithIntl(
      <CampaignItemPicker
        items={[
          item("a", { title: "Chè", selling: false, max: 0 }),
          item("b", { title: "Bánh", selling: false, max: 2 }),
        ]}
        selection={{ b: "2", a: "" }}
        onChange={vi.fn()}
      />,
    );

    expect(row("Chè").getByText("Ngừng bán")).toBeInTheDocument();
    expect(row("Chè").getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
    expect(row("Bánh").getByRole("button", { name: "Tăng số lượng" })).toBeDisabled();
    expect(row("Bánh").getByRole("button", { name: "Giảm số lượng" })).toBeEnabled();
  });

  it("says how much of a limited product may be chosen", () => {
    renderWithIntl(
      <CampaignItemPicker
        items={[item("b", { title: "Bánh", max: 2 })]}
        selection={{ b: "3" }}
        onChange={vi.fn()}
      />,
    );
    expect(row("Bánh").getByRole("alert")).toHaveTextContent("Tối đa 2 cái");
  });

  it("disables every stepper", () => {
    renderPicker({ a: "2" }, { disabled: true });
    for (const field of screen.getAllByRole("textbox")) {
      expect(field).toBeDisabled();
    }
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });

  it("only lists the products when read-only", () => {
    renderPicker({}, { readOnly: true });
    expect(screen.getByText("Xôi gà")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names units in English on an English page", () => {
    renderWithIntl(
      <CampaignItemPicker items={ITEMS} selection={{ a: "8" }} onChange={vi.fn()} />,
      { locale: "en" },
    );
    expect(
      screen.getByRole("textbox", { name: "Quantity of Xôi gà" }),
    ).toBeInTheDocument();
    expect(screen.getByText("/piece")).toBeInTheDocument();
  });
});
