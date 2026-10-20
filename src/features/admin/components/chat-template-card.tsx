"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUserMessage } from "@/shared/api/use-user-message";
import { Button, buttonVariants } from "@/shared/ui/atoms/shadcn/button";
import { Textarea } from "@/shared/ui/atoms/shadcn/textarea";
import { Field } from "@/shared/ui/molecules/field";
import { cn } from "@/shared/lib/utils";
import {
  type ChatTemplate,
  useChatPreview,
  useSendChatTest,
  useUpdateChatTemplate,
} from "../api/use-chat-channel";
import {
  insertVariable,
  TEMPLATE_MAX_LENGTH,
  TEMPLATE_TITLE_KEYS,
  unknownVariables,
} from "../lib/chat-template";

const DEBOUNCE_MS = 400;

/** One message template: switch, text with variable chips, preview, save and test. */
export function ChatTemplateCard({ template }: { template: ChatTemplate }) {
  const t = useTranslations("admin.chat.templates");
  const tt = useTranslations("admin.chat.types");
  const userMessage = useUserMessage();
  const save = useUpdateChatTemplate();
  const test = useSendChatTest();
  const [enabled, setEnabled] = useState(template.enabled);
  const [text, setText] = useState(template.template);
  const [debounced, setDebounced] = useState(template.template);
  const [syncedAt, setSyncedAt] = useState(template.updatedAt);
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Adopt the saved values when the server copy changes.
  if (syncedAt !== template.updatedAt) {
    setSyncedAt(template.updatedAt);
    setEnabled(template.enabled);
    setText(template.template);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const unknown = unknownVariables(text, template.variables);
  const problem =
    text.trim() === ""
      ? t("required")
      : text.length > TEMPLATE_MAX_LENGTH
        ? t("tooLong", { max: TEMPLATE_MAX_LENGTH })
        : unknown.length > 0
          ? t("unknownVariables", { names: unknown.join(", ") })
          : undefined;
  const valid = problem === undefined;
  const debouncedValid =
    debounced.trim() !== "" &&
    debounced.length <= TEMPLATE_MAX_LENGTH &&
    unknownVariables(debounced, template.variables).length === 0;
  const preview = useChatPreview(
    template.eventType,
    debounced,
    debouncedValid && valid,
  );

  const titleKey = TEMPLATE_TITLE_KEYS[template.eventType];
  const title = titleKey
    ? tt(titleKey as Parameters<typeof tt>[0])
    : template.eventType;
  const isDigest = template.eventType === "chat.digest";
  const fieldId = `chat-template-${template.eventType}`;

  function insert(name: string): void {
    const el = textarea.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = insertVariable(text, start, end, name);
    setText(next.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }

  async function onSave(): Promise<void> {
    try {
      await save.mutateAsync({
        eventType: template.eventType,
        enabled,
        template: text,
      });
      toast.success(t("saved"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  async function onTest(): Promise<void> {
    try {
      await test.mutateAsync({ eventType: template.eventType, template: text });
      toast.success(t("tested"));
    } catch (error) {
      toast.error(userMessage(error));
    }
  }

  return (
    <article
      aria-label={title}
      className="flex flex-col gap-4 rounded-lg border border-border p-4"
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          role="switch"
          className="size-4 accent-primary"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        {isDigest ? t("digestEnabled") : t("enabled")}
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-muted-foreground">{t("variables")}</p>
        <div className="flex flex-wrap gap-2">
          {template.variables.map((name) => (
            <button
              key={name}
              type="button"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "font-mono",
              )}
              onClick={() => insert(name)}
            >
              {`{{${name}}}`}
            </button>
          ))}
        </div>
      </div>

      <Field htmlFor={fieldId} label={t("field")} error={problem}>
        <Textarea
          id={fieldId}
          ref={textarea}
          rows={4}
          value={text}
          aria-invalid={problem ? true : undefined}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="text-right text-[13px] text-muted-foreground">
          {t("counter", { count: text.length, max: TEMPLATE_MAX_LENGTH })}
        </p>
      </Field>

      <div
        role="region"
        aria-label={t("preview")}
        className="whitespace-pre-wrap rounded-lg bg-surface p-3 text-sm"
      >
        {preview.data ?? (
          <span className="text-muted-foreground">{t("previewEmpty")}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!valid || save.isPending}
          onClick={() => void onSave()}
        >
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!valid || test.isPending}
          onClick={() => void onTest()}
        >
          {t("test")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setText(template.defaultTemplate)}
        >
          {t("restore")}
        </Button>
      </div>
    </article>
  );
}
