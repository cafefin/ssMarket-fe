"use client";

import { CaretDownIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
  useWatch,
} from "react-hook-form";
import { useFormat } from "@/shared/lib/format/use-format";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Textarea } from "@/shared/ui/atoms/shadcn/textarea";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import type { CampaignItem } from "../api/use-my-campaigns";
import type { CampaignFormValues, ItemFormValues } from "../lib/campaign-schema";
import type { ItemPhotos } from "../lib/submit-campaign";
import { LISTING_UNITS } from "../lib/units";
import { ComboFields } from "./combo-fields";
import { ImagesField } from "./images-field";

/**
 * The columns of a row from 640px up; the heading of the list uses the same
 * ones. Below that a row stacks as a card.
 */
export const ITEM_ROW_COLUMNS =
  "sm:grid-cols-[2.5rem_minmax(0,1fr)_8rem_6.5rem_4.5rem]";

interface ItemRowProps {
  index: number;
  control: Control<CampaignFormValues>;
  register: UseFormRegister<CampaignFormValues>;
  setValue: UseFormSetValue<CampaignFormValues>;
  errors: FieldErrors<ItemFormValues> | undefined;
  /** The product as the server has it; absent for one not saved yet. */
  saved?: Pick<CampaignItem, "images" | "orderCount" | "removable">;
  onRemove: () => void;
  /** Called with the row's photo changes, which the form sends when saving. */
  onPhotosChange: (photos: ItemPhotos) => void;
}

const NO_IMAGES: CampaignItem["images"] = [];

/**
 * One product of a round: photo, name, price and unit on one line, with the
 * description, combos and photos behind a disclosure button.
 */
export function ItemRow({
  index,
  control,
  register,
  setValue,
  errors,
  saved,
  onRemove,
  onPhotosChange,
}: ItemRowProps) {
  const t = useTranslations("sell.campaign.item");
  const format = useFormat();
  const number = index + 1;
  const name = `items.${index}` as const;
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState<ItemPhotos>({
    newImages: [],
    removedImageIds: [],
  });
  const selling = useWatch({ control, name: `${name}.selling` });

  // A problem in a closed row would be invisible, so such a row opens itself.
  const open = expanded || Boolean(errors?.description || errors?.combos);
  const removable = saved?.removable ?? true;
  const savedImages = saved?.images ?? NO_IMAGES;
  const existingImages = useMemo(
    () => savedImages.filter((image) => !photos.removedImageIds.includes(image.id)),
    [savedImages, photos.removedImageIds],
  );

  const firstNew = existingImages.length === 0 ? photos.newImages[0] : undefined;
  const preview = useMemo(
    () => (firstNew ? URL.createObjectURL(firstNew) : null),
    [firstNew],
  );
  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );
  const thumbnail = existingImages[0]?.thumbnailUrl ?? preview;

  function changePhotos(next: ItemPhotos): void {
    setPhotos(next);
    onPhotosChange(next);
  }

  return (
    <li
      aria-label={t("label", { number })}
      className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:rounded-none sm:border-0 sm:border-b sm:px-0 sm:py-3"
    >
      <div
        className={cn(
          // From 640px the column headings name the fields, so the labels
          // stay for screen readers only.
          "grid grid-cols-[2.5rem_minmax(0,1fr)_6.5rem] items-start gap-3 sm:[&_label]:sr-only",
          ITEM_ROW_COLUMNS,
        )}
      >
        <button
          type="button"
          aria-label={thumbnail ? undefined : t("addPhoto", { number })}
          onClick={() => setExpanded(true)}
          className="mt-7 flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-surface text-muted-foreground outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 sm:mt-0"
        >
          {thumbnail ? (
            // Session-protected media or a local preview; see listing-card.tsx.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={t("photo", { number })}
              className="size-full object-cover"
            />
          ) : (
            <PlusIcon aria-hidden="true" className="size-4" />
          )}
        </button>

        <div className="col-span-2 sm:col-span-1">
          <Field
            htmlFor={`${name}.title`}
            label={t("title", { number })}
            error={errors?.title?.message}
          >
            <Input
              id={`${name}.title`}
              placeholder={t("titlePlaceholder")}
              aria-invalid={Boolean(errors?.title)}
              {...register(`${name}.title`)}
            />
          </Field>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <Field
            htmlFor={`${name}.unitPrice`}
            label={t("price", { number })}
            error={errors?.unitPrice?.message}
          >
            <Input
              id={`${name}.unitPrice`}
              inputMode="numeric"
              placeholder="15.000"
              aria-invalid={Boolean(errors?.unitPrice)}
              {...register(`${name}.unitPrice`)}
            />
          </Field>
        </div>

        <Field
          htmlFor={`${name}.unit`}
          label={t("unit", { number })}
          error={errors?.unit?.message}
        >
          <select
            id={`${name}.unit`}
            className={selectClassName}
            aria-invalid={Boolean(errors?.unit)}
            {...register(`${name}.unit`)}
          >
            {LISTING_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {format.unit(unit)}
              </option>
            ))}
          </select>
        </Field>

        <div className="col-span-3 flex justify-end gap-1 sm:col-span-1 sm:pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={open}
            aria-label={t(open ? "collapse" : "expand", { number })}
            onClick={() => setExpanded(!open)}
          >
            <CaretDownIcon
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </Button>
          {removable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("remove", { number })}
              onClick={onRemove}
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {!removable && (
        // An order refers to this product, so it can only stop being sold.
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              role="switch"
              className="size-4 accent-primary"
              checked={!selling}
              onChange={(event) =>
                setValue(`${name}.selling`, !event.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            {t("stopSelling")}
          </label>
          <span className="text-muted-foreground">
            {t("orders", { count: saved?.orderCount ?? 0 })}
          </span>
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-4 rounded-md bg-surface p-3 sm:ml-[3.25rem]">
          <Field
            htmlFor={`${name}.description`}
            label={t("description", { number })}
            error={errors?.description?.message}
          >
            <Textarea
              id={`${name}.description`}
              rows={2}
              className="bg-background"
              aria-invalid={Boolean(errors?.description)}
              {...register(`${name}.description`)}
            />
          </Field>
          <ComboFields
            control={control}
            register={register}
            prefix={`${name}.`}
            errors={errors?.combos}
          />
          <ImagesField
            inputId={`${name}.images`}
            existing={existingImages}
            added={photos.newImages}
            onAdd={(files) =>
              changePhotos({
                ...photos,
                newImages: [...photos.newImages, ...files],
              })
            }
            onRemoveExisting={(id) =>
              changePhotos({
                ...photos,
                removedImageIds: [...photos.removedImageIds, id],
              })
            }
            onRemoveAdded={(removed) =>
              changePhotos({
                ...photos,
                newImages: photos.newImages.filter((_, i) => i !== removed),
              })
            }
          />
        </div>
      )}
    </li>
  );
}
