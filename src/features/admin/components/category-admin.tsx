"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { categoryName } from "@/features/listings";
import type { Translator } from "@/shared/i18n/translator";
import { useUserMessage } from "@/shared/api/use-user-message";
import { cn } from "@/shared/lib/utils";
import {
  type AdminCategory,
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
} from "../api/use-admin-categories";
import { useCurrentUser } from "@/shared/api/use-current-user";

function addSchema(t: Translator<"admin.validation">) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .max(40, t("maxLength", { max: 40 })),
    nameEn: z
      .string()
      .trim()
      .min(1, t("nameEnRequired"))
      .max(40, t("maxLength", { max: 40 })),
  });
}
type AddValues = z.infer<ReturnType<typeof addSchema>>;

function editSchema(t: Translator<"admin.validation">) {
  const sortMessage = t("sortOrder");
  return addSchema(t).extend({
    // An empty field would otherwise coerce to 0.
    sortOrder: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.coerce.number(sortMessage).int(sortMessage).min(0, sortMessage),
    ),
  });
}
type EditInput = z.input<ReturnType<typeof editSchema>>;
type EditValues = z.output<ReturnType<typeof editSchema>>;

function AddForm() {
  const create = useCreateCategory();
  const t = useTranslations("admin");
  const tv = useTranslations("admin.validation");
  const userMessage = useUserMessage();
  const schema = useMemo(() => addSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", nameEn: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success(t("add.done"));
      reset();
    } catch (error) {
      toast.error(userMessage(error));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 sm:flex-row sm:items-start"
      aria-label={t("add.title")}
    >
      <div className="flex-1">
        <Field
          htmlFor="new-name"
          label={t("fields.name")}
          error={errors.name?.message}
        >
          <Input id="new-name" {...register("name")} />
        </Field>
      </div>
      <div className="flex-1">
        <Field
          htmlFor="new-name-en"
          label={t("fields.nameEn")}
          error={errors.nameEn?.message}
        >
          <Input id="new-name-en" {...register("nameEn")} />
        </Field>
      </div>
      <Button type="submit" disabled={create.isPending} className="sm:mt-7">
        {t("add.submit")}
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const [editing, setEditing] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const update = useUpdateCategory();
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tv = useTranslations("admin.validation");
  const locale = useLocale();
  const userMessage = useUserMessage();
  const schema = useMemo(() => editSchema(tv), [tv]);
  const name = categoryName(category, locale);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category.name,
      nameEn: category.nameEn,
      sortOrder: category.sortOrder,
    },
  });

  useEffect(() => {
    if (editing) {
      setFocus("name");
    } else if (wasEditing.current) {
      // Editing just ended: return focus to this row's edit button.
      editButton.current?.focus();
    }
    wasEditing.current = editing;
  }, [editing, setFocus]);

  const onSave = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: category.id, body: values });
      setEditing(false);
      toast.success(t("saved"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  });

  async function toggle(): Promise<void> {
    const next = !category.isActive;
    try {
      await update.mutateAsync({ id: category.id, body: { isActive: next } });
      toast.success(next ? t("shown") : t("hidden"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  function startEditing(): void {
    reset({
      name: category.name,
      nameEn: category.nameEn,
      sortOrder: category.sortOrder,
    });
    setEditing(true);
  }

  if (editing) {
    return (
      <tr className="border-b border-border align-top">
        <td className="p-2">
          <Field
            htmlFor={`name-${category.id}`}
            label={t("fields.shortName")}
            error={errors.name?.message}
          >
            <Input id={`name-${category.id}`} {...register("name")} />
          </Field>
        </td>
        <td className="p-2">
          <Field
            htmlFor={`name-en-${category.id}`}
            label={t("fields.nameEn")}
            error={errors.nameEn?.message}
          >
            <Input id={`name-en-${category.id}`} {...register("nameEn")} />
          </Field>
        </td>
        <td className="p-2">
          <Field
            htmlFor={`sort-${category.id}`}
            label={t("fields.sortOrder")}
            error={errors.sortOrder?.message}
          >
            <Input
              id={`sort-${category.id}`}
              type="number"
              min={0}
              {...register("sortOrder")}
            />
          </Field>
        </td>
        <td className="p-2" />
        <td className="p-2">
          <div className="flex gap-2 pt-7">
            <Button
              type="button"
              size="sm"
              disabled={update.isPending}
              onClick={() => void onSave()}
            >
              {tc("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              {tc("cancel")}
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border">
      <td className="p-2 font-medium">{category.name}</td>
      <td className="p-2">{category.nameEn}</td>
      <td className="p-2">{category.sortOrder}</td>
      <td
        className={cn(
          "p-2",
          category.isActive ? "text-positive-deep" : "text-muted-foreground",
        )}
      >
        {category.isActive ? t("status.active") : t("status.hidden")}
      </td>
      <td className="p-2">
        <div className="flex gap-2">
          <Button
            type="button"
            ref={editButton}
            variant="outline"
            size="sm"
            aria-label={t("actions.editNamed", { name })}
            onClick={startEditing}
          >
            {tc("edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={update.isPending}
            aria-label={
              category.isActive
                ? t("actions.hideNamed", { name })
                : t("actions.showNamed", { name })
            }
            onClick={() => void toggle()}
          >
            {category.isActive ? t("actions.hide") : t("actions.show")}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function CategoryAdmin() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const userMessage = useUserMessage();
  const {
    data: categories,
    error,
    isError,
    refetch,
  } = useAdminCategories(isAdmin);

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, router]);

  if (!user) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold">
          {t("title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("intro")}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("add.title")}</h2>
        <AddForm />
      </section>

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-error-deep">{userMessage(error)}</p>
          <Button variant="outline" onClick={() => void refetch()}>
            {tc("retry")}
          </Button>
        </div>
      ) : categories ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">{t("table.caption")}</caption>
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 font-medium">{t("fields.shortName")}</th>
                <th className="p-2 font-medium">{t("fields.nameEn")}</th>
                <th className="p-2 font-medium">{t("fields.sortOrder")}</th>
                <th className="p-2 font-medium">{t("table.status")}</th>
                <th className="p-2">
                  <span className="sr-only">{t("table.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}
    </div>
  );
}
