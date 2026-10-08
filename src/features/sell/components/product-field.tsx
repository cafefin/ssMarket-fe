"use client";

import { TrashIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { useFormat } from "@/shared/lib/format/use-format";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import {
  LISTING_UNITS,
  type ListingFormValues,
  type ListingMode,
  MAX_COMBOS,
  parsePrice,
  parseQuantity,
} from "../lib/listing-schema";

interface ProductFieldProps {
  mode: ListingMode;
  control: Control<ListingFormValues>;
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

/**
 * The combos of the product: "N units for a set price", with the price per
 * unit shown so the seller sees the discount.
 */
function CombosField({
  control,
  register,
  errors,
}: Omit<ProductFieldProps, "mode">) {
  const t = useTranslations("sell.product");
  const format = useFormat();
  const { fields, append, remove } = useFieldArray({ control, name: "combos" });
  const combos = useWatch({ control, name: "combos" });
  const unit = useWatch({ control, name: "unit" });

  return (
    <div className="flex flex-col gap-3">
      {fields.length > 0 && <p className="text-sm font-medium">{t("combos")}</p>}
      {fields.map((field, index) => {
        const number = index + 1;
        const quantity = parseQuantity(combos?.[index]?.quantity ?? "");
        const price = parsePrice(combos?.[index]?.price ?? "");
        const perUnit =
          quantity !== null && Number(quantity) > 0 && !Number.isNaN(price)
            ? Math.round(price / Number(quantity))
            : null;
        return (
          <div
            key={field.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3"
          >
            <Field
              htmlFor={`combos.${index}.quantity`}
              label={t("comboQuantity", { number })}
              error={errors.combos?.[index]?.quantity?.message}
            >
              <Input
                id={`combos.${index}.quantity`}
                inputMode="decimal"
                placeholder="10"
                {...register(`combos.${index}.quantity`)}
              />
            </Field>
            <Field
              htmlFor={`combos.${index}.price`}
              label={t("comboPrice", { number })}
              hint={
                perUnit === null
                  ? undefined
                  : t("comboPerUnit", { price: format.money(perUnit), unit })
              }
              error={errors.combos?.[index]?.price?.message}
            >
              <Input
                id={`combos.${index}.price`}
                inputMode="numeric"
                placeholder="90.000"
                {...register(`combos.${index}.price`)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeCombo", { number })}
              onClick={() => remove(index)}
              className="mt-7"
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={fields.length >= MAX_COMBOS}
          onClick={() => append({ quantity: "", price: "" })}
        >
          {t("addCombo")}
        </Button>
        <span className="ml-2 text-[13px] text-muted-foreground">
          {t("combosHint", { max: MAX_COMBOS })}
        </span>
      </div>
    </div>
  );
}

/**
 * Price, unit and, for goods in stock, how many there are. One listing is
 * one product: sell another product as another listing.
 */
export function ProductField({ mode, control, register, errors }: ProductFieldProps) {
  const t = useTranslations("sell.product");
  const showStock = mode === "in_stock";

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-lg font-semibold">{t("title")}</legend>
      <p className="-mt-2 text-sm text-muted-foreground">{t(`hint.${mode}`)}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:items-start">
        <div className="col-span-2 sm:col-span-1">
          <Field
            htmlFor="unitPrice"
            label={t("unitPrice")}
            error={errors.unitPrice?.message}
          >
            <Input
              id="unitPrice"
              inputMode="numeric"
              placeholder="35.000"
              aria-invalid={Boolean(errors.unitPrice)}
              {...register("unitPrice")}
            />
          </Field>
        </div>
        <Field htmlFor="unit" label={t("unit")}>
          <select id="unit" className={selectClassName} {...register("unit")}>
            {LISTING_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </Field>
        {showStock && (
          <Field
            htmlFor="stockQuantity"
            label={t("stock")}
            error={errors.stockQuantity?.message}
          >
            <Input
              id="stockQuantity"
              inputMode="decimal"
              aria-invalid={Boolean(errors.stockQuantity)}
              {...register("stockQuantity")}
            />
          </Field>
        )}
      </div>

      <CombosField control={control} register={register} errors={errors} />
    </fieldset>
  );
}
