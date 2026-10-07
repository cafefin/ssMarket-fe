"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Textarea } from "@/shared/ui/atoms/shadcn/textarea";
import { ApiError } from "@/shared/api/api-error";
import { useUserMessage } from "@/shared/api/use-user-message";
import { api } from "@/shared/api/client";
import { CONDITION_PERCENT, CONDITIONS, categoryName, useCategories, MY_LISTINGS_QUERY_KEY, type ListingDetail, LISTINGS_QUERY_KEY, listingQueryKey } from "@/features/listings";
import {
  type ListingFormValues,
  type ListingMode,
  listingSchema,
  needsCondition,
  toListingBody,
} from "../lib/listing-schema";
import { submitListing } from "../lib/submit-listing";
import { ImagesField } from "./images-field";
import { ItemsField } from "./items-field";

interface ListingFormProps {
  mode: ListingMode;
  initialValues: ListingFormValues;
  /** Present when editing an existing listing. */
  listing?: Pick<ListingDetail, "id" | "status" | "images"> &
    Partial<Pick<ListingDetail, "category">>;
  /** Called on every change, so the create flow can keep a draft. */
  onValuesChange?: (values: ListingFormValues) => void;
  /** Called once the listing exists on the server. */
  onSaved?: () => void;
}

export function ListingForm({
  mode,
  initialValues,
  listing,
  onValuesChange,
  onSaved,
}: ListingFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("sell.form");
  const tv = useTranslations("sell.validation");
  const tm = useTranslations("sell.modeStep");
  const tc = useTranslations("common");
  const locale = useLocale();
  const userMessage = useUserMessage();
  const { data: categories = [], isSuccess: categoriesLoaded } =
    useCategories();
  const tl = useTranslations("listings");
  // The listing's own category counts too: it may have been hidden since.
  const ownCategory = listing?.category;
  const perishableIds = useMemo(
    () =>
      new Set(
        [...categories, ...(ownCategory ? [ownCategory] : [])]
          .filter((category) => category.isPerishable)
          .map((category) => String(category.id)),
      ),
    [categories, ownCategory],
  );
  const isPerishable = useMemo(
    () => (categoryId: string) => perishableIds.has(categoryId),
    [perishableIds],
  );
  const schema = useMemo(
    () => listingSchema(mode, tv, isPerishable),
    [mode, tv, isPerishable],
  );
  const [addedImages, setAddedImages] = useState<File[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [bankRequired, setBankRequired] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);

  const {
    register,
    control,
    handleSubmit,
    subscribe,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  const categoryId = useWatch({ control, name: "categoryId" });

  useEffect(() => {
    if (!onValuesChange) {
      return;
    }
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => onValuesChange(values),
    });
  }, [subscribe, onValuesChange]);

  // Re-apply the category once the options have loaded (see profile-form.tsx).
  useEffect(() => {
    setValue("categoryId", getValues("categoryId"));
  }, [categories, getValues, setValue]);

  // The backend lets a listing keep a category that has since been hidden, but
  // the options only list active ones. Show it so the select keeps its value.
  const hiddenCategory =
    categoriesLoaded &&
    listing?.category &&
    !categories.some((category) => category.id === listing.category?.id)
      ? listing.category
      : null;

  const isOpen = listing?.status === "open";
  const existingImages = (listing?.images ?? []).filter(
    (image) => !removedImageIds.includes(image.id),
  );

  const save = (publish: boolean) =>
    handleSubmit(async (values) => {
      setSubmitting(publish ? "publish" : "draft");
      setBankRequired(false);
      try {
        const result = await submitListing({
          api,
          listingId: listing?.id,
          body: toListingBody(mode, values, isPerishable),
          newImages: addedImages,
          removedImageIds,
          publish,
        });
        onSaved?.();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: LISTINGS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
          queryClient.invalidateQueries({ queryKey: listingQueryKey(result.id) }),
        ]);

        if (result.failedImages.length > 0) {
          toast.error(
            t("imagesFailed", { files: result.failedImages.join(", ") }),
          );
          router.replace(`/listings/${result.id}/edit`);
        } else if (result.publishError) {
          toast.error(
            t("publishFailed", { reason: userMessage(result.publishError) }),
          );
          router.replace(`/listings/${result.id}/edit`);
        } else if (result.published || isOpen) {
          toast.success(result.published ? t("published") : t("changesSaved"));
          router.push(`/listings/${result.id}`);
        } else {
          toast.success(t("draftSaved"));
          router.push("/sell?tab=draft");
        }
      } catch (error) {
        if (error instanceof ApiError && error.code === "BANK_PROFILE_REQUIRED") {
          setBankRequired(true);
        } else {
          toast.error(userMessage(error));
        }
      } finally {
        setSubmitting(null);
      }
    });

  return (
    <form
      noValidate
      // Enter in a text field does what the primary button does.
      onSubmit={(event) => void save(!isOpen)(event)}
      className="flex flex-col gap-8"
    >
      <p className="text-sm text-muted-foreground">
        {t("modeLabel")}{" "}
        <span className="font-medium text-foreground">
          {tm(`${mode}.title`)}
        </span>
      </p>

      <section className="flex flex-col gap-4">
        <Field htmlFor="title" label={t("title")} error={errors.title?.message}>
          <Input
            id="title"
            placeholder={t(`titlePlaceholder.${mode}`)}
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
        </Field>
        <Field
          htmlFor="categoryId"
          label={t("category")}
          error={errors.categoryId?.message}
        >
          <select
            id="categoryId"
            className={selectClassName}
            aria-invalid={Boolean(errors.categoryId)}
            {...register("categoryId")}
          >
            <option value="">{t("chooseCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {categoryName(category, locale)}
              </option>
            ))}
            {hiddenCategory && (
              <option value={String(hiddenCategory.id)}>
                {t("hiddenCategory", {
                  name: categoryName(hiddenCategory, locale),
                })}
              </option>
            )}
          </select>
        </Field>
        <Field
          htmlFor="description"
          label={t("description")}
          error={errors.description?.message}
        >
          <Textarea id="description" rows={4} {...register("description")} />
        </Field>
      </section>

      {needsCondition(mode, categoryId, isPerishable) && (
        <Field
          htmlFor="condition"
          label={t("condition")}
          hint={t("conditionHint")}
          error={errors.condition?.message}
        >
          <select
            id="condition"
            className={selectClassName}
            aria-invalid={Boolean(errors.condition)}
            {...register("condition")}
          >
            <option value="">{t("chooseCondition")}</option>
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {tl("conditionLabel", {
                  level: tl(`condition.${condition}`),
                  percent: CONDITION_PERCENT[condition],
                })}
              </option>
            ))}
          </select>
        </Field>
      )}

      {mode === "preorder" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="orderDeadline"
            label={t("deadline")}
            hint={t("deadlineHint")}
            error={errors.orderDeadline?.message}
          >
            <Input
              id="orderDeadline"
              type="datetime-local"
              aria-invalid={Boolean(errors.orderDeadline)}
              {...register("orderDeadline")}
            />
          </Field>
          <Field
            htmlFor="deliveryDate"
            label={t("deliveryDate")}
            error={errors.deliveryDate?.message}
          >
            <Input
              id="deliveryDate"
              type="date"
              aria-invalid={Boolean(errors.deliveryDate)}
              {...register("deliveryDate")}
            />
          </Field>
        </section>
      )}

      <ItemsField mode={mode} control={control} register={register} errors={errors} />

      <ImagesField
        existing={existingImages}
        added={addedImages}
        onAdd={(files) => setAddedImages((current) => [...current, ...files])}
        onRemoveExisting={(id) =>
          setRemovedImageIds((current) => [...current, id])
        }
        onRemoveAdded={(index) =>
          setAddedImages((current) => current.filter((_, i) => i !== index))
        }
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-semibold">{t("payment")}</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            {...register("acceptsPayOnDelivery")}
          />
          <span>
            {tc("paymentMethods.pay_on_delivery")}
            <span className="block text-sm text-muted-foreground">
              {t("payOnDeliveryHint")}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            {...register("acceptsPrepaidQr")}
          />
          <span>
            {tc("paymentMethods.prepaid_qr")}
            <span className="block text-sm text-muted-foreground">
              {t("prepaidQrHint")}
            </span>
          </span>
        </label>
        {errors.acceptsPayOnDelivery?.message && (
          <p role="alert" className="text-[13px] text-error-deep">
            {errors.acceptsPayOnDelivery.message}
          </p>
        )}
        {bankRequired && (
          <p
            role="alert"
            className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep"
          >
            {t("bankRequired")}{" "}
            <Link
              href={`/profile?next=${encodeURIComponent(pathname)}`}
              className="font-medium underline"
            >
              {t("addBank")}
            </Link>
            {!listing && t("keptExceptImages")}
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        {isOpen ? (
          <Button
            type="button"
            disabled={submitting !== null}
            onClick={() => void save(false)()}
          >
            {submitting ? tc("saving") : t("saveChanges")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={submitting !== null}
              onClick={() => void save(true)()}
            >
              {submitting === "publish" ? t("publishing") : t("publish")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null}
              onClick={() => void save(false)()}
            >
              {submitting === "draft" ? tc("saving") : t("saveDraft")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
