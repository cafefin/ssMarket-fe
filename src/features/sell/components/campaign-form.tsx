"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { categoryName, useCategories } from "@/features/listings";
import { ApiError } from "@/shared/api/api-error";
import { api } from "@/shared/api/client";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { useFormat } from "@/shared/lib/format/use-format";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Textarea } from "@/shared/ui/atoms/shadcn/textarea";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import {
  type CampaignDetail,
  campaignKeysToInvalidate,
} from "../api/use-my-campaigns";
import {
  type CampaignFormValues,
  campaignSchema,
  emptyItem,
  toCampaignBody,
} from "../lib/campaign-schema";
import { type ItemPhotos, submitCampaign } from "../lib/submit-campaign";
import { LISTING_UNITS } from "../lib/units";
import { CampaignItemsField } from "./campaign-items-field";

interface CampaignFormProps {
  initialValues: CampaignFormValues;
  /** Present when editing a saved round. */
  campaign?: CampaignDetail;
  /** Called on every change, so the create flow can keep a draft. */
  onValuesChange?: (values: CampaignFormValues) => void;
  /** Called once the round is saved and the lists that show it are fresh. */
  onSaved?: () => void;
  /** Buttons next to the heading of the products. */
  itemActions?: ReactNode;
  /** A line under the heading of the products. */
  itemNotice?: ReactNode;
}

const NO_PHOTOS: ItemPhotos = { newImages: [], removedImageIds: [] };

/**
 * The form of a pre-order round: the shared terms once, then one row per
 * product.
 */
