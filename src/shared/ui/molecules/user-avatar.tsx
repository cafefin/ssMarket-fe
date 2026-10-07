import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/atoms/shadcn/avatar";
import { initials } from "@/shared/lib/format/initials";
import { cn } from "@/shared/lib/utils";

/**
 * A person's photo, or their initials when there is none. Decorative by
 * default, because the name is almost always written next to it.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "default",
  tone = "brand",
  decorative = true,
  className,
}: {
  name: string;
  avatarUrl: string | null;
  size?: "xs" | "default" | "lg";
  tone?: "brand" | "plain";
  decorative?: boolean;
  className?: string;
}) {
  return (
    <Avatar
      aria-hidden={decorative ? "true" : undefined}
      size={size === "lg" ? "lg" : "default"}
      className={cn(size === "xs" && "size-7", className)}
    >
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback
        className={cn(
          tone === "brand" && "bg-primary-soft font-semibold text-primary-deep",
          size === "xs" && "text-[11px]",
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
