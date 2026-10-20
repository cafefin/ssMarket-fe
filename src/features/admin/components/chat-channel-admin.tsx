"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useCurrentUser } from "@/shared/api/use-current-user";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Button } from "@/shared/ui/atoms/shadcn/button";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useChatChannel } from "../api/use-chat-channel";
import { ChatChannelSettings } from "./chat-channel-settings";
import { ChatDeliveryLog } from "./chat-delivery-log";
import { ChatTemplateCard } from "./chat-template-card";

/** `/admin/chat-channel`: settings, message templates and the delivery log. */
export function ChatChannelAdmin() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const t = useTranslations("admin.chat");
  const userMessage = useUserMessage();
  const { data: channel, error, isError, refetch } = useChatChannel(isAdmin);

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
        <p className="mt-1 text-muted-foreground">{t("intro")}</p>
      </div>

      {isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-error-deep">
            {t("loadError")} {userMessage(error)}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            {t("retry")}
          </Button>
        </div>
      ) : channel ? (
        <>
          <ChatChannelSettings channel={channel} />
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{t("templates.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("templates.intro")}
            </p>
            {channel.templates.map((template) => (
              <ChatTemplateCard key={template.eventType} template={template} />
            ))}
          </section>
        </>
      ) : (
        <Skeleton className="h-48 w-full" />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t("log.title")}</h2>
        <ChatDeliveryLog />
      </section>
    </div>
  );
}
