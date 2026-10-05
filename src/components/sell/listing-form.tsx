"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, selectClassName } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, userMessage } from "@/lib/api/api-error";
import { api } from "@/lib/api/client";
import { useCategories } from "@/lib/api/use-categories";
import {
  type ListingDetail,
  LISTINGS_QUERY_KEY,
  listingQueryKey,
} from "@/lib/api/use-listings";
import {
  type ListingFormValues,
  type ListingMode,
  listingSchema,
  toListingBody,
} from "@/lib/listings/listing-schema";
import { submitListing } from "@/lib/listings/submit-listing";
import { ImagesField } from "./images-field";
import { ItemsField } from "./items-field";

export const MY_LISTINGS_QUERY_KEY = ["my-listings"] as const;

interface ListingFormProps {
  mode: ListingMode;
  initialValues: ListingFormValues;
  /** Present when editing an existing listing. */
  listing?: Pick<ListingDetail, "id" | "status" | "images">;
  /** Called on every change, so the create flow can keep a draft. */
  onValuesChange?: (values: ListingFormValues) => void;
  /** Called once the listing exists on the server. */
  onSaved?: () => void;
}

const MODE_LABEL: Record<ListingMode, string> = {
  in_stock: "Hàng có sẵn",
  preorder: "Đặt trước",
};

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
  const { data: categories = [] } = useCategories();
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
    resolver: zodResolver(listingSchema(mode)),
    defaultValues: initialValues,
  });

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
          body: toListingBody(mode, values),
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
            `Đã lưu bài đăng nhưng chưa tải được ảnh: ${result.failedImages.join(", ")}. Hãy thử thêm lại ảnh.`,
          );
          router.replace(`/listings/${result.id}/edit`);
        } else if (result.publishError) {
          toast.error(
            `Đã lưu bản nháp nhưng chưa đăng được. ${userMessage(result.publishError)}`,
          );
          router.replace(`/listings/${result.id}/edit`);
        } else if (result.published || isOpen) {
          toast.success(result.published ? "Đã đăng bán" : "Đã lưu thay đổi");
          router.push(`/listings/${result.id}`);
        } else {
          toast.success("Đã lưu bản nháp");
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
        Hình thức: <span className="font-medium text-foreground">{MODE_LABEL[mode]}</span>
      </p>

      <section className="flex flex-col gap-4">
        <Field htmlFor="title" label="Tiêu đề" error={errors.title?.message}>
          <Input
            id="title"
            placeholder={
              mode === "preorder" ? "Hoa quả tuần này" : "Loa bluetooth JBL cũ"
            }
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
        </Field>
        <Field
          htmlFor="categoryId"
          label="Loại hàng"
          error={errors.categoryId?.message}
        >
          <select
            id="categoryId"
            className={selectClassName}
            aria-invalid={Boolean(errors.categoryId)}
            {...register("categoryId")}
          >
            <option value="">Chọn loại hàng</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          htmlFor="description"
          label="Mô tả"
          error={errors.description?.message}
        >
          <Textarea id="description" rows={4} {...register("description")} />
        </Field>
      </section>

      {mode === "preorder" && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Field
            htmlFor="orderDeadline"
            label="Hạn chốt đơn"
            hint="Sau thời điểm này không ai đặt thêm được."
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
            label="Ngày giao"
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
        <legend className="text-lg font-semibold">Thanh toán</legend>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            {...register("acceptsPayOnDelivery")}
          />
          <span>
            Trả tiền khi nhận hàng
            <span className="block text-sm text-muted-foreground">
              Bạn giao hàng rồi thu tiền trực tiếp hoặc nhận chuyển khoản sau.
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
            Chuyển khoản trước qua mã QR
            <span className="block text-sm text-muted-foreground">
              Người mua quét mã có sẵn số tiền. Cần thông tin ngân hàng trong hồ
              sơ của bạn.
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
            Bạn cần thêm thông tin ngân hàng trước khi nhận thanh toán qua QR.{" "}
            <Link
              href={`/profile?next=${encodeURIComponent(pathname)}`}
              className="font-medium underline"
            >
              Thêm thông tin ngân hàng
            </Link>
            {!listing && ". Nội dung bạn đã nhập sẽ được giữ lại, trừ ảnh."}
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
            {submitting ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={submitting !== null}
              onClick={() => void save(true)()}
            >
              {submitting === "publish" ? "Đang đăng…" : "Đăng bán"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null}
              onClick={() => void save(false)()}
            >
              {submitting === "draft" ? "Đang lưu…" : "Lưu nháp"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
