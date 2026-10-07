import type { useTranslations } from "next-intl";
import type { NamespaceKeys, NestedKeyOf } from "next-intl";
import type { Messages } from "./messages";

/**
 * The type of `useTranslations(namespace)`. Pure functions such as form
 * schemas take one so they can stay free of hooks and still be typed.
 */
export type Translator<
  Namespace extends NamespaceKeys<Messages, NestedKeyOf<Messages>>,
> = ReturnType<typeof useTranslations<Namespace>>;
