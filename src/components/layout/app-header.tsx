"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/api/use-current-user";
import { initials } from "@/lib/format/initials";

export function AppHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  async function handleLogout(): Promise<void> {
    await api.POST("/auth/logout");
    // Drop cached data so the next person on this browser never sees it.
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-hairline-soft bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8">
        <span className="text-lg font-semibold">ssMarket</span>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <Avatar>
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {user.name}
              </span>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleLogout()}
          >
            Đăng xuất
          </Button>
        </div>
      </div>
    </header>
  );
}
