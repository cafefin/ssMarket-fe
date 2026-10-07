"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Field, selectClassName } from "@/shared/ui/molecules/field";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { useUserMessage } from "@/shared/api/use-user-message";
import type { CurrentUser } from "@/shared/api/client";
import { useBanks } from "../api/use-banks";
import { useUpdateProfile } from "../api/use-update-profile";
import {
  type ProfileFormValues,
  profileSchema,
  safeNextPath,
  toProfileUpdate,
} from "../lib/profile-schema";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { data: banks = [] } = useBanks();
  const updateProfile = useUpdateProfile();
  const t = useTranslations("profile");
  const tv = useTranslations("profile.validation");
  const tc = useTranslations("common");
  const userMessage = useUserMessage();
  const schema = useMemo(() => profileSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
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
      toast.success(t("saved"));
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
        <h2 className="text-lg font-semibold">{t("delivery.title")}</h2>
        <Field
          htmlFor="deliveryLocation"
          label={t("delivery.location")}
          hint={t("delivery.locationHint")}
          error={errors.deliveryLocation?.message}
        >
          <Input id="deliveryLocation" {...register("deliveryLocation")} />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t("bank.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("bank.hint")}
          </p>
        </div>
        <Field
          htmlFor="bankBin"
          label={t("bank.bank")}
          error={errors.bankBin?.message}
        >
          <select
            id="bankBin"
            className={selectClassName}
            aria-invalid={Boolean(errors.bankBin)}
            {...register("bankBin")}
          >
            <option value="">{t("bank.none")}</option>
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
          label={t("bank.accountNumber")}
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
          label={t("bank.accountName")}
          hint={t("bank.accountNameHint")}
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
          {updateProfile.isPending ? tc("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
