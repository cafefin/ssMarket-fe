"use client";

import { Trash2Icon } from "lucide-react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import {
  emptyItem,
  LISTING_UNITS,
  type ListingFormValues,
  type ListingMode,
  MAX_ITEMS,
} from "../lib/listing-schema";

interface ItemsFieldProps {
  mode: ListingMode;
  control: Control<ListingFormValues>;
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

/** The repeatable item rows. Stock is asked only for in-stock listings. */
export function ItemsField({ mode, control, register, errors }: ItemsFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const showStock = mode === "in_stock";

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-lg font-semibold">Mặt hàng</legend>
      <p className="-mt-2 text-sm text-muted-foreground">
        {showStock
          ? "Mỗi dòng là một món, kèm số lượng bạn đang có."
          : "Mỗi dòng là một lựa chọn, ví dụ cam ngọt và cam vắt. Không cần nhập số lượng."}
      </p>

      {fields.map((field, index) => {
        const number = index + 1;
        const itemErrors = errors.items?.[index];
        return (
          <div
            key={field.id}
            role="group"
            aria-label={`Mặt hàng ${number}`}
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
          >
            <Field
              htmlFor={`items.${index}.name`}
              label="Tên"
              error={itemErrors?.name?.message}
            >
              <Input
                id={`items.${index}.name`}
                aria-invalid={Boolean(itemErrors?.name)}
                {...register(`items.${index}.name`)}
              />
            </Field>
            <Field htmlFor={`items.${index}.unit`} label="Đơn vị">
              <select
                id={`items.${index}.unit`}
                className={selectClassName}
                {...register(`items.${index}.unit`)}
              >
                {LISTING_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              htmlFor={`items.${index}.unitPrice`}
              label="Đơn giá (đ)"
              error={itemErrors?.unitPrice?.message}
            >
              <Input
                id={`items.${index}.unitPrice`}
                inputMode="numeric"
                placeholder="35.000"
                aria-invalid={Boolean(itemErrors?.unitPrice)}
                {...register(`items.${index}.unitPrice`)}
              />
            </Field>
            {showStock ? (
              <Field
                htmlFor={`items.${index}.stockQuantity`}
                label="Số lượng có"
                error={itemErrors?.stockQuantity?.message}
              >
                <Input
                  id={`items.${index}.stockQuantity`}
                  inputMode="decimal"
                  aria-invalid={Boolean(itemErrors?.stockQuantity)}
                  {...register(`items.${index}.stockQuantity`)}
                />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Xóa mặt hàng ${number}`}
              // A listing always has at least one item.
              disabled={fields.length === 1}
              onClick={() => remove(index)}
              className="sm:mt-7"
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </div>
        );
      })}

      {errors.items?.root?.message && (
        <p role="alert" className="text-[13px] text-error-deep">
          {errors.items.root.message}
        </p>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          disabled={fields.length >= MAX_ITEMS}
          onClick={() => append(emptyItem())}
        >
          Thêm mặt hàng
        </Button>
      </div>
    </fieldset>
  );
}
