import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/shared/i18n/test-utils";
import { QuantityStepper } from "./quantity-stepper";

function renderStepper(
  props: Partial<React.ComponentProps<typeof QuantityStepper>> = {},
) {
  const onChange = vi.fn();
  renderWithIntl(
    <QuantityStepper
      value="1"
      unit="cái"
      label="Số lượng"
      onChange={onChange}
      {...props}
    />,
  );
  return {
    onChange,
    less: screen.getByRole("button", { name: "Giảm số lượng" }),
    more: screen.getByRole("button", { name: "Tăng số lượng" }),
    field: screen.getByRole("textbox", { name: "Số lượng" }),
  };
}

describe("QuantityStepper", () => {
  it("never goes below one step unless told otherwise", async () => {
    const { less, more, onChange } = renderStepper();
    expect(less).toBeDisabled();
    await userEvent.click(more);
    expect(onChange).toHaveBeenCalledWith("2");
  });

  it("steps kilograms by half a kilo", async () => {
    const { less, more, onChange } = renderStepper({ value: "1,5", unit: "kg" });
    await userEvent.click(less);
    expect(onChange).toHaveBeenLastCalledWith("1");
    await userEvent.click(more);
    expect(onChange).toHaveBeenLastCalledWith("2");
  });

  it("stops at the most that is allowed", () => {
    const { more } = renderStepper({ value: "3", max: 3 });
    expect(more).toBeDisabled();
  });

  it("starts again from one step when the value is not a quantity", async () => {
    const { less, more, onChange } = renderStepper({ value: "abc" });
    expect(less).toBeDisabled();
    await userEvent.click(more);
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("passes on what is typed", async () => {
    const { field, onChange } = renderStepper({ value: "" });
    await userEvent.type(field, "7");
    expect(onChange).toHaveBeenCalledWith("7");
  });

  describe("with a minimum of zero", () => {
    it("goes down to nothing and treats an empty field as nothing", async () => {
      const { less, onChange } = renderStepper({ value: "1", min: 0 });
      expect(less).toBeEnabled();
      await userEvent.click(less);
      expect(onChange).toHaveBeenCalledWith("0");
    });

    it("counts up from an empty field and shows a zero in it", async () => {
      const { less, more, field, onChange } = renderStepper({ value: "", min: 0 });
      expect(less).toBeDisabled();
      expect(field).toHaveAttribute("placeholder", "0");
      await userEvent.click(more);
      expect(onChange).toHaveBeenCalledWith("1");
    });

    it("cannot leave zero when nothing more is allowed", () => {
      const { less, more } = renderStepper({ value: "0", min: 0, max: 0 });
      expect(less).toBeDisabled();
      expect(more).toBeDisabled();
    });
  });

  it("disables both buttons and the field", () => {
    const { less, more, field } = renderStepper({ value: "2", disabled: true });
    expect(less).toBeDisabled();
    expect(more).toBeDisabled();
    expect(field).toBeDisabled();
  });

  it("marks its field as invalid when told the quantity is wrong", () => {
    expect(renderStepper({ invalid: true }).field).toBeInvalid();
  });

  it("leaves its field valid otherwise", () => {
    expect(renderStepper().field).toBeValid();
  });
});