export function CampaignForm({
  initialValues,
  campaign,
  onValuesChange,
  onSaved,
  itemActions,
  itemNotice,
}: CampaignFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("sell.campaign.form");
  const tf = useTranslations("sell.form");
  const tv = useTranslations("sell.validation");
  const tc = useTranslations("common");
  const locale = useLocale();
  const format = useFormat();
  const userMessage = useUserMessage();
  const { data: me } = useCurrentUser();
  const { data: categories = [], isSuccess: categoriesLoaded } =
    useCategories();
  const schema = useMemo(() => campaignSchema(tv), [tv]);
  const [bankRequired, setBankRequired] = useState(false);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  // Files cannot live in the form state (it is copied to sessionStorage), so
  // each row's photo changes are kept here under the row's key.
  const photos = useRef(new Map<string, ItemPhotos>());

  const {
    register,
    control,
    handleSubmit,
    subscribe,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
    // The default key name, "id", would overwrite a product's server id.
    keyName: "key",
  });
  const acceptsPrepaidQr = useWatch({ control, name: "acceptsPrepaidQr" });

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

  // The backend lets a round keep a category that has since been hidden, but
  // the options only list active ones. Show it so the select keeps its value.
  const hiddenCategory =
    categoriesLoaded &&
    campaign &&
    !categories.some((category) => category.id === campaign.category.id)
      ? campaign.category
      : null;

  const isOpen = campaign?.status === "open";
  // Known before saving when the seller's profile has loaded; the server's
  // refusal covers the rest.
  const needsBank =
    bankRequired || (acceptsPrepaidQr && me != null && !me.bankAccountNumber);

  const save = (publish: boolean) =>
    handleSubmit(async (values) => {
      setSubmitting(publish ? "publish" : "draft");
      setBankRequired(false);
      try {
        const result = await submitCampaign({
          api,
          campaignId: campaign?.id,
          body: toCampaignBody(values),
          photos: fields.map((field) => photos.current.get(field.key) ?? NO_PHOTOS),
          publish,
        });
        await Promise.all(
          campaignKeysToInvalidate(result.id).map((queryKey) =>
            queryClient.invalidateQueries({ queryKey }),
          ),
        );
        onSaved?.();

        if (result.failedRemovals > 0) {
          toast.error(t("removalsFailed", { count: result.failedRemovals }));
        }
        if (result.failedImages.length > 0) {
          toast.error(
            t("imagesFailed", { files: result.failedImages.join(", ") }),
          );
          router.replace(`/campaigns/${result.id}/edit`);
        } else if (result.publishError) {
          toast.error(
            tf("publishFailed", { reason: userMessage(result.publishError) }),
          );
          router.replace(`/campaigns/${result.id}/edit`);
        } else if (result.published || isOpen) {
          toast.success(result.published ? t("published") : tf("changesSaved"));
          router.push(`/campaigns/${result.id}`);
        } else {
          toast.success(tf("draftSaved"));
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
      // Enter in a text field saves; publishing only through its own button.
      // With 50 rows of inputs an accidental publish is too easy.
      onSubmit={(event) => void save(false)(event)}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          event.key === "Enter" &&
          target instanceof HTMLInputElement &&
          !["checkbox", "radio", "file", "button", "submit"].includes(target.type)
        ) {
          event.preventDefault();
          if (submitting === null) {
            void save(false)();
          }
        }
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("shared")}</h2>
        <Field htmlFor="title" label={t("title")} error={errors.title?.message}>
          <Input
            id="title"
            placeholder={t("titlePlaceholder")}
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
        </Field>
        <Field
          htmlFor="categoryId"
          label={tf("category")}
          error={errors.categoryId?.message}
        >
          <select
            id="categoryId"
            className={selectClassName}
            aria-invalid={Boolean(errors.categoryId)}
            {...register("categoryId")}
          >
            <option value="">{tf("chooseCategory")}</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {categoryName(category, locale)}
              </option>
            ))}
            {hiddenCategory && (
              <option value={String(hiddenCategory.id)}>
                {tf("hiddenCategory", {
                  name: categoryName(hiddenCategory, locale),
                })}
              </option>
            )}
          </select>
        </Field>
        <Field
          htmlFor="description"
          label={tf("description")}
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
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
        </div>
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-semibold">{tf("payment")}</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            {...register("acceptsPayOnDelivery")}
          />
          <span>
            {tc("paymentMethods.pay_on_delivery")}
            <span className="block text-sm text-muted-foreground">
              {tf("payOnDeliveryHint")}
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
              {tf("prepaidQrHint")}
            </span>
          </span>
        </label>
        {errors.acceptsPayOnDelivery?.message && (
          <p role="alert" className="text-[13px] text-error-deep">
            {errors.acceptsPayOnDelivery.message}
          </p>
        )}
        {needsBank && (
          <p
            role="alert"
            className="rounded-md border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-deep"
          >
            {tf("bankRequired")}{" "}
            <Link
              href={`/profile?next=${encodeURIComponent(pathname)}`}
              className="font-medium underline"
            >
              {tf("addBank")}
            </Link>
            {!campaign && tf("keptExceptImages")}
          </p>
        )}
      </fieldset>

      <div className="max-w-xs">
        <Field
          htmlFor="defaultUnit"
          label={t("defaultUnit")}
          hint={t("defaultUnitHint")}
        >
          <select
            id="defaultUnit"
            className={selectClassName}
            {...register("defaultUnit")}
          >
            {LISTING_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {format.unit(unit)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <CampaignItemsField
        control={control}
        register={register}
        setValue={setValue}
        errors={errors.items}
        fields={fields}
        savedItems={campaign?.items}
        onAdd={() => append(emptyItem(getValues("defaultUnit")))}
        onRemove={(index) => {
          photos.current.delete(fields[index].key);
          remove(index);
        }}
        onPhotosChange={(key, changed) => photos.current.set(key, changed)}
        actions={itemActions}
        notice={itemNotice}
      />

      <div className="flex flex-wrap gap-3">
        {isOpen ? (
          <Button
            type="button"
            disabled={submitting !== null}
            onClick={() => void save(false)()}
          >
            {submitting ? tc("saving") : tf("saveChanges")}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={submitting !== null}
              onClick={() => void save(true)()}
            >
              {submitting === "publish" ? tf("publishing") : t("publish")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null}
              onClick={() => void save(false)()}
            >
              {submitting === "draft" ? tc("saving") : tf("saveDraft")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
