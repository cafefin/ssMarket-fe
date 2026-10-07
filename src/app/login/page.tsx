import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/shared/ui/atoms/wordmark";
import { buttonVariants } from "@/shared/ui/atoms/shadcn/button";

// Only these fixed messages are ever rendered; the query value itself is not.
const ERROR_KEYS = {
  domain_not_allowed: "errors.domainNotAllowed",
  login_failed: "errors.generic",
} as const;

function errorKey(error: string) {
  return Object.hasOwn(ERROR_KEYS, error)
    ? ERROR_KEYS[error as keyof typeof ERROR_KEYS]
    : "errors.generic";
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const t = await getTranslations("login");
  const errorMessage = error ? t(errorKey(error)) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-soft px-4">
      <section className="w-full max-w-sm rounded-lg border border-border bg-card p-8 text-center">
        <h1>
          <Wordmark className="text-[28px] leading-tight" />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("tagline")}
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-error/40 bg-error-soft px-4 py-3 text-sm text-error-deep"
          >
            {errorMessage}
          </p>
        )}

        {/* A plain link, not next/link: this must be a full navigation that
            reaches the backend through the /api proxy. */}
        <a
          href="/api/auth/google"
          className={buttonVariants({ size: "lg", className: "mt-6 w-full" })}
        >
          {t("signInWithGoogle")}
        </a>
      </section>
    </main>
  );
}
