"use client";

import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { Skeleton } from "@/shared/ui/atoms/shadcn/skeleton";
import { useCurrentUser } from "@/shared/api/use-current-user";

export default function ProfilePage() {
  const { data: user, isError } = useCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <h1 className="text-[28px] leading-tight font-semibold">Hồ sơ</h1>
      {user && (
        <p className="mt-1 text-sm text-muted-foreground">
          {user.name} · {user.email}
        </p>
      )}

      <div className="mt-8">
        {isError && (
          <p role="alert" className="text-sm text-error-deep">
            Không tải được hồ sơ. Vui lòng tải lại trang.
          </p>
        )}
        {!user && !isError && (
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {user && (
          // useSearchParams in the form needs a Suspense boundary.
          <Suspense>
            <ProfileForm user={user} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
