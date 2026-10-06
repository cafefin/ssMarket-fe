"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { userMessage } from "@/lib/api/api-error";
import {
  type AdminCategory,
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/lib/api/use-admin-categories";
import { useCurrentUser } from "@/lib/api/use-current-user";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nhập tên danh mục")
  .max(40, "Tối đa 40 ký tự");
const nameEnSchema = z
  .string()
  .trim()
  .min(1, "Nhập tên tiếng Anh")
  .max(40, "Tối đa 40 ký tự");

const addSchema = z.object({ name: nameSchema, nameEn: nameEnSchema });
type AddValues = z.infer<typeof addSchema>;

const editSchema = z.object({
  name: nameSchema,
  nameEn: nameEnSchema,
  sortOrder: z.coerce
    .number("Thứ tự là số nguyên từ 0")
    .int("Thứ tự là số nguyên từ 0")
    .min(0, "Thứ tự là số nguyên từ 0"),
});
type EditInput = z.input<typeof editSchema>;
type EditValues = z.output<typeof editSchema>;

function AddForm() {
  const create = useCreateCategory();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: "", nameEn: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success("Đã thêm danh mục");
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
      aria-label="Thêm danh mục"
    >
      <div className="flex-1">
        <Field htmlFor="new-name" label="Tên danh mục" error={errors.name?.message}>
          <Input id="new-name" {...register("name")} />
        </Field>
      </div>
      <div className="flex-1">
        <Field
          htmlFor="new-name-en"
          label="Tên tiếng Anh"
          error={errors.nameEn?.message}
        >
          <Input id="new-name-en" {...register("nameEn")} />
        </Field>
      </div>
      <Button type="submit" disabled={create.isPending} className="sm:mt-7">
        Thêm
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: AdminCategory }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateCategory();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditInput, unknown, EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: category.name,
      nameEn: category.nameEn,
      sortOrder: category.sortOrder,
    },
  });

  const onSave = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: category.id, body: values });
      setEditing(false);
      toast.success("Đã lưu danh mục");
    } catch (error) {
      toast.error(userMessage(error));
    }
  });

  async function toggle(): Promise<void> {
    const next = !category.isActive;
    try {
      await update.mutateAsync({ id: category.id, body: { isActive: next } });
      toast.success(next ? "Đã hiện danh mục" : "Đã ẩn danh mục");
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
          <Field htmlFor={`name-${category.id}`} label="Tên" error={errors.name?.message}>
            <Input id={`name-${category.id}`} {...register("name")} />
          </Field>
        </td>
        <td className="p-2">
          <Field
            htmlFor={`name-en-${category.id}`}
            label="Tên tiếng Anh"
            error={errors.nameEn?.message}
          >
            <Input id={`name-en-${category.id}`} {...register("nameEn")} />
          </Field>
        </td>
        <td className="p-2">
          <Field
            htmlFor={`sort-${category.id}`}
            label="Thứ tự"
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
              Lưu
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Hủy
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
        className={`p-2 ${category.isActive ? "text-positive-deep" : "text-muted-foreground"}`}
      >
        {category.isActive ? "Đang hiện" : "Đang ẩn"}
      </td>
      <td className="p-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Sửa ${category.name}`}
            onClick={startEditing}
          >
            Sửa
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={update.isPending}
            aria-label={`${category.isActive ? "Ẩn" : "Hiện"} ${category.name}`}
            onClick={() => void toggle()}
          >
            {category.isActive ? "Ẩn" : "Hiện"}
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
  const { data: categories } = useAdminCategories(isAdmin);

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
        <h1 className="text-2xl font-semibold">Quản lý danh mục</h1>
        <p className="mt-1 text-muted-foreground">
          Danh mục ẩn không còn trong bộ lọc và form đăng bán; bài đăng cũ vẫn
          giữ nguyên.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Thêm danh mục</h2>
        <AddForm />
      </section>

      {categories ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="p-2 font-medium">Tên</th>
              <th className="p-2 font-medium">Tên tiếng Anh</th>
              <th className="p-2 font-medium">Thứ tự</th>
              <th className="p-2 font-medium">Trạng thái</th>
              <th className="p-2">
                <span className="sr-only">Thao tác</span>
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
