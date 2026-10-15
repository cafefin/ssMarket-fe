"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import type { CampaignItem } from "../api/use-my-campaigns";
import { type CampaignFormValues, MAX_ITEMS } from "../lib/campaign-schema";
import type { ItemPhotos } from "../lib/submit-campaign";
import { ITEM_ROW_COLUMNS, ItemRow } from "./item-row";

/** A row of the form's field array; `key` identifies the row, `id` is the server's. */
export type ItemField = FieldArrayWithId<CampaignFormValues, "items", "key">;

interface CampaignItemsFieldProps {
  control: Control<CampaignFormValues>;
  register: UseFormRegister<CampaignFormValues>;
  setValue: UseFormSetValue<CampaignFormValues>;
  errors: FieldErrors<CampaignFormValues>["items"];
  fields: ItemField[];
  /** The products as the server has them, when editing a saved round. */
  savedItems?: CampaignItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onPhotosChange: (key: string, photos: ItemPhotos) => void;
  /** Buttons shown next to the heading, such as the import from a file. */
  actions?: ReactNode;
  /** A line under the heading, such as the outcome of an import. */
  notice?: ReactNode;
}

/** The products of a round: a counted list of rows and the button to add one. */
export function CampaignItemsField({
  control,
  register,
  setValue,
  errors,
  fields,
  savedItems = [],
  onAdd,
  onRemove,
  onPhotosChange,
  actions,
  notice,
}: CampaignItemsFieldProps) {
  const t = useTranslations("sell.campaign.items");
  const full = fields.length >= MAX_ITEMS;
  // A problem with the list itself: no products, or too many.
  const listError = errors?.root?.message ?? errors?.message;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {t("count", { count: fields.length, max: MAX_ITEMS })}
          </span>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {notice && <div className="text-sm text-muted-foreground">{notice}</div>}
      {listError && (
        <p role="alert" className="text-[13px] text-error-deep">
          {listError}
        </p>
      )}

      {fields.length > 0 && (
        <div>
          <div
            aria-hidden="true"
            className={cn(
              "hidden gap-3 border-b border-border pb-2 text-[13px] font-medium text-muted-foreground sm:grid",
              ITEM_ROW_COLUMNS,
            )}
          >
            <span>{t("columnPhoto")}</span>
            <span>{t("columnTitle")}</span>
            <span>{t("columnPrice")}</span>
            <span>{t("columnUnit")}</span>
          </div>
          <ul className="flex flex-col gap-3 sm:gap-0">
            {fields.map((field, index) => (
              <ItemRow
                key={field.key}
                index={index}
                control={control}
                register={register}
                setValue={setValue}
                errors={errors?.[index]}
                saved={
                  field.id
                    ? savedItems.find((item) => item.id === field.id)
                    : undefined
                }
                onRemove={() => onRemove(index)}
                onPhotosChange={(photos) => onPhotosChange(field.key, photos)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button type="button" variant="outline" disabled={full} onClick={onAdd}>
          {t("add")}
        </Button>
        {full && (
          <span className="text-[13px] text-muted-foreground">
            {t("limit", { max: MAX_ITEMS })}
          </span>
        )}
      </div>
    </section>
  );
}
