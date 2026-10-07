"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/shared/ui/molecules/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/atoms/shadcn/dropdown-menu";
import { api, type CurrentUser } from "@/shared/api/client";

export function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout(): Promise<void> {
    await api.POST("/auth/logout");
    // Drop cached data so the next person on this browser never sees it.
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tài khoản của ${user.name}`}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar
          name={user.name}
          avatarUrl={user.avatarUrl}
          tone="plain"
          decorative={false}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          Hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/orders")}>
          Đơn của tôi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/sell")}>
          Bài đăng của tôi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/sell/orders")}>
          Đơn nhận được
        </DropdownMenuItem>
        {user.role === "admin" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/categories")}>
              Quản lý danh mục
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleLogout()}>
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
