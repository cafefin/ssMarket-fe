import {
  HouseIcon,
  type LucideIcon,
  ReceiptTextIcon,
  StoreIcon,
  UserIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** A key in the `shell.nav` messages. */
  labelKey: "home" | "orders" | "selling" | "me";
  icon: LucideIcon;
}

/** The destinations shown in the header on wide screens and in the tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", labelKey: "home", icon: HouseIcon },
  { href: "/orders", labelKey: "orders", icon: ReceiptTextIcon },
  { href: "/sell", labelKey: "selling", icon: StoreIcon },
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
