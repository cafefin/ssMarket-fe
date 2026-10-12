"use client";

import { TrashIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import {
  type Control,
  type FieldError,
  type FieldValues,
  type Merge,
  type UseFormRegister,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { useFormat } from "@/shared/lib/format/use-format";
import { Field } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { MAX_COMBOS, parsePrice, parseQuantity } from "../lib/product-rules";

/** The part of any form that holds one product's unit and combos. */
interface ProductShape {
  unit: string;
  combos: { quantity: string; price: string }[];
}

type ComboErrors = Merge<
  FieldError,
  (
    | { quantity?: { message?: string }; price?: { message?: string } }
    | undefined
  )[]
>;

interface ComboFieldsProps<Values extends FieldValues> {
  control: Control<Values>;
  register: UseFormRegister<Values>;
  /**
   * Where the product sits in the form: "" when the form is the product,
   * "items.3." for the fourth product of a round.
   */
  prefix?: string;
  /** The errors of the product's `combos`. */
  errors: ComboErrors | undefined;
}

/**
 * The combos of a product: "N units for a set price", with the price per
 * unit shown so the seller sees the discount. Used by the listing form and
 * by each product of a round.
 */
export function ComboFields<Values extends FieldValues>({
  control: anyControl,
  register: anyRegister,
  prefix = "",
  errors,
}: ComboFieldsProps<Values>) {
  // The paths are built from `prefix`, which the types of React Hook Form
  // cannot follow, so inside this component the form is seen as one product.
  const control = anyControl as unknown as Control<ProductShape>;
  const register = anyRegister as unknown as UseFormRegister<ProductShape>;
  const combosName = `${prefix}combos` as "combos";
  const unitName = `${prefix}unit` as "unit";

  const t = useTranslations("sell.product");
  const format = useFormat();
  const { fields, append, remove } = useFieldArray({
    control,
    name: combosName,
    // The default key name, "id", would hide a product's own `id`.
    keyName: "key",
  });
  const combos = useWatch({ control, name: combosName });
  const unit = useWatch({ control, name: unitName });

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
        const quantityName = `${combosName}.${index}.quantity` as const;
        const priceName = `${combosName}.${index}.price` as const;
        return (
          <div
            key={field.key}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3"
          >
            <Field
              htmlFor={quantityName}
              label={t("comboQuantity", { number })}
              error={errors?.[index]?.quantity?.message}
            >
              <Input
                id={quantityName}
                inputMode="decimal"
                placeholder="10"
                {...register(quantityName)}
              />
            </Field>
            <Field
              htmlFor={priceName}
              label={t("comboPrice", { number })}
              hint={
                perUnit === null
                  ? undefined
                  : t("comboPerUnit", {
                      price: format.money(perUnit),
                      unit: format.unit(unit),
                    })
              }
              error={errors?.[index]?.price?.message}
            >
              <Input
                id={priceName}
                inputMode="numeric"
                placeholder="90.000"
                {...register(priceName)}
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
