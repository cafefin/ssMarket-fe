"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useFormat } from "@/shared/lib/format/use-format";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { LISTING_UNITS, type ListingFormValues } from "../lib/listing-schema";
import { ComboFields } from "./combo-fields";

interface ProductFieldProps {
  control: Control<ListingFormValues>;
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
}

/**
 * Price, unit and how many there are. One listing is one product: sell
 * another product as another listing.
 */
export function ProductField({ control, register, errors }: ProductFieldProps) {
  const t = useTranslations("sell.product");
  const format = useFormat();

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-lg font-semibold">{t("title")}</legend>
      <p className="-mt-2 text-sm text-muted-foreground">{t("hint")}</p>

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
                {format.unit(unit)}
              </option>
            ))}
          </select>
        </Field>
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
      </div>

      <ComboFields control={control} register={register} errors={errors.combos} />
    </fieldset>
  );
}
