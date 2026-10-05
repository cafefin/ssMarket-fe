"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, selectClassName } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userMessage } from "@/lib/api/api-error";
import type { CurrentUser } from "@/lib/api/client";
import { useBanks } from "@/lib/api/use-banks";
import { useUpdateProfile } from "@/lib/api/use-update-profile";
import {
  type ProfileFormValues,
  profileSchema,
  safeNextPath,
  toProfileUpdate,
} from "./profile-schema";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { data: banks = [] } = useBanks();
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      deliveryLocation: user.deliveryLocation ?? "",
      bankBin: user.bankBin ?? "",
      bankAccountNumber: user.bankAccountNumber ?? "",
      bankAccountName: user.bankAccountName ?? "",
    },
  });

  // The bank list arrives after the first render. A native <select> falls
  // back to its first option when its options change, so re-apply the value.
  useEffect(() => {
    setValue("bankBin", getValues("bankBin"));
  }, [banks, getValues, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateProfile.mutateAsync(toProfileUpdate(values));
      toast.success("Đã lưu hồ sơ");
      if (next) {
        router.push(next);
      }
    } catch (error) {
      toast.error(userMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Nhận hàng</h2>
        <Field
          htmlFor="deliveryLocation"
          label="Vị trí nhận hàng"
          hint="Ví dụ: Tầng 7, khu A. Người bán sẽ giao tới đây."
          error={errors.deliveryLocation?.message}
        >
          <Input id="deliveryLocation" {...register("deliveryLocation")} />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tài khoản nhận tiền</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Chỉ cần khi bạn bán hàng và muốn nhận chuyển khoản qua mã QR. Người
            mua sẽ thấy thông tin này trên đơn hàng của họ.
          </p>
        </div>
        <Field
          htmlFor="bankBin"
          label="Ngân hàng"
          error={errors.bankBin?.message}
        >
          <select
            id="bankBin"
            className={selectClassName}
            aria-invalid={Boolean(errors.bankBin)}
            {...register("bankBin")}
          >
            <option value="">Chưa chọn</option>
            {/* Keeps the saved bank selectable while the list is loading. */}
            {user.bankBin && banks.length === 0 && (
              <option value={user.bankBin}>{user.bankBin}</option>
            )}
            {banks.map((bank) => (
              <option key={bank.bin} value={bank.bin}>
                {bank.shortName} – {bank.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          htmlFor="bankAccountNumber"
          label="Số tài khoản"
          error={errors.bankAccountNumber?.message}
        >
          <Input
            id="bankAccountNumber"
            inputMode="numeric"
            autoComplete="off"
            className="font-mono"
            aria-invalid={Boolean(errors.bankAccountNumber)}
            {...register("bankAccountNumber")}
          />
        </Field>
        <Field
          htmlFor="bankAccountName"
          label="Tên chủ tài khoản"
          hint="Hệ thống tự chuyển thành chữ in hoa không dấu, như trên thẻ ngân hàng."
          error={errors.bankAccountName?.message}
        >
          <Input
            id="bankAccountName"
            autoComplete="off"
            aria-invalid={Boolean(errors.bankAccountName)}
            {...register("bankAccountName")}
          />
        </Field>
      </section>

      <div>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </div>
    </form>
  );
}
