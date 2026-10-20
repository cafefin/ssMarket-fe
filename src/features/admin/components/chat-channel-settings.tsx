"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Input } from "@/shared/ui/atoms/shadcn/input";
import { Field } from "@/shared/ui/molecules/field";
import {
  type ChatChannel,
  useUpdateChatSettings,
} from "../api/use-chat-channel";
import {
  chatSettingsSchema,
  toSettingsUpdate,
  type ChatSettingsValues,
} from "../lib/chat-settings-schema";

function valuesOf(channel: ChatChannel): ChatSettingsValues {
  return {
    enabled: channel.enabled,
    unlimited: channel.maxPerHour === null,
    maxPerHour: String(channel.maxPerHour ?? 10),
    sellerCooldownMinutes: String(channel.sellerCooldownMinutes),
    webhookUrl: "",
    removeWebhook: false,
  };
}

/** Switch, webhook, limits and cooldown of the Google Chat channel. */
export function ChatChannelSettings({ channel }: { channel: ChatChannel }) {
  const t = useTranslations("admin.chat.settings");
  const tv = useTranslations("admin.chat.validation");
  const userMessage = useUserMessage();
  const update = useUpdateChatSettings();
  const [replacing, setReplacing] = useState(false);
  const schema = useMemo(
    () => chatSettingsSchema(tv, channel.hasWebhook),
    [tv, channel.hasWebhook],
  );
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ChatSettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesOf(channel),
  });
  const unlimited = useWatch({ control, name: "unlimited" });
  const removeWebhook = useWatch({ control, name: "removeWebhook" });
  const showInput = !channel.hasWebhook || replacing;

  function keepWebhook(): void {
    setReplacing(false);
    setValue("webhookUrl", "");
    setValue("removeWebhook", false);
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await update.mutateAsync(toSettingsUpdate(values));
      reset(valuesOf(saved));
      setReplacing(false);
      toast.success(t("saved"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={t("title")}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h2 className="text-lg">{t("title")}</h2>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          role="switch"
          className="size-4 accent-primary"
          {...register("enabled")}
        />
        {t("enabled")}
      </label>

      <div className="flex flex-col gap-2">
        {channel.hasWebhook && !removeWebhook ? (
          <p className="text-sm">
            {t("webhookSet", { hint: channel.webhookHint ?? "" })}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("webhookNone")}</p>
        )}
        {channel.hasWebhook && (
          <div className="flex flex-wrap gap-2">
            {replacing || removeWebhook ? (
              <Button type="button" variant="outline" onClick={keepWebhook}>
                {t("keepWebhook")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReplacing(true)}
                >
                  {t("replaceWebhook")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValue("removeWebhook", true)}
                >
                  {t("removeWebhook")}
                </Button>
              </>
            )}
          </div>
        )}
        {(showInput || errors.webhookUrl) && (
          <Field
            htmlFor="chat-webhook"
            label={t("webhook")}
            hint={t("webhookHint")}
            error={errors.webhookUrl?.message}
          >
            <Input
              id="chat-webhook"
              autoComplete="off"
              aria-invalid={errors.webhookUrl ? true : undefined}
              {...register("webhookUrl")}
            />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Field
          htmlFor="chat-max-per-hour"
          label={t("maxPerHour")}
          error={errors.maxPerHour?.message}
        >
          <Input
            id="chat-max-per-hour"
            inputMode="numeric"
            disabled={unlimited}
            aria-invalid={errors.maxPerHour ? true : undefined}
            {...register("maxPerHour")}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            {...register("unlimited")}
          />
          {t("unlimited")}
        </label>
        <Field
          htmlFor="chat-cooldown"
          label={t("cooldown")}
          hint={t("cooldownHint")}
          error={errors.sellerCooldownMinutes?.message}
        >
          <Input
            id="chat-cooldown"
            inputMode="numeric"
            aria-invalid={errors.sellerCooldownMinutes ? true : undefined}
            {...register("sellerCooldownMinutes")}
          />
        </Field>
        <p className="text-[13px] text-muted-foreground">{t("limitHint")}</p>
      </div>

      <div>
        <Button type="submit" disabled={update.isPending}>
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
