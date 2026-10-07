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
  emptyItem,
  LISTING_UNITS,
  type ListingFormValues,
  type ListingMode,
  MAX_COMBOS,
  MAX_ITEMS,
  parsePrice,
  parseQuantity,
} from "../lib/listing-schema";

/**
 * The combos of one option: "N units for a set price", with the price per
 * unit shown so the seller sees the discount.
 */
function CombosField({
  index,
  control,
  register,
  errors,
}: Omit<ItemsFieldProps, "mode"> & { index: number }) {
  const t = useTranslations("sell.items");
  const format = useFormat();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${index}.combos`,
  });
  const combos = useWatch({ control, name: `items.${index}.combos` });
  const unit = useWatch({ control, name: `items.${index}.unit` });
  const comboErrors = errors.items?.[index]?.combos;

  return (
    <div className="flex flex-col gap-3 sm:col-span-full">
      {fields.length > 0 && (
        <p className="text-sm font-medium">{t("combos")}</p>
      )}
      {fields.map((field, comboIndex) => {
        const number = comboIndex + 1;
        const quantity = parseQuantity(combos?.[comboIndex]?.quantity ?? "");
        const price = parsePrice(combos?.[comboIndex]?.price ?? "");
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
              htmlFor={`items.${index}.combos.${comboIndex}.quantity`}
              label={t("comboQuantity", { number })}
              error={comboErrors?.[comboIndex]?.quantity?.message}
            >
              <Input
                id={`items.${index}.combos.${comboIndex}.quantity`}
                inputMode="decimal"
                placeholder="100"
                {...register(`items.${index}.combos.${comboIndex}.quantity`)}
              />
            </Field>
            <Field
              htmlFor={`items.${index}.combos.${comboIndex}.price`}
              label={t("comboPrice", { number })}
              hint={
                perUnit === null
                  ? undefined
                  : t("comboPerUnit", { price: format.money(perUnit), unit })
              }
              error={comboErrors?.[comboIndex]?.price?.message}
            >
              <Input
                id={`items.${index}.combos.${comboIndex}.price`}
                inputMode="numeric"
                placeholder="900.000"
                {...register(`items.${index}.combos.${comboIndex}.price`)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeCombo", { number })}
              onClick={() => remove(comboIndex)}
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
  const t = useTranslations("sell.items");

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-lg font-semibold">{t("title")}</legend>
      <p className="-mt-2 text-sm text-muted-foreground">
        {t(`hint.${mode}`)}
      </p>

      {fields.map((field, index) => {
        const number = index + 1;
        const itemErrors = errors.items?.[index];
        return (
          <div
            key={field.id}
            role="group"
            aria-label={t("item", { number })}
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,2fr)_7rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start"
          >
            <Field
              htmlFor={`items.${index}.name`}
              label={fields.length === 1 ? t("nameOptional") : t("name")}
              error={itemErrors?.name?.message}
            >
              <Input
                id={`items.${index}.name`}
                aria-invalid={Boolean(itemErrors?.name)}
                {...register(`items.${index}.name`)}
              />
            </Field>
            <Field htmlFor={`items.${index}.unit`} label={t("unit")}>
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
              label={t("unitPrice")}
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
                label={t("stock")}
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
              aria-label={t("remove", { number })}
              // A listing always has at least one item.
              disabled={fields.length === 1}
              onClick={() => remove(index)}
              className="sm:mt-7"
            >
              <TrashIcon aria-hidden="true" />
            </Button>
            <CombosField
              index={index}
              control={control}
              register={register}
              errors={errors}
            />
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
          {t("add")}
        </Button>
      </div>
    </fieldset>
  );
}
