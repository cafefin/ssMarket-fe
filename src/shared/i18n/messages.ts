import en from "./messages/en.json";
import vi from "./messages/vi.json";
import type { Locale } from "./config";

export type Messages = typeof vi;

export const MESSAGES: Record<Locale, Messages> = { vi, en };
