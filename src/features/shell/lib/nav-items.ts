import {
  HouseIcon,
  ReceiptIcon,
  StorefrontIcon,
  UserIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

export interface NavItem {
  href: string;
  /** A key in the `shell.nav` messages. */
  labelKey: "home" | "orders" | "selling" | "me";
  icon: Icon;
}

/** The destinations shown in the header on wide screens and in the tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "home", icon: HouseIcon },
  { href: "/orders", labelKey: "orders", icon: ReceiptIcon },
  { href: "/sell", labelKey: "selling", icon: StorefrontIcon },
];

export const PROFILE_ITEM: NavItem = {
  href: "/profile",
  labelKey: "me",
  icon: UserIcon,
};

/** Browsing a listing still counts as being on the home section. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/listings/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
